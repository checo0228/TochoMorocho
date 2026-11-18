"use client";
import { generarPdf, type Etiqueta } from "./pdf";
import type { DisenoEtiqueta } from "./spec";

const dos = (n: number) => String(n).padStart(2, "0");

export function nombreArchivo(d: DisenoEtiqueta, parte?: { i: number; de: number }) {
  const f = new Date();
  const base = `etiquetas-${d.clase === "grande" ? "grandes" : "chicas"}-${f.getFullYear()}${dos(f.getMonth() + 1)}${dos(f.getDate())}-${dos(f.getHours())}${dos(f.getMinutes())}`;
  return parte && parte.de > 1 ? `${base}-parte-${parte.i}-de-${parte.de}.pdf` : `${base}.pdf`;
}

/** Genera el PDF en el navegador y lo descarga. */
export async function descargarPdf(d: DisenoEtiqueta, etiquetas: Etiqueta[], archivo: string) {
  // deja pintar el "Generando…" antes del trabajo pesado
  await new Promise((r) => setTimeout(r, 30));
  const doc = generarPdf(d, etiquetas, archivo.replace(/\.pdf$/, ""));
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = archivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
