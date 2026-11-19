import type { CambioProducto } from "./diff";
import type { Tamano } from "../tipos";

export interface SugerenciaImpresion {
  codigo: string;
  nombre: string;
  tamano: Tamano | null;
  /** Piezas en existencia (null si no se subió el reporte o no viene). */
  existencia: number | null;
  /** Etiquetas sugeridas (0 = no imprimir). */
  cantidad: number;
  motivo: "nuevo" | "reutilizado" | "movido" | "precio";
}

/**
 * Qué imprimir después de sincronizar: nuevos, reutilizados, movidos y precios cambiados (solo activos).
 * Con existencias: tantas etiquetas como piezas (0 si no hay); sin existencias: 1.
 * "1 etiqueta" (exhibición) siempre 1.
 */
export function sugerirImpresion(cambios: CambioProducto[], existencias: Map<string, number> | null): SugerenciaImpresion[] {
  const orden: SugerenciaImpresion["motivo"][] = ["reutilizado", "movido", "nuevo", "precio"];
  return cambios
    .filter((c) => c.imprimir)
    .map((c) => {
      const motivo = orden.find((m) => c.tipos.includes(m)) ?? "precio";
      const existencia = existencias ? (existencias.get(c.codigo) ?? null) : null;
      const cantidad = c.despues.etiqueta_unica ? 1 : existencias ? (existencia ?? 0) : 1;
      return { codigo: c.codigo, nombre: c.despues.nombre, tamano: c.despues.tamano, existencia, cantidad, motivo };
    })
    .sort((a, b) => orden.indexOf(a.motivo) - orden.indexOf(b.motivo));
}
