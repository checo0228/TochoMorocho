/** Lectura/escritura de data/catalogo.csv (carga inicial de la BD). */

export type Tamano = "grande" | "chica";

export interface FilaCatalogo {
  codigo: string;
  nombre: string;
  precio: number;
  categoria: string;
  tamano: Tamano | null;
  activo: boolean;
  etiqueta_unica: boolean;
}

export const COLUMNAS_CATALOGO = [
  "codigo",
  "nombre",
  "precio",
  "categoria",
  "tamano",
  "activo",
  "etiqueta_unica",
] as const;

/** Divide una línea CSV respetando comillas dobles. */
function dividirLinea(linea: string): string[] {
  const campos: string[] = [];
  let actual = "";
  let enComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (enComillas) {
      if (c === '"' && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else if (c === '"') enComillas = false;
      else actual += c;
    } else if (c === '"') enComillas = true;
    else if (c === ",") {
      campos.push(actual);
      actual = "";
    } else actual += c;
  }
  campos.push(actual);
  return campos;
}

export function leerCatalogoCSV(texto: string): FilaCatalogo[] {
  const lineas = texto.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  const enc = dividirLinea(lineas[0]);
  const i = (n: string) => {
    const k = enc.indexOf(n);
    if (k < 0) throw new Error(`catalogo.csv: falta la columna ${n}`);
    return k;
  };
  const [ic, inom, ip, icat, it, ia, iu] = COLUMNAS_CATALOGO.map(i);
  return lineas.slice(1).map((l) => {
    const c = dividirLinea(l);
    const tamano = c[it]?.trim();
    return {
      codigo: c[ic].trim(),
      nombre: (c[inom] ?? "").trim(),
      precio: Number(c[ip]),
      categoria: (c[icat] ?? "").trim(),
      tamano: tamano === "grande" || tamano === "chica" ? tamano : null,
      activo: c[ia]?.trim() === "true",
      etiqueta_unica: c[iu]?.trim() === "true",
    };
  });
}

const escapar = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function escribirCatalogoCSV(filas: FilaCatalogo[]): string {
  const cuerpo = filas.map((f) =>
    [
      f.codigo,
      escapar(f.nombre),
      f.precio.toFixed(2),
      escapar(f.categoria),
      f.tamano ?? "",
      String(f.activo),
      String(f.etiqueta_unica),
    ].join(","),
  );
  return [COLUMNAS_CATALOGO.join(","), ...cuerpo].join("\n") + "\n";
}
