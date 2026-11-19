-- Editar, ocultar y eliminar productos.
--
-- * oculto: solo de la app. Lo esconde del catálogo, de las sugerencias y del aviso de "sin tamaño".
--   La sincronización no lo toca (si el código se reutiliza, igual avisa).
-- * nombre_mc / precio_mc / categoria_mc: lo último que dijo Multicomercio. La sincronización compara
--   el Excel contra estos (no contra lo editado en la app), así un nombre editado aquí no se confunde
--   con un código reutilizado. Si el valor de la app ≠ el de Multicomercio → "editado en la app".
--   En productos creados en la app (pendientes) quedan en null hasta que aparecen en el Excel.
-- * Eliminar de verdad: solo productos pendientes (no existen en Multicomercio). Queda en el historial.

alter table public.productos
  add column oculto boolean not null default false,
  add column nombre_mc text,
  add column precio_mc numeric(10, 2),
  add column categoria_mc text;

update public.productos
set nombre_mc = nombre, precio_mc = precio, categoria_mc = categoria
where not pendiente_multicomercio;

-- nuevos tipos de historial
alter table public.cambios drop constraint cambios_tipo_check;
alter table public.cambios add constraint cambios_tipo_check check (tipo in (
  'alta', 'baja', 'nombre', 'sin_nombre', 'precio', 'activo', 'tamano',
  'categoria', 'etiqueta_unica', 'pendiente', 'movido', 'oculto', 'eliminado'
));

create or replace function public.registrar_ocultos_y_bajas() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_origen text := coalesce(nullif(current_setting('app.origen', true), ''), 'manual');
begin
  if tg_op = 'DELETE' then
    insert into public.cambios (codigo, tipo, antes, despues, origen)
    values (old.codigo, 'eliminado', to_jsonb(old), null, v_origen);
    return old;
  end if;
  if new.oculto is distinct from old.oculto then
    insert into public.cambios (codigo, tipo, antes, despues, origen)
    values (new.codigo, 'oculto', jsonb_build_object('oculto', old.oculto), jsonb_build_object('oculto', new.oculto), v_origen);
  end if;
  return new;
end $$;
revoke all on function public.registrar_ocultos_y_bajas() from public, anon, authenticated;

create trigger productos_ocultos after update of oculto on public.productos
for each row execute function public.registrar_ocultos_y_bajas();
create trigger productos_eliminados after delete on public.productos
for each row execute function public.registrar_ocultos_y_bajas();

-- solo admin, y solo pendientes
create policy productos_eliminar on public.productos for delete to authenticated
  using (public.es_admin() and pendiente_multicomercio);
