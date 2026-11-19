/**
 * Compara el Excel de productos de Multicomercio contra la base de datos (CLAUDE.md → Detección de cambios).
 *
 * Se compara contra lo último que dijo Multicomercio (nombre_mc / precio_mc / categoria_mc), no contra lo
 * editado en la app: así una edición hecha aquí no se confunde con un código reutilizado.
 * Multicomercio manda: al aplicar, todo queda como dice el Excel.
 */
import type { ProductoMC } from "../multicomercio/productos";
import type { Producto, Tamano } from "../tipos";

export type TipoCambio =
  | "nuevo" // código que no existía
  | "reutilizado" // el código ahora es OTRO producto (cambió el nombre) → etiquetas viejas inválidas
  | "movido" // el producto pasó a otro código (su código viejo quedó con otro nombre o sin nombre)
  | "sinNombre" // quedó sin nombre (descontinuado / pendiente)
  | "precio" // solo cambió el precio → reimprimir todas las piezas
  | "desaparecido" // ya no viene → inactivo (no se borra)
  | "activo" // cambió activo / inactivo
  | "categoria" // cambió de categoría (se actualiza solo)
  | "editadoApp" // se había editado en la app; vuelve a lo de Multicomercio
  | "dadoDeAlta"; // se creó en la app y ya existe en Multicomercio (deja de estar pendiente)

/** Fila final que se escribe en la BD. */
export interface FilaSync {
  codigo: string;
  nombre: string;
  precio: number;
  categoria: string | null;
  activo: boolean;
  tamano: Tamano | null;
  etiqueta_unica: boolean;
  oculto: boolean;
  pendiente_multicomercio: boolean;
  nombre_mc: string;
  precio_mc: number;
  categoria_mc: string | null;
}

export interface CambioProducto {
  codigo: string;
  tipos: TipoCambio[];
  antes?: Producto;
  despues: FilaSync;
  /** Para "movido": de qué código(s) venía. */
  movidoDe?: string[];
  /** Hay que imprimir etiqueta nueva. */
  imprimir: boolean;
}

export interface ResultadoSync {
  cambios: CambioProducto[];
  /** Códigos que ya no vienen en el Excel (se marcan inactivos). */
  desaparecidos: Producto[];
  porTipo: Record<TipoCambio, CambioProducto[]>;
  /** Total leído del Excel. */
  leidos: number;
}

const TIPOS: TipoCambio[] = ["nuevo", "reutilizado", "movido", "sinNombre", "precio", "desaparecido", "activo", "categoria", "editadoApp", "dadoDeAlta"];

const t = (s: string | null | undefined) => (s ?? "").trim();
const mismoPrecio = (a: number | null | undefined, b: number | null | undefined) => Math.round(Number(a ?? 0) * 100) === Math.round(Number(b ?? 0) * 100);

/** Lo último que dijo Multicomercio de este producto. */
const delMC = (p: Producto) => ({
  nombre: t(p.nombre_mc ?? p.nombre),
  precio: p.precio_mc ?? p.precio,
  categoria: p.categoria_mc !== undefined ? p.categoria_mc : p.categoria,
});

