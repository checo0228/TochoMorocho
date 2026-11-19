/**
 * Asigna tamaños en la base de datos de producción, SOLO a productos que no tienen tamaño
 * (no pisa lo que ya se asignó desde la app). Queda en el historial de cambios.
 *
 * Uso: npm run tamanos:asignar -- grande=1161,1163 chica=746
 * Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY en .env.local.
 */
import { createClient } from "@supabase/supabase-js";
import { limpiarUrlSupabase } from "../lib/supabase/env";

const url = limpiarUrlSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL);
const clave = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !clave) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local");
  process.exit(1);
}
const sb = createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });

const pedidos: { tamano: "grande" | "chica"; codigos: string[] }[] = [];
for (const arg of process.argv.slice(2)) {
  const m = arg.match(/^(grande|chica)=(.+)$/);
  if (!m) {
    console.error(`Argumento no válido: ${arg}`);
    process.exit(1);
  }
  pedidos.push({ tamano: m[1] as "grande" | "chica", codigos: m[2].split(",").map((c) => c.trim()).filter(Boolean) });
}

for (const { tamano, codigos } of pedidos) {
  const { data, error } = await sb.from("productos").update({ tamano }).in("codigo", codigos).is("tamano", null).select("codigo");
  if (error) throw error;
  const hechos = new Set(data.map((p) => p.codigo));
  console.log(`${tamano}: ${hechos.size} asignados${hechos.size ? ` (${[...hechos].join(", ")})` : ""}`);
  const omitidos = codigos.filter((c) => !hechos.has(c));
  if (omitidos.length) console.log(`  sin cambio (ya tenían tamaño o no existen): ${omitidos.join(", ")}`);
}
const { count } = await sb.from("productos").select("codigo", { count: "exact", head: true }).is("tamano", null);
console.log(`Quedan ${count} productos sin tamaño.`);
