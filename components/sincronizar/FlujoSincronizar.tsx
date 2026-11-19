"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Icono from "@/components/Icono";
import ZonaArchivo from "./ZonaArchivo";
import { supabaseNavegador } from "@/lib/supabase/client";
import { agregarVariosALista, aplicarSync, type Sincronizacion } from "@/lib/datos";
import { leerProductosMC } from "@/lib/multicomercio/productos";
import { leerExistencias } from "@/lib/multicomercio/existencias";
import { compararConMulticomercio, filasAEscribir, type CambioProducto, type ResultadoSync, type TipoCambio } from "@/lib/sync/diff";
import { sugerirImpresion, type SugerenciaImpresion } from "@/lib/sync/sugerir";
import { formatoPrecio } from "@/lib/etiquetas/spec";
import type { Producto } from "@/lib/tipos";

const $ = (n: number | null | undefined) => formatoPrecio(Number(n ?? 0)).replace("$ ", "$");

/** Orden y textos de los mosaicos. "fuerte" = alerta roja. */
const MOSAICOS: { tipo: TipoCambio; etiqueta: string; fuerte?: boolean }[] = [
  { tipo: "reutilizado", etiqueta: "códigos reutilizados", fuerte: true },
  { tipo: "movido", etiqueta: "cambiaron de código", fuerte: true },
  { tipo: "nuevo", etiqueta: "productos nuevos" },
  { tipo: "precio", etiqueta: "precios cambiados" },
  { tipo: "sinNombre", etiqueta: "quedaron sin nombre" },
  { tipo: "desaparecido", etiqueta: "ya no vienen (se desactivan)" },
  { tipo: "activo", etiqueta: "cambios de activo" },
  { tipo: "categoria", etiqueta: "cambios de categoría" },
  { tipo: "editadoApp", etiqueta: "editados en la app (vuelven a Multicomercio)" },
  { tipo: "dadoDeAlta", etiqueta: "pendientes ya dados de alta" },
];

const EXPLICA: Partial<Record<TipoCambio, string>> = {
  reutilizado: "El código ahora es OTRO producto. Quita las etiquetas viejas de estos códigos: ya escanean otra cosa. Se les quita el tamaño para que lo elijas de nuevo.",
  movido: "El mismo producto pasó a otro código. Quita las etiquetas del código viejo. El código nuevo conserva el tamaño que tenía.",
  nuevo: "Se agregan al catálogo sin tamaño (salvo los que solo cambiaron de código).",
  precio: "Hay que reimprimir TODAS las piezas con el precio nuevo.",
  sinNombre: "Normalmente es un producto descontinuado. Conserva su tamaño; no se imprime.",
  desaparecido: "No se borran: quedan inactivos.",
  editadoApp: "Se habían cambiado aquí y Multicomercio dice otra cosa: quedan como dice Multicomercio.",
  dadoDeAlta: "Los creaste aquí y ya existen en Multicomercio: dejan de estar pendientes.",
};

function detalle(c: CambioProducto, tipo: TipoCambio): string {
  const a = c.antes;
  const d = c.despues;
  switch (tipo) {
    case "reutilizado":
      return `Antes: ${a?.nombre_mc || a?.nombre || "(sin nombre)"}${a?.tamano ? ` (${a.tamano})` : ""}`;
    case "movido":
      return `Estaba en el código ${c.movidoDe?.join(", ")}`;
    case "nuevo":
      return `${$(d.precio)} · ${d.categoria ?? "Sin categoría"}`;
    case "precio":
      return `${$(a?.precio_mc ?? a?.precio)} → ${$(d.precio)}`;
    case "sinNombre":
      return `Antes: ${a?.nombre_mc || a?.nombre}`;
    case "desaparecido":
      return "Se desactiva";
    case "activo":
      return d.activo ? "Inactivo → Activo" : "Activo → Inactivo";
    case "categoria":
      return `${a?.categoria_mc ?? a?.categoria ?? "—"} → ${d.categoria ?? "—"}`;
    case "editadoApp":
      return `En la app: ${a?.nombre} ${$(a?.precio)} → ${d.nombre} ${$(d.precio)}`;
    case "dadoDeAlta":
      return `${$(d.precio)}`;
  }
}

type Etapa = { paso: "subir" } | { paso: "resumen"; archivo: string; r: ResultadoSync } | { paso: "listo"; archivo: string; r: ResultadoSync };

