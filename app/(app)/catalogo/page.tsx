import PantallaCatalogo from "@/components/catalogo/PantallaCatalogo";
import { requiereAdmin, supabaseServidor } from "@/lib/supabase/server";
import { cargarCategorias, cargarLista, cargarProductos } from "@/lib/datos";

export const metadata = { title: "Catálogo · Etiquetas" };

export default async function Catalogo() {
  await requiereAdmin();
  const supabase = await supabaseServidor();
  const [productos, lista, categorias] = await Promise.all([cargarProductos(supabase), cargarLista(supabase), cargarCategorias(supabase)]);
  return <PantallaCatalogo productosIniciales={productos} listaInicial={lista} categorias={categorias} />;
}
