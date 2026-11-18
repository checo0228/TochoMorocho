import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { calcularBarras, modulosCode128, simbolosCode128 } from "../lib/etiquetas/code128";
import { CHICA, GRANDE } from "../lib/etiquetas/spec";

const esperado: Record<string, number[]> = JSON.parse(readFileSync("tests/fixtures/code128_reportlab.json", "utf8"));

describe("Code128 idéntico a reportlab (el generador probado en la Zebra)", () => {
  it(`mismos símbolos para ${Object.keys(esperado).length} códigos (catálogo completo, bordes y al azar)`, () => {
    const distintos = Object.entries(esperado)
      .filter(([c, s]) => JSON.stringify(simbolosCode128(c)) !== JSON.stringify(s))
      .map(([c]) => c);
    expect(distintos).toEqual([]);
  });

  it("anchos en módulos conocidos", () => {
    expect(modulosCode128("869")).toHaveLength(68);
    expect(modulosCode128("84")).toHaveLength(46);
    expect(modulosCode128("90051")).toHaveLength(79);
  });

  it("grande: módulo 0.375 mm salvo que pase de 33 mm", () => {
    expect(calcularBarras("90051", GRANDE.barras.modulos, GRANDE.barras.anchoMax).modulo).toBe(0.375);
    expect(calcularBarras("6955501230098", GRANDE.barras.modulos, GRANDE.barras.anchoMax).modulo).toBe(0.25);
  });

  it("chica: 0.375 mm si cabe en 25.4 mm; si no 0.25 mm; si tampoco, error", () => {
    expect(calcularBarras("84", CHICA.barras.modulos, CHICA.barras.anchoMax).modulo).toBe(0.375); // 46 × .375 = 17.25 mm
    expect(calcularBarras("869", CHICA.barras.modulos, CHICA.barras.anchoMax).modulo).toBe(0.25); // 68 × .375 = 25.5 mm > 25.4
    expect(() => calcularBarras("ABCDEFGHIJ", CHICA.barras.modulos, CHICA.barras.anchoMax)).toThrow(/demasiado largo/);
  });
});
