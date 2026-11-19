import { redirect } from "next/navigation";
import Encabezado from "@/components/Encabezado";
import { sesionActual, supabaseServidor } from "@/lib/supabase/server";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/entrar");

  const supabase = await supabaseServidor();
  const [lista, pendientes] = await Promise.all([
    supabase.from("lista_impresion").select("codigo", { count: "exact", head: true }),
    sesion.rol === "admin"
      ? supabase.from("productos").select("codigo", { count: "exact", head: true }).eq("pendiente_multicomercio", true)
      : Promise.resolve({ count: 0 }),
  ]);

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <Encabezado rol={sesion.rol} nombre={sesion.nombre} enLista={lista.count ?? 0} pendientes={pendientes.count ?? 0} />
      <main className="flex flex-1 flex-col lg:min-h-0">{children}</main>
    </div>
  );
}
