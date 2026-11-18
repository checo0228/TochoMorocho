"use client";
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

let cliente: ReturnType<typeof createBrowserClient> | undefined;

/** Cliente de Supabase para el navegador (usa la sesión de las cookies). */
export function supabaseNavegador() {
  cliente ??= createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  return cliente;
}
