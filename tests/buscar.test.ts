import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buscarCodigo, indexar, normalizar, sugerir } from "../lib/buscar";
import { leerCatalogoCSV } from "../lib/catalogo-csv";
import type { Producto } from "../lib/tipos";

const productos: Producto[] = leerCatalogoCSV(readFileSync("data/catalogo.csv", "utf8")).map((f) => ({
  ...f,
  pendiente_multicomercio: false,
}));
const indice = indexar(productos);

describe("búsqueda", () => {
  it("normaliza acentos y mayúsculas", () => expect(normalizar("  Muñeco  NAVIDEÑO ")).toBe("muneco navideno"));
  it("código exacto, también alfanumérico en minúsculas", () => {
    expect(buscarCodigo(indice, "869")?.nombre).toBe("gorro navidad");
    expect(buscarCodigo(indice, "999999")).toBeUndefined();
  });
  it("el código exacto sale primero", () => expect(sugerir(indice, "84")[0].codigo).toBe("84"));
  it("busca por palabras sin importar el orden ni acentos", () => {
    const r = sugerir(indice, "navidad gorro");
    expect(r.map((p) => p.codigo)).toContain("869");
    expect(sugerir(indice, "MUNECO").length).toBeGreaterThan(0);
  });
  it("sin coincidencias → vacío", () => expect(sugerir(indice, "zzzzqqq")).toEqual([]));
});
