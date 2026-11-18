import type { SupabaseClient } from "@supabase/supabase-js";
import { COLUMNAS_PRODUCTO, type Producto, type RenglonLista, type Tamano } from "./tipos";

/** PostgREST devuelve máximo 1,000 filas por consulta: se pide por páginas. */
export async function cargarProductos(sb: SupabaseClient): Promise<Producto[]> {
  const todos: Producto[] = [];
  const PAGINA = 1000;
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await sb
      .from("productos")
      .select(COLUMNAS_PRODUCTO)
      .order("codigo")
      .range(desde, desde + PAGINA - 1);
    if (error) throw error;
    todos.push(...(data as Producto[]).map((p) => ({ ...p, precio: Number(p.precio) })));
    if (!data || data.length < PAGINA) break;
  }
  return todos;
}

export async function cargarLista(sb: SupabaseClient): Promise<RenglonLista[]> {
  const { data, error } = await sb.from("lista_impresion").select("codigo,cantidad,created_at").order("created_at", { ascending: false });
  if (error) throw error;
  return data as RenglonLista[];
}

export async function agregarALista(sb: SupabaseClient, codigo: string, cantidad = 1): Promise<number> {
  const { data, error } = await sb.rpc("agregar_a_lista", { p_codigo: codigo, p_cantidad: cantidad });
  if (error) throw error;
  return data as number;
}

export async function fijarCantidad(sb: SupabaseClient, codigo: string, cantidad: number) {
  const { error } =
    cantidad <= 0
      ? await sb.from("lista_impresion").delete().eq("codigo", codigo)
      : await sb.from("lista_impresion").update({ cantidad: Math.min(cantidad, 10000) }).eq("codigo", codigo);
  if (error) throw error;
}

export async function vaciarLista(sb: SupabaseClient) {
  const { error } = await sb.rpc("vaciar_lista");
  if (error) throw error;
}

/** Solo admin (RLS). */
export async function asignarTamano(sb: SupabaseClient, codigo: string, tamano: Tamano) {
  const { data, error } = await sb.from("productos").update({ tamano }).eq("codigo", codigo).select("codigo");
  if (error) throw error;
  if (!data?.length) throw new Error("No tienes permiso para cambiar el tamaño.");
}

export async function registrarImpresion(
  sb: SupabaseClient,
  clase: Tamano,
  formatoId: string,
  detalle: { codigo: string; nombre: string; precio: number; cantidad: number }[],
  total: number,
) {
  const { error } = await sb.from("impresiones").insert({ clase, formato_id: formatoId, total_etiquetas: total, detalle });
  if (error) console.error("registrarImpresion", error); // no bloquea la impresión
}
