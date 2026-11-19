"use client";

import { memo, useState } from "react";
import { formatoPrecio } from "@/lib/etiquetas/spec";
import { leerPrecio } from "@/lib/producto-nuevo";
import type { CambiosProducto } from "@/lib/datos";
import type { Producto, Tamano } from "@/lib/tipos";

interface Props {
  p: Producto;
  enLista: number;
  onCambiar: (codigo: string, cambios: CambiosProducto) => void;
  onAgregar: (p: Producto) => void;
}

/**
 * Nombre y precio solo se editan en productos creados aquí (pendientes): en los demás manda
 * Multicomercio, y un cambio aquí no llegaría a caja (y al sincronizar se marcaría como código reutilizado).
 */
function RenglonCatalogo({ p, enLista, onCambiar, onAgregar }: Props) {
  const editable = p.pendiente_multicomercio;
  const [nombre, setNombre] = useState<string | null>(null);
  const [precio, setPrecio] = useState<string | null>(null);

  const guardarNombre = () => {
    if (nombre !== null && nombre.trim() && nombre.trim() !== p.nombre) onCambiar(p.codigo, { nombre: nombre.trim() });
    setNombre(null);
  };
  const guardarPrecio = () => {
    const n = precio !== null ? leerPrecio(precio) : null;
    if (n !== null && n !== p.precio) onCambiar(p.codigo, { precio: n });
    setPrecio(null);
  };
  const enter = (e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && e.currentTarget.blur();

  const tamano = (t: Tamano) => (
    <button
      type="button"
      onClick={() => p.tamano !== t && onCambiar(p.codigo, { tamano: t })}
      aria-pressed={p.tamano === t}
      className={`h-10 rounded-[9px] px-3.5 text-[15px] font-bold ${p.tamano === t ? "bg-tinta text-white" : "text-texto-2 hover:bg-white"}`}
    >
      {t === "grande" ? "Grande" : "Chica"}
    </button>
  );

  return (
    <li className={`flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-2xl border border-borde bg-white py-3 pl-[18px] pr-3.5 ${p.activo ? "" : "opacity-60"}`}>
      <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-0.5">
        {editable ? (
          <input
            value={nombre ?? p.nombre}
            onChange={(e) => setNombre(e.target.value)}
            onBlur={guardarNombre}
            onKeyDown={enter}
            aria-label={`Nombre de ${p.codigo}`}
            className="-ml-2.5 h-[42px] w-full rounded-[10px] border-2 border-transparent bg-transparent px-2 text-lg font-semibold text-tinta outline-none hover:border-borde focus:border-tinta"
          />
        ) : (
          <div className="py-1.5 text-lg font-semibold leading-tight">{p.nombre || <span className="text-apagado">(sin nombre)</span>}</div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-apagado">{p.codigo}</span>
          <span className="text-[13px] text-apagado">· {p.categoria ?? "Sin categoría"}</span>
          {p.pendiente_multicomercio && <Etiq tono="rojo">Pendiente en Multicomercio</Etiq>}
          {!p.activo && <Etiq tono="gris">Inactivo</Etiq>}
          {!p.tamano && <Etiq tono="rojo">Sin tamaño</Etiq>}
        </div>
      </div>

      {editable ? (
        <div className="relative flex-[0_0_120px]">
          <span className="absolute inset-y-0 left-3 flex items-center text-lg font-semibold text-apagado">$</span>
          <input
            value={precio ?? p.precio.toFixed(2)}
            onChange={(e) => setPrecio(e.target.value)}
            onBlur={guardarPrecio}
            onKeyDown={enter}
            inputMode="decimal"
            aria-label={`Precio de ${p.codigo}`}
            className="h-12 w-full rounded-xl border-2 border-borde bg-white pl-7 pr-2.5 text-lg font-bold text-tinta outline-none focus:border-tinta"
          />
        </div>
      ) : (
        <div className="flex-[0_0_120px] text-right text-lg font-bold" title="El precio se cambia en Multicomercio">
          {formatoPrecio(p.precio).replace("$ ", "$")}
        </div>
      )}

      <div className="flex gap-1 rounded-xl bg-[#f3efe8] p-1">
        {tamano("grande")}
        {tamano("chica")}
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-texto-2" title="Exhibición o anaquel: 1 etiqueta aunque haya varias piezas">
        <input
          type="checkbox"
          checked={p.etiqueta_unica}
          onChange={(e) => onCambiar(p.codigo, { etiqueta_unica: e.target.checked })}
          className="size-5 accent-[#111]"
        />
        1 etiqueta
      </label>

      <button
        type="button"
        onClick={() => onAgregar(p)}
        className={`h-12 min-w-[200px] rounded-xl border-2 border-tinta px-4 text-base font-bold ${enLista > 0 ? "bg-white text-tinta" : "bg-tinta text-white"}`}
      >
        {enLista > 0 ? `En la impresión · ${enLista}` : "Agregar a impresión"}
      </button>
    </li>
  );
}

function Etiq({ tono, children }: { tono: "rojo" | "gris"; children: React.ReactNode }) {
  return (
    <span className={`rounded-md px-2 py-[3px] text-xs font-bold ${tono === "rojo" ? "bg-suave text-enlace" : "bg-chip text-texto-2"}`}>{children}</span>
  );
}

export default memo(RenglonCatalogo);
