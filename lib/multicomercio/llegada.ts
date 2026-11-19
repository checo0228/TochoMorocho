import * as XLSX from "xlsx";
import { limpiarCodigo, MENSAJE_CODIGO } from "../codigo";
import type { Tamano } from "../tipos";

export interface RenglonLlegada {
  codigo: string;
  nombre: string;
  cantidad: number;
  tamano: Tamano | null;
}

const norm = (s: unknown) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/�/g, "")
    .toLowerCase()
    .trim();

/**
 * Hoja de llegada (como data/muestras/llegada_ejemplo.xlsx): Código | Nombre | Cantidad | Tamaño (g/ch) | nuevo.
 * Las columnas se buscan por encabezado. La columna "nuevo" se ignora (la sincronización ya lo sabe).
 */
export function leerLlegada(datos: ArrayBuffer | Uint8Array): { renglones: RenglonLlegada[]; rechazados: { fila: number; codigo: string; motivo: string }[] } {
  const libro = XLSX.read(datos, { type: "array" });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, raw: false, defval: "" });
  const enc = (filas[0] ?? []).map(norm);
  const col = (...nombres: string[]) => enc.findIndex((h) => nombres.some((n) => h.startsWith(n)));
  const iCod = col("codigo", "cdigo");
  const iCant = col("cantidad");
  if (iCod < 0 || iCant < 0) throw new Error("La hoja de llegada necesita las columnas Código y Cantidad.");
  const iNom = col("nombre", "descripcion");
  const iTam = col("tamano", "tamao", "tama");

  const porCodigo = new Map<string, RenglonLlegada>();
  const rechazados: { fila: number; codigo: string; motivo: string }[] = [];
  filas.slice(1).forEach((f, k) => {
    const crudo = String(f[iCod] ?? "").trim();
    if (!crudo) return;
    const r = limpiarCodigo(crudo);
    if (!r.ok) {
      rechazados.push({ fila: k + 2, codigo: crudo, motivo: r.motivo === "vacio" ? "Sin código" : MENSAJE_CODIGO[r.motivo] });
      return;
    }
    const cantidad = Math.max(0, Math.floor(Number(String(f[iCant]).replace(",", "."))));
    if (!cantidad) {
      rechazados.push({ fila: k + 2, codigo: r.codigo, motivo: "Cantidad vacía o en cero" });
      return;
    }
    const t = iTam >= 0 ? norm(f[iTam]) : "";
    const tamano: Tamano | null = t.startsWith("g") ? "grande" : t.startsWith("c") ? "chica" : null;
    const ya = porCodigo.get(r.codigo);
    if (ya) ya.cantidad += cantidad;
    else porCodigo.set(r.codigo, { codigo: r.codigo, nombre: iNom >= 0 ? String(f[iNom] ?? "").trim() : "", cantidad, tamano });
  });
  return { renglones: [...porCodigo.values()], rechazados };
}
