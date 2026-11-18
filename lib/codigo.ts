/** Reglas de códigos de barras (ver CLAUDE.md → Reglas de negocio). */

export const CODIGO_VALIDO = /^[0-9A-Za-z]+$/;

export type ResultadoCodigo =
  | { ok: true; codigo: string }
  | { ok: false; codigo: string; motivo: "vacio" | "apostrofe" | "guion" | "caracteres" };

/**
 * Limpia lo que teclea el escáner: quita espacios. No corrige guiones ni apóstrofes:
 * con teclado en español el escáner convierte "-" en "'", y ese código no existe en caja,
 * así que se avisa en vez de "arreglarlo" en silencio.
 */
export function limpiarCodigo(entrada: string): ResultadoCodigo {
  const codigo = entrada.replace(/\s+/g, "");
  if (!codigo) return { ok: false, codigo, motivo: "vacio" };
  if (CODIGO_VALIDO.test(codigo)) return { ok: true, codigo };
  if (codigo.includes("'")) return { ok: false, codigo, motivo: "apostrofe" };
  if (codigo.includes("-")) return { ok: false, codigo, motivo: "guion" };
  return { ok: false, codigo, motivo: "caracteres" };
}

export const MENSAJE_CODIGO: Record<Exclude<ResultadoCodigo, { ok: true }>["motivo"], string> = {
  vacio: "Escribe o escanea un código.",
  apostrofe:
    "El código trae un apóstrofe ('). Seguramente tiene un guion y el escáner lo cambió. Los códigos no pueden llevar guiones.",
  guion: "Los códigos no pueden llevar guiones: el escáner los cambia y no se encuentran en caja.",
  caracteres: "El código solo puede tener números y letras, sin espacios ni símbolos.",
};

/** Nombre vacío o "." en Multicomercio = sin nombre. */
export function normalizarNombre(nombre: unknown): string {
  const t = nombre == null ? "" : String(nombre).trim();
  return t === "." ? "" : t;
}
