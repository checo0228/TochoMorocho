/**
 * Code128 IDÉNTICO al de reportlab (docs/referencia/etiquetas_ref.py, probado en la Zebra):
 * misma elección de juegos B/C, mismos símbolos y mismas barras.
 * Port línea por línea de reportlab.graphics.barcode.code128 (encode + _try_TO_C),
 * limitado a códigos [0-9A-Za-z] (todos caben en el juego B; nunca hace falta el A).
 * Verificado contra reportlab con todo el catálogo: tests/code128.test.ts.
 */

/** Patrones estándar Code128 (símbolos 0–106) como módulos "1" barra / "0" espacio. */
const PATRONES: string[] = ["11011001100", "11001101100", "11001100110", "10010011000", "10010001100", "10001001100", "10011001000", "10011000100", "10001100100", "11001001000", "11001000100", "11000100100", "10110011100", "10011011100", "10011001110", "10111001100", "10011101100", "10011100110", "11001110010", "11001011100", "11001001110", "11011100100", "11001110100", "11101101110", "11101001100", "11100101100", "11100100110", "11101100100", "11100110100", "11100110010", "11011011000", "11011000110", "11000110110", "10100011000", "10001011000", "10001000110", "10110001000", "10001101000", "10001100010", "11010001000", "11000101000", "11000100010", "10110111000", "10110001110", "10001101110", "10111011000", "10111000110", "10001110110", "11101110110", "11010001110", "11000101110", "11011101000", "11011100010", "11011101110", "11101011000", "11101000110", "11100010110", "11101101000", "11101100010", "11100011010", "11101111010", "11001000010", "11110001010", "10100110000", "10100001100", "10010110000", "10010000110", "10000101100", "10000100110", "10110010000", "10110000100", "10011010000", "10011000010", "10000110100", "10000110010", "11000010010", "11001010000", "11110111010", "11000010100", "10001111010", "10100111100", "10010111100", "10010011110", "10111100100", "10011110100", "10011110010", "11110100100", "11110010100", "11110010010", "11011011110", "11011110110", "11110110110", "10101111000", "10100011110", "10001011110", "10111101000", "10111100010", "11110101000", "11110100010", "10111011110", "10111101110", "11101011110", "11110101110", "11010000100", "11010010000", "11010011100", "1100011101011"];

const START_B = 104;
const START_C = 105;
const STOP = 106;
const DIGITOS = "0123456789";

const esDigito = (x: string | undefined) => x !== undefined && x.length === 1 && DIGITOS.includes(x);
const C_STARTS = new Set(["START_B", "TO_A", "TO_B"]);
const TOS = new Set(["TO_A", "TO_B", "TO_C", "START_A", "START_B", "START_C"]);

/** Port de Code128._try_TO_C (incluye sus detalles, como la variable j que se arrastra). */
function intentarJuegoC(l: string[]): string[] {
  let i = 0;
  let j = 0;
  let nl: string[] = [];
  while (i < l.length) {
    let startpos = i;
    let rl: string[] = [];
    let savings = -1; // el TO_C cuesta un símbolo
    while (i < l.length) {
      if (C_STARTS.has(l[i])) {
        j = i;
        break;
      } else if (esDigito(l[i]) && esDigito(l[i + 1])) {
        rl.push(l[i] + l[i + 1]);
        i += 2;
        savings += 1;
        continue;
      } else {
        if (esDigito(l[i]) && l[i + 1] === "STOP") {
          const rrl: string[] = [];
          let rsavings = -1; // hace falta un TO_C
          let k = i;
          while (k > startpos) {
            if (esDigito(l[k]) && esDigito(l[k - 1])) {
              rrl.push(l[k - 1] + l[k]);
              rsavings += 1;
              k -= 2;
            } else break;
          }
          rrl.reverse();
          const extra = savings >= 0 && startpos > 0 && C_STARTS.has(nl[nl.length - 1]) ? 1 : 0;
          if (rsavings > savings + extra - 1) {
            nl.push(l[startpos]);
            startpos += 1;
            rl = rrl;
            i += 1;
          }
        }
        break;
      }
    }
    const ta = !(l[i] === "STOP" || j === i);
    const xs = savings >= 0 && startpos > 0 && C_STARTS.has(nl[nl.length - 1]);
    if (savings + (xs ? 1 : 0) > (ta ? 1 : 0)) {
      let toc: string;
      if (xs) {
        toc = nl[nl.length - 1].slice(0, -1) + "C";
        nl = nl.slice(0, -1);
      } else toc = "TO_C";
      nl.push(toc, ...rl);
      if (ta) nl.push("TO" + l[j].slice(-2));
      nl.push(l[i]);
    } else {
      nl.push(...l.slice(startpos, i + 1));
    }
    i += 1;
  }
  return nl;
}

