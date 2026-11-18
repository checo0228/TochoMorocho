"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icono from "@/components/Icono";
import Buscador from "./Buscador";
import RenglonImpresion from "./RenglonImpresion";
import EscanerCamara from "./EscanerCamara";
import { AyudaZebra, BarraResumenCelular, ConfirmarVaciarCelular, PanelResumenEscritorio, type Resumen } from "./PanelResumen";
import { supabaseNavegador } from "@/lib/supabase/client";
import { agregarALista, asignarTamano, cargarLista, cargarProductos, fijarCantidad, registrarImpresion, vaciarLista } from "@/lib/datos";
import { buscarCodigo, indexar, sugerir } from "@/lib/buscar";
import { limpiarCodigo, MENSAJE_CODIGO } from "@/lib/codigo";
import { cabeCodigo } from "@/lib/etiquetas/code128";
import { dividirEnPartes, etiquetasDe, expandir, paginasDe, type Etiqueta, type ItemImpresion } from "@/lib/etiquetas/pdf";
import { descargarPdf, nombreArchivo } from "@/lib/etiquetas/descargar";
import { CHICA, GRANDE, MAX_PAGINAS_POR_PDF, type DisenoEtiqueta } from "@/lib/etiquetas/spec";
import { COLUMNAS_PRODUCTO, type Producto, type RenglonLista, type Tamano } from "@/lib/tipos";
import type { Rol } from "@/lib/roles";

interface Props {
  rol: Rol;
  productosIniciales: Producto[];
  listaInicial: RenglonLista[];
}

type Aviso = { tipo: "noExiste" | "codigo"; codigo: string; texto: string } | null;
type Partes = { diseno: DisenoEtiqueta; partes: Etiqueta[][]; hechas: Set<number> } | null;

const DISENOS: Record<Tamano, DisenoEtiqueta> = { grande: GRANDE, chica: CHICA };

