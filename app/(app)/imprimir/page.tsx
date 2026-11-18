import Proximamente from "@/components/Proximamente";
import { sesionActual, supabaseServidor } from "@/lib/supabase/server";

export const metadata = { title: "Imprimir · Etiquetas" };

/** Fase 1: muestra que la sesión, el rol y la base de datos funcionan. La lista llega en la fase 2. */
export default async function Imprimir() {
  const sesion = await sesionActual();
  const supabase = await supabaseServidor();
  const [total, sinTamano] = await Promise.all([
    supabase.from("productos").select("codigo", { count: "exact", head: true }),
    supabase.from("productos").select("codigo", { count: "exact", head: true }).is("tamano", null).eq("activo", true),
  ]);

  return (
    <>
      <Proximamente
        titulo="IMPRIMIR ETIQUETAS"
        fase={2}
        texto="Aquí vas a escanear productos, armar la lista y descargar los PDF para la Zebra."
      />
      <div className="flex max-w-2xl flex-col gap-1 rounded-[18px] border border-borde bg-white p-6 text-base">
        <p>
          Entraste como <b>{sesion?.rol === "admin" ? "Admin" : "Empleadas"}</b>.
        </p>
        {total.error ? (
          <p className="text-enlace">No se pudo leer el catálogo: {total.error.message}</p>
        ) : (
          <p>
            Catálogo cargado: <b>{(total.count ?? 0).toLocaleString("es-MX")}</b> productos
            {sesion?.rol === "admin" && <> · {sinTamano.count ?? 0} activos sin tamaño</>}.
          </p>
        )}
      </div>
    </>
  );
}
