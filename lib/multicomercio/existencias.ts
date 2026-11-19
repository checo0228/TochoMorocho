import * as XLSX from "xlsx";
import { CODIGO_VALIDO } from "../codigo";

/**
 * Reporte "Existencias por almacén" de Multicomercio (.xls que en realidad es XML SpreadsheetML de
 * FastReport). Código en la columna B, descripción en F, existencia en O (índice 14).
 * Existencias negativas o en cero cuentan como 0. Devuelve código → piezas.
 */
export function leerExistencias(datos: ArrayBuffer | Uint8Array): Map<string, number> {
  const libro = XLSX.read(datos, { type: "array" });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, raw: true, defval: null });
  const salida = new Map<string, number>();
  for (const f of filas) {
    const codigo = f[1] == null ? "" : String(f[1]).trim();
    const exist = f[14];
    if (!CODIGO_VALIDO.test(codigo) || exist == null || exist === "" || Number.isNaN(Number(exist))) continue;
    const n = Math.max(0, Math.floor(Number(exist)));
    salida.set(codigo, (salida.get(codigo) ?? 0) + n); // si un código sale en dos categorías, se suma
  }
  if (salida.size === 0) throw new Error("No encontré existencias. ¿Es el reporte de existencias de Multicomercio?");
  return salida;
}
