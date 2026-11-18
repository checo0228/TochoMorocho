"use client";

import { forwardRef, useState } from "react";
import Icono from "@/components/Icono";
import { formatoPrecio } from "@/lib/etiquetas/spec";
import type { Producto } from "@/lib/tipos";

interface Props {
  valor: string;
  onCambio: (v: string) => void;
  /** Enter: con una sugerencia elegida se manda esa; si no, el texto tal cual. */
  onEnviar: (texto: string, elegido?: Producto) => void;
  sugerencias: Producto[];
  enfocado: boolean;
  onEnfoque: (v: boolean) => void;
  /** Botón de cámara (solo celular). */
  accionCamara?: React.ReactNode;
}

const chip = (p: Producto) =>
  p.tamano === "grande"
    ? { txt: "Grande", cls: "bg-tinta text-white" }
    : p.tamano === "chica"
      ? { txt: "Chica", cls: "bg-[#f3efe8] text-tinta" }
      : { txt: "Sin tamaño", cls: "bg-suave text-enlace" };

const Buscador = forwardRef<HTMLInputElement, Props>(function Buscador(
  { valor, onCambio, onEnviar, sugerencias, enfocado, onEnfoque, accionCamara },
  ref,
) {
  const [sel, setSel] = useState(-1);
  const mostrar = enfocado && valor.trim().length > 0;

  const alTeclear = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, sugerencias.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      onEnviar(valor, sel >= 0 ? sugerencias[sel] : undefined);
      setSel(-1);
    } else if (e.key === "Escape") {
      onCambio("");
      setSel(-1);
    }
  };

  return (
    <div className="relative z-10">
      <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-tinta md:left-[22px]">
        <Icono nombre="escanear" tam={28} trazo={2} />
      </div>
      <input
        ref={ref}
        value={valor}
        onChange={(e) => {
          onCambio(e.target.value);
          setSel(-1);
        }}
        onKeyDown={alTeclear}
        onFocus={() => onEnfoque(true)}
        onBlur={() => onEnfoque(false)}
        placeholder="Escanea o escribe código o nombre"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="search"
        aria-label="Escanea o escribe código o nombre"
        className={`h-16 w-full rounded-[18px] border-[3px] bg-white pl-14 text-lg font-semibold text-tinta outline-none md:h-[76px] md:pl-16 md:text-[22px] ${
          accionCamara ? "pr-16" : "pr-5"
        } ${enfocado ? "border-acento" : "border-tinta"}`}
      />
      {accionCamara && <div className="absolute inset-y-0 right-2 flex items-center">{accionCamara}</div>}

      {mostrar && (
        <div
          className="absolute inset-x-0 top-[calc(100%+8px)] overflow-hidden rounded-2xl border border-borde bg-white p-1.5 shadow-[0_18px_48px_rgba(17,17,17,.14)]"
          role="listbox"
        >
          {sugerencias.map((p, i) => {
            const c = chip(p);
            return (
              <div
                key={p.codigo}
                role="option"
                aria-selected={i === sel}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onEnviar(valor, p);
                }}
                className={`flex cursor-pointer items-center gap-3.5 rounded-xl px-3.5 py-3 ${i === sel ? "bg-fondo" : "hover:bg-fondo"}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-lg font-semibold">{p.nombre || <span className="text-apagado">(sin nombre)</span>}</div>
                  <div className="font-mono text-sm text-apagado">
                    {p.codigo}
                    {!p.activo && <span className="ml-2 font-sans font-semibold text-enlace">Inactivo</span>}
                  </div>
                </div>
                <div className="text-lg font-bold">{formatoPrecio(p.precio).replace("$ ", "$")}</div>
                <div className={`rounded-full px-2.5 py-1 text-[13px] font-bold ${c.cls}`}>{c.txt}</div>
              </div>
            );
          })}
          {sugerencias.length === 0 && (
            <div className="flex items-center gap-3 rounded-xl bg-fondo p-3.5 text-[17px] text-texto-2">
              No encontramos <b>“{valor.trim()}”</b>. Presiona Enter si es un código.
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default Buscador;
