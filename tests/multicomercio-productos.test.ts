import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { leerProductosMC } from "../lib/multicomercio/productos";
import { leerCatalogoCSV } from "../lib/catalogo-csv";

const leer = (f: string) => leerProductosMC(readFileSync(`data/muestras/${f}`));

describe("Excel de productos de Multicomercio", () => {
  it.each([
    ["productos_2026-11-04.xlsx", 1160],
    ["productos_2026-11-13.xlsx", 1160],
    ["productos_2026-11-17.xlsx", 1168],
  ])("%s trae %i productos válidos y nada rechazado", (f, n) => {
    const { productos, rechazados } = leer(f);
    expect(productos).toHaveLength(n);
    expect(rechazados).toEqual([]);
  });

  it("lee categoría, nombre, precio y activo igual que el catálogo del 13 nov", () => {
    const { productos } = leer("productos_2026-11-13.xlsx");
    const base = new Map(leerCatalogoCSV(readFileSync("data/catalogo_2026-11-13.csv", "utf8")).map((f) => [f.codigo, f]));
    const distintos = productos.filter((p) => {
      const b = base.get(p.codigo);
      return !b || b.nombre !== p.nombre || b.precio !== p.precio || b.categoria !== p.categoria || b.activo !== p.activo;
    });
    expect(distintos).toEqual([]);
  });

  it("toma la categoría de la fila 'Categoría : NOMBRE (COUNT=n)'", () => {
    const { productos } = leer("productos_2026-11-17.xlsx");
    expect(productos.find((p) => p.codigo === "863")).toMatchObject({ nombre: "guante fosfo/negro", categoria: "TELAS" });
    expect(productos.find((p) => p.codigo === "1168")).toMatchObject({ nombre: "set construccion", precio: 398, categoria: "JUGUETES", activo: true });
  });

  it('nombre "." o vacío queda como sin nombre; "Falso" = inactivo', () => {
    const { productos } = leer("productos_2026-11-17.xlsx");
    expect(productos.find((p) => p.codigo === "2055")?.nombre).toBe("");
    expect(productos.find((p) => p.codigo === "89920")).toMatchObject({ nombre: "triptico", activo: false });
  });

  it("los precios quedan con 2 decimales", () => {
    const { productos } = leer("productos_2026-11-17.xlsx");
    expect(productos.every((p) => Math.round(p.precio * 100) === p.precio * 100)).toBe(true);
  });

  it("rechaza un archivo que no es de productos", () => {
    expect(() => leerProductosMC(readFileSync("data/muestras/llegada_ejemplo.xlsx"))).toThrow(/columna/);
  });
});
