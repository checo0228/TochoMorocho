import * as XLSX from "xlsx";
import { CODIGO_VALIDO, normalizarNombre } from "../codigo";

/** Un producto tal como viene en el Excel de productos de Multicomercio. */
export interface ProductoMC {
  codigo: string;
  nombre: string;
  precio: number;
  categoria: string;
  activo: boolean;
}

export interface LecturaProductosMC {
  productos: ProductoMC[];
  /** Filas con código inválido (guion, espacios…) o repetido: no se importan. */
  rechazados: { fila: number; codigo: string; motivo: string }[];
}

const quitarAcentos = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const RE_CATEGORIA = /^categor[ií]a\s*:\s*(.*?)\s*\(count=\d+\)\s*$/i;

/** Precio 1 puede venir como 62.9999 → se redondea a 2 decimales. */
export const redondear2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function aBooleano(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  const t = quitarAcentos(String(v ?? ""));
  return t === "verdadero" || t === "true" || t === "1" || t === "si";
}

/**
 * Lee el Excel de productos de Multicomercio. Las columnas se buscan por encabezado
 * en la fila 0 (la exportación cambia de orden). El nombre va en la columna siguiente a "Artículo".
 */
export function leerProductosMC(datos: ArrayBuffer | Uint8Array): LecturaProductosMC {
  const libro = XLSX.read(datos, { type: "array" });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  const crudo = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, raw: true, defval: null });
  const texto = XLSX.utils.sheet_to_json<string[]>(hoja, { header: 1, raw: false, defval: "" });
  if (crudo.length === 0) throw new Error("El archivo está vacío.");

  const encabezados = (crudo[0] ?? []).map((h) => quitarAcentos(String(h ?? "")));
  const col = (nombre: string) => {
    const i = encabezados.indexOf(nombre);
    if (i < 0) throw new Error(`No encontré la columna "${nombre}". ¿Es el Excel de productos de Multicomercio?`);
    return i;
  };
  const iArticulo = col("articulo");
  const iNombre = iArticulo + 1;
  const iCodigo = col("codigo");
  const iPrecio = col("precio 1");
  const iActivo = col("activo");

  const productos: ProductoMC[] = [];
  const rechazados: LecturaProductosMC["rechazados"] = [];
  const vistos = new Set<string>();
  let categoria = "";

  for (let f = 1; f < crudo.length; f++) {
    const fila = crudo[f] ?? [];
    const b = fila[iNombre];
    const m = typeof b === "string" ? b.match(RE_CATEGORIA) : null;
    if (m) {
      categoria = m[1].trim();
      continue;
    }
    const precio = fila[iPrecio];
    if (precio == null || precio === "" || Number.isNaN(Number(precio))) continue; // fila sin precio = basura

    const codigo = String(texto[f]?.[iCodigo] ?? fila[iCodigo] ?? "").trim();
    if (!CODIGO_VALIDO.test(codigo)) {
      rechazados.push({ fila: f + 1, codigo, motivo: "Código con guion, espacio o símbolo" });
      continue;
    }
    if (vistos.has(codigo)) {
      rechazados.push({ fila: f + 1, codigo, motivo: "Código repetido en el archivo" });
      continue;
    }
    vistos.add(codigo);
    productos.push({
      codigo,
      nombre: normalizarNombre(b),
      precio: redondear2(Number(precio)),
      categoria,
      activo: aBooleano(fila[iActivo]),
    });
  }
  return { productos, rechazados };
}
