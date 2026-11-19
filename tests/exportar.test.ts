import { describe, expect, it } from "vitest";
import { bytesPendientes } from "../lib/multicomercio/exportar";
import { leerProductosMC } from "../lib/multicomercio/productos";
import type { Producto } from "../lib/tipos";

const p = (o: Partial<Producto>): Producto => ({
  codigo: "1", nombre: "", precio: 0, categoria: null, tamano: "grande", activo: true, etiqueta_unica: false, pendiente_multicomercio: true, ...o,
});

describe("exportar pendientes (formato del Excel de Multicomercio)", () => {
  it("se vuelve a leer igual con el importador de Multicomercio", () => {
    const productos = [
      p({ codigo: "77001", nombre: "termo acero 500 ml", precio: 149.5, categoria: "COCINA/HOGAR" }),
      p({ codigo: "901B", nombre: "pieza alfanumérica", precio: 62.99, categoria: "COCINA/HOGAR" }),
      p({ codigo: "77002", nombre: "llavero stitch", precio: 35, categoria: null }),
    ];
    const { productos: leidos, rechazados } = leerProductosMC(bytesPendientes(productos));
    expect(rechazados).toEqual([]);
    expect(leidos.map((x) => [x.codigo, x.nombre, x.precio, x.categoria, x.activo]).sort()).toEqual(
      [
        ["77001", "termo acero 500 ml", 149.5, "COCINA/HOGAR", true],
        ["901B", "pieza alfanumérica", 62.99, "COCINA/HOGAR", true],
        ["77002", "llavero stitch", 35, "Sin Categoría", true],
      ].sort(),
    );
  });
});
