import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { leerCatalogoCSV } from "../lib/catalogo-csv";
import { CODIGO_VALIDO } from "../lib/codigo";

const catalogo = leerCatalogoCSV(readFileSync("data/catalogo.csv", "utf8"));

describe("data/catalogo.csv (carga inicial, al 17 nov 2026)", () => {
  it("tiene los conteos esperados", () => {
    expect(catalogo).toHaveLength(1168);
    expect(catalogo.filter((f) => f.tamano === "grande")).toHaveLength(885);
    expect(catalogo.filter((f) => f.tamano === "chica")).toHaveLength(269);
    expect(catalogo.filter((f) => !f.tamano)).toHaveLength(14);
    expect(catalogo.filter((f) => !f.activo)).toHaveLength(11);
    expect(catalogo.filter((f) => f.etiqueta_unica)).toHaveLength(12);
  });

  it("todos los códigos son válidos y únicos", () => {
    expect(catalogo.filter((f) => !CODIGO_VALIDO.test(f.codigo))).toEqual([]);
    expect(new Set(catalogo.map((f) => f.codigo)).size).toBe(catalogo.length);
  });

  it("códigos reutilizados con su tamaño nuevo (859 bocina roja grande, 746 estrellota chica)", () => {
    expect(catalogo.find((f) => f.codigo === "859")).toMatchObject({ nombre: "bocina roja", tamano: "grande" });
    expect(catalogo.find((f) => f.codigo === "746")).toMatchObject({ nombre: "estrellota", tamano: "chica" });
    expect(catalogo.find((f) => f.codigo === "327")?.tamano).toBeNull(); // papel navideño: sin etiqueta
  });

  it("los productos que siguen igual conservan su tamaño", () => {
    expect(catalogo.find((f) => f.codigo === "869")).toMatchObject({ nombre: "gorro navidad", tamano: expect.any(String) });
    expect(catalogo.find((f) => f.codigo === "802")).toMatchObject({ nombre: "inflable", precio: 1400 });
  });
});
