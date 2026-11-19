import FlujoSincronizar from "@/components/sincronizar/FlujoSincronizar";
import { PanelLlegada, PanelPendientes } from "@/components/sincronizar/PanelesLaterales";
import { requiereAdmin, supabaseServidor } from "@/lib/supabase/server";
import { cargarProductos, ultimaSincronizacion } from "@/lib/datos";

export const metadata = { title: "Sincronizar · Etiquetas" };

export default async function Sincronizar() {
  await requiereAdmin();
  const supabase = await supabaseServidor();
  const [productos, ultima] = await Promise.all([cargarProductos(supabase), ultimaSincronizacion(supabase)]);
  return (
    <div className="flex flex-col gap-[18px] px-4 py-5 md:px-10 md:py-8">
      <h1 className="titulo text-[34px] md:text-[52px]">SINCRONIZAR CON MULTICOMERCIO</h1>
      <div className="flex flex-wrap items-start gap-[18px]">
        <FlujoSincronizar productos={productos} ultima={ultima} />
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-[18px]">
          <PanelPendientes productos={productos} />
          <PanelLlegada productos={productos} />
        </div>
      </div>
    </div>
  );
}
