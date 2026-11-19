-- Una lista de impresión por PIN (por usuario), para que admin y empleadas trabajen al mismo tiempo.
-- El mismo PIN en la PC y en el celular comparte su lista (escanear con el celular, imprimir en la PC).

alter table public.lista_impresion add column usuario uuid references auth.users (id) on delete cascade;
update public.lista_impresion set usuario = agregado_por where usuario is null;
delete from public.lista_impresion where usuario is null; -- renglones sin dueño (no debería haber)
alter table public.lista_impresion alter column usuario set not null;
alter table public.lista_impresion alter column usuario set default auth.uid();

alter table public.lista_impresion drop constraint lista_impresion_pkey;
alter table public.lista_impresion add primary key (usuario, codigo);
create index lista_impresion_codigo_idx on public.lista_impresion (codigo);

-- RLS: cada quien ve y cambia solo su lista
drop policy lista_leer on public.lista_impresion;
drop policy lista_agregar on public.lista_impresion;
drop policy lista_cambiar on public.lista_impresion;
drop policy lista_quitar on public.lista_impresion;
create policy lista_leer on public.lista_impresion for select to authenticated
  using (public.es_equipo() and usuario = auth.uid());
create policy lista_agregar on public.lista_impresion for insert to authenticated
  with check (public.es_equipo() and usuario = auth.uid());
create policy lista_cambiar on public.lista_impresion for update to authenticated
  using (public.es_equipo() and usuario = auth.uid()) with check (public.es_equipo() and usuario = auth.uid());
create policy lista_quitar on public.lista_impresion for delete to authenticated
  using (public.es_equipo() and usuario = auth.uid());

-- Funciones: ahora sobre la lista de quien las llama
create or replace function public.agregar_a_lista(p_codigo text, p_cantidad integer default 1)
returns integer
language sql security invoker set search_path = '' as $$
  insert into public.lista_impresion as l (usuario, codigo, cantidad)
  values (auth.uid(), p_codigo, greatest(1, least(p_cantidad, 10000)))
  on conflict (usuario, codigo) do update
    set cantidad = least(l.cantidad + excluded.cantidad, 10000)
  returning cantidad
$$;

create or replace function public.agregar_varios_a_lista(p_items jsonb)
returns integer
language sql security invoker set search_path = '' as $$
  with entrada as (
    select e ->> 'codigo' as codigo, greatest(1, least(coalesce((e ->> 'cantidad')::integer, 1), 10000)) as cantidad
    from jsonb_array_elements(p_items) e
  ), unicos as (
    select codigo, sum(cantidad)::integer as cantidad from entrada group by codigo
  ), hecho as (
    insert into public.lista_impresion as l (usuario, codigo, cantidad)
    select auth.uid(), codigo, cantidad from unicos
    on conflict (usuario, codigo) do update set cantidad = least(l.cantidad + excluded.cantidad, 10000)
    returning 1
  )
  select count(*)::integer from hecho
$$;

create or replace function public.vaciar_lista()
returns void
language sql security invoker set search_path = '' as $$
  delete from public.lista_impresion where usuario = auth.uid()
$$;
