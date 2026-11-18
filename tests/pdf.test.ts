/**
 * PDFs de la app vs. el generador probado en la Zebra (docs/referencia/etiquetas_ref.py):
 *  - píxel por píxel a 203 dpi en blanco y negro (lo que imprime la cabeza térmica),
 *  - todos los códigos se leen con zxing a 203 dpi, en su lugar.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dividirEnPartes, etiquetasDe, expandir, generarPdf, paginasDe, pdfABytes, type ItemImpresion } from "../lib/etiquetas/pdf";
import { CHICA, GRANDE, type DisenoEtiqueta } from "../lib/etiquetas/spec";
import { cabeCodigo } from "../lib/etiquetas/code128";
import { leerCatalogoCSV } from "../lib/catalogo-csv";
import { leerEtiquetasPdf, renderizarPdf, type PaginaMono } from "./util/barras";

// Los mismos casos que docs/referencia/etiquetas_ref.py
const CASOS_REF: ItemImpresion[] = [
  { nombre: "gorro navidad", precio: 15, codigo: "869", cantidad: 1 },
  { nombre: "", precio: 19, codigo: "8", cantidad: 1 },
  { nombre: "termo digital sencillo con luz led extra", precio: 90, codigo: "90051", cantidad: 1 },
  { nombre: "inflable", precio: 1300, codigo: "802", cantidad: 1 },
  { nombre: "pieza sin nombre", precio: 62.9999, codigo: "901A", cantidad: 1 },
  { nombre: "cepillo uñas", precio: 10, codigo: "84", cantidad: 2 },
];
const BORDES: ItemImpresion[] = JSON.parse(readFileSync("tests/fixtures/bordes.json", "utf8"));

const columnas = (d: DisenoEtiqueta) => d.columnasX.map((x) => [x, d.etiqueta.ancho] as [number, number]);

function pixelesDistintos(a: PaginaMono[], b: PaginaMono[]) {
  expect(b).toHaveLength(a.length);
  return a.map((pa, i) => {
    const pb = b[i];
    expect([pb.ancho, pb.alto]).toEqual([pa.ancho, pa.alto]);
    let n = 0;
    for (let k = 0; k < pa.px.length; k++) if (pa.px[k] !== pb.px[k]) n++;
    return n;
  });
}

describe.each([
  ["grande", GRANDE],
  ["chica", CHICA],
] as const)("PDF %s", (nombre, d) => {
  it("es idéntico píxel por píxel a 203 dpi al PDF de referencia probado en la Zebra", () => {
    const app = renderizarPdf(pdfABytes(generarPdf(d, expandir(CASOS_REF))));
    const ref = renderizarPdf(readFileSync(`docs/referencia/muestras_${nombre}.pdf`));
    expect(pixelesDistintos(ref, app)).toEqual(ref.map(() => 0));
  });

  it("casos borde: idéntico al generador de referencia (1–5 dígitos, 901A, nombres largos, sin nombre, acentos, ≥ $1,000)", () => {
    const app = renderizarPdf(pdfABytes(generarPdf(d, expandir(BORDES))));
    const ref = renderizarPdf(readFileSync(`tests/fixtures/bordes_${nombre}.pdf`));
    expect(pixelesDistintos(ref, app)).toEqual(ref.map(() => 0));
  });

  it("casos borde: cada código se lee a 203 dpi en su lugar", async () => {
    const leidos = (await leerEtiquetasPdf(pdfABytes(generarPdf(d, expandir(BORDES))), columnas(d))).flat();
    const esperados = BORDES.map((b) => b.codigo);
    expect(leidos.slice(0, esperados.length)).toEqual(esperados);
    expect(leidos.slice(esperados.length).every((x) => x === "")).toBe(true);
  });

  it("página del tamaño del preset del driver", () => {
    const [p] = renderizarPdf(pdfABytes(generarPdf(d, expandir(CASOS_REF.slice(0, 1)))));
    expect(p.ancho).toBe(Math.ceil((d.pagina.ancho / 25.4) * 203)); // el renderizador redondea hacia arriba (igual que la referencia)
    expect(p.alto).toBe(Math.ceil((d.pagina.alto / 25.4) * 203));
  });
});

describe("todo el catálogo", () => {
  const catalogo = leerCatalogoCSV(readFileSync("data/catalogo.csv", "utf8"));

  it("todos los códigos caben en grande y en chica", () => {
    expect(catalogo.filter((p) => !cabeCodigo(p.codigo, GRANDE.barras.modulos, GRANDE.barras.anchoMax))).toEqual([]);
    expect(catalogo.filter((p) => !cabeCodigo(p.codigo, CHICA.barras.modulos, CHICA.barras.anchoMax))).toEqual([]);
  });

  it(
    "las 1,168 etiquetas chicas (con nombre y precio reales) se leen a 203 dpi",
    async () => {
      const items = catalogo.map((p) => ({ codigo: p.codigo, nombre: p.nombre, precio: p.precio, cantidad: 1 }));
      const leidos = (await leerEtiquetasPdf(pdfABytes(generarPdf(CHICA, expandir(items))), columnas(CHICA))).flat();
      const fallan = items.filter((it, i) => leidos[i] !== it.codigo).map((it) => it.codigo);
      expect(fallan).toEqual([]);
    },
    180_000,
  );
});

describe("lista → etiquetas", () => {
  it("etiqueta única: 1 sola etiqueta aunque haya varias piezas", () => {
    expect(etiquetasDe({ cantidad: 12, etiquetaUnica: true })).toBe(1);
    expect(etiquetasDe({ cantidad: 12 })).toBe(12);
    const e = expandir([
      { codigo: "1", nombre: "a", precio: 1, cantidad: 3 },
      { codigo: "2", nombre: "b", precio: 2, cantidad: 5, etiquetaUnica: true },
    ]);
    expect(e.map((x) => x.codigo)).toEqual(["1", "1", "1", "2"]);
  });

  it("chicas: hileras = ceil(N/3)", () => {
    expect(paginasDe(CHICA, 30)).toBe(10);
    expect(paginasDe(CHICA, 31)).toBe(11);
    expect(paginasDe(GRANDE, 31)).toBe(31);
  });

  it("divide en partes de máximo 300 páginas sin partir hileras", () => {
    const muchas = Array.from({ length: 1000 }, (_, i) => ({ codigo: String(i + 1), nombre: "", precio: 1 }));
    expect(dividirEnPartes(GRANDE, muchas).map((p) => p.length)).toEqual([300, 300, 300, 100]);
    expect(dividirEnPartes(CHICA, muchas).map((p) => p.length)).toEqual([900, 100]);
    expect(dividirEnPartes(CHICA, muchas.slice(0, 900)).map((p) => p.length)).toEqual([900]);
  });

  it("sin etiquetas no genera PDF", () => {
    expect(() => generarPdf(GRANDE, [])).toThrow();
  });
});