export default function PantallaImprimir({ rol, productosIniciales, listaInicial }: Props) {
  const sb = supabaseNavegador();
  const esAdmin = rol === "admin";
  const [productos, setProductos] = useState(productosIniciales);
  const [lista, setLista] = useState(listaInicial);
  const [q, setQ] = useState("");
  const [enfocado, setEnfocado] = useState(false);
  const [resaltado, setResaltado] = useState<string | null>(null);
  const [toast, setToast] = useState<{ texto: string; error?: boolean } | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [generando, setGenerando] = useState<Tamano | null>(null);
  const [partes, setPartes] = useState<Partes>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const timerToast = useRef<ReturnType<typeof setTimeout>>(undefined);
  const timerResaltado = useRef<ReturnType<typeof setTimeout>>(undefined);

  const indice = useMemo(() => indexar(productos), [productos]);
  const porCodigo = useMemo(() => new Map(productos.map((p) => [p.codigo, p])), [productos]);
  const sugerencias = useMemo(() => sugerir(indice, q), [indice, q]);

  // ── utilidades de UI ──
  const avisar = useCallback((texto: string, error = false) => {
    clearTimeout(timerToast.current);
    setToast({ texto, error });
    timerToast.current = setTimeout(() => setToast(null), error ? 5000 : 2200);
  }, []);
  const resaltar = useCallback((codigo: string) => {
    clearTimeout(timerResaltado.current);
    setResaltado(codigo);
    timerResaltado.current = setTimeout(() => setResaltado(null), 1200);
  }, []);
  /** En PC el buscador vuelve a quedar listo para la pistola; en celular no (abriría el teclado). */
  const reenfocar = useCallback(() => {
    if (window.matchMedia("(pointer: fine)").matches) entrada.current?.focus();
  }, []);

  const recargarLista = useCallback(async () => {
    try {
      setLista(await cargarLista(sb));
    } catch (e) {
      console.error(e);
    }
  }, [sb]);
  const recargarProductos = useCallback(async () => {
    try {
      setProductos(await cargarProductos(sb));
    } catch (e) {
      console.error(e);
    }
  }, [sb]);

  // ── lista compartida en vivo (otro equipo escanea → aparece aquí) ──
  useEffect(() => {
    let espera: ReturnType<typeof setTimeout>;
    const canal = sb
      .channel("lista_impresion")
      .on("postgres_changes", { event: "*", schema: "public", table: "lista_impresion" }, () => {
        clearTimeout(espera);
        espera = setTimeout(recargarLista, 250);
      })
      .subscribe();
    const alVolver = () => {
      if (document.visibilityState === "visible") {
        void recargarLista();
        void recargarProductos();
      }
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearTimeout(espera);
      document.removeEventListener("visibilitychange", alVolver);
      void sb.removeChannel(canal);
    };
  }, [sb, recargarLista, recargarProductos]);

  // ── la pistola escribe aunque el buscador no tenga el foco ──
  useEffect(() => {
    entrada.current?.focus();
    const alTeclear = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
      entrada.current?.focus(); // la tecla cae en el buscador
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, []);

  // ── acciones ──
  const agregar = useCallback(
    async (p: Producto, n = 1) => {
      setAviso(null);
      const ahora = new Date().toISOString();
      setLista((l) => {
        const ya = l.find((r) => r.codigo === p.codigo);
        return ya
          ? [{ ...ya, cantidad: ya.cantidad + n }, ...l.filter((r) => r.codigo !== p.codigo)]
          : [{ codigo: p.codigo, cantidad: n, created_at: ahora }, ...l];
      });
      resaltar(p.codigo);
      try {
        const cantidad = await agregarALista(sb, p.codigo, n);
        avisar(`${p.nombre || p.codigo} · ${cantidad} ${cantidad === 1 ? "pieza" : "piezas"}`);
      } catch (e) {
        console.error(e);
        avisar("No se pudo agregar. Revisa el internet.", true);
        void recargarLista();
      }
    },
    [sb, avisar, resaltar, recargarLista],
  );

  const enviar = useCallback(
    async (texto: string, elegido?: Producto) => {
      if (elegido) {
        setQ("");
        return void agregar(elegido);
      }
      const r = limpiarCodigo(texto);
      if (!r.ok) {
        if (r.motivo === "vacio") return;
        // ¿texto con espacios que coincide con un nombre? → si hay 1 sola sugerencia, esa
        if (r.motivo === "caracteres" && sugerencias.length === 1) {
          setQ("");
          return void agregar(sugerencias[0]);
        }
        if (r.motivo === "caracteres" && sugerencias.length > 1) return; // que elija de la lista
        setQ("");
        return setAviso({ tipo: "codigo", codigo: r.codigo, texto: MENSAJE_CODIGO[r.motivo] });
      }
      let p = buscarCodigo(indice, r.codigo);
      if (!p) {
        // ¿lo acaban de dar de alta? se pregunta a la base antes de decir que no existe
        const { data } = await sb.from("productos").select(COLUMNAS_PRODUCTO).ilike("codigo", r.codigo).maybeSingle();
        if (data) {
          p = { ...(data as Producto), precio: Number((data as Producto).precio) };
          void recargarProductos();
        }
      }
      setQ("");
      if (p) return void agregar(p);
      if (/^\d+$|^[0-9A-Za-z]+$/.test(texto.trim()) && sugerencias.length === 0) {
        setAviso({
          tipo: "noExiste",
          codigo: r.codigo,
          texto: esAdmin
            ? "Dalo de alta en Multicomercio y luego sincroniza el Excel. (Crear productos aquí llega en la fase 3.)"
            : "Avisa a la encargada para que lo dé de alta.",
        });
      }
    },
    [agregar, indice, sb, sugerencias, esAdmin, recargarProductos],
  );

  const cambiarCantidad = useCallback(
    async (codigo: string, n: number) => {
      setLista((l) => (n <= 0 ? l.filter((r) => r.codigo !== codigo) : l.map((r) => (r.codigo === codigo ? { ...r, cantidad: Math.min(n, 10000) } : r))));
      try {
        await fijarCantidad(sb, codigo, n);
      } catch (e) {
        console.error(e);
        avisar("No se pudo guardar el cambio.", true);
        void recargarLista();
      }
      reenfocar();
    },
    [sb, avisar, recargarLista, reenfocar],
  );

  const cambiarTamano = useCallback(
    async (codigo: string, t: Tamano) => {
      setProductos((ps) => ps.map((p) => (p.codigo === codigo ? { ...p, tamano: t } : p)));
      try {
        await asignarTamano(sb, codigo, t);
        avisar(`Tamaño guardado: ${t === "grande" ? "Grande" : "Chica"}`);
      } catch (e) {
        console.error(e);
        avisar("No se pudo guardar el tamaño.", true);
        void recargarProductos();
      }
      reenfocar();
    },
    [sb, avisar, recargarProductos, reenfocar],
  );

  const vaciar = useCallback(async () => {
    const antes = lista;
    setLista([]);
    try {
      await vaciarLista(sb);
      avisar("Lista vacía");
    } catch (e) {
      console.error(e);
      setLista(antes);
      avisar("No se pudo vaciar la lista.", true);
    }
    reenfocar();
  }, [sb, lista, avisar, reenfocar]);

  // ── renglones y resumen ──
  const renglones = useMemo(
    () =>
      lista
        .map((r) => ({ r, p: porCodigo.get(r.codigo) }))
        .filter((x): x is { r: RenglonLista; p: Producto } => !!x.p)
        .map(({ r, p }) => ({
          r,
          p,
          noCabe: !!p.tamano && !cabeCodigo(p.codigo, DISENOS[p.tamano].barras.modulos, DISENOS[p.tamano].barras.anchoMax),
        })),
    [lista, porCodigo],
  );

  const itemsDe = useCallback(
    (t: Tamano): ItemImpresion[] =>
      renglones
        .filter((x) => x.p.tamano === t && !x.noCabe)
        .map(({ r, p }) => ({ codigo: p.codigo, nombre: p.nombre, precio: p.precio, cantidad: r.cantidad, etiquetaUnica: p.etiqueta_unica })),
    [renglones],
  );

  const resumen: Resumen = useMemo(() => {
    const g = itemsDe("grande");
    const c = itemsDe("chica");
    const grandes = g.reduce((s, i) => s + etiquetasDe(i), 0);
    const chicas = c.reduce((s, i) => s + etiquetasDe(i), 0);
    return {
      grandes,
      chicas,
      hileras: paginasDe(CHICA, chicas),
      sinTamano: renglones.filter((x) => !x.p.tamano).length,
      noCaben: renglones.filter((x) => x.noCabe).length,
      muestraGrande: expandir(g.slice(0, 1))[0],
      muestraChicas: expandir(c).slice(0, 3),
    };
  }, [itemsDe, renglones]);

  // ── PDF ──
  const bajarParte = useCallback(
    async (d: DisenoEtiqueta, etiquetas: Etiqueta[], i: number, de: number) => {
      setGenerando(d.clase);
      try {
        await descargarPdf(d, etiquetas, nombreArchivo(d, { i: i + 1, de }));
      } catch (e) {
        console.error(e);
        avisar(e instanceof Error ? e.message : "No se pudo generar el PDF.", true);
        return false;
      } finally {
        setGenerando(null);
      }
      return true;
    },
    [avisar],
  );

  const descargar = useCallback(
    async (t: Tamano) => {
      const d = DISENOS[t];
      const items = itemsDe(t);
      const etiquetas = expandir(items);
      if (etiquetas.length === 0) return;
      const total = etiquetas.length;
      void registrarImpresion(
        sb,
        t,
        d.id,
        items.map((i) => ({ codigo: i.codigo, nombre: i.nombre, precio: i.precio, cantidad: etiquetasDe(i) })),
        total,
      );
      if (paginasDe(d, total) > MAX_PAGINAS_POR_PDF) {
        setPartes({ diseno: d, partes: dividirEnPartes(d, etiquetas), hechas: new Set() });
        return;
      }
      if (await bajarParte(d, etiquetas, 0, 1)) {
        avisar(`PDF listo: ${total.toLocaleString("es-MX")} ${t === "grande" ? "grandes" : "chicas"}. Imprime en Tamaño real.`);
      }
    },
    [itemsDe, sb, bajarParte, avisar],
  );

  // ── render ──
  const camara = <EscanerCamara onCodigo={(c) => void enviar(c)} />;

  return (
    <>
      <div className="flex flex-1 lg:min-h-0 lg:overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col gap-[18px] px-4 py-5 md:px-10 md:py-8 lg:overflow-y-auto">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="titulo text-[34px] md:text-[52px]">IMPRIMIR ETIQUETAS</h1>
            <div className={`hidden items-center gap-2 text-[15px] font-semibold md:flex ${enfocado ? "text-[#1e6b3e]" : "text-apagado"}`}>
              <span
                className={`inline-block size-2.5 rounded-full ${enfocado ? "bg-[#1e8e4e] [animation:tm-pulso_1.6s_ease-in-out_infinite]" : "bg-[#b8b0a3]"}`}
              />
              {enfocado ? "Listo para escanear" : "Toca el buscador para escanear"}
            </div>
          </div>

          <Buscador
            ref={entrada}
            valor={q}
            onCambio={setQ}
            onEnviar={(t, p) => void enviar(t, p)}
            sugerencias={sugerencias}
            enfocado={enfocado}
            onEnfoque={setEnfocado}
            accionCamara={camara}
          />
          <p className="-mt-1.5 text-[15px] text-apagado">Con el escáner se agrega solo. Si escribes, elige de la lista o presiona Enter.</p>

          {aviso && (
            <div role="alert" className="flex items-start gap-3 rounded-2xl border-2 border-acento bg-suave p-4 text-[#7a2410]">
              <span className="mt-0.5 flex-none text-enlace">
                <Icono nombre="alerta" tam={22} />
              </span>
              <div className="flex-1 text-base leading-snug">
                <div className="text-lg font-bold">
                  {aviso.tipo === "noExiste" ? (
                    <>
                      No encontramos el código <span className="font-mono">{aviso.codigo}</span>
                    </>
                  ) : (
                    <>
                      Código no válido: <span className="font-mono">{aviso.codigo}</span>
                    </>
                  )}
                </div>
                {aviso.texto}
              </div>
              <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar aviso" className="flex size-10 items-center justify-center rounded-xl hover:bg-white/60">
                <Icono nombre="cerrar" tam={20} />
              </button>
            </div>
          )}

          {renglones.length > 0 ? (
            <>
              <div className="flex items-center justify-between gap-3 pt-1.5">
                <div className="text-[17px] font-bold">
                  En esta impresión{" "}
                  <span className="font-medium text-apagado">
                    · {renglones.length} {renglones.length === 1 ? "producto" : "productos"}
                  </span>
                </div>
                <ConfirmarVaciarCelular onVaciar={() => void vaciar()} />
              </div>
              <ul className="flex flex-col gap-2.5">
                {renglones.map(({ r, p, noCabe }) => (
                  <RenglonImpresion
                    key={p.codigo}
                    producto={p}
                    cantidad={r.cantidad}
                    esAdmin={esAdmin}
                    resaltado={resaltado === p.codigo}
                    noCabe={noCabe}
                    onCantidad={(n) => void cambiarCantidad(p.codigo, n)}
                    onQuitar={() => void cambiarCantidad(p.codigo, 0)}
                    onTamano={(t) => void cambiarTamano(p.codigo, t)}
                  />
                ))}
              </ul>
            </>
          ) : (
            <div className="flex min-h-[300px] flex-1 flex-col items-center justify-center gap-3.5 px-4 py-10 text-center">
              <Image src="/marca/panda.png" alt="" width={160} height={160} className="h-auto w-[120px] mix-blend-multiply md:w-[160px]" />
              <div className="text-[26px] font-bold tracking-[-.3px] text-balance">Escanea un producto para empezar</div>
              <div className="max-w-[420px] text-[17px] leading-relaxed text-apagado text-pretty">
                Apunta la pistola al código de barras. También puedes escribir el nombre o el código arriba.
              </div>
            </div>
          )}
          <div className="pb-2 lg:hidden">
            <AyudaZebra />
          </div>
        </div>

        <PanelResumenEscritorio r={resumen} generando={generando} hayRenglones={renglones.length > 0} onDescargar={(t) => void descargar(t)} onVaciar={() => void vaciar()} />
      </div>

      <BarraResumenCelular r={resumen} generando={generando} hayRenglones={renglones.length > 0} onDescargar={(t) => void descargar(t)} onVaciar={() => void vaciar()} />

      {partes && (
        <DialogoPartes
          partes={partes}
          generando={generando !== null}
          onBajar={async (i) => {
            const ok = await bajarParte(partes.diseno, partes.partes[i], i, partes.partes.length);
            if (ok) setPartes((p) => (p ? { ...p, hechas: new Set(p.hechas).add(i) } : p));
          }}
          onCerrar={() => {
            setPartes(null);
            reenfocar();
          }}
        />
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-[150px] left-1/2 z-40 flex max-w-[92%] -translate-x-1/2 items-center gap-2.5 whitespace-nowrap rounded-full bg-tinta py-3.5 pl-4 pr-[22px] text-[17px] font-semibold text-white shadow-[0_12px_32px_rgba(0,0,0,.25)] lg:bottom-7"
        >
          <span className={`flex size-7 flex-none items-center justify-center rounded-full ${toast.error ? "bg-[#b83a1d]" : "bg-acento"}`}>
            <Icono nombre={toast.error ? "alerta" : "palomita"} tam={16} trazo={3} />
          </span>
          <span className="truncate">{toast.texto}</span>
        </div>
      )}
    </>
  );
}

function DialogoPartes({
  partes,
  generando,
  onBajar,
  onCerrar,
}: {
  partes: NonNullable<Partes>;
  generando: boolean;
  onBajar: (i: number) => void;
  onCerrar: () => void;
}) {
  const { diseno, partes: lista, hechas } = partes;
  const total = lista.reduce((s, p) => s + p.length, 0);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="titulo-partes">
      <div className="flex w-full max-w-[480px] flex-col gap-4 rounded-[22px] bg-white p-6 shadow-xl">
        <h2 id="titulo-partes" className="titulo text-[26px]">
          SON MUCHAS ETIQUETAS
        </h2>
        <p className="text-base leading-relaxed text-texto-2">
          {total.toLocaleString("es-MX")} etiquetas {diseno.clase === "grande" ? "grandes" : "chicas"} = {paginasDe(diseno, total).toLocaleString("es-MX")}{" "}
          {diseno.clase === "grande" ? "páginas" : "hileras"}. Para que no se trabe la cola de impresión, se dividen en {lista.length} partes.{" "}
          <b>Manda una parte, espera a que termine de imprimir y luego la siguiente.</b>
        </p>
        <div className="flex flex-col gap-2">
          {lista.map((p, i) => (
            <button
              key={i}
              type="button"
              disabled={generando}
              onClick={() => onBajar(i)}
              className={`flex h-14 items-center justify-between gap-3 rounded-2xl border-2 px-4 text-left text-base font-bold disabled:opacity-50 ${
                hechas.has(i) ? "border-borde bg-fondo text-apagado" : "border-acento bg-white text-tinta hover:bg-suave"
              }`}
            >
              <span>
                Parte {i + 1} de {lista.length}{" "}
                <span className="font-medium text-apagado">· {p.length.toLocaleString("es-MX")} etiquetas</span>
              </span>
              <span className="flex items-center gap-1.5 text-sm">
                {hechas.has(i) ? (
                  <>
                    <Icono nombre="palomita" tam={18} trazo={3} /> Descargada
                  </>
                ) : (
                  <>
                    <Icono nombre="descargar" tam={18} trazo={2.4} /> Descargar
                  </>
                )}
              </span>
            </button>
          ))}
        </div>
        <button type="button" onClick={onCerrar} className="h-12 rounded-[14px] border border-borde-input text-base font-semibold text-texto-2 hover:bg-fondo">
          Cerrar
        </button>
      </div>
    </div>
  );
}
