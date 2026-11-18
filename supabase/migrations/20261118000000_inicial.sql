-- Etiquetas De Tocho Morocho — esquema inicial
-- Roles: el rol va en auth.users.raw_app_meta_data->>'rol' ('admin' | 'empleada').
-- Solo se puede poner desde el servidor (service role); el usuario no puede cambiarlo.

create extension if not exists pgcrypto with schema extensions;

-- ───────────────────────── helpers de rol ─────────────────────────
create or replace function public.rol_actual() returns text
language sql stable set search_path = '' as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'rol', '')
$$;

create or replace function public.es_admin() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(public.rol_actual() = 'admin', false)
$$;

-- Cualquier persona del equipo (admin o empleada). Un usuario autenticado SIN rol no ve nada.
create or replace function public.es_equipo() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(public.rol_actual() in ('admin', 'empleada'), false)
$$;

-- ───────────────────────── tablas ─────────────────────────
create table public.categorias (
  nombre text primary key check (length(trim(nombre)) > 0),
  origen text not null default 'multicomercio' check (origen in ('multicomercio', 'app')),
  created_at timestamptz not null default now()
);

create table public.productos (
  codigo text primary key check (codigo ~ '^[0-9A-Za-z]+$'),
  nombre text not null default '',
  precio numeric(10, 2) not null check (precio >= 0),
  categoria text references public.categorias (nombre) on update cascade,
  tamano text check (tamano in ('grande', 'chica')),
  activo boolean not null default true,
  etiqueta_unica boolean not null default false,
  pendiente_multicomercio boolean not null default false,
  updated_at timestamptz not null default now()
);
create index productos_nombre_idx on public.productos using gin (to_tsvector('simple', nombre));
create index productos_categoria_idx on public.productos (categoria);

