import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabaseConfigurado } from "./lib/supabase/env";
import { esRutaAdmin } from "./lib/roles";

const PUBLICAS = ["/entrar", "/api/pin"];

/**
 * Refresca la sesión de Supabase y hace las redirecciones por rol.
 * Es solo una primera barrera: la seguridad real está en RLS (Postgres) y en cada página.
 */
export async function proxy(request: NextRequest) {
  const ruta = request.nextUrl.pathname;
  const esPublica = PUBLICAS.some((p) => ruta === p || ruta.startsWith(p + "/"));
  let respuesta = NextResponse.next({ request });

  if (!supabaseConfigurado()) {
    return esPublica ? respuesta : NextResponse.redirect(new URL("/entrar", request.url));
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        respuesta = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const rol = (data?.claims?.app_metadata as { rol?: string } | undefined)?.rol;
  const conSesion = rol === "admin" || rol === "empleada";

  const redirigir = (destino: string) => {
    const r = NextResponse.redirect(new URL(destino, request.url));
    respuesta.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  if (!conSesion && !esPublica) return redirigir("/entrar");
  if (conSesion && ruta === "/entrar") return redirigir("/imprimir");
  if (rol === "empleada" && esRutaAdmin(ruta)) return redirigir("/imprimir");
  return respuesta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|marca/|.*\.(?:png|jpg|svg|ico|webmanifest)$).*)"],
};