export default function FlujoSincronizar({ productos, ultima }: { productos: Producto[]; ultima: Sincronizacion | null }) {
  const sb = supabaseNavegador();
  const router = useRouter();
  const [etapa, setEtapa] = useState<Etapa>({ paso: "subir" });
  const [error, setError] = useState<string | null>(null);
  const [aplicando, setAplicando] = useState(false);
  const [sel, setSel] = useState<TipoCambio | null>(null);

  const leerArchivo = async (f: File) => {
    setError(null);
    try {
      const { productos: excel, rechazados } = leerProductosMC(new Uint8Array(await f.arrayBuffer()));
      if (excel.length < 50) throw new Error("El archivo trae muy pocos productos. ¿Es la exportación completa de productos?");
      const r = compararConMulticomercio(productos, excel);
      if (rechazados.length)
        setError(`${rechazados.length} renglón(es) con código no válido no se importan: ${rechazados.map((x) => x.codigo).slice(0, 8).join(", ")}`);
      setEtapa({ paso: "resumen", archivo: f.name, r });
      setSel(MOSAICOS.find((m) => r.porTipo[m.tipo].length > 0)?.tipo ?? null);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "No se pudo leer el archivo.");
    }
  };

  const aplicar = async () => {
    if (etapa.paso !== "resumen") return;
    setAplicando(true);
    setError(null);
    try {
      const { r, archivo } = etapa;
      const resumen = Object.fromEntries(MOSAICOS.map((m) => [m.tipo, r.porTipo[m.tipo].length]).filter(([, n]) => n));
      await aplicarSync(sb, {
        filas: filasAEscribir(r),
        movidos: r.porTipo.movido.map((c) => ({ codigo: c.codigo, de: c.movidoDe ?? [] })),
        archivo,
        leidos: r.leidos,
        resumen,
      });
      setEtapa({ paso: "listo", archivo, r });
      router.refresh();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "No se pudo aplicar. No se cambió nada.");
    } finally {
      setAplicando(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-[2_1_520px] flex-col gap-[18px] rounded-[20px] border border-borde bg-white p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-[21px] font-bold">Actualizar precios, nombres y activos</h2>
        <p className="text-[15px] text-apagado">
          {ultima
            ? `Última vez: ${new Date(ultima.fecha).toLocaleString("es-MX", { day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })} · ${ultima.archivo}`
            : "Todavía no se ha sincronizado desde la app."}
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-[14px] bg-suave px-4 py-3 text-[15px] font-semibold text-[#7a2410]">
          {error}
        </div>
      )}

      {etapa.paso === "subir" && (
        <>
          <div className="flex flex-wrap gap-2.5">
            <Paso n={1}>
              En Multicomercio, exporta el <b>Excel de productos</b> (el de “almacén”, con todas las categorías).
            </Paso>
            <Paso n={2}>Súbelo aquí y revisa qué cambió antes de aplicar. Nada cambia hasta que le des “Aplicar”.</Paso>
          </div>
          <ZonaArchivo titulo="SUBE EL EXCEL DE MULTICOMERCIO" detalle="Arrástralo aquí o toca para buscarlo · archivo .xlsx" acepta=".xlsx,.xls" onArchivo={leerArchivo} />
        </>
      )}

      {etapa.paso === "resumen" && (
        <Resumen
          archivo={etapa.archivo}
          r={etapa.r}
          sel={sel}
          onSel={setSel}
          aplicando={aplicando}
          onAplicar={() => void aplicar()}
          onCancelar={() => {
            setEtapa({ paso: "subir" });
            setError(null);
          }}
        />
      )}

      {etapa.paso === "listo" && <Listo r={etapa.r} onOtro={() => setEtapa({ paso: "subir" })} />}
    </div>
  );
}

function Paso({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex flex-[1_1_220px] items-start gap-3 text-base leading-snug">
      <span className="flex size-[30px] flex-none items-center justify-center rounded-full bg-tinta font-bold text-white">{n}</span>
      <span>{children}</span>
    </div>
  );
}

