-- Fase 4: sincronizar con Multicomercio.

-- Registro de cada sincronización ("Última vez: …" y auditoría)
create table public.sincronizaciones (
  id bigint generated always as identity primary key,
  archivo text not null,
  leidos integer not null,
  resumen jsonb not null,           -- {"nuevo": 8, "reutilizado": 26, ...}
  usuario uuid default auth.uid() references auth.users (id) on delete set null,
  fecha timestamptz not null default now()
);
alter table public.sincronizaciones enable row level security;
create policy sincronizaciones_leer on public.sincronizaciones for select to authenticated using (public.es_admin());

-- Aplica una sincronización completa en una sola transacción (todo o nada).
-- p_filas: filas finales calculadas en la app (lib/sync/diff.ts), cada una con
--   codigo, nombre, precio, categoria, activo, tamano, etiqueta_unica, oculto,
--   pendiente_multicomercio, nombre_mc, precio_mc, categoria_mc
-- p_movidos: [{"codigo": "248", "de": ["249"]}] para dejarlo en el historial.
-- SECURITY DEFINER porque escribe en el historial; por eso revisa que sea admin.
create or replace function public.aplicar_sync(p_filas jsonb, p_movidos jsonb, p_archivo text, p_leidos integer, p_resumen jsonb)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_n integer;
begin
  if not public.es_admin() then
    raise exception 'Solo el admin puede sincronizar.' using errcode = '42501';
  end if;
  perform set_config('app.origen', 'sync', true);

  insert into public.categorias (nombre, origen)
  select distinct f ->> 'categoria', 'multicomercio'
  from jsonb_array_elements(p_filas) f
  where nullif(trim(f ->> 'categoria'), '') is not null
  on conflict (nombre) do nothing;

  insert into public.productos as p (
    codigo, nombre, precio, categoria, activo, tamano, etiqueta_unica, oculto,
    pendiente_multicomercio, nombre_mc, precio_mc, categoria_mc
  )
  select
    f ->> 'codigo',
    coalesce(f ->> 'nombre', ''),
    round((f ->> 'precio')::numeric, 2),
    nullif(trim(f ->> 'categoria'), ''),
    (f ->> 'activo')::boolean,
    nullif(f ->> 'tamano', ''),
    coalesce((f ->> 'etiqueta_unica')::boolean, false),
    coalesce((f ->> 'oculto')::boolean, false),
    coalesce((f ->> 'pendiente_multicomercio')::boolean, false),
    f ->> 'nombre_mc',
    round((f ->> 'precio_mc')::numeric, 2),
    nullif(trim(f ->> 'categoria_mc'), '')
  from jsonb_array_elements(p_filas) f
  on conflict (codigo) do update set
    nombre = excluded.nombre,
    precio = excluded.precio,
    categoria = excluded.categoria,
    activo = excluded.activo,
    tamano = excluded.tamano,
    etiqueta_unica = excluded.etiqueta_unica,
    oculto = excluded.oculto,
    pendiente_multicomercio = excluded.pendiente_multicomercio,
    nombre_mc = excluded.nombre_mc,
    precio_mc = excluded.precio_mc,
    categoria_mc = excluded.categoria_mc;
  get diagnostics v_n = row_count;

  insert into public.cambios (codigo, tipo, antes, despues, origen)
  select m ->> 'codigo', 'movido', jsonb_build_object('de', m -> 'de'), null, 'sync'
  from jsonb_array_elements(coalesce(p_movidos, '[]'::jsonb)) m;

  insert into public.sincronizaciones (archivo, leidos, resumen) values (p_archivo, p_leidos, p_resumen);
  return v_n;
end $$;

revoke all on function public.aplicar_sync(jsonb, jsonb, text, integer, jsonb) from public, anon;
grant execute on function public.aplicar_sync(jsonb, jsonb, text, integer, jsonb) to authenticated;