create table public.lista_impresion (
  codigo text primary key references public.productos (codigo) on update cascade on delete cascade,
  cantidad integer not null check (cantidad > 0 and cantidad <= 10000),
  agregado_por uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.cambios (
  id bigint generated always as identity primary key,
  codigo text not null,
  tipo text not null check (tipo in (
    'alta', 'baja', 'nombre', 'sin_nombre', 'precio', 'activo', 'tamano',
    'categoria', 'etiqueta_unica', 'pendiente', 'movido'
  )),
  antes jsonb,
  despues jsonb,
  origen text not null check (origen in ('sync', 'manual', 'seed')),
  usuario uuid default auth.uid() references auth.users (id) on delete set null,
  fecha timestamptz not null default now()
);
create index cambios_codigo_idx on public.cambios (codigo, fecha desc);
create index cambios_fecha_idx on public.cambios (fecha desc);

create table public.impresiones (
  id bigint generated always as identity primary key,
  clase text not null check (clase in ('grande', 'chica')),
  formato_id text not null,
  total_etiquetas integer not null check (total_etiquetas >= 0),
  detalle jsonb not null,            -- [{codigo, nombre, precio, cantidad}]
  usuario uuid default auth.uid() references auth.users (id) on delete set null,
  fecha timestamptz not null default now()
);
create index impresiones_fecha_idx on public.impresiones (fecha desc);

-- Formatos de etiqueta. Los "probados" (grande-38x25, chica-3x27x13) son de fábrica:
-- la app usa la especificación del código (lib/etiquetas/spec.ts) y no se pueden editar.
create table public.formatos_etiqueta (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  clase text not null check (clase in ('grande', 'chica')),
  nombre text not null,
  diseno jsonb not null,
  probado boolean not null default false,
  activo boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index formatos_un_activo_por_clase on public.formatos_etiqueta (clase) where activo;

-- PINs de acceso. Sin políticas RLS: solo el servidor (service role) los lee.
create table public.pines (
  usuario uuid primary key references auth.users (id) on delete cascade,
  rol text not null check (rol in ('admin', 'empleada')),
  etiqueta text not null,            -- "Admin", "Empleadas"
  pin_hash text not null,
  updated_at timestamptz not null default now()
);

create table public.intentos_pin (
  id bigint generated always as identity primary key,
  ip text not null,
  ok boolean not null,
  fecha timestamptz not null default now()
);
create index intentos_pin_ip_idx on public.intentos_pin (ip, fecha desc);
create index intentos_pin_fecha_idx on public.intentos_pin (fecha desc);

-- ───────────────────────── triggers ─────────────────────────
create or replace function public.tocar_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger productos_updated_at before update on public.productos
for each row execute function public.tocar_updated_at();

-- Historial automático. El origen se toma de la variable de sesión app.origen
-- (la pone la función de sincronizar); si no hay, es 'manual'.
create or replace function public.registrar_cambios() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_origen text := coalesce(nullif(current_setting('app.origen', true), ''), 'manual');
begin
  if tg_op = 'INSERT' then
    insert into public.cambios (codigo, tipo, antes, despues, origen)
    values (new.codigo, 'alta', null, to_jsonb(new), v_origen);
    return new;
  end if;

  if new.nombre is distinct from old.nombre then
    insert into public.cambios (codigo, tipo, antes, despues, origen)
    values (new.codigo, case when new.nombre = '' then 'sin_nombre' else 'nombre' end,
            jsonb_build_object('nombre', old.nombre, 'tamano', old.tamano),
            jsonb_build_object('nombre', new.nombre, 'tamano', new.tamano), v_origen);
  end if;
  if new.precio is distinct from old.precio then
    insert into public.cambios (codigo, tipo, antes, despues, origen)
    values (new.codigo, 'precio', jsonb_build_object('precio', old.precio),
            jsonb_build_object('precio', new.precio), v_origen);
  end if;
  if new.activo is distinct from old.activo then
    insert into public.cambios (codigo, tipo, antes, despues, origen)
    values (new.codigo, case when new.activo then 'activo' else 'baja' end,
            jsonb_build_object('activo', old.activo), jsonb_build_object('activo', new.activo), v_origen);
  end if;
  if new.tamano is distinct from old.tamano then
    insert into public.cambios (codigo, tipo, antes, despues, origen)
    values (new.codigo, 'tamano', jsonb_build_object('tamano', old.tamano),
            jsonb_build_object('tamano', new.tamano), v_origen);
  end if;
  if new.categoria is distinct from old.categoria then
    insert into public.cambios (codigo, tipo, antes, despues, origen)
    values (new.codigo, 'categoria', jsonb_build_object('categoria', old.categoria),
            jsonb_build_object('categoria', new.categoria), v_origen);
  end if;
  if new.etiqueta_unica is distinct from old.etiqueta_unica then
    insert into public.cambios (codigo, tipo, antes, despues, origen)
    values (new.codigo, 'etiqueta_unica', jsonb_build_object('etiqueta_unica', old.etiqueta_unica),
            jsonb_build_object('etiqueta_unica', new.etiqueta_unica), v_origen);
  end if;
  if new.pendiente_multicomercio is distinct from old.pendiente_multicomercio then
    insert into public.cambios (codigo, tipo, antes, despues, origen)
    values (new.codigo, 'pendiente', jsonb_build_object('pendiente', old.pendiente_multicomercio),
            jsonb_build_object('pendiente', new.pendiente_multicomercio), v_origen);
  end if;
  return new;
end $$;

create trigger productos_historial after insert or update on public.productos
for each row execute function public.registrar_cambios();

-- ───────────────────────── PIN ─────────────────────────
-- Verifica un PIN. Límites: 5 fallos por IP en 15 min; 30 fallos en total en 15 min.
-- Devuelve el usuario si el PIN es correcto. Solo la llama el servidor (service role).
create or replace function public.verificar_pin(p_pin text, p_ip text)
returns table (usuario uuid, rol text, bloqueado boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_usuario uuid;
  v_rol text;
begin
  if (select count(*) from public.intentos_pin i
       where i.ip = p_ip and not i.ok and i.fecha > now() - interval '15 minutes') >= 5
     or (select count(*) from public.intentos_pin i
       where not i.ok and i.fecha > now() - interval '15 minutes') >= 30 then
    return query select null::uuid, null::text, true;
    return;
  end if;

  select p.usuario, p.rol into v_usuario, v_rol
  from public.pines p
  where p.pin_hash = extensions.crypt(p_pin, p.pin_hash)
  limit 1;

  insert into public.intentos_pin (ip, ok) values (p_ip, v_usuario is not null);
  delete from public.intentos_pin where fecha < now() - interval '30 days';

  return query select v_usuario, v_rol, false;
end $$;

-- Pone o cambia el PIN de un usuario. 6 dígitos y distinto a los demás PINs.
create or replace function public.establecer_pin(p_usuario uuid, p_rol text, p_etiqueta text, p_pin text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_pin !~ '^[0-9]{6}$' then
    raise exception 'El PIN debe tener 6 números.';
  end if;
  if exists (select 1 from public.pines p
             where p.usuario <> p_usuario and p.pin_hash = extensions.crypt(p_pin, p.pin_hash)) then
    raise exception 'Ese PIN ya lo usa otra persona.';
  end if;
  insert into public.pines (usuario, rol, etiqueta, pin_hash)
  values (p_usuario, p_rol, p_etiqueta, extensions.crypt(p_pin, extensions.gen_salt('bf', 10)))
  on conflict (usuario) do update
    set rol = excluded.rol, etiqueta = excluded.etiqueta,
        pin_hash = excluded.pin_hash, updated_at = now();
end $$;

revoke all on function public.verificar_pin(text, text) from public, anon, authenticated;
revoke all on function public.establecer_pin(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.verificar_pin(text, text) to service_role;
grant execute on function public.establecer_pin(uuid, text, text, text) to service_role;
revoke all on function public.registrar_cambios() from public, anon, authenticated;

-- ───────────────────────── RLS ─────────────────────────
alter table public.categorias enable row level security;
alter table public.productos enable row level security;
alter table public.lista_impresion enable row level security;
alter table public.cambios enable row level security;
alter table public.impresiones enable row level security;
alter table public.formatos_etiqueta enable row level security;
alter table public.pines enable row level security;
alter table public.intentos_pin enable row level security;

-- categorias: todos leen; admin crea/renombra
create policy categorias_leer on public.categorias for select to authenticated using (public.es_equipo());
create policy categorias_crear on public.categorias for insert to authenticated with check (public.es_admin());
create policy categorias_editar on public.categorias for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- productos: todos leen (hace falta para imprimir); solo admin crea/edita; nadie borra
create policy productos_leer on public.productos for select to authenticated using (public.es_equipo());
create policy productos_crear on public.productos for insert to authenticated with check (public.es_admin());
create policy productos_editar on public.productos for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- lista de impresión: compartida por todo el equipo
create policy lista_leer on public.lista_impresion for select to authenticated using (public.es_equipo());
create policy lista_agregar on public.lista_impresion for insert to authenticated with check (public.es_equipo());
create policy lista_cambiar on public.lista_impresion for update to authenticated
  using (public.es_equipo()) with check (public.es_equipo());
create policy lista_quitar on public.lista_impresion for delete to authenticated using (public.es_equipo());

-- historial: solo admin lo ve; lo escriben los triggers
create policy cambios_leer on public.cambios for select to authenticated using (public.es_admin());

-- impresiones: todos registran las suyas; solo admin ve el historial
create policy impresiones_registrar on public.impresiones for insert to authenticated
  with check (public.es_equipo() and usuario = auth.uid());
create policy impresiones_leer on public.impresiones for select to authenticated using (public.es_admin());

-- formatos: todos leen; admin administra solo los no probados
create policy formatos_leer on public.formatos_etiqueta for select to authenticated using (public.es_equipo());
create policy formatos_crear on public.formatos_etiqueta for insert to authenticated
  with check (public.es_admin() and not probado);
create policy formatos_editar on public.formatos_etiqueta for update to authenticated
  using (public.es_admin() and not probado) with check (public.es_admin() and not probado);
create policy formatos_borrar on public.formatos_etiqueta for delete to authenticated
  using (public.es_admin() and not probado);

-- pines e intentos_pin: sin políticas → nadie fuera del service role.

-- Lista compartida en vivo (celular ↔ PC)
alter publication supabase_realtime add table public.lista_impresion;
