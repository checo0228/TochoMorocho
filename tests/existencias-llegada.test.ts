import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { leerExistencias } from "../lib/multicomercio/existencias";
import { leerLlegada } from "../lib/multicomercio/llegada";

describe("reporte de existencias (SpreadsheetML de FastReport)", () => {
  const ex = leerExistencias(readFileSync("data/muestras/existencias_2026-10-29.xls"));
  it("lee código → existencia", () => {
    expect(ex.size).toBeGreaterThan(1000);
    expect(ex.get("124")).toBe(6);
    expect(ex.get("104")).toBe(48);
  });
  it("negativas o cero cuentan como 0", () => {
    expect([...ex.values()].every((n) => n >= 0 && Number.isInteger(n))).toBe(true);
    expect([...ex.values()].filter((n) => n === 0).length).toBeGreaterThan(0);
  });
  it("no confunde encabezados (Almacen Principal, CODIGO) con productos", () => {
    expect(ex.has("CODIGO")).toBe(false);
  });
  it("rechaza un archivo que no es de existencias", () => {
    expect(() => leerExistencias(readFileSync("data/muestras/llegada_ejemplo.xlsx"))).toThrow();
  });
});

describe("hoja de llegada", () => {
  const { renglones, rechazados } = leerLlegada(readFileSync("data/muestras/llegada_ejemplo.xlsx"));
  it("lee código, cantidad y tamaño g/ch", () => {
    expect(renglones.find((r) => r.codigo === "3002")).toMatchObject({ cantidad: 2, tamano: "grande" });
    expect(renglones.some((r) => r.tamano === "chica")).toBe(true);
  });
  it("rechaza el código con guion (899-18)", () => {
    expect(rechazados.map((r) => r.codigo)).toContain("899-18");
  });
});