const valorB = (c: string): number => {
  if (c === "TO_C") return 99;
  if (c === "TO_A") return 101;
  const v = c.charCodeAt(0) - 32;
  if (c.length !== 1 || v < 0 || v > 94) throw new Error(`Carácter no válido en el código: ${c}`);
  return v;
};
const valorC = (c: string): number => {
  if (c === "TO_B") return 100;
  if (c === "TO_A") return 101;
  if (!/^[0-9]{2}$/.test(c)) throw new Error(`Par no válido en juego C: ${c}`);
  return Number(c);
};

/** Símbolos Code128 (con inicio, verificación y fin), igual que reportlab Code128.encode(). */
export function simbolosCode128(codigo: string): number[] {
  if (!/^[0-9A-Za-z]+$/.test(codigo)) throw new Error(`Código no válido: ${codigo}`);
  let l = ["START_B", ...codigo.split(""), "STOP"];
  l = intentarJuegoC(l);
  if (TOS.has(l[1])) l = ["START_" + l[1].slice(-1), ...l.slice(2)];

  let juego: "B" | "C" = l[0] === "START_C" ? "C" : "B";
  const e: number[] = [juego === "C" ? START_C : START_B];
  for (const c of l.slice(1, -1)) {
    if (TOS.has(c)) {
      e.push(juego === "B" ? valorB(c) : valorC(c));
      juego = c === "TO_C" ? "C" : "B";
    } else e.push(juego === "B" ? valorB(c) : valorC(c));
  }
  let suma = e[0];
  for (let k = 1; k < e.length; k++) suma += k * e[k];
  return [...e, suma % 103, STOP];
}

/** Módulos como "1"/"0", SIN zona blanca. */
export function modulosCode128(codigo: string): string {
  return simbolosCode128(codigo)
    .map((s) => PATRONES[s])
    .join("");
}

export interface Barras {
  /** Ancho del módulo elegido en mm. */
  modulo: number;
  /** Ancho total en mm. */
  ancho: number;
  /** Barras como [inicio, ancho] en mm desde el borde izquierdo del código. */
  barras: [number, number][];
}

export class CodigoMuyLargoError extends Error {
  constructor(public codigo: string) {
    super(`El código ${codigo} es demasiado largo para esta etiqueta.`);
    this.name = "CodigoMuyLargoError";
  }
}

/** Elige el primer módulo que quepa en anchoMax (0.375 → 0.25 mm) y calcula las barras. */
export function calcularBarras(codigo: string, modulos: number[], anchoMax: number): Barras {
  const m = modulosCode128(codigo);
  for (const modulo of modulos) {
    const ancho = m.length * modulo;
    if (ancho <= anchoMax + 1e-9) {
      const barras: [number, number][] = [];
      let i = 0;
      while (i < m.length) {
        if (m[i] === "1") {
          let k = i;
          while (k < m.length && m[k] === "1") k++;
          barras.push([i * modulo, (k - i) * modulo]);
          i = k;
        } else i++;
      }
      return { modulo, ancho, barras };
    }
  }
  throw new CodigoMuyLargoError(codigo);
}

/** ¿Cabe el código en la etiqueta? (para avisar antes de generar el PDF) */
export function cabeCodigo(codigo: string, modulos: number[], anchoMax: number): boolean {
  try {
    calcularBarras(codigo, modulos, anchoMax);
    return true;
  } catch {
    return false;
  }
}
