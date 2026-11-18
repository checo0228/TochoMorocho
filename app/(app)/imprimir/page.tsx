import PantallaImprimir from "@/components/imprimir/PantallaImprimir";
import { sesionActual, supabaseServidor } from "@/lib/supabase/server";
import { cargarLista, cargarProductos } from "@/lib/datos";
import { redirect } from "next/navigation";

export const metadata = { title: "Imprimir · Etiquetas" };

export default async function Imprimir() {
  const sesion = await sesionActual();
  if (!sesion) redirect("/entrar");
  const supabase = await supabaseServidor();
  const [productos, lista] = await Promise.all([cargarProductos(supabase), cargarLista(supabase)]);
  return <PantallaImprimir rol={sesion.rol} productosIniciales={productos} listaInicial={lista} />;
}
