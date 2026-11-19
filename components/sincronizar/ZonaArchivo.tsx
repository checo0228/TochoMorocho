"use client";

import { useRef, useState } from "react";
import Icono from "@/components/Icono";

/** Zona para soltar o elegir un archivo (Excel de Multicomercio, existencias, llegada). */
export default function ZonaArchivo({
  titulo,
  detalle,
  acepta,
  onArchivo,
  compacta,
}: {
  titulo: string;
  detalle: string;
  acepta: string;
  onArchivo: (f: File) => void;
  compacta?: boolean;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [encima, setEncima] = useState(false);
  return (
    <button
      type="button"
      onClick={() => entrada.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setEncima(true);
      }}
      onDragLeave={() => setEncima(false)}
      onDrop={(e) => {
        e.preventDefault();
        setEncima(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onArchivo(f);
      }}
      className={`flex w-full flex-col items-center gap-3 rounded-[18px] border-2 border-dashed font-sans transition-colors ${
        compacta ? "px-4 py-5" : "px-5 py-10"
      } ${encima ? "border-acento bg-[#fcf3ef]" : "border-[#cfc7ba] bg-fondo hover:border-acento hover:bg-[#fcf3ef]"}`}
    >
      <span className={`flex items-center justify-center rounded-full bg-tinta text-white ${compacta ? "size-11" : "size-[60px]"}`}>
        <Icono nombre="subir" tam={compacta ? 22 : 28} />
      </span>
      <span className={`titulo tracking-[.5px] text-tinta ${compacta ? "text-lg" : "text-2xl"}`}>{titulo}</span>
      <span className="text-base text-apagado">{detalle}</span>
      <input
        ref={entrada}
        type="file"
        accept={acepta}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onArchivo(f);
          e.target.value = "";
        }}
      />
    </button>
  );
}
