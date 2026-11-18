import type { Producto } from "./tipos";

/** minúsculas, sin acentos, espacios simples */
export const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export interface IndiceProductos {
  porCodigo: Map<string, Producto>;
  /** [nombre normalizado, producto] */
  nombres: [string, Producto][];
}

export function indexar(productos: Producto[]): IndiceProductos {
  return {
    porCodigo: new Map(productos.map((p) => [p.codigo.toUpperCase(), p])),
    nombres: productos.map((p) => [normalizar(p.nombre), p]),
  };
}

/** Busca por código exacto (sin importar mayúsculas). */
export const buscarCodigo = (i: IndiceProductos, codigo: string) => i.porCodigo.get(codigo.trim().toUpperCase());

/**
 * Sugerencias por nombre o código. Todas las palabras deben aparecer en el nombre.
 * Orden: código exacto, código que empieza igual, nombre que empieza igual, activos primero.
 */
export function sugerir(i: IndiceProductos, consulta: string, max = 8): Producto[] {
  const q = normalizar(consulta);
  if (!q) return [];
  const palabras = q.split(" ");
  const qCodigo = consulta.replace(/\s+/g, "").toUpperCase();
  const puntuados: [number, Producto][] = [];
  for (const [nombre, p] of i.nombres) {
    const cod = p.codigo.toUpperCase();
    let puntos = -1;
    if (cod === qCodigo) puntos = 100;
    else if (qCodigo.length >= 2 && cod.startsWith(qCodigo)) puntos = 60;
    else if (nombre && palabras.every((w) => nombre.includes(w))) {
      puntos = nombre.startsWith(q) ? 50 : palabras.some((w) => nombre.split(" ").some((n) => n.startsWith(w))) ? 40 : 30;
    }
    if (puntos < 0) continue;
    if (!p.activo) puntos -= 20;
    puntos -= Math.min(nombre.length, 40) / 100; // los nombres cortos primero
    puntuados.push([puntos, p]);
  }
  return puntuados
    .sort((a, b) => b[0] - a[0])
    .slice(0, max)
    .map(([, p]) => p);
}
