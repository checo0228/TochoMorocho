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
}

export interface RenglonLista {
  codigo: string;
  cantidad: number;
  created_at: string;
}

export const COLUMNAS_PRODUCTO =
  "codigo,nombre,precio,categoria,tamano,activo,etiqueta_unica,pendiente_multicomercio" as const;
