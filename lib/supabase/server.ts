import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";
import type { Rol } from "../roles";

/** Cliente de Supabase para Server Components, Server Actions y Route Handlers. */
export async function supabaseServidor() {
  const almacen = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => almacen.set(name, value, options));
        } catch {
          // En Server Components no se pueden escribir cookies; el proxy refresca la sesión.
        }
      },
    },
  });
}

/** Sesión verificada (firma del JWT) con el rol. null si no hay sesión o no tiene rol. */
export async function sesionActual(): Promise<{ usuario: string; rol: Rol } | null> {
  const supabase = await supabaseServidor();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const rol = (claims?.app_metadata as { rol?: string } | undefined)?.rol;
  if (!claims?.sub || (rol !== "admin" && rol !== "empleada")) return null;
  return { usuario: claims.sub, rol };
}

/** Para páginas de admin: si no es admin, lo manda a Imprimir. (RLS también lo bloquea en la BD.) */
export async function requiereAdmin() {
  const sesion = await sesionActual();
  if (sesion?.rol !== "admin") redirect("/imprimir");
  return sesion;
}
