import { describe, expect, it } from "vitest";
import { limpiarCodigo, normalizarNombre } from "../lib/codigo";
import { formatoPrecio } from "../lib/etiquetas/spec";

describe("códigos", () => {
  it.each(["8", "84", "869", "8994", "90051", "901A", "6955501230098"])("acepta %s", (c) => {
    expect(limpiarCodigo(c)).toEqual({ ok: true, codigo: c });
  });
  it("quita espacios que mete el escáner", () => {
    expect(limpiarCodigo(" 90 051 \n")).toEqual({ ok: true, codigo: "90051" });
  });
  it("avisa del apóstrofe (guion convertido por el teclado en español)", () => {
    expect(limpiarCodigo("899'18")).toMatchObject({ ok: false, motivo: "apostrofe" });
  });
  it("rechaza guiones", () => {
    expect(limpiarCodigo("899-18")).toMatchObject({ ok: false, motivo: "guion" });
  });
  it("rechaza vacío y símbolos", () => {
    expect(limpiarCodigo("   ")).toMatchObject({ ok: false, motivo: "vacio" });
    expect(limpiarCodigo("12/3")).toMatchObject({ ok: false, motivo: "caracteres" });
  });
  it('nombre "." o vacío = sin nombre', () => {
    expect(normalizarNombre(".")).toBe("");
    expect(normalizarNombre(" . ")).toBe("");
    expect(normalizarNombre(null)).toBe("");
    expect(normalizarNombre(" gorro navidad ")).toBe("gorro navidad");
  });
});

describe("formato de precio", () => {
  it.each([
    [15, "$ 15.00"],
    [62.9999, "$ 63.00"],
    [1300, "$ 1,300.00"],
    [1234567.5, "$ 1,234,567.50"],
    [0, "$ 0.00"],
  ])("%s → %s", (p, t) => expect(formatoPrecio(p)).toBe(t));
});
