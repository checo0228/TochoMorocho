/**
 * Verifica la herramienta de prueba de 203 dpi con los PDFs de referencia, que ya se
 * imprimieron y se escanearon bien en la tienda. Si esto pasa, el mismo test sirve para
 * validar los PDFs que genere la app (fase 2).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { leerEtiquetasPdf, renderizarPdf } from "./util/barras";
import { CHICA, GRANDE } from "../lib/etiquetas/spec";

// Casos de docs/referencia/etiquetas_ref.py (84 va con cantidad 2)
const CODIGOS = ["869", "8", "90051", "802", "901A", "84", "84"];

describe("PDFs de referencia leídos a 203 dpi en blanco y negro", () => {
  it("grande: una etiqueta de 38 × 25 mm por página y todos los códigos se leen", async () => {
    const pdf = readFileSync("docs/referencia/muestras_grande.pdf");
    const paginas = renderizarPdf(pdf);
    expect(paginas).toHaveLength(CODIGOS.length);
    // 38 × 25 mm a 203 dpi ≈ 304 × 200 px
    expect(paginas[0].ancho).toBeGreaterThanOrEqual(303);
    expect(paginas[0].ancho).toBeLessThanOrEqual(305);
    expect(paginas[0].alto).toBeGreaterThanOrEqual(199);
    expect(paginas[0].alto).toBeLessThanOrEqual(201);

    const leidos = await leerEtiquetasPdf(pdf, [[0, GRANDE.pagina.ancho]]);
    expect(leidos.map((f) => f[0])).toEqual(CODIGOS);
  });

  it("chica: hileras de 3 en 90 × 13 mm, cada etiqueta se lee en su lugar", async () => {
    const pdf = readFileSync("docs/referencia/muestras_chica.pdf");
    const columnas = CHICA.columnasX.map((x) => [x, CHICA.etiqueta.ancho] as [number, number]);
    const leidos = await leerEtiquetasPdf(pdf, columnas);
    expect(leidos).toEqual([
      ["869", "8", "90051"],
      ["802", "901A", "84"],
      ["84", "", ""], // la última hilera queda incompleta
    ]);
  });
});
