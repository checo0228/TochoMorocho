import * as XLSX from "xlsx";
import type { Producto } from "../tipos";

/**
 * Exporta productos con el MISMO formato del Excel de productos de Multicomercio
 * (Sergio confirmó que Multicomercio importa ese mismo archivo). El formato está aislado aquí
 * por si hay que ajustarlo.
 */
export const ENCABEZADOS_MC = ["Artículo", "", "", "SKU", "Código", "Se vende por", "impuestos", "Marca", "Proveedor", "Precio 1", "Activo", "Costo"];

export function libroPendientes(productos: Producto[]): XLSX.WorkBook {
  const porCategoria = new Map<string, Producto[]>();
  for (const p of productos) {
    const c = p.categoria || "Sin Categoría";
    porCategoria.set(c, [...(porCategoria.get(c) ?? []), p]);
  }
  const filas: (string | number)[][] = [ENCABEZADOS_MC];
  for (const [cat, ps] of [...porCategoria].sort(([a], [b]) => a.localeCompare(b, "es"))) {
    filas.push(["-", `Categoría : ${cat} (COUNT=${ps.length})`]);
    for (const p of ps)
      filas.push(["", p.nombre, "", "", p.codigo, "Pieza", "IVA Exento (IVA/Exento): 0.0000%", "Sin Marca", "Sin Proveedor", p.precio, p.activo ? "Verdadero" : "Falso", ""]);
  }
  const hoja = XLSX.utils.aoa_to_sheet(filas);
  // el código siempre como texto (901A, y para no perder ceros a la izquierda)
  for (let r = 1; r < filas.length; r++) {
    const ref = XLSX.utils.encode_cell({ r, c: 4 });
    if (hoja[ref]) hoja[ref] = { t: "s", v: String(filas[r][4]) };
  }
  hoja["!cols"] = [{ wch: 4 }, { wch: 36 }, { wch: 2 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 8 }];
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "almacen");
  return libro;
}

export function bytesPendientes(productos: Producto[]): Uint8Array {
  return new Uint8Array(XLSX.write(libroPendientes(productos), { type: "array", bookType: "xlsx" }));
}
