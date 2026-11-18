/**
 * Especificación de etiquetas PROBADA EN LA ZEBRA ZD220d (203 dpi).
 * Copia fiel de CLAUDE.md y de docs/referencia/etiquetas_ref.py. NO CAMBIAR sin probar en la impresora.
 *
 * Unidades en mm, origen (0,0) abajo a la izquierda como en reportlab.
 * Al dibujar con jsPDF (origen arriba) se convierte: y_jspdf = alto − y.
 */

export type Alineacion = "centro" | "izquierda" | "derecha";

export interface TextoSpec {
  fuente: "helvetica-bold" | "helvetica";
  pt: number;
  /** Tamaño mínimo al reducir de 0.25 en 0.25 pt para que quepa. */
  ptMin?: number;
  y: number;
  alinear: Alineacion;
  /** x de anclaje (izquierda o derecha); si alinear = centro se usa el centro de la etiqueta. */
  x?: number;
}

export interface DisenoEtiqueta {
  id: string;
  clase: "grande" | "chica";
  nombre: string;
  /** Tamaño de la página del PDF (preset del driver). */
  pagina: { ancho: number; alto: number };
  /** Tamaño de cada etiqueta. */
  etiqueta: { ancho: number; alto: number };
  /** x de cada etiqueta dentro de la página (1 = una por página; 3 = hilera de 3). */
  columnasX: number[];
  nombreTexto: TextoSpec & {
    /** Ancho máximo fijo, o "resto": ancho − márgenes − ancho del precio − separación. */
    anchoMax: number | { resto: { margenes: number; separacion: number } };
    /** Si no cabe al tamaño mínimo: true = recortar con "…"; false = se deja así. */
    truncar: boolean;
  };
  precioTexto: TextoSpec;
  barras: {
    y: number;
    alto: number;
    /** Módulos a probar en orden (múltiplos de 0.125 mm = 1 punto a 203 dpi). */
    modulos: number[];
    anchoMax: number;
  };
  numeroTexto: TextoSpec;
  /** Texto para el recordatorio del driver. */
  presetDriver: string;
}

export const GRANDE: DisenoEtiqueta = {
  id: "grande-38x25",
  clase: "grande",
  nombre: "Grande 38 × 25 mm",
  pagina: { ancho: 38, alto: 25 },
  etiqueta: { ancho: 38, alto: 25 },
  columnasX: [0],
  nombreTexto: {
    fuente: "helvetica-bold",
    pt: 7,
    ptMin: 4.5,
    y: 25 - 2.7,
    alinear: "centro",
    anchoMax: 35.5,
    truncar: false,
  },
  precioTexto: { fuente: "helvetica-bold", pt: 10.5, y: 25 - 6.6, alinear: "centro" },
  barras: { y: 3.0, alto: 12.5, modulos: [0.375, 0.25], anchoMax: 33 },
  numeroTexto: { fuente: "helvetica", pt: 6, y: 0.8, alinear: "centro" },
  presetDriver: "38 × 25 mm",
};

export const CHICA: DisenoEtiqueta = {
  id: "chica-3x27x13",
  clase: "chica",
  nombre: "Chica 27 × 13 mm (3 por hilera)",
  pagina: { ancho: 90, alto: 13 },
  etiqueta: { ancho: 27, alto: 13 },
  columnasX: [1.5, 31.5, 61.5],
  nombreTexto: {
    fuente: "helvetica",
    pt: 5.5,
    ptMin: 4,
    y: 9.2,
    alinear: "izquierda",
    x: 0.8,
    anchoMax: { resto: { margenes: 1.6, separacion: 1 } },
    truncar: true,
  },
  precioTexto: { fuente: "helvetica-bold", pt: 7, y: 9.2, alinear: "derecha", x: 27 - 0.8 },
  barras: { y: 3.0, alto: 5.4, modulos: [0.375, 0.25], anchoMax: 25.4 },
  numeroTexto: { fuente: "helvetica", pt: 5, y: 1.1, alinear: "centro" },
  presetDriver: "90 × 13 mm",
};

/** Formatos probados en la impresora: no se pueden editar desde la app. */
export const FORMATOS_PROBADOS = [GRANDE, CHICA] as const;

/** La cola de impresión de Windows se traba con trabajos grandes. */
export const MAX_PAGINAS_POR_PDF = 300;

/** Precio con formato "$ 1,234.00". */
export function formatoPrecio(precio: number): string {
  const [ent, dec] = (Math.round((precio + Number.EPSILON) * 100) / 100).toFixed(2).split(".");
  return `$ ${ent.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${dec}`;
}

export const PT_A_MM = 25.4 / 72;
