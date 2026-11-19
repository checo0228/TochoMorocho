-- Fase 3: catálogo y producto nuevo. SECURITY INVOKER → RLS sigue aplicando (solo admin crea productos).

-- Agrega varios productos a la lista de una vez: p_items = [{"codigo": "869", "cantidad": 2}, …]
-- Devuelve cuántos renglones se tocaron.
create or replace function public.agregar_varios_a_lista(p_items jsonb)
returns integer
language sql security invoker set search_path = '' as $$
  with entrada as (
    select e ->> 'codigo' as codigo, greatest(1, least(coalesce((e ->> 'cantidad')::integer, 1), 10000)) as cantidad
    from jsonb_array_elements(p_items) e
  ), unicos as (
    select codigo, sum(cantidad)::integer as cantidad from entrada group by codigo
  ), hecho as (
    insert into public.lista_impresion as l (codigo, cantidad)
    select codigo, cantidad from unicos
    on conflict (codigo) do update set cantidad = least(l.cantidad + excluded.cantidad, 10000)
    returning 1
  )
  select count(*)::integer from hecho
$$;

-- Crea un producto en la app (queda pendiente para Multicomercio), crea la categoría si es nueva
-- y, si p_agregar > 0, lo agrega a la lista con esa cantidad. Todo o nada.
create or replace function public.crear_producto(
  p_codigo text,
  p_nombre text,
  p_precio numeric,
  p_categoria text,
  p_tamano text,
  p_etiqueta_unica boolean default false,
  p_agregar integer default 1
)
returns public.productos
language plpgsql security invoker set search_path = '' as $$
declare
  v public.productos;
begin
  if p_categoria is not null and length(trim(p_categoria)) > 0 then
    insert into public.categorias (nombre, origen) values (trim(p_categoria), 'app') on conflict (nombre) do nothing;
  end if;
  insert into public.productos (codigo, nombre, precio, categoria, tamano, activo, etiqueta_unica, pendiente_multicomercio)
  values (p_codigo, coalesce(trim(p_nombre), ''), round(p_precio, 2), nullif(trim(p_categoria), ''), p_tamano, true,
          coalesce(p_etiqueta_unica, false), true)
  returning * into v;
  if coalesce(p_agregar, 0) > 0 then
    perform public.agregar_a_lista(p_codigo, p_agregar);
  end if;
  return v;
end $$;

revoke all on function public.agregar_varios_a_lista(jsonb) from public, anon;
revoke all on function public.crear_producto(text, text, numeric, text, text, boolean, integer) from public, anon;
grant execute on function public.agregar_varios_a_lista(jsonb) to authenticated;
grant execute on function public.crear_producto(text, text, numeric, text, text, boolean, integer) to authenticated;
