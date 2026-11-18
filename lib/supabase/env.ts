/** Variables de entorno de Supabase. La clave secreta SOLO existe en el servidor. */
/** Solo el origen (https://xxxx.supabase.co): si alguien pega la URL con /rest/v1/, se quita. */
export function limpiarUrlSupabase(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url.trim()).origin;
  } catch {
    return url.trim();
  }
}

export const SUPABASE_URL = limpiarUrlSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function supabaseConfigurado(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}
