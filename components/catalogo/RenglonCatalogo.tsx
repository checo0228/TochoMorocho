"use client";

import { memo } from "react";
import { formatoPrecio } from "@/lib/etiquetas/spec";
import type { CambiosProducto } from "@/lib/datos";
import { editadoEnApp, type Producto, type Tamano } from "@/lib/tipos";

interface Props {
  p: Producto;
  enLista: number;
  onCambiar: (codigo: string, cambios: CambiosProducto) => void;
  onAgregar: (p: Producto) => void;
  onEditar: (p: Producto) => void;
}

/** Tamaño y "1 etiqueta" se cambian aquí mismo; lo demás en la ventana Editar. */
function RenglonCatalogo({ p, enLista, onCambiar, onAgregar, onEditar }: Props) {
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
    <li className={`flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-2xl border border-borde bg-white py-3 pl-[18px] pr-3.5 ${p.activo && !p.oculto ? "" : "opacity-60"}`}>
      <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-0.5">
        <div className="py-1 text-lg font-semibold leading-tight">{p.nombre || <span className="text-apagado">(sin nombre)</span>}</div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-apagado">{p.codigo}</span>
          <span className="text-[13px] text-apagado">· {p.categoria ?? "Sin categoría"}</span>
          {p.pendiente_multicomercio && <Etiq tono="rojo">Pendiente en Multicomercio</Etiq>}
          {editadoEnApp(p) && <Etiq tono="rojo">Editado en la app</Etiq>}
          {p.oculto && <Etiq tono="gris">Oculto</Etiq>}
          {!p.activo && <Etiq tono="gris">Inactivo</Etiq>}
          {!p.tamano && <Etiq tono="rojo">Sin tamaño</Etiq>}
        </div>
      </div>

      <div className="flex-[0_0_110px] text-right text-lg font-bold">{formatoPrecio(p.precio).replace("$ ", "$")}</div>

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

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onEditar(p)}
          className="h-12 rounded-xl border-2 border-borde-input bg-white px-4 text-base font-semibold text-texto-2 hover:border-tinta hover:text-tinta"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={() => onAgregar(p)}
          className={`h-12 min-w-[200px] rounded-xl border-2 border-tinta px-4 text-base font-bold ${enLista > 0 ? "bg-white text-tinta" : "bg-tinta text-white"}`}
        >
          {enLista > 0 ? `En la impresión · ${enLista}` : "Agregar a impresión"}
        </button>
      </div>
    </li>
  );
}

function Etiq({ tono, children }: { tono: "rojo" | "gris"; children: React.ReactNode }) {
  return (
    <span className={`rounded-md px-2 py-[3px] text-xs font-bold ${tono === "rojo" ? "bg-suave text-enlace" : "bg-chip text-texto-2"}`}>{children}</span>
  );
}

export default memo(RenglonCatalogo);
