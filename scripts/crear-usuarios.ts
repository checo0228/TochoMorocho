/**
 * Crea (o actualiza) los 2 accesos de la app y les pone su PIN.
 *   - Admin      (rol admin):    ve y edita todo.
 *   - Empleadas  (rol empleada): solo imprime.
 *
 * Uso (en la PC, nunca en Vercel):
 *   1. En .env.local pon NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, PIN_ADMIN y PIN_EMPLEADAS (6 números).
 *   2. npm run usuarios:crear
 *   3. Borra PIN_ADMIN y PIN_EMPLEADAS de .env.local.
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

const ACCESOS = [
  { email: "admin@etiquetas-tochomorocho.invalid", rol: "admin", etiqueta: "Admin", pin: process.env.PIN_ADMIN },
  {
    email: "empleadas@etiquetas-tochomorocho.invalid",
    rol: "empleada",
    etiqueta: "Empleadas",
    pin: process.env.PIN_EMPLEADAS,
  },
] as const;

const supabase = createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });

for (const a of ACCESOS) {
  if (!a.pin || !/^[0-9]{6}$/.test(a.pin)) {
    console.error(`PIN de ${a.etiqueta}: debe tener 6 números (variable ${a.rol === "admin" ? "PIN_ADMIN" : "PIN_EMPLEADAS"}).`);
    process.exit(1);
  }
}
if (ACCESOS[0].pin === ACCESOS[1].pin) {
  console.error("El PIN de Admin y el de Empleadas tienen que ser distintos.");
  process.exit(1);
}

const { data: lista, error: el } = await supabase.auth.admin.listUsers({ perPage: 1000 });
if (el) throw el;

for (const a of ACCESOS) {
  let id = lista.users.find((u) => u.email === a.email)?.id;
  if (!id) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: a.email,
      email_confirm: true,
      password: randomBytes(32).toString("base64url"), // nadie la usa: se entra con PIN
      app_metadata: { rol: a.rol },
    });
    if (error) throw error;
    id = data.user.id;
    console.log(`Creado: ${a.etiqueta}`);
  } else {
    const { error } = await supabase.auth.admin.updateUserById(id, { app_metadata: { rol: a.rol } });
    if (error) throw error;
    console.log(`Actualizado: ${a.etiqueta}`);
  }
  const { error: ep } = await supabase.rpc("establecer_pin", {
    p_usuario: id,
    p_rol: a.rol,
    p_etiqueta: a.etiqueta,
    p_pin: a.pin,
  });
  if (ep) throw ep;
  console.log(`  PIN guardado para ${a.etiqueta}.`);
}
console.log("Listo. Ahora borra PIN_ADMIN y PIN_EMPLEADAS de .env.local.");
