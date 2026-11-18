# Despliegue (Supabase + Vercel)

Se hace una sola vez. Las claves **nunca** se escriben en el repo ni en el chat: van en `.env.local` (tu PC) y en Vercel.

## 1. Supabase (cuenta personal de Sergio)
1. Crear un proyecto nuevo, por ejemplo `etiquetas-tocho-morocho`, en la región **East US** o la más cercana. Guarda la contraseña de la base en tu gestor de contraseñas.
2. **Authentication → Sign In / Providers**:
   - Desactivar **Allow new users to sign up**, para que nadie pueda crearse una cuenta.
   - En **Email**, dejar activo el proveedor. Los accesos se crean desde el script con correos `.invalid`, que no reciben nada.
3. **SQL Editor → New query**: pegar y correr **cada archivo de `supabase/migrations/` en orden** (por fecha en el nombre):
   - `20261118000000_inicial.sql` (fase 1)
   - `20261119000000_lista_impresion.sql` (fase 2)
   Cuando haya una migración nueva, se corre solo esa.
4. **SQL Editor → New query**: pegar todo `supabase/seed.sql` y dar **Run**. Carga 1,168 productos al 17 nov, 14 categorías y los 2 formatos de etiqueta probados.
5. **Project Settings → API Keys**: copiar la URL del proyecto, la clave **publishable** (o la *anon* antigua) y la **secret** (o la *service_role* antigua).

## 2. En tu PC: crear los accesos con PIN
1. Copiar `.env.example` como `.env.local` y llenar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY`.
2. Elegir 2 PINs de 6 números, distintos entre sí y que no sean obvios como 123456 o una fecha. Ponerlos en `PIN_ADMIN` y `PIN_EMPLEADAS`.
3. Correr `npm run usuarios:crear`.
4. **Borrar** `PIN_ADMIN` y `PIN_EMPLEADAS` de `.env.local`.
5. Probar en local con `npm run dev`, abrir http://localhost:3000 y entrar con cada PIN.

Para cambiar un PIN después, vuelve a ponerlo en `.env.local`, corre `npm run usuarios:crear` y bórralo otra vez.

## 3. Vercel (cuenta personal de Sergio, entrando con GitHub checo0228)
1. **Add New → Project → Import** el repo `checo0228/TochoMorocho`. La primera vez Vercel pide permiso para leer el repo de GitHub.
2. Framework: Next.js. No hay que cambiar nada más.
3. **Environment Variables**: agregar estas 3 en Production y Preview:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
   No agregues los PINs.
4. **Deploy**. Queda en `https://<nombre>.vercel.app`; el nombre se puede cambiar en Settings → Domains.
5. Cada `git push` a `main` vuelve a desplegar solo.

## Seguridad, en corto
- Los PINs se guardan cifrados con bcrypt en Postgres y solo el servidor los puede leer.
- Después de 5 PINs fallidos desde la misma conexión hay que esperar 15 minutos. Con 30 fallos en total se bloquean todos durante 15 minutos.
- La base revisa el rol (RLS) en cada consulta. Las empleadas pueden leer productos y usar la lista de impresión, pero no pueden editar nada ni ver el historial.
- Una cuenta sin rol no ve nada, aunque alguien lograra crearla.
