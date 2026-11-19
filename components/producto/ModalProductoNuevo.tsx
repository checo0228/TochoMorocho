"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icono from "@/components/Icono";
import VistaEtiqueta from "@/components/etiquetas/VistaEtiqueta";
import { supabaseNavegador } from "@/lib/supabase/client";
import { crearProducto } from "@/lib/datos";
import { hayErrores, leerPrecio, soloAlfanumerico, validarProducto, type ErroresProducto, type FormProducto } from "@/lib/producto-nuevo";
import { limpiarCodigo } from "@/lib/codigo";
import { CHICA, GRANDE } from "@/lib/etiquetas/spec";
import type { Producto, Tamano } from "@/lib/tipos";

interface Props {
  codigoInicial?: string;
  categorias: string[];
  /** Busca un código en el catálogo cargado. */
  existe: (codigo: string) => Producto | undefined;
  onCerrar: () => void;
  /** Se creó y ya está en la lista. */
  onCreado: (p: Producto) => void;
  /** El código ya existía: agregar ese a la lista. */
  onAgregarExistente: (p: Producto) => void;
}

const NUEVA = "__nueva__";

export default function ModalProductoNuevo({ codigoInicial = "", categorias, existe, onCerrar, onCreado, onAgregarExistente }: Props) {
  const sb = supabaseNavegador();
  const [f, setF] = useState<FormProducto>({ codigo: codigoInicial, nombre: "", precio: "", categoria: "", tamano: null, etiquetaUnica: false });
  const [nuevaCat, setNuevaCat] = useState(false);
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const primerCampo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    primerCampo.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onCerrar]);

  const errores: ErroresProducto = useMemo(() => validarProducto(f, existe), [f, existe]);
  const codigoLimpio = limpiarCodigo(f.codigo);
  const duplicado = codigoLimpio.ok ? existe(codigoLimpio.codigo) : undefined;
  const conCaracteresMalos = !codigoLimpio.ok && codigoLimpio.motivo !== "vacio";
  const mostrar = (k: keyof ErroresProducto) => (intentado || (k === "codigo" && f.codigo.length > 0)) && errores[k];
  const set = <K extends keyof FormProducto>(k: K, v: FormProducto[K]) => {
    setErrorServidor(null);
    setF((x) => ({ ...x, [k]: v }));
  };

  const precio = leerPrecio(f.precio);
  // si el código no cabe, la vista previa muestra "Código muy largo" en su lugar
  const vista = f.tamano ? { codigo: codigoLimpio.ok ? codigoLimpio.codigo : "000000", nombre: f.nombre, precio: precio ?? 0 } : null;

  const guardar = async () => {
    setIntentado(true);
    if (hayErrores(errores) || !codigoLimpio.ok || !f.tamano || precio === null) return;
    setGuardando(true);
    try {
      const p = await crearProducto(sb, {
        codigo: codigoLimpio.codigo,
        nombre: f.nombre.trim(),
        precio,
        categoria: f.categoria.trim(),
        tamano: f.tamano,
        etiquetaUnica: f.etiquetaUnica,
        agregar: 1,
      });
      onCreado(p);
    } catch (e) {
      console.error(e);
      setErrorServidor(e instanceof Error ? e.message : "No se pudo guardar. Revisa el internet.");
    } finally {
      setGuardando(false);
    }
  };

  const borde = (k: keyof ErroresProducto) => (mostrar(k) ? "border-acento" : "border-borde-input focus:border-tinta");

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-[rgba(17,17,17,.45)] sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="titulo-nuevo">
      <div className="flex max-h-full w-full max-w-[980px] flex-col overflow-hidden bg-white shadow-[0_30px_80px_rgba(0,0,0,.25)] sm:rounded-[22px]">
        <div className="flex flex-none items-start gap-3 border-b border-borde px-6 pb-4 pt-[22px]">
          <div className="flex flex-1 flex-col gap-1">
            <h2 id="titulo-nuevo" className="titulo text-[28px] leading-[1.1]">
              PRODUCTO NUEVO
            </h2>
            <p className="text-base text-apagado">
              {codigoInicial ? (
                <>
                  No encontramos el código <span className="font-mono">{codigoInicial}</span>. Dalo de alta para imprimir su etiqueta.
                </>
              ) : (
                "Dalo de alta para imprimir su etiqueta."
              )}
            </p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="flex size-11 items-center justify-center rounded-xl bg-[#f3efe8] text-tinta">
            <Icono nombre="cerrar" tam={22} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] overflow-auto">
          <div className="flex flex-col gap-[18px] px-6 py-5">
            {/* Código */}
            <label className="flex flex-col gap-[7px]">
              <span className="text-[15px] font-bold">Código de barras</span>
              <input
                ref={primerCampo}
                value={f.codigo}
                onChange={(e) => set("codigo", e.target.value)}
                placeholder="Solo números y letras"
                autoComplete="off"
                spellCheck={false}
                className={`h-14 rounded-[14px] border-2 bg-white px-4 font-mono text-xl font-semibold tracking-[1px] text-tinta outline-none ${borde("codigo")}`}
              />
              {conCaracteresMalos && (
                <div className="flex flex-wrap items-center gap-2.5 rounded-[10px] bg-suave px-3 py-2.5 text-[15px] text-[#7a2410]">
                  <span className="flex-[1_1_200px]">{errores.codigo}</span>
                  <button type="button" onClick={() => set("codigo", soloAlfanumerico(f.codigo))} className="h-[38px] rounded-[10px] bg-tinta px-3 text-sm font-bold text-white">
                    Quitar guiones y espacios
                  </button>
                </div>
              )}
              {duplicado && (
                <div className="flex flex-wrap items-center gap-2.5 rounded-[10px] bg-suave px-3 py-2.5 text-[15px] text-[#7a2410]">
                  <span className="flex-[1_1_200px]">
                    Este código ya existe: <b>{duplicado.nombre || "(sin nombre)"}</b>
                  </span>
                  <button type="button" onClick={() => onAgregarExistente(duplicado)} className="h-[38px] rounded-[10px] bg-tinta px-3 text-sm font-bold text-white">
                    Agregar ese a la lista
                  </button>
                </div>
              )}
              {!conCaracteresMalos && !duplicado && mostrar("codigo") && <MensajeError>{errores.codigo}</MensajeError>}
            </label>

            {/* Nombre */}
            <label className="flex flex-col gap-[7px]">
              <span className="text-[15px] font-bold">Nombre</span>
              <input
                value={f.nombre}
                onChange={(e) => set("nombre", e.target.value)}
                placeholder="Como quieres que salga en la etiqueta"
                className={`h-14 rounded-[14px] border-2 bg-white px-4 text-lg font-medium text-tinta outline-none ${borde("nombre")}`}
              />
              {mostrar("nombre") && <MensajeError>{errores.nombre}</MensajeError>}
            </label>

            {/* Precio */}
            <label className="flex max-w-[220px] flex-col gap-[7px]">
              <span className="text-[15px] font-bold">Precio</span>
              <div className="relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-xl font-bold text-apagado">$</span>
                <input
                  value={f.precio}
                  onChange={(e) => set("precio", e.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  className={`h-14 w-full rounded-[14px] border-2 bg-white pl-[34px] pr-4 text-xl font-bold text-tinta outline-none ${borde("precio")}`}
                />
              </div>
              {mostrar("precio") && <MensajeError>{errores.precio}</MensajeError>}
            </label>

            {/* Categoría */}
            <div className="flex flex-col gap-2">
              <span className="text-[15px] font-bold">Categoría</span>
              <select
                value={nuevaCat ? NUEVA : f.categoria}
                onChange={(e) => {
                  if (e.target.value === NUEVA) {
                    setNuevaCat(true);
                    set("categoria", "");
                  } else {
                    setNuevaCat(false);
                    set("categoria", e.target.value);
                  }
                }}
                className={`h-14 rounded-[14px] border-2 bg-white px-3.5 text-[17px] font-medium text-tinta ${borde("categoria")}`}
                aria-label="Categoría"
              >
                <option value="">Elige una categoría…</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value={NUEVA}>+ Categoría nueva…</option>
              </select>
              {nuevaCat && (
                <>
                  <input
                    value={f.categoria}
                    onChange={(e) => set("categoria", e.target.value.toUpperCase())}
                    placeholder="NOMBRE DE LA CATEGORÍA"
                    autoFocus
                    className="h-12 rounded-[14px] border-2 border-borde-input bg-white px-4 text-base font-semibold uppercase outline-none focus:border-tinta"
                  />
                  <div className="rounded-[10px] bg-suave px-3 py-2 text-sm text-[#7a2410]">
                    Ojo: créala igual en Multicomercio, o al sincronizar el producto quedará en la categoría de allá.
                  </div>
                </>
              )}
              {mostrar("categoria") && <MensajeError>{errores.categoria}</MensajeError>}
            </div>

            {/* Tamaño */}
            <div className="flex flex-col gap-2">
              <span className="text-[15px] font-bold">Tamaño de etiqueta</span>
              <div className="grid grid-cols-2 gap-2.5">
                <OpcionTamano t="grande" activo={f.tamano === "grande"} onClick={() => set("tamano", "grande")} />
                <OpcionTamano t="chica" activo={f.tamano === "chica"} onClick={() => set("tamano", "chica")} />
              </div>
              {mostrar("tamano") && <MensajeError>{errores.tamano}</MensajeError>}
              <label className="mt-1 flex cursor-pointer items-center gap-2.5 text-[15px]">
                <input type="checkbox" checked={f.etiquetaUnica} onChange={(e) => set("etiquetaUnica", e.target.checked)} className="size-5 accent-[#111]" />
                <span>
                  <b>Una sola etiqueta</b> <span className="text-apagado">(exhibición o anaquel, aunque haya varias piezas)</span>
                </span>
              </label>
            </div>
          </div>

          {/* Vista previa */}
          <div className="flex min-h-[280px] flex-col gap-3.5 bg-[#f3efe8] px-6 py-5">
            <div className="text-sm font-bold tracking-[.4px] text-apagado">VISTA PREVIA</div>
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              {vista && f.tamano === "grande" && (
                <>
                  <VistaEtiqueta diseno={GRANDE} etiquetas={[vista]} anchoPx={266} className="drop-shadow" />
                  <div className="text-sm font-semibold text-texto-2">38 × 25 mm</div>
                </>
              )}
              {vista && f.tamano === "chica" && (
                <>
                  <VistaEtiqueta diseno={CHICA} etiquetas={[vista, vista, vista]} anchoPx={360} className="w-full max-w-[360px] drop-shadow" />
                  <div className="text-sm font-semibold text-texto-2">27 × 13 mm · se imprimen 3 por hilera</div>
                </>
              )}
              {!vista && <div className="max-w-[240px] text-center text-base text-apagado">Elige un tamaño para ver cómo sale la etiqueta.</div>}
              {vista && <div className="text-[13px] text-apagado">Se imprime en blanco y negro.</div>}
            </div>
          </div>
        </div>

        <div className="flex flex-none flex-wrap items-center gap-3 border-t border-borde px-6 py-4">
          <div className="flex-[1_1_240px] text-[15px] text-texto-2">
            {errorServidor ? (
              <span className="font-semibold text-enlace">{errorServidor}</span>
            ) : (
              <>
                Quedará como <b className="text-enlace">pendiente de dar de alta en Multicomercio</b>.
              </>
            )}
          </div>
          <button type="button" onClick={onCerrar} className="h-14 rounded-[14px] border border-borde-input bg-white px-5 text-[17px] font-semibold text-texto-2 hover:bg-fondo">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void guardar()}
            disabled={guardando}
            className="h-14 rounded-[14px] bg-acento px-6 text-lg font-bold text-white hover:bg-acento-hover disabled:opacity-60"
          >
            {guardando ? "Guardando…" : "Guardar y agregar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MensajeError({ children }: { children: React.ReactNode }) {
  return <span className="text-sm font-semibold text-enlace">{children}</span>;
}

function OpcionTamano({ t, activo, onClick }: { t: Tamano; activo: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`flex flex-col gap-2.5 rounded-2xl border-[3px] p-3.5 text-left text-tinta ${activo ? "border-tinta bg-fondo" : "border-borde bg-white hover:border-borde-input"}`}
    >
      <div className="flex h-[58px] items-center gap-[3px]">
        {t === "grande" ? (
          <div className="flex h-[53px] w-20 flex-col gap-[3px] rounded border-2 border-tinta bg-white px-1.5 py-[5px]">
            <div className="h-[3px] w-[70%] rounded-sm bg-tinta" />
            <div className="h-[9px] w-[55%] rounded-sm bg-tinta" />
            <div className="flex-1 bg-[repeating-linear-gradient(90deg,#111_0_2px,#fff_2px_3px,#111_3px_4px,#fff_4px_6px)]" />
          </div>
        ) : (
          [0, 1, 2].map((i) => (
            <div key={i} className="flex h-[19px] w-[38px] flex-col gap-0.5 rounded-[3px] border-2 border-tinta bg-white px-[3px] py-0.5">
              <div className="h-1 w-[60%] bg-tinta" />
              <div className="flex-1 bg-[repeating-linear-gradient(90deg,#111_0_1px,#fff_1px_2px)]" />
            </div>
          ))
        )}
      </div>
      <div>
        <div className="text-lg font-bold">{t === "grande" ? "Grande" : "Chica"}</div>
        <div className="text-[13px] leading-snug text-apagado">{t === "grande" ? "38 × 25 mm · nombre, precio y código" : "27 × 13 mm · precio y código, 3 por hilera"}</div>
      </div>
    </button>
  );
}
