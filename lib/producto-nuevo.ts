import { CODIGO_VALIDO, limpiarCodigo, MENSAJE_CODIGO } from "./codigo";
import { cabeCodigo } from "./etiquetas/code128";
import { CHICA, GRANDE } from "./etiquetas/spec";
import type { Producto, Tamano } from "./tipos";

export interface FormProducto {
  codigo: string;
  nombre: string;
  precio: string;
  categoria: string;
  tamano: Tamano | null;
  etiquetaUnica: boolean;
}

export interface ErroresProducto {
  codigo?: string;
  nombre?: string;
  precio?: string;
  categoria?: string;
  tamano?: string;
}

/** "1,234.50" / "62.9999" / "$ 15" → número con 2 decimales, o null si no es válido. */
export function leerPrecio(texto: string): number | null {
  const t = texto.replace(/[$\s]/g, "").replace(/,/g, "");
  if (!/^\d+(\.\d*)?$|^\.\d+$/.test(t)) return null;
  const n = Math.round((Number(t) + Number.EPSILON) * 100) / 100;
  return Number.isFinite(n) && n >= 0 && n < 100_000_000 ? n : null;
}

/** Deja solo letras y números (lo que sí lee bien el escáner). */
export const soloAlfanumerico = (c: string) => c.replace(/[^0-9A-Za-z]/g, "");

export function validarProducto(f: FormProducto, existe: (codigo: string) => Producto | undefined): ErroresProducto {
  const e: ErroresProducto = {};
  const r = limpiarCodigo(f.codigo);
  if (!r.ok) e.codigo = r.motivo === "vacio" ? "Falta el código." : MENSAJE_CODIGO[r.motivo];
  else if (existe(r.codigo)) e.codigo = "Este código ya existe.";
  else if (f.tamano) {
    const d = f.tamano === "grande" ? GRANDE : CHICA;
    if (!cabeCodigo(r.codigo, d.barras.modulos, d.barras.anchoMax))
      e.codigo = `El código es demasiado largo para la etiqueta ${f.tamano}.${f.tamano === "chica" ? " Usa grande." : ""}`;
  }
  if (!f.nombre.trim()) e.nombre = "Falta el nombre.";
  if (!f.precio.trim()) e.precio = "Falta el precio.";
  else if (leerPrecio(f.precio) === null) e.precio = "Escribe el precio con números, por ejemplo 149.50.";
  if (!f.categoria.trim()) e.categoria = "Elige una categoría.";
  if (!f.tamano) e.tamano = "Elige Grande o Chica.";
  return e;
}

export const hayErrores = (e: ErroresProducto) => Object.values(e).some(Boolean);
export { CODIGO_VALIDO };
