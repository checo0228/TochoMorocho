import Proximamente from "@/components/Proximamente";
import { requiereAdmin } from "@/lib/supabase/server";

export const metadata = { title: "Sincronizar · Etiquetas" };

export default async function Sincronizar() {
  await requiereAdmin();
  return (
    <Proximamente
      titulo="SINCRONIZAR CON MULTICOMERCIO"
      fase={4}
      texto="Subir el Excel de productos, ver qué cambió (nuevos, códigos reutilizados, precios) y mandar a imprimir lo que necesita etiqueta nueva."
    />
  );
}
