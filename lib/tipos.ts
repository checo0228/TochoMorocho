import type { Tamano } from "./catalogo-csv";

export type { Tamano };

/** Producto como lo usa la app (columnas de public.productos). */
export interface Producto {
  codigo: string;
  nombre: string;
  precio: number;
  categoria: string | null;
  tamano: Tamano | null;
  activo: boolean;
  etiqueta_unica: boolean;
  pendiente_multicomercio: boolean;
  /** Escondido en la app (no se borra). */
  oculto?: boolean;
  /** Lo último que dijo Multicomercio (null en productos creados en la app). */
  nombre_mc?: string | null;
  precio_mc?: number | null;
  categoria_mc?: string | null;
}

/** El producto viene de Multicomercio pero se cambió el nombre, el precio o la categoría en la app. */
export const editadoEnApp = (p: Producto) =>
  !p.pendiente_multicomercio &&
  p.nombre_mc != null &&
  (p.nombre !== p.nombre_mc || (p.precio_mc != null && Number(p.precio) !== Number(p.precio_mc)) || (p.categoria ?? null) !== (p.categoria_mc ?? null));

export interface RenglonLista {
  codigo: string;
  cantidad: number;
  created_at: string;
}

export const COLUMNAS_PRODUCTO =
  "codigo,nombre,precio,categoria,tamano,activo,etiqueta_unica,pendiente_multicomercio,oculto,nombre_mc,precio_mc,categoria_mc" as const;
