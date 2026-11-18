/**
 * Generador de PDFs de etiquetas, en el navegador (también corre en Node para los tests).
 * Port directo de docs/referencia/etiquetas_ref.py (probado en la Zebra ZD220d).
 */
import { jsPDF } from "jspdf";
import { calcularBarras } from "./code128";
import { HELVETICA, HELVETICA_BOLD } from "./metricas-helvetica";
import { formatoPrecio, MAX_PAGINAS_POR_PDF, PT_A_MM, type DisenoEtiqueta, type TextoSpec } from "./spec";

export interface ItemImpresion {
  codigo: string;
  nombre: string;
  precio: number;
  cantidad: number;
  /** Exhibición/anaquel: 1 sola etiqueta sin importar la cantidad. */
  etiquetaUnica?: boolean;
}

export interface Etiqueta {
  codigo: string;
  nombre: string;
  precio: number;
}

/** Cuántas etiquetas salen de un renglón de la lista. */
export const etiquetasDe = (i: Pick<ItemImpresion, "cantidad" | "etiquetaUnica">) =>
  i.etiquetaUnica ? Math.min(1, i.cantidad) : i.cantidad;

/** Expande la lista a etiquetas sueltas, en el orden de la lista. */
export function expandir(items: ItemImpresion[]): Etiqueta[] {
  const salida: Etiqueta[] = [];
  for (const i of items)
    for (let k = 0; k < etiquetasDe(i); k++) salida.push({ codigo: i.codigo, nombre: i.nombre, precio: i.precio });
  return salida;
}

export const paginasDe = (diseno: DisenoEtiqueta, etiquetas: number) =>
  Math.ceil(etiquetas / diseno.columnasX.length);

const nombreVisible = (n: string) => {
  const t = (n ?? "").trim();
  return t === "." ? "" : t;
};

type Medidor = (texto: string, fuente: TextoSpec["fuente"], pt: number) => number;

/** Ancho de un texto en mm con las métricas reales de Adobe (igual que reportlab stringWidth). */
export function anchoTexto(texto: string, fuente: TextoSpec["fuente"], pt: number): number {
  const tabla = fuente === "helvetica-bold" ? HELVETICA_BOLD : HELVETICA;
  let milesimas = 0;
  for (const c of texto) milesimas += tabla[c] ?? tabla["?"] ?? 556;
  return (milesimas / 1000) * pt * PT_A_MM;
}

function fijarFuente(doc: jsPDF, fuente: TextoSpec["fuente"], pt: number) {
  doc.setFont("helvetica", fuente === "helvetica-bold" ? "bold" : "normal");
  doc.setFontSize(pt);
}

/** fit_size: baja de 0.25 en 0.25 pt hasta que quepa o llegue al mínimo. */
export function ajustarTamano(medir: Medidor, t: string, fuente: TextoSpec["fuente"], max: number, min: number, ancho: number) {
  let cuartos = Math.round(max * 4);
  const minCuartos = Math.round(min * 4);
  while (cuartos > minCuartos && medir(t, fuente, cuartos / 4) > ancho) cuartos -= 1;
  return cuartos / 4;
}

/** fit_cut: como ajustarTamano y, si aun así no cabe, recorta con "…". */
export function ajustarRecortar(medir: Medidor, t: string, fuente: TextoSpec["fuente"], max: number, min: number, ancho: number) {
  const pt = ajustarTamano(medir, t, fuente, max, min, ancho);
  if (medir(t, fuente, pt) > ancho) {
    while (t && medir(t + "…", fuente, pt) > ancho) t = t.slice(0, -1);
    t = t.trimEnd() + "…";
  }
  return { texto: t, pt };
}

/** Primitivas de dibujo en mm, origen ARRIBA a la izquierda de la página (como jsPDF y SVG). */
export interface TextoCompuesto {
  texto: string;
  /** x del inicio del texto (ya alineado) */
  x: number;
  /** línea base */
  y: number;
  pt: number;
  negrita: boolean;
}
export interface EtiquetaCompuesta {
  textos: TextoCompuesto[];
  /** [x, y, ancho, alto] */
  barras: [number, number, number, number][];
}

/**
 * Calcula dónde va cada cosa de una etiqueta cuya esquina izquierda está en x = ox.
 * Lo usan el PDF y la vista previa en pantalla, así que salen idénticos.
 */