export function compararConMulticomercio(actuales: Producto[], excel: ProductoMC[]): ResultadoSync {
  const db = new Map(actuales.map((p) => [p.codigo, p]));
  const mc = new Map(excel.map((p) => [p.codigo, p]));

  // nombre (según Multicomercio) → códigos que lo tenían; tolera nombres repetidos
  const codigosPorNombre = new Map<string, string[]>();
  for (const p of actuales) {
    if (p.pendiente_multicomercio) continue;
    const n = delMC(p).nombre;
    if (!n) continue;
    codigosPorNombre.set(n, [...(codigosPorNombre.get(n) ?? []), p.codigo]);
  }
  /** ¿El nombre N lo tenía otro código que en el Excel ya no lo tiene? → el producto se movió de ahí. */
  const origenMovido = (codigo: string, nombre: string): string[] => {
    if (!nombre) return [];
    return (codigosPorNombre.get(nombre) ?? []).filter((y) => y !== codigo && t(mc.get(y)?.nombre) !== nombre);
  };

  const cambios: CambioProducto[] = [];

  for (const e of excel) {
    const p = db.get(e.codigo);
    const base: FilaSync = {
      codigo: e.codigo,
      nombre: e.nombre,
      precio: e.precio,
      categoria: e.categoria || null,
      activo: e.activo,
      tamano: p?.tamano ?? null,
      etiqueta_unica: p?.etiqueta_unica ?? false,
      oculto: p?.oculto ?? false,
      pendiente_multicomercio: false,
      nombre_mc: e.nombre,
      precio_mc: e.precio,
      categoria_mc: e.categoria || null,
    };
    const tipos: TipoCambio[] = [];
    let movidoDe: string[] | undefined;

    if (!p) {
      tipos.push("nuevo");
      const origen = origenMovido(e.codigo, e.nombre);
      if (origen.length) {
        tipos.push("movido");
        movidoDe = origen;
        const viejo = db.get(origen[0])!;
        base.tamano = viejo.tamano;
        base.etiqueta_unica = viejo.etiqueta_unica;
      }
    } else if (p.pendiente_multicomercio) {
      tipos.push("dadoDeAlta");
      if (t(p.nombre) !== e.nombre || !mismoPrecio(p.precio, e.precio)) tipos.push(t(p.nombre) !== e.nombre ? "editadoApp" : "precio");
    } else {
      const ant = delMC(p);
      if (ant.nombre !== e.nombre) {
        if (!e.nombre) {
          tipos.push("sinNombre"); // descontinuado: se queda con su tamaño
        } else {
          const origen = origenMovido(e.codigo, e.nombre);
          if (origen.length) {
            tipos.push("movido");
            movidoDe = origen;
            const viejo = db.get(origen[0])!;
            base.tamano = viejo.tamano;
            base.etiqueta_unica = viejo.etiqueta_unica;
          } else {
            tipos.push("reutilizado");
            base.tamano = null;
            base.etiqueta_unica = false;
          }
          base.oculto = false; // es otro producto: no hereda el "oculto"
        }
      } else if (!mismoPrecio(ant.precio, e.precio)) {
        tipos.push("precio");
      }
      if (p.activo !== e.activo) tipos.push("activo");
      if (t(ant.categoria) !== t(e.categoria)) tipos.push("categoria");
      // editado en la app y Multicomercio no lo cambió → se regresa a lo de Multicomercio
      const mcIgual = ant.nombre === e.nombre && mismoPrecio(ant.precio, e.precio) && t(ant.categoria) === t(e.categoria);
      const appDistinto = t(p.nombre) !== ant.nombre || !mismoPrecio(p.precio, ant.precio) || t(p.categoria) !== t(ant.categoria);
      if (mcIgual && appDistinto) tipos.push("editadoApp");
    }

    if (tipos.length === 0) continue;
    const imprimir = e.activo && tipos.some((x) => x === "nuevo" || x === "reutilizado" || x === "movido" || x === "precio");
    cambios.push({ codigo: e.codigo, tipos, antes: p, despues: base, movidoDe, imprimir });
  }

  const desaparecidos = actuales.filter((p) => !p.pendiente_multicomercio && p.activo && !mc.has(p.codigo));

  const porTipo = Object.fromEntries(TIPOS.map((x) => [x, [] as CambioProducto[]])) as Record<TipoCambio, CambioProducto[]>;
  for (const c of cambios) for (const x of c.tipos) porTipo[x].push(c);
  for (const p of desaparecidos)
    porTipo.desaparecido.push({
      codigo: p.codigo,
      tipos: ["desaparecido"],
      antes: p,
      despues: {
        codigo: p.codigo,
        nombre: p.nombre,
        precio: p.precio,
        categoria: p.categoria,
        activo: false,
        tamano: p.tamano,
        etiqueta_unica: p.etiqueta_unica,
        oculto: p.oculto ?? false,
        pendiente_multicomercio: false,
        nombre_mc: delMC(p).nombre,
        precio_mc: delMC(p).precio,
        categoria_mc: delMC(p).categoria ?? null,
      },
      imprimir: false,
    });

  return { cambios, desaparecidos, porTipo, leidos: excel.length };
}

/** Todo lo que hay que escribir (cambios + desaparecidos). */
export const filasAEscribir = (r: ResultadoSync): FilaSync[] => [...r.cambios.map((c) => c.despues), ...r.porTipo.desaparecido.map((c) => c.despues)];
