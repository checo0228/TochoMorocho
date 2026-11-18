/**
 * Utilidades de verificación de etiquetas (equivalente a `pdftoppm -r 203 -mono` + zxing):
 * renderiza cada página a 203 dpi en escala de grises, la umbraliza a blanco/negro puro
 * (como la cabeza térmica: cada punto está o no está) y decodifica con zxing (WASM, sin internet).
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import * as mupdf from "mupdf";
import { PNG } from "pngjs";
import { prepareZXingModule, readBarcodes } from "zxing-wasm/reader";

export const DPI = 203;
const MM_A_PX = DPI / 25.4;

const require = createRequire(import.meta.url);
prepareZXingModule({
  overrides: { wasmBinary: readFileSync(require.resolve("zxing-wasm/reader/zxing_reader.wasm")).buffer },
  fireImmediately: true,
});

export interface PaginaMono {
  ancho: number;
  alto: number;
  /** 1 byte por píxel: 0 = negro, 255 = blanco. */
  px: Uint8Array;
}

export function renderizarPdf(datos: Uint8Array): PaginaMono[] {
  const doc = mupdf.Document.openDocument(datos, "application/pdf");
  const paginas: PaginaMono[] = [];
  const escala = DPI / 72;
  for (let i = 0; i < doc.countPages(); i++) {
    const pix = doc.loadPage(i).toPixmap(mupdf.Matrix.scale(escala, escala), mupdf.ColorSpace.DeviceGray, false, true);
    const ancho = pix.getWidth();
    const alto = pix.getHeight();
    const stride = pix.getStride();
    const gris = pix.getPixels();
    const px = new Uint8Array(ancho * alto);
    for (let y = 0; y < alto; y++)
      for (let x = 0; x < ancho; x++) px[y * ancho + x] = gris[y * stride + x] < 128 ? 0 : 255;
    paginas.push({ ancho, alto, px });
  }
  return paginas;
}

/** Recorta una zona en mm (x desde la izquierda, ancho) de la página, toda la altura, con margen blanco. */
export function recortarPng(p: PaginaMono, xMm: number, anchoMm: number, margenPx = 20): Uint8Array {
  const x0 = Math.max(0, Math.round(xMm * MM_A_PX));
  const x1 = Math.min(p.ancho, Math.round((xMm + anchoMm) * MM_A_PX));
  const w = x1 - x0 + margenPx * 2;
  const h = p.alto + margenPx * 2;
  const png = new PNG({ width: w, height: h });
  png.data.fill(255);
  for (let y = 0; y < p.alto; y++)
    for (let x = x0; x < x1; x++) {
      const v = p.px[y * p.ancho + x];
      const i = ((y + margenPx) * w + (x - x0 + margenPx)) * 4;
      png.data[i] = png.data[i + 1] = png.data[i + 2] = v;
    }
  return PNG.sync.write(png);
}

export async function leerCode128(png: Uint8Array): Promise<string[]> {
  const r = await readBarcodes(png, { formats: ["Code128"], tryHarder: true, maxNumberOfSymbols: 4 });
  return r.filter((x) => x.isValid).map((x) => x.text);
}

/** Decodifica todas las etiquetas de un PDF. columnasMm = [[x, ancho], …] de cada etiqueta en la página. */
export async function leerEtiquetasPdf(datos: Uint8Array, columnasMm: [number, number][]): Promise<string[][]> {
  const salida: string[][] = [];
  for (const p of renderizarPdf(datos)) {
    const fila: string[] = [];
    for (const [x, w] of columnasMm) fila.push((await leerCode128(recortarPng(p, x, w))).join("|"));
    salida.push(fila);
  }
  return salida;
}

/** Píxeles negros en una página (para comparar contra la referencia). */
export function pixelesNegros(p: PaginaMono): number {
  let n = 0;
  for (const v of p.px) if (v === 0) n++;
  return n;
}
