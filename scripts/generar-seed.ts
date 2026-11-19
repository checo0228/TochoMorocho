/**
 * Genera supabase/seed.sql desde data/catalogo.csv (categorías, productos y formatos probados).
 * Uso: npm run db:seed-sql
 * Después: pegar supabase/seed.sql en el SQL Editor de Supabase (o `supabase db reset` en local).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { leerCatalogoCSV } from "../lib/catalogo-csv";
import { FORMATOS_PROBADOS } from "../lib/etiquetas/spec";

const filas = leerCatalogoCSV(readFileSync("data/catalogo.csv", "utf8"));
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

const categorias = [...new Set(filas.map((f) => f.categoria).filter(Boolean))].sort();

const sql = [
  "-- GENERADO por scripts/generar-seed.ts desde data/catalogo.csv — no editar a mano.",
  `-- ${filas.length} productos, ${categorias.length} categorías.`,
  "begin;",
  "select set_config('app.origen', 'seed', true);",
  "",
  "insert into public.categorias (nombre, origen) values",
  categorias.map((c) => `  (${q(c)}, 'multicomercio')`).join(",\n"),
  "on conflict (nombre) do nothing;",
  "",
  // nombre_mc / precio_mc / categoria_mc = lo último que dijo Multicomercio (migración 20261121000000)
  "insert into public.productos (codigo, nombre, precio, categoria, tamano, activo, etiqueta_unica, nombre_mc, precio_mc, categoria_mc) values",
  filas
    .map((f) => {
      const cat = f.categoria ? q(f.categoria) : "null";
      return (
        `  (${q(f.codigo)}, ${q(f.nombre)}, ${f.precio.toFixed(2)}, ${cat}, ` +
        `${f.tamano ? q(f.tamano) : "null"}, ${f.activo}, ${f.etiqueta_unica}, ${q(f.nombre)}, ${f.precio.toFixed(2)}, ${cat})`
      );
    })
    .join(",\n"),
  "on conflict (codigo) do nothing;",
  "",
  "insert into public.formatos_etiqueta (id, clase, nombre, diseno, probado, activo) values",
  FORMATOS_PROBADOS.map(
    (d) => `  (${q(d.id)}, ${q(d.clase)}, ${q(d.nombre)}, ${q(JSON.stringify(d))}::jsonb, true, true)`,
  ).join(",\n"),
  "on conflict (id) do nothing;",
  "",
  "commit;",
  "",
].join("\n");

writeFileSync("supabase/seed.sql", sql);
console.log(`supabase/seed.sql: ${filas.length} productos, ${categorias.length} categorías, ${FORMATOS_PROBADOS.length} formatos.`);
