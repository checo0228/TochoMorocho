import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FILTROS_INICIALES, filtrarCatalogo, hayFiltro, separarParaImprimir } from "../lib/filtrar-catalogo";
import { leerCatalogoCSV } from "../lib/catalogo-csv";
import type { Producto } from "../lib/tipos";

const productos: Producto[] = leerCatalogoCSV(readFileSync("data/catalogo.csv", "utf8")).map((f) => ({ ...f, pendiente_multicomercio: f.codigo === "1168" }));

describe("filtros del catálogo", () => {
  it("por defecto: solo activos (1,157 de 1,168)", () => {
    expect(filtrarCatalogo(productos, FILTROS_INICIALES)).toHaveLength(1157);
    expect(hayFiltro(FILTROS_INICIALES)).toBe(false);
  });
  it("sin tamaño (activos)", () => {
    const r = filtrarCatalogo(productos, { ...FILTROS_INICIALES, tamano: "sin" });
    expect(r.every((p) => !p.tamano && p.activo)).toBe(true);
    expect(r.length).toBe(productos.filter((p) => !p.tamano && p.activo).length);
  });
  it("categoría + tamaño", () => {
    const r = filtrarCatalogo(productos, { ...FILTROS_INICIALES, categoria: "JUGUETES", tamano: "grande" });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => p.categoria === "JUGUETES" && p.tamano === "grande")).toBe(true);
  });
  it("inactivos y todos", () => {
    expect(filtrarCatalogo(productos, { ...FILTROS_INICIALES, estado: "inactivos" })).toHaveLength(11);
    expect(filtrarCatalogo(productos, { ...FILTROS_INICIALES, estado: "todos" })).toHaveLength(1168);
  });
  it("pendientes en Multicomercio", () => {
    expect(filtrarCatalogo(productos, { ...FILTROS_INICIALES, pendientes: true }).map((p) => p.codigo)).toEqual(["1168"]);
  });
  it("búsqueda respeta los demás filtros", () => {
    const r = filtrarCatalogo(productos, { ...FILTROS_INICIALES, q: "gorro", categoria: "FIESTA" });
    expect(r.every((p) => p.categoria === "FIESTA")).toBe(true);
  });
  it("para imprimir un grupo solo van activos con tamaño", () => {
    const r = separarParaImprimir(filtrarCatalogo(productos, { ...FILTROS_INICIALES, categoria: "FIESTA", estado: "todos" }));
    expect(r.imprimibles.every((p) => p.activo && p.tamano)).toBe(true);
    expect(r.sinTamano).toBeGreaterThan(0); // 432 y 443 (FIESTA) siguen sin tamaño
  });
});

describe("ocultos", () => {
  const conOcultos = productos.map((p) => (["327", "464", "2055"].includes(p.codigo) ? { ...p, oculto: true } : p));
  it("no salen en activos ni en todos; sí en 'ocultos'", () => {
    expect(filtrarCatalogo(conOcultos, FILTROS_INICIALES).some((p) => p.oculto)).toBe(false);
    expect(filtrarCatalogo(conOcultos, { ...FILTROS_INICIALES, estado: "todos" })).toHaveLength(1165);
    expect(filtrarCatalogo(conOcultos, { ...FILTROS_INICIALES, estado: "ocultos" }).map((p) => p.codigo).sort()).toEqual(["2055", "327", "464"]);
  });
  it("no cuentan para imprimir un grupo", () => {
    const r = separarParaImprimir(conOcultos);
    expect(r.imprimibles.some((p) => p.oculto)).toBe(false);
  });
});
