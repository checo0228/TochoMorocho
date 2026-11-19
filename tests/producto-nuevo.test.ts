import { describe, expect, it } from "vitest";
import { hayErrores, leerPrecio, soloAlfanumerico, validarProducto, type FormProducto } from "../lib/producto-nuevo";
import type { Producto } from "../lib/tipos";

const existentes = new Map<string, Producto>([
  ["869", { codigo: "869", nombre: "gorro navidad", precio: 15, categoria: "FIESTA", tamano: "grande", activo: true, etiqueta_unica: false, pendiente_multicomercio: false }],
]);
const existe = (c: string) => existentes.get(c);
const base: FormProducto = { codigo: "77001", nombre: "termo", precio: "149.50", categoria: "COCINA/HOGAR", tamano: "grande", etiquetaUnica: false };

describe("producto nuevo", () => {
  it("formulario completo no tiene errores", () => expect(hayErrores(validarProducto(base, existe))).toBe(false));
  it("pide cada campo", () => {
    const e = validarProducto({ codigo: "", nombre: " ", precio: "", categoria: "", tamano: null, etiquetaUnica: false }, existe);
    expect(Object.keys(e).sort()).toEqual(["categoria", "codigo", "nombre", "precio", "tamano"]);
  });
  it("código duplicado", () => expect(validarProducto({ ...base, codigo: "869" }, existe).codigo).toMatch(/ya existe/));
  it("código con guion o apóstrofe", () => {
    expect(validarProducto({ ...base, codigo: "899-18" }, existe).codigo).toMatch(/guion/);
    expect(validarProducto({ ...base, codigo: "899'18" }, existe).codigo).toMatch(/apóstrofe/);
    expect(soloAlfanumerico("899-18 ")).toBe("89918");
  });
  it("EAN de 13 dígitos no cabe en chica pero sí en grande", () => {
    expect(validarProducto({ ...base, codigo: "7501234567890", tamano: "chica" }, existe).codigo).toMatch(/demasiado largo/);
    expect(validarProducto({ ...base, codigo: "7501234567890", tamano: "grande" }, existe).codigo).toBeUndefined();
  });
  it.each([
    ["149.50", 149.5],
    ["$ 1,300", 1300],
    ["62.9999", 63],
    [".5", 0.5],
    ["abc", null],
    ["-5", null],
    ["1.2.3", null],
  ])("precio %s → %s", (t, n) => expect(leerPrecio(t)).toBe(n));
});
