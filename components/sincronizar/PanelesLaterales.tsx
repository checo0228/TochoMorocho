"use client";

import { useState } from "react";
import Icono from "@/components/Icono";
import ZonaArchivo from "./ZonaArchivo";
import { supabaseNavegador } from "@/lib/supabase/client";
import { actualizarProducto, agregarVariosALista } from "@/lib/datos";
import { bytesPendientes } from "@/lib/multicomercio/exportar";
import { leerLlegada, type RenglonLlegada } from "@/lib/multicomercio/llegada";
import { formatoPrecio } from "@/lib/etiquetas/spec";
import type { Producto } from "@/lib/tipos";

function descargar(bytes: Uint8Array, nombre: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function PanelPendientes({ productos }: { productos: Producto[] }) {
  const pendientes = productos.filter((p) => p.pendiente_multicomercio);
  const exportar = () => {
    const f = new Date();
    const dos = (n: number) => String(n).padStart(2, "0");
    descargar(bytesPendientes(pendientes), `pendientes-multicomercio-${f.getFullYear()}${dos(f.getMonth() + 1)}${dos(f.getDate())}.xlsx`);
  };
  return (
    <section className="flex flex-col gap-3.5 rounded-[20px] border border-borde bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[19px] font-bold">Pendientes de dar de alta</h2>
        <span className="titulo text-[34px] leading-none">{pendientes.length}</span>
      </div>
      <p className="text-[15px] leading-relaxed text-apagado">
        Productos que creaste aquí y aún no existen en Multicomercio. Se quitan solos cuando aparecen en el Excel.
      </p>
      {pendientes.length > 0 ? (
        <>
          <ul className="flex max-h-[260px] flex-col overflow-auto rounded-[14px] border border-borde">
            {pendientes.map((p) => (
              <li key={p.codigo} className="flex items-center gap-3 border-b border-[#f0ebe3] px-3.5 py-2.5 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold">{p.nombre}</div>
                  <div className="font-mono text-[13px] text-apagado">{p.codigo}</div>
                </div>
                <div className="text-[15px] font-bold">{formatoPrecio(p.precio).replace("$ ", "$")}</div>
              </li>
            ))}
          </ul>
          <button type="button" onClick={exportar} className="flex h-[52px] items-center justify-center gap-2 rounded-[14px] bg-tinta text-base font-bold text-white">
            <Icono nombre="descargar" tam={20} trazo={2.4} /> Exportar pendientes (.xlsx)
          </button>
          <p className="text-[13px] text-apagado">Mismo formato que el Excel de productos de Multicomercio, listo para importarlo allá.</p>
        </>
      ) : (
        <div className="rounded-[14px] bg-fondo px-4 py-3 text-[15px] text-texto-2">No hay pendientes. 🎉</div>
      )}
    </section>
  );
}

interface ResultadoLlegada {
  archivo: string;
  conocidos: { r: RenglonLlegada; p: Producto }[];
  desconocidos: RenglonLlegada[];
  rechazados: { fila: number; codigo: string; motivo: string }[];
}

/** Hoja de llegada: llena la lista de impresión con las piezas que llegaron (y el tamaño g/ch si falta). */
export function PanelLlegada({ productos }: { productos: Producto[] }) {
  const sb = supabaseNavegador();
  const [res, setRes] = useState<ResultadoLlegada | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  const leer = async (f: File) => {
    setError(null);
    setHecho(null);
    try {
      const { renglones, rechazados } = leerLlegada(new Uint8Array(await f.arrayBuffer()));
      const porCodigo = new Map(productos.map((p) => [p.codigo.toUpperCase(), p]));
      const conocidos: ResultadoLlegada["conocidos"] = [];
      const desconocidos: RenglonLlegada[] = [];
      for (const r of renglones) {
        const p = porCodigo.get(r.codigo.toUpperCase());
        if (p) conocidos.push({ r, p });
        else desconocidos.push(r);
      }
      setRes({ archivo: f.name, conocidos, desconocidos, rechazados });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer la hoja.");
    }
  };

  const tamanosNuevos = res?.conocidos.filter(({ r, p }) => !p.tamano && r.tamano) ?? [];
  const piezas = res?.conocidos.reduce((t, { r }) => t + r.cantidad, 0) ?? 0;

  const agregar = async () => {
    if (!res) return;
    setTrabajando(true);
    try {
      for (const { r, p } of tamanosNuevos) await actualizarProducto(sb, p.codigo, { tamano: r.tamano! });
      await agregarVariosALista(
        sb,
        res.conocidos.map(({ r, p }) => ({ codigo: p.codigo, cantidad: r.cantidad })),
      );
      setHecho(`${res.conocidos.length} productos (${piezas} piezas) agregados a la impresión${tamanosNuevos.length ? `; ${tamanosNuevos.length} tomaron el tamaño de la hoja` : ""}.`);
      setRes(null);
    } catch (e) {
      console.error(e);
      setError("No se pudieron agregar a la impresión.");
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <section className="flex flex-col gap-3.5 rounded-[20px] border border-borde bg-white p-6">
      <h2 className="text-[19px] font-bold">Llegó mercancía (opcional)</h2>
      <p className="text-[15px] leading-relaxed text-apagado">
        Sube la hoja de llegada (código, nombre, cantidad, tamaño g/ch) y se agregan a la impresión con sus piezas.
      </p>
      {error && <div className="rounded-[14px] bg-suave px-4 py-2.5 text-[15px] font-semibold text-[#7a2410]">{error}</div>}
      {hecho && (
        <div className="flex items-start gap-2 rounded-[14px] bg-fondo px-4 py-3 text-[15px]">
          <Icono nombre="palomita" tam={20} trazo={3} className="mt-px" />
          <span>
            {hecho}{" "}
            <a href="/imprimir" className="font-bold">
              Ir a Imprimir →
            </a>
          </span>
        </div>
      )}
      {!res ? (
        <ZonaArchivo compacta titulo="SUBIR HOJA DE LLEGADA" detalle="Archivo .xlsx" acepta=".xlsx,.xls" onArchivo={(f) => void leer(f)} />
      ) : (
        <div className="flex flex-col gap-2.5 text-[15px]">
          <div className="rounded-[14px] bg-fondo px-4 py-3">
            <b>{res.archivo}</b>: {res.conocidos.length} productos, {piezas} piezas.
            {tamanosNuevos.length > 0 && <> {tamanosNuevos.length} sin tamaño tomarán el de la hoja.</>}
          </div>
          {res.desconocidos.length > 0 && (
            <div className="rounded-[14px] bg-suave px-4 py-3 text-[#7a2410]">
              <b>No existen en el catálogo ({res.desconocidos.length}):</b> {res.desconocidos.map((r) => r.codigo).join(", ")}. Dalos de alta en Multicomercio y
              sincroniza, o créalos en Catálogo.
            </div>
          )}
          {res.rechazados.length > 0 && (
            <div className="rounded-[14px] bg-suave px-4 py-3 text-[#7a2410]">
              <b>No se pueden usar ({res.rechazados.length}):</b>{" "}
              {res.rechazados.map((r) => `${r.codigo} (${r.motivo.split(".")[0].toLowerCase()})`).join("; ")}.
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void agregar()}
              disabled={trabajando || res.conocidos.length === 0}
              className="h-[52px] flex-1 rounded-[14px] bg-acento px-5 text-base font-bold text-white hover:bg-acento-hover disabled:opacity-50"
            >
              {trabajando ? "Agregando…" : `Agregar ${res.conocidos.length} a impresión`}
            </button>
            <button type="button" onClick={() => setRes(null)} className="h-[52px] rounded-[14px] border border-borde-input px-4 font-semibold text-texto-2">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