function Resumen({
  archivo,
  r,
  sel,
  onSel,
  aplicando,
  onAplicar,
  onCancelar,
}: {
  archivo: string;
  r: ResultadoSync;
  sel: TipoCambio | null;
  onSel: (t: TipoCambio) => void;
  aplicando: boolean;
  onAplicar: () => void;
  onCancelar: () => void;
}) {
  const visibles = MOSAICOS.filter((m) => r.porTipo[m.tipo].length > 0);
  const sinCambios = visibles.length === 0;
  const lista = sel ? r.porTipo[sel] : [];
  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-[14px] bg-fondo px-4 py-3">
        <span className="flex size-9 flex-none items-center justify-center rounded-lg bg-[#1f6e43] text-[13px] font-bold text-white">XLS</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold">{archivo}</div>
          <div className="text-sm text-apagado">{r.leidos.toLocaleString("es-MX")} productos leídos</div>
        </div>
        <button type="button" onClick={onCancelar} className="text-[15px] font-semibold text-apagado underline">
          Cambiar archivo
        </button>
      </div>

      {sinCambios ? (
        <div className="flex items-center gap-3 rounded-2xl bg-fondo p-5 text-lg font-semibold">
          <Icono nombre="palomita" tam={26} trazo={3} /> Todo está igual que en Multicomercio. No hay nada que aplicar.
        </div>
      ) : (
        <>
          <div className="text-[17px] font-semibold">Esto va a cambiar:</div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
            {visibles.map((m) => {
              const activo = sel === m.tipo;
              return (
                <button
                  key={m.tipo}
                  type="button"
                  onClick={() => onSel(m.tipo)}
                  aria-pressed={activo}
                  className={`flex flex-col gap-0.5 rounded-2xl border-2 px-[18px] py-4 text-left text-tinta ${
                    activo ? (m.fuerte ? "border-acento bg-suave" : "border-tinta bg-fondo") : m.fuerte ? "border-[#f0c9bd] bg-white" : "border-borde bg-white"
                  }`}
                >
                  <span className={`titulo text-[44px] leading-none ${m.fuerte ? "text-enlace" : ""}`}>{r.porTipo[m.tipo].length}</span>
                  <span className="text-base font-semibold leading-tight">{m.etiqueta}</span>
                </button>
              );
            })}
          </div>

          {sel && (
            <div className="flex flex-col gap-2">
              {EXPLICA[sel] && (
                <div
                  className={`flex items-start gap-2.5 rounded-[14px] px-3.5 py-3 text-[15px] leading-snug ${
                    MOSAICOS.find((m) => m.tipo === sel)?.fuerte ? "border-2 border-acento bg-suave font-semibold text-[#7a2410]" : "bg-fondo text-texto-2"
                  }`}
                >
                  <Icono nombre="alerta" tam={20} className="mt-px flex-none" />
                  <span>{EXPLICA[sel]}</span>
                </div>
              )}
              <ul className="max-h-[320px] overflow-auto rounded-[14px] border border-borde">
                {lista.map((c) => (
                  <li key={c.codigo} className="flex flex-wrap items-center gap-3 border-b border-[#f0ebe3] px-4 py-3 last:border-b-0">
                    <div className="min-w-0 flex-[1_1_220px]">
                      <div className="text-base font-semibold">{c.despues.nombre || <span className="text-apagado">(sin nombre)</span>}</div>
                      <div className="font-mono text-[13px] text-apagado">{c.codigo}</div>
                    </div>
                    <div className="text-base font-semibold text-texto-2">{detalle(c, sel)}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={onAplicar}
              disabled={aplicando}
              className="h-[58px] rounded-[14px] bg-acento px-7 text-lg font-bold text-white hover:bg-acento-hover disabled:opacity-60"
            >
              {aplicando ? "Aplicando…" : "Aplicar cambios"}
            </button>
            <button type="button" onClick={onCancelar} className="h-[58px] rounded-[14px] border border-borde-input bg-white px-[22px] text-[17px] font-semibold text-texto-2">
              Cancelar
            </button>
          </div>
        </>
      )}
    </>
  );
}

function Listo({ r, onOtro }: { r: ResultadoSync; onOtro: () => void }) {
  const sb = supabaseNavegador();
  const [existencias, setExistencias] = useState<{ archivo: string; mapa: Map<string, number> } | null>(null);
  const [errorEx, setErrorEx] = useState<string | null>(null);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [agregando, setAgregando] = useState(false);
  const [agregados, setAgregados] = useState<number | null>(null);

  const sugeridas: SugerenciaImpresion[] = useMemo(() => sugerirImpresion(r.cambios, existencias?.mapa ?? null), [r, existencias]);
  const cant = (s: SugerenciaImpresion) => cantidades[s.codigo] ?? s.cantidad;
  const items = sugeridas.filter((s) => cant(s) > 0);
  const total = items.reduce((t, s) => t + cant(s), 0);
  const sinTamano = items.filter((s) => !s.tamano).length;

  const resumen = MOSAICOS.filter((m) => r.porTipo[m.tipo].length)
    .slice(0, 4)
    .map((m) => `${r.porTipo[m.tipo].length} ${m.etiqueta}`)
    .join(", ");

  const subirExistencias = async (f: File) => {
    setErrorEx(null);
    try {
      setExistencias({ archivo: f.name, mapa: leerExistencias(new Uint8Array(await f.arrayBuffer())) });
      setCantidades({});
    } catch (e) {
      setErrorEx(e instanceof Error ? e.message : "No se pudo leer el reporte.");
    }
  };

  const agregar = async () => {
    setAgregando(true);
    try {
      await agregarVariosALista(
        sb,
        items.map((s) => ({ codigo: s.codigo, cantidad: cant(s) })),
      );
      setAgregados(items.length);
    } catch (e) {
      console.error(e);
      setErrorEx("No se pudieron agregar a la impresión.");
    } finally {
      setAgregando(false);
    }
  };

  const motivo: Record<SugerenciaImpresion["motivo"], string> = { reutilizado: "Reutilizado", movido: "Cambió de código", nuevo: "Nuevo", precio: "Precio nuevo" };

  return (
    <>
      <div className="flex flex-wrap items-center gap-[18px] rounded-2xl bg-fondo p-[22px]">
        <span className="flex size-14 flex-none items-center justify-center rounded-full bg-tinta text-white">
          <Icono nombre="palomita" tam={30} trazo={3} />
        </span>
        <div className="flex flex-[1_1_260px] flex-col gap-1.5">
          <div className="titulo text-2xl tracking-[.4px]">LISTO, CATÁLOGO ACTUALIZADO</div>
          <div className="text-base leading-relaxed text-texto-2">{resumen}.</div>
        </div>
        <button type="button" onClick={onOtro} className="text-[15px] font-semibold text-apagado underline">
          Subir otro archivo
        </button>
      </div>

      {sugeridas.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-[19px] font-bold">Etiquetas nuevas que hay que imprimir</h3>
          {!existencias ? (
            <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-borde px-4 py-3">
              <div className="flex-[1_1_240px] text-[15px] text-texto-2">
                Se sugiere <b>1 etiqueta</b> por producto. Para que sean tantas como piezas hay, sube el <b>reporte de existencias de hoy</b> (opcional; si es viejo, los códigos reutilizados traerían las piezas del producto anterior).
              </div>
              <div className="w-full sm:w-auto">
                <ZonaArchivo compacta titulo="EXISTENCIAS" detalle="Reporte .xls de Multicomercio" acepta=".xls,.xlsx,.xml" onArchivo={(f) => void subirExistencias(f)} />
              </div>
            </div>
          ) : (
            <div className="rounded-[14px] bg-fondo px-4 py-2.5 text-[15px] text-texto-2">
              Cantidades según <b>{existencias.archivo}</b>. Con 0 piezas no se imprimen; puedes cambiar cualquier cantidad.
            </div>
          )}
          {errorEx && <div className="rounded-[14px] bg-suave px-4 py-2.5 text-[15px] font-semibold text-[#7a2410]">{errorEx}</div>}

          <ul className="max-h-[360px] overflow-auto rounded-[14px] border border-borde">
            {sugeridas.map((s) => (
              <li key={s.codigo} className="flex flex-wrap items-center gap-3 border-b border-[#f0ebe3] px-4 py-2.5 last:border-b-0">
                <div className="min-w-0 flex-[1_1_200px]">
                  <div className="text-base font-semibold">{s.nombre || "(sin nombre)"}</div>
                  <div className="flex flex-wrap gap-2 text-[13px] text-apagado">
                    <span className="font-mono">{s.codigo}</span>· {motivo[s.motivo]}
                    {!s.tamano && <span className="font-bold text-enlace">· Sin tamaño</span>}
                    {s.existencia !== null && <span>· {s.existencia} en existencia</span>}
                  </div>
                </div>
                <input
                  value={cant(s)}
                  onChange={(e) => setCantidades((c) => ({ ...c, [s.codigo]: Math.min(10000, Number(e.target.value.replace(/\D/g, "")) || 0) }))}
                  inputMode="numeric"
                  aria-label={`Etiquetas de ${s.nombre || s.codigo}`}
                  className="h-11 w-[70px] rounded-xl border-2 border-tinta text-center text-lg font-bold outline-none"
                />
              </li>
            ))}
          </ul>

          {agregados === null ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void agregar()}
                disabled={agregando || items.length === 0}
                className="h-[58px] rounded-[14px] bg-acento px-7 text-lg font-bold text-white hover:bg-acento-hover disabled:opacity-50"
              >
                {agregando ? "Agregando…" : `Agregar ${items.length} a impresión (${total.toLocaleString("es-MX")} etiquetas)`}
              </button>
              {sinTamano > 0 && <span className="text-[15px] text-enlace">{sinTamano} sin tamaño: elígelo en la pantalla Imprimir.</span>}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 rounded-[14px] bg-fondo px-4 py-3 text-base">
              <Icono nombre="palomita" tam={22} trazo={3} />
              <span className="flex-1">{agregados} productos agregados a la impresión.</span>
              <a href="/imprimir" className="font-bold">
                Ir a Imprimir →
              </a>
            </div>
          )}
        </div>
      )}
    </>
  );
}
