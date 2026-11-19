import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { leerProductosMC, type ProductoMC } from "../lib/multicomercio/productos";
import { compararConMulticomercio, filasAEscribir } from "../lib/sync/diff";
import type { Producto } from "../lib/tipos";

const leer = (f: string) => leerProductosMC(readFileSync(`data/muestras/${f}`)).productos;
/** La BD tal como quedaría después de sincronizar ese Excel. */
const comoBD = (ps: ProductoMC[], tamano: Producto["tamano"] = "grande"): Producto[] =>
  ps.map((p) => ({
    ...p,
    categoria: p.categoria || null,
    tamano,
    etiqueta_unica: false,
    pendiente_multicomercio: false,
    oculto: false,
    nombre_mc: p.nombre,
    precio_mc: p.precio,
    categoria_mc: p.categoria || null,
  }));
const codigos = (xs: { codigo: string }[]) => xs.map((x) => x.codigo).sort();

describe("4 nov → 13 nov (resultado esperado en CLAUDE.md)", () => {
  const r = compararConMulticomercio(comoBD(leer("productos_2026-11-04.xlsx")), leer("productos_2026-11-13.xlsx"));
  it("0 nuevos y 0 desaparecidos", () => {
    expect(r.porTipo.nuevo).toHaveLength(0);
    expect(r.porTipo.desaparecido).toHaveLength(0);
  });
  it("30 con nombre cambiado, entre ellos 2 movidos (cable v8 249→248, kit envase 269→626)", () => {
    expect(r.porTipo.reutilizado.length + r.porTipo.movido.length).toBe(30);
    expect(r.porTipo.movido.map((c) => `${c.movidoDe?.join("/")}→${c.codigo}`).sort()).toEqual(["249→248", "269→626"]);
  });
  it("1 solo precio: 869 gorro navidad $15", () => {
    expect(r.porTipo.precio.map((c) => [c.codigo, c.despues.nombre, c.despues.precio])).toEqual([["869", "gorro navidad", 15]]);
  });
  it("6 quedaron sin nombre", () => {
    expect(codigos(r.porTipo.sinNombre)).toEqual(["2093", "2146", "49", "505", "607", "746"]);
  });
  it("0 cambios de activo", () => expect(r.porTipo.activo).toHaveLength(0));
  it("los reutilizados pierden el tamaño; los movidos heredan el del código viejo; sin nombre lo conservan", () => {
    const porCodigo = new Map(r.cambios.map((c) => [c.codigo, c]));
    expect(porCodigo.get("802")?.despues.tamano).toBeNull();
    expect(porCodigo.get("248")?.despues.tamano).toBe("grande");
    expect(porCodigo.get("2093")?.despues.tamano).toBe("grande");
  });
});

describe("13 nov → 17 nov", () => {
  const r = compararConMulticomercio(comoBD(leer("productos_2026-11-13.xlsx")), leer("productos_2026-11-17.xlsx"));
  it("8 nuevos (1161–1168) sin tamaño y para imprimir", () => {
    expect(codigos(r.porTipo.nuevo)).toEqual(["1161", "1162", "1163", "1164", "1165", "1166", "1167", "1168"]);
    expect(r.porTipo.nuevo.every((c) => c.despues.tamano === null && c.imprimir)).toBe(true);
  });
  it("31 nombres cambiados: 26 reutilizados + 5 sin nombre", () => {
    expect(r.porTipo.reutilizado).toHaveLength(26);
    expect(codigos(r.porTipo.sinNombre)).toEqual(["2055", "2080", "2105", "2151", "2155"]);
  });
  it("2 solo precio: 802 y 750", () => {
    expect(r.porTipo.precio.map((c) => [c.codigo, c.antes?.precio, c.despues.precio]).sort()).toEqual([
      ["750", 135, 175],
      ["802", 1300, 1400],
    ]);
  });
  it("sin nombre no se manda a imprimir", () => expect(r.porTipo.sinNombre.some((c) => c.imprimir)).toBe(false));
});

