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

export async function cargarCategorias(sb: SupabaseClient): Promise<string[]> {
  const { data, error } = await sb.from("categorias").select("nombre").order("nombre");
  if (error) throw error;
  return (data as { nombre: string }[]).map((c) => c.nombre);
}

/** Varios a la lista en una sola operación. Devuelve cuántos renglones se tocaron. */
export async function agregarVariosALista(sb: SupabaseClient, items: { codigo: string; cantidad: number }[]): Promise<number> {
  if (items.length === 0) return 0;
  const { data, error } = await sb.rpc("agregar_varios_a_lista", { p_items: items });
  if (error) throw error;
  return data as number;
}

/** Solo admin. Crea el producto (pendiente para Multicomercio) y lo agrega a la lista. */
export async function crearProducto(
  sb: SupabaseClient,
  p: { codigo: string; nombre: string; precio: number; categoria: string; tamano: Tamano; etiquetaUnica: boolean; agregar: number },
): Promise<Producto> {
  const { data, error } = await sb
    .rpc("crear_producto", {
      p_codigo: p.codigo,
      p_nombre: p.nombre,
      p_precio: p.precio,
      p_categoria: p.categoria,
      p_tamano: p.tamano,
      p_etiqueta_unica: p.etiquetaUnica,
      p_agregar: p.agregar,
    })
    .single<Producto>();
  if (error) {
    if (error.code === "23505") throw new Error("Ese código ya existe.");
    throw error;
  }
  return { ...data, precio: Number(data.precio) };
}

export type CambiosProducto = Partial<Pick<Producto, "nombre" | "precio" | "tamano" | "etiqueta_unica" | "categoria">>;

/** Solo admin (RLS). */
export async function actualizarProducto(sb: SupabaseClient, codigo: string, cambios: CambiosProducto) {
  const { data, error } = await sb.from("productos").update(cambios).eq("codigo", codigo).select("codigo");
  if (error) throw error;
  if (!data?.length) throw new Error("No tienes permiso para cambiar este producto.");
}
