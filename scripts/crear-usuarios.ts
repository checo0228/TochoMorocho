/**
 * Crea (o actualiza) los accesos de la app y les pone su PIN. Cada PIN tiene su propia lista de impresión.
 *   - Admin        (rol admin):    ve y edita todo.                  Variable PIN_ADMIN
 *   - Empleadas    (rol empleada): solo imprime (PIN compartido).    Variable PIN_EMPLEADAS
 *   - Una empleada (rol empleada): igual, pero con PIN y lista propios.
 *     Variable EMPLEADAS="Ana:123456,Lupita:234567"
 *
 * Solo se tocan los accesos cuya variable tenga valor (así puedes cambiar un solo PIN).
 *
 * Uso (en la PC, nunca en Vercel):
 *   1. En .env.local pon NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY y los PINs (6 números cada uno).
 *   2. npm run usuarios:crear
 *   3. Borra los PINs de .env.local.
 *
 * Los correos terminan en .invalid (dominio reservado): Supabase nunca manda nada ahí.
 */
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { limpiarUrlSupabase } from "../lib/supabase/env";

const url = limpiarUrlSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL);
const clave = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !clave) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local");
  process.exit(1);
}

const DOMINIO = "etiquetas-tochomorocho.invalid";
const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

interface Acceso {
  email: string;
  rol: "admin" | "empleada";
  etiqueta: string;
  pin: string;
  variable: string;
}

const accesos: Acceso[] = [];
if (process.env.PIN_ADMIN) accesos.push({ email: `admin@${DOMINIO}`, rol: "admin", etiqueta: "Admin", pin: process.env.PIN_ADMIN, variable: "PIN_ADMIN" });
if (process.env.PIN_EMPLEADAS)
  accesos.push({ email: `empleadas@${DOMINIO}`, rol: "empleada", etiqueta: "Empleadas", pin: process.env.PIN_EMPLEADAS, variable: "PIN_EMPLEADAS" });
for (const par of (process.env.EMPLEADAS ?? "").split(",").map((x) => x.trim()).filter(Boolean)) {
  const [nombre, pin] = par.split(":").map((x) => x?.trim() ?? "");
  if (!nombre || !slug(nombre)) {
    console.error(`EMPLEADAS: falta el nombre en "${par}". Formato: Nombre:123456`);
    process.exit(1);
  }
  accesos.push({ email: `empleada-${slug(nombre)}@${DOMINIO}`, rol: "empleada", etiqueta: `Empleada ${nombre}`, pin, variable: `EMPLEADAS (${nombre})` });
}

if (accesos.length === 0) {
  console.error("No hay PINs en .env.local (PIN_ADMIN, PIN_EMPLEADAS o EMPLEADAS).");
  process.exit(1);
}
for (const a of accesos) {
  if (!/^[0-9]{6}$/.test(a.pin)) {
    console.error(`PIN de ${a.etiqueta}: debe tener 6 números (${a.variable}).`);
    process.exit(1);
  }
}
if (new Set(accesos.map((a) => a.pin)).size !== accesos.length) {
  console.error("Cada acceso necesita un PIN distinto.");
  process.exit(1);
}

const supabase = createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: lista, error: el } = await supabase.auth.admin.listUsers({ perPage: 1000 });
if (el) throw el;

for (const a of accesos) {
  let id = lista.users.find((u) => u.email === a.email)?.id;
  if (!id) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: a.email,
      email_confirm: true,
      password: randomBytes(32).toString("base64url"), // nadie la usa: se entra con PIN
      app_metadata: { rol: a.rol, nombre: a.etiqueta },
    });
    if (error) throw error;
    id = data.user.id;
    console.log(`Creado: ${a.etiqueta}`);
  } else {
    const { error } = await supabase.auth.admin.updateUserById(id, { app_metadata: { rol: a.rol, nombre: a.etiqueta } });
    if (error) throw error;
    console.log(`Actualizado: ${a.etiqueta}`);
  }
  // establecer_pin rechaza un PIN que ya use otra persona (también de las que no tocaste aquí)
  const { error: ep } = await supabase.rpc("establecer_pin", { p_usuario: id, p_rol: a.rol, p_etiqueta: a.etiqueta, p_pin: a.pin });
  if (ep) {
    console.error(`  No se pudo guardar el PIN de ${a.etiqueta}: ${ep.message}`);
    process.exitCode = 1;
    continue;
  }
  console.log(`  PIN guardado para ${a.etiqueta}.`);
}
console.log("Listo. Ahora borra los PINs de .env.local.");
