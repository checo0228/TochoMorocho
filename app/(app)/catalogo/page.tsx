import Proximamente from "@/components/Proximamente";
import { requiereAdmin } from "@/lib/supabase/server";

export const metadata = { title: "Catálogo · Etiquetas" };

export default async function Catalogo() {
  await requiereAdmin();
  return (
    <Proximamente
      titulo="CATÁLOGO"
      fase={3}
      texto="Buscar productos, filtrar por categoría y tamaño, editar rápido y agregar a la impresión."
    />
  );
}