describe("casos especiales", () => {
  const base = comoBD(leer("productos_2026-11-17.xlsx"));
  const excel = leer("productos_2026-11-17.xlsx");

  it("mismo Excel → sin cambios", () => {
    const r = compararConMulticomercio(base, excel);
    expect(r.cambios).toEqual([]);
    expect(r.desaparecidos).toEqual([]);
  });

  it("editado en la app y Multicomercio igual → 'editadoApp' (se regresa a lo de Multicomercio), no reutilizado", () => {
    const bd = base.map((p) => (p.codigo === "869" ? { ...p, nombre: "gorro navideño rojo", precio: 18 } : p));
    const r = compararConMulticomercio(bd, excel);
    expect(r.cambios.map((c) => [c.codigo, c.tipos])).toEqual([["869", ["editadoApp"]]]);
    expect(r.cambios[0].despues).toMatchObject({ nombre: "gorro navidad", precio: 15, tamano: "grande" });
  });

  it("código que ya no viene → inactivo (no se borra); los pendientes no cuentan", () => {
    const bd: Producto[] = [
      ...base,
      { ...base[0], codigo: "999001", nombre: "ya no se surte" },
      { ...base[0], codigo: "999002", nombre: "creado aquí", pendiente_multicomercio: true, nombre_mc: null, precio_mc: null, categoria_mc: null },
    ];
    const r = compararConMulticomercio(bd, excel);
    expect(codigos(r.porTipo.desaparecido)).toEqual(["999001"]);
    expect(filasAEscribir(r).find((f) => f.codigo === "999001")?.activo).toBe(false);
  });

  it("pendiente que aparece en el Excel → dado de alta (deja de estar pendiente)", () => {
    const bd = base.map((p) => (p.codigo === "1168" ? { ...p, pendiente_multicomercio: true, nombre_mc: null, precio_mc: null, categoria_mc: null } : p));
    const r = compararConMulticomercio(bd, excel);
    expect(r.cambios.map((c) => [c.codigo, c.tipos])).toEqual([["1168", ["dadoDeAlta"]]]);
    expect(r.cambios[0].despues).toMatchObject({ pendiente_multicomercio: false, nombre_mc: "set construccion" });
  });

  it("un oculto cuyo código se reutiliza vuelve a verse (es otro producto)", () => {
    const bd = base.map((p) => (p.codigo === "327" ? { ...p, oculto: true } : p));
    const ex = excel.map((p) => (p.codigo === "327" ? { ...p, nombre: "producto nuevo x" } : p));
    const r = compararConMulticomercio(bd, ex);
    expect(r.cambios[0]).toMatchObject({ codigo: "327", tipos: ["reutilizado"], despues: { oculto: false, tamano: null } });
  });

  it("un oculto sin cambios de nombre sigue oculto", () => {
    const bd = base.map((p) => (p.codigo === "327" ? { ...p, oculto: true } : p));
    const ex = excel.map((p) => (p.codigo === "327" ? { ...p, precio: 99 } : p));
    expect(compararConMulticomercio(bd, ex).cambios[0].despues.oculto).toBe(true);
  });

  it("código nuevo con el nombre de otro que lo perdió → movido y hereda el tamaño", () => {
    const bd = base.map((p) => (p.codigo === "869" ? { ...p, tamano: "chica" as const } : p));
    const ex = [...excel.map((p) => (p.codigo === "869" ? { ...p, nombre: "" } : p)), { ...excel.find((p) => p.codigo === "869")!, codigo: "77777" }];
    const r = compararConMulticomercio(bd, ex);
    const m = r.cambios.find((c) => c.codigo === "77777")!;
    expect(m.tipos).toEqual(["nuevo", "movido"]);
    expect(m.movidoDe).toEqual(["869"]);
    expect(m.despues.tamano).toBe("chica");
  });

  it("nombres repetidos: si el nombre sigue en su código, no es 'movido'", () => {
    const g = excel.find((p) => p.codigo === "869")!;
    const r = compararConMulticomercio(base, [...excel, { ...g, codigo: "77778" }]);
    expect(r.cambios.find((c) => c.codigo === "77778")?.tipos).toEqual(["nuevo"]);
  });

  it("producto inactivo con precio nuevo no se manda a imprimir", () => {
    const ex = excel.map((p) => (p.codigo === "802" ? { ...p, precio: 1500, activo: false } : p));
    const c = compararConMulticomercio(base, ex).cambios.find((x) => x.codigo === "802")!;
    expect(c.tipos).toEqual(["precio", "activo"]);
    expect(c.imprimir).toBe(false);
  });
});

import { sugerirImpresion } from "../lib/sync/sugerir";

describe("sugerir qué imprimir después de sincronizar", () => {
  const r = compararConMulticomercio(comoBD(leer("productos_2026-11-13.xlsx")), leer("productos_2026-11-17.xlsx"));
  it("sin existencias: 1 etiqueta por producto; reutilizados primero", () => {
    const s = sugerirImpresion(r.cambios, null);
    expect(s).toHaveLength(8 + 26 + 2);
    expect(s.every((x) => x.cantidad === 1)).toBe(true);
    expect(s[0].motivo).toBe("reutilizado");
  });
  it("con existencias: tantas como piezas, 0 si no hay; '1 etiqueta' siempre 1", () => {
    const ex = new Map([["802", 7], ["750", 0]]);
    const c = r.cambios.map((x) => (x.codigo === "1161" ? { ...x, despues: { ...x.despues, etiqueta_unica: true } } : x));
    const s = new Map(sugerirImpresion(c, ex).map((x) => [x.codigo, x.cantidad]));
    expect(s.get("802")).toBe(7);
    expect(s.get("750")).toBe(0);
    expect(s.get("1161")).toBe(1);
    expect(s.get("1162")).toBe(0); // no viene en el reporte
  });
});
