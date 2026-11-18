import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServidor } from "@/lib/supabase/server";
import { PIN_VALIDO } from "@/lib/roles";

/**
 * Entrar con PIN. El PIN se compara en Postgres (bcrypt) con límite de intentos por IP y global.
 * Si es correcto se abre la sesión de Supabase de ese usuario con un enlace mágico generado
 * en el servidor (no se manda ningún correo).
 */
export async function POST(request: NextRequest) {
  const { pin } = (await request.json().catch(() => ({}))) as { pin?: unknown };
  if (typeof pin !== "string" || !PIN_VALIDO.test(pin)) {
    return NextResponse.json({ error: "El PIN tiene 6 números." }, { status: 400 });
  }
  const ip =
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "desconocida";

  const admin = supabaseAdmin();
  const { data, error } = await admin.rpc("verificar_pin", { p_pin: pin, p_ip: ip }).single<{
    usuario: string | null;
    rol: string | null;
    bloqueado: boolean;
  }>();
  if (error) {
    console.error("verificar_pin", error);
    return NextResponse.json({ error: "No se pudo revisar el PIN. Intenta otra vez." }, { status: 500 });
  }
  if (data.bloqueado) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera 15 minutos y vuelve a intentar." },
      { status: 429 },
    );
  }
  if (!data.usuario) return NextResponse.json({ error: "PIN incorrecto." }, { status: 401 });

  const { data: u, error: eu } = await admin.auth.admin.getUserById(data.usuario);
  const email = u?.user?.email;
  if (eu || !email) {
    console.error("getUserById", eu);
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 500 });
  }
  const { data: link, error: el } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (el || !link.properties?.hashed_token) {
    console.error("generateLink", el);
    return NextResponse.json({ error: "No se pudo abrir la sesión." }, { status: 500 });
  }

  const supabase = await supabaseServidor();
  const { error: ev } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  if (ev) {
    console.error("verifyOtp", ev);
    return NextResponse.json({ error: "No se pudo abrir la sesión." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, rol: data.rol });
}
