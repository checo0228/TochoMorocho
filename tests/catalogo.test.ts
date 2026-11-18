import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { leerCatalogoCSV } from "../lib/catalogo-csv";
import { CODIGO_VALIDO } from "../lib/codigo";

const catalogo = leerCatalogoCSV(readFileSync("data/catalogo.csv", "utf8"));

describe("data/catalogo.csv (carga inicial, al 17 nov 2026)", () => {
  it("tiene los conteos esperados", () => {
    expect(catalogo).toHaveLength(1168);
    expect(catalogo.filter((f) => f.tamano === "grande")).toHaveLength(854);
    expect(catalogo.filter((f) => f.tamano === "chica")).toHaveLength(268);
    expect(catalogo.filter((f) => !f.tamano)).toHaveLength(46);
    expect(catalogo.filter((f) => !f.activo)).toHaveLength(11);
    expect(catalogo.filter((f) => f.etiqueta_unica)).toHaveLength(12);
  });

  it("todos los códigos son válidos y únicos", () => {
    expect(catalogo.filter((f) => !CODIGO_VALIDO.test(f.codigo))).toEqual([]);
    expect(new Set(catalogo.map((f) => f.codigo)).size).toBe(catalogo.length);
  });

  it("los códigos reutilizados quedaron sin tamaño (859 tren madera → bocina roja)", () => {
    expect(catalogo.find((f) => f.codigo === "859")).toMatchObject({ nombre: "bocina roja", tamano: null });
  });

  it("los productos que siguen igual conservan su tamaño", () => {
    expect(catalogo.find((f) => f.codigo === "869")).toMatchObject({ nombre: "gorro navidad", tamano: expect.any(String) });
    expect(catalogo.find((f) => f.codigo === "802")).toMatchObject({ nombre: "inflable", precio: 1400 });
  });
});
