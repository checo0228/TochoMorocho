import { indexar, normalizar, sugerir } from "./buscar";
import type { Producto } from "./tipos";

export interface FiltrosCatalogo {
  q: string;
  categoria: string; // "" = todas
  tamano: "todos" | "grande" | "chica" | "sin";
  estado: "activos" | "inactivos" | "todos";
  pendientes: boolean;
}

export const FILTROS_INICIALES: FiltrosCatalogo = { q: "", categoria: "", tamano: "todos", estado: "activos", pendientes: false };

export const hayFiltro = (f: FiltrosCatalogo) =>
  f.q.trim() !== "" || f.categoria !== "" || f.tamano !== "todos" || f.estado !== "activos" || f.pendientes;

/**
 * Aplica los filtros. Con búsqueda, ordena por relevancia; sin búsqueda, por categoría y nombre.
 * `mantener`: códigos que siguen visibles aunque ya no pasen el filtro de tamaño (recién asignados).
 */
export function filtrarCatalogo(productos: Producto[], f: FiltrosCatalogo, mantener?: Set<string>): Producto[] {
  const pasa = (p: Producto) =>
    (f.categoria === "" || p.categoria === f.categoria) &&
    (f.tamano === "todos" || (f.tamano === "sin" ? !p.tamano : p.tamano === f.tamano) || !!mantener?.has(p.codigo)) &&
    (f.estado === "todos" || (f.estado === "activos" ? p.activo : !p.activo)) &&
    (!f.pendientes || p.pendiente_multicomercio);

  if (f.q.trim()) {
    const base = productos.filter(pasa);
    return sugerir(indexar(base), f.q, base.length);
  }
  return productos
    .filter(pasa)
    .sort(
      (a, b) =>
        (a.categoria ?? "").localeCompare(b.categoria ?? "", "es") ||
        normalizar(a.nombre || "~").localeCompare(normalizar(b.nombre || "~"), "es") ||
        a.codigo.localeCompare(b.codigo, "es", { numeric: true }),
    );
}

/** Qué pasaría al mandar a imprimir un grupo: solo activos con tamaño. */
export function separarParaImprimir(productos: Producto[]) {
  const imprimibles = productos.filter((p) => p.activo && p.tamano);
  return {
    imprimibles,
    sinTamano: productos.filter((p) => p.activo && !p.tamano).length,
    inactivos: productos.filter((p) => !p.activo).length,
  };
}
