"use client";

import { useState } from "react";
import Icono from "@/components/Icono";
import { formatoPrecio } from "@/lib/etiquetas/spec";
import type { Producto, Tamano } from "@/lib/tipos";

interface Props {
  producto: Producto;
  cantidad: number;
  esAdmin: boolean;
  resaltado: boolean;
  /** El código no cabe en la etiqueta de su tamaño. */
  noCabe: boolean;
  onCantidad: (n: number) => void;
  onQuitar: () => void;
  onTamano: (t: Tamano) => void;
}

const precio = (p: number) => formatoPrecio(p).replace("$ ", "$");

export default function RenglonImpresion({ producto: p, cantidad, esAdmin, resaltado, noCabe, onCantidad, onQuitar, onTamano }: Props) {
  // null = no se está editando: se muestra la cantidad de la lista (que puede cambiar en vivo)
  const [editando, setEditando] = useState<string | null>(null);
  const texto = editando ?? String(cantidad);

  const confirmar = () => {
    const n = Number.parseInt(texto, 10);
    if (Number.isFinite(n) && n !== cantidad) onCantidad(Math.max(0, n));
    setEditando(null);
  };

  const nombre = p.nombre || <span className="text-apagado">(sin nombre)</span>;
  const etiquetas = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[13px] text-apagado md:text-sm">{p.codigo}</span>
      {p.pendiente_multicomercio && <Etiq tono="rojo">Pendiente en Multicomercio</Etiq>}
      {!p.activo && <Etiq tono="rojo">Inactivo</Etiq>}
      {p.oculto && <Etiq tono="gris">Oculto</Etiq>}
      {p.etiqueta_unica && <Etiq tono="gris">1 etiqueta (exhibición)</Etiq>}
      {noCabe && <Etiq tono="rojo">Código muy largo para {p.tamano}</Etiq>}
    </div>
  );

  const tamano = p.tamano ? (
    <button
      type="button"
      onClick={esAdmin ? () => onTamano(p.tamano === "grande" ? "chica" : "grande") : undefined}
      disabled={!esAdmin}
      title={esAdmin ? "Toca para cambiar el tamaño" : undefined}
      className={`flex h-11 items-center gap-2 rounded-full border-2 border-tinta px-3.5 text-[15px] font-bold md:h-10 ${
        p.tamano === "grande" ? "bg-tinta text-white" : "bg-[#f3efe8] text-tinta"
      } ${esAdmin ? "cursor-pointer" : "cursor-default"}`}
    >
      {p.tamano === "grande" ? "Grande" : "Chica"}
      <span className="hidden text-[13px] font-medium opacity-70 md:inline">{p.tamano === "grande" ? "38×25" : "27×13"}</span>
    </button>
  ) : esAdmin ? (
    <div className="flex flex-col gap-1">
      <div className="hidden text-[13px] font-bold text-enlace md:block">Elige tamaño</div>
      <div className="flex gap-1.5">
        {(["grande", "chica"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onTamano(t)}
            className="h-11 rounded-[10px] border-2 border-acento bg-white px-2.5 text-sm font-bold text-tinta hover:bg-suave md:h-9"
          >
            {t === "grande" ? "Grande" : "Chica"}
          </button>
        ))}
      </div>
    </div>
  ) : (
    <div className="text-[13px] font-bold leading-tight text-enlace">
      Sin tamaño
      <br />
      <span className="font-medium">Avisa a la encargada</span>
    </div>
  );

  const contador = (
    <div className="flex items-center gap-1 md:gap-1.5">
      <BotonCant etiqueta="Menos" onClick={() => onCantidad(cantidad - 1)}>
        −
      </BotonCant>
      <input
        value={texto}
        onFocus={(e) => {
          setEditando(String(cantidad));
          e.currentTarget.select();
        }}
        onChange={(e) => setEditando(e.target.value.replace(/\D/g, "").slice(0, 5))}
        onBlur={confirmar}
        onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
        inputMode="numeric"
        aria-label={`Cantidad de ${p.nombre || p.codigo}`}
        className="h-11 w-[50px] rounded-xl border-2 border-tinta bg-white text-center text-lg font-bold text-tinta outline-none md:h-12 md:w-[58px] md:text-xl"
      />
      <BotonCant etiqueta="Más" onClick={() => onCantidad(cantidad + 1)}>
        +
      </BotonCant>
    </div>
  );

  const quitar = (
    <button
      type="button"
      onClick={onQuitar}
      aria-label={`Quitar ${p.nombre || p.codigo}`}
      title="Quitar"
      className="flex size-11 items-center justify-center rounded-xl text-apagado hover:bg-suave hover:text-enlace md:size-12"
    >
      <Icono nombre="cerrar" tam={22} />
    </button>
  );

  const fondo = resaltado ? "border-acento bg-suave" : !p.tamano || noCabe ? "border-[#f0c9bd] bg-white" : "border-borde bg-white";

  return (
    <li className={`rounded-2xl border transition-colors duration-700 ${fondo}`}>
      {/* Renglón ancho: tablet sin panel (md) y escritorio grande (xl) */}
      <div className="hidden grid-cols-[minmax(0,1fr)_110px_172px_172px_48px] items-center gap-4 py-3.5 pl-5 pr-3.5 md:grid lg:hidden xl:grid">
        <div className="flex min-w-0 flex-col gap-[3px]">
          <div className="text-lg font-semibold leading-tight">{nombre}</div>
          {etiquetas}
        </div>
        <div className="text-right text-xl font-bold">{precio(p.precio)}</div>
        <div>{tamano}</div>
        {contador}
        {quitar}
      </div>
      {/* Tarjeta: celular, y laptop con el panel de resumen al lado (lg) */}
      <div className="flex flex-col gap-2.5 p-3.5 md:hidden lg:flex xl:hidden">
        <div className="flex items-start gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="text-[17px] font-semibold leading-tight">{nombre}</div>
            <div className="mt-[3px] flex flex-wrap items-center gap-2">
              {etiquetas}
              <span className="text-base font-bold">{precio(p.precio)}</span>
            </div>
          </div>
          <div className="-mr-1.5 -mt-1.5">{quitar}</div>
        </div>
        <div className="flex items-center justify-between gap-2">
          {tamano}
          {contador}
        </div>
      </div>
    </li>
  );
}

function Etiq({ tono, children }: { tono: "rojo" | "gris"; children: React.ReactNode }) {
  return (
    <span className={`rounded-md px-2 py-[3px] text-xs font-bold ${tono === "rojo" ? "bg-suave text-enlace" : "bg-chip text-texto-2"}`}>
      {children}
    </span>
  );
}

function BotonCant({ etiqueta, onClick, children }: { etiqueta: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      className="size-11 rounded-xl border border-borde-input bg-white text-2xl font-medium leading-none text-tinta hover:bg-fondo md:size-12 md:text-[26px]"
    >
      {children}
    </button>
  );
}