export function componerEtiqueta(d: DisenoEtiqueta, e: Etiqueta, ox = 0): EtiquetaCompuesta {
  const H = d.pagina.alto;
  const W = d.etiqueta.ancho;
  const medir: Medidor = anchoTexto;
  const textos: TextoCompuesto[] = [];
  const escribir = (t: string, s: TextoSpec, pt: number) => {
    const w = anchoTexto(t, s.fuente, pt);
    const x = s.alinear === "centro" ? W / 2 - w / 2 : s.alinear === "derecha" ? (s.x ?? W) - w : (s.x ?? 0);
    textos.push({ texto: t, x: ox + x, y: H - s.y, pt, negrita: s.fuente === "helvetica-bold" });
  };

  // Precio (en la chica se necesita su ancho para el nombre)
  const precio = formatoPrecio(e.precio);
  const anchoPrecio = medir(precio, d.precioTexto.fuente, d.precioTexto.pt);

  // Nombre
  const nombre = nombreVisible(e.nombre);
  if (nombre) {
    const s = d.nombreTexto;
    const anchoMax =
      typeof s.anchoMax === "number" ? s.anchoMax : W - s.anchoMax.resto.margenes - anchoPrecio - s.anchoMax.resto.separacion;
    const { texto, pt } = s.truncar
      ? ajustarRecortar(medir, nombre, s.fuente, s.pt, s.ptMin ?? s.pt, anchoMax)
      : { texto: nombre, pt: ajustarTamano(medir, nombre, s.fuente, s.pt, s.ptMin ?? s.pt, anchoMax) };
    escribir(texto, s, pt);
  }
  escribir(precio, d.precioTexto, d.precioTexto.pt);

  // Barras (Code128, sin zona blanca, módulos de 0.375/0.25 mm), centradas en la etiqueta
  const b = calcularBarras(e.codigo, d.barras.modulos, d.barras.anchoMax);
  const x0 = ox + (W - b.ancho) / 2;
  const yArriba = H - (d.barras.y + d.barras.alto);
  const barras = b.barras.map(([x, w]) => [x0 + x, yArriba, w, d.barras.alto] as [number, number, number, number]);

  // Número
  escribir(e.codigo, d.numeroTexto, d.numeroTexto.pt);
  return { textos, barras };
}

function dibujarEtiqueta(doc: jsPDF, d: DisenoEtiqueta, e: Etiqueta, ox: number) {
  const c = componerEtiqueta(d, e, ox);
  for (const t of c.textos) {
    fijarFuente(doc, t.negrita ? "helvetica-bold" : "helvetica", t.pt);
    doc.text(t.texto, t.x, t.y, { baseline: "alphabetic" });
  }
  doc.setFillColor(0, 0, 0);
  for (const [x, y, w, h] of c.barras) doc.rect(x, y, w, h, "F");
}

/** Genera un PDF (una página por etiqueta grande, o por hilera de chicas). */
export function generarPdf(d: DisenoEtiqueta, etiquetas: Etiqueta[], titulo = "Etiquetas"): jsPDF {
  const { ancho, alto } = d.pagina;
  const doc = new jsPDF({
    unit: "mm",
    format: [ancho, alto],
    orientation: ancho >= alto ? "landscape" : "portrait",
    compress: true,
  });
  doc.setProperties({ title: titulo, creator: "Etiquetas De Tocho Morocho" });
  doc.setTextColor(0, 0, 0);
  const cols = d.columnasX.length;
  for (let i = 0; i < etiquetas.length; i += cols) {
    if (i > 0) doc.addPage([ancho, alto], ancho >= alto ? "landscape" : "portrait");
    etiquetas.slice(i, i + cols).forEach((e, j) => dibujarEtiqueta(doc, d, e, d.columnasX[j]));
  }
  if (etiquetas.length === 0) throw new Error("No hay etiquetas para imprimir.");
  return doc;
}

/**
 * Divide en partes de máximo 300 páginas (la cola de Windows se traba con trabajos grandes).
 * Nunca parte una hilera de chicas.
 */
export function dividirEnPartes(d: DisenoEtiqueta, etiquetas: Etiqueta[], maxPaginas = MAX_PAGINAS_POR_PDF): Etiqueta[][] {
  const porParte = maxPaginas * d.columnasX.length;
  const partes: Etiqueta[][] = [];
  for (let i = 0; i < etiquetas.length; i += porParte) partes.push(etiquetas.slice(i, i + porParte));
  return partes;
}

export const pdfABytes = (doc: jsPDF) => new Uint8Array(doc.output("arraybuffer"));

export { PT_A_MM };
