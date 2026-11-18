-- Fase 2: operaciones atómicas sobre la lista de impresión (varios equipos escanean a la vez).
-- SECURITY INVOKER: corren con los permisos del usuario, así que RLS sigue aplicando.

-- Suma piezas a un producto de la lista (o lo agrega). Devuelve la cantidad nueva.
create or replace function public.agregar_a_lista(p_codigo text, p_cantidad integer default 1)
returns integer
language sql security invoker set search_path = '' as $$
  insert into public.lista_impresion as l (codigo, cantidad)
  values (p_codigo, greatest(1, least(p_cantidad, 10000)))
  on conflict (codigo) do update
    set cantidad = least(l.cantidad + excluded.cantidad, 10000)
  returning cantidad
$$;

-- Vacía la lista completa.
create or replace function public.vaciar_lista()
returns void
language sql security invoker set search_path = '' as $$
  delete from public.lista_impresion where true
$$;

revoke all on function public.agregar_a_lista(text, integer) from public, anon;
revoke all on function public.vaciar_lista() from public, anon;
grant execute on function public.agregar_a_lista(text, integer) to authenticated;
grant execute on function public.vaciar_lista() to authenticated;

-- Para que Realtime mande la fila completa al borrar.
alter table public.lista_impresion replica identity full;
