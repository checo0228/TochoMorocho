/**
 * Actualiza data/catalogo.csv (tamaños asignados a mano) con un Excel nuevo de Multicomercio.
 * Uso: npm run catalogo:actualizar -- <catalogo_base.csv> <productos.xlsx> <salida.csv> [reporte.md]
 *
 * Reglas (CLAUDE.md):
 *  - mismo código y mismo nombre  → conserva tamaño y etiqueta única; toma precio, categoría y activo del Excel.
 *  - mismo código con OTRO nombre → es otro producto: tamaño vacío y etiqueta única = false.
 *  - código nuevo                 → tamaño vacío.
 *  - código que ya no viene       → se conserva como inactivo (no se borra).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { leerProductosMC } from "../lib/multicomercio/productos";
import { escribirCatalogoCSV, leerCatalogoCSV, type FilaCatalogo } from "../lib/catalogo-csv";

const [base, excel, salida, reporte] = process.argv.slice(2);
if (!base || !excel || !salida) {
  console.error("Uso: npm run catalogo:actualizar -- <base.csv> <productos.xlsx> <salida.csv> [reporte.md]");
  process.exit(1);
}

const anterior = new Map(leerCatalogoCSV(readFileSync(base, "utf8")).map((f) => [f.codigo, f]));
const { productos, rechazados } = leerProductosMC(readFileSync(excel));

const nuevos: FilaCatalogo[] = [];
const renombrados: { antes: FilaCatalogo; despues: FilaCatalogo }[] = [];
const precios: { antes: FilaCatalogo; despues: FilaCatalogo }[] = [];
const resultado: FilaCatalogo[] = [];
const enExcel = new Set<string>();

for (const p of productos) {
  enExcel.add(p.codigo);
  const a = anterior.get(p.codigo);
  const mismoProducto = a && a.nombre === p.nombre;
  const fila: FilaCatalogo = {
    codigo: p.codigo,
    nombre: p.nombre,
    precio: p.precio,
    categoria: p.categoria,
    activo: p.activo,
    tamano: mismoProducto ? a.tamano : null,
    etiqueta_unica: mismoProducto ? a.etiqueta_unica : false,
  };
  if (!a) nuevos.push(fila);
  else if (!mismoProducto) renombrados.push({ antes: a, despues: fila });
  else if (a.precio !== p.precio) precios.push({ antes: a, despues: fila });
  resultado.push(fila);
}
const desaparecidos = [...anterior.values()].filter((a) => !enExcel.has(a.codigo));
for (const a of desaparecidos) resultado.push({ ...a, activo: false });

writeFileSync(salida, escribirCatalogoCSV(resultado));

const n = (f: FilaCatalogo) => f.nombre || "(sin nombre)";
const lineas = [
  `# Actualización del catálogo`,
  ``,
  `- Base: \`${base}\` (${anterior.size} productos)`,
  `- Excel: \`${excel}\` (${productos.length} productos)`,
  `- Resultado: \`${salida}\` (${resultado.length} productos; ` +
    `${resultado.filter((f) => f.tamano === "grande").length} grandes, ` +
    `${resultado.filter((f) => f.tamano === "chica").length} chicas, ` +
    `${resultado.filter((f) => !f.tamano).length} sin tamaño, ` +
    `${resultado.filter((f) => !f.activo).length} inactivos, ` +
    `${resultado.filter((f) => f.etiqueta_unica).length} etiqueta única)`,
  ``,
  `## Nuevos (${nuevos.length}) — sin tamaño`,
  ...nuevos.map((f) => `- ${f.codigo} · ${n(f)} · $${f.precio.toFixed(2)} · ${f.categoria}`),
  ``,
  `## Código reutilizado / nombre cambiado (${renombrados.length}) — se quitó el tamaño`,
  ...renombrados.map(
    ({ antes, despues }) =>
      `- ${despues.codigo}: "${n(antes)}" → "${n(despues)}" (tenía ${antes.tamano ?? "sin tamaño"}${antes.etiqueta_unica ? ", etiqueta única" : ""})`,
  ),
  ``,
  `## Solo cambió el precio (${precios.length})`,
  ...precios.map(({ antes, despues }) => `- ${despues.codigo} · ${n(despues)}: $${antes.precio.toFixed(2)} → $${despues.precio.toFixed(2)}`),
  ``,
  `## Ya no vienen en el Excel (${desaparecidos.length}) — marcados inactivos`,
  ...desaparecidos.map((f) => `- ${f.codigo} · ${n(f)}`),
  ``,
  `## Rechazados (${rechazados.length})`,
  ...rechazados.map((r) => `- fila ${r.fila}: "${r.codigo}" — ${r.motivo}`),
  ``,
];
if (reporte) writeFileSync(reporte, lineas.join("\n"));
console.log(lineas.join("\n"));
