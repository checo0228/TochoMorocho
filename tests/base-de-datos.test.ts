/**
 * Aplica la migración y el seed reales en un Postgres embebido (PGlite) con un "Supabase mínimo"
 * (esquema auth, roles anon/authenticated/service_role, auth.jwt()) y revisa RLS por rol y el PIN.
 */
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { beforeAll, describe, expect, it } from "vitest";

const ADMIN = "00000000-0000-0000-0000-00000000000a";
const EMPLEADA = "00000000-0000-0000-0000-00000000000e";
const SIN_ROL = "00000000-0000-0000-0000-000000000000";

const SUPABASE_MINIMO = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create schema extensions;
  create table auth.users (id uuid primary key, email text);
  create function auth.jwt() returns jsonb language sql stable as
    $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt() ->> 'sub')::uuid $$;
  grant usage on schema public, auth, extensions to anon, authenticated, service_role;
  grant execute on all functions in schema auth to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  create publication supabase_realtime;
`;

let db: PGlite;

/** Ejecuta como un rol de Supabase con los claims dados (como hace PostgREST). */
async function como<T>(rol: string, claims: object | null, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; select set_config('request.jwt.claims', '', false);`);
  if (claims) await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify(claims)]);
  await db.exec(`set role ${rol}`);
  try {
    return await db.query<T>(sql, params);
  } finally {
    await db.exec(`reset role`);
  }
}
const admin = { sub: ADMIN, role: "authenticated", app_metadata: { rol: "admin" } };
const empleada = { sub: EMPLEADA, role: "authenticated", app_metadata: { rol: "empleada" } };
const sinRol = { sub: SIN_ROL, role: "authenticated", app_metadata: {} };

beforeAll(async () => {
  db = await PGlite.create({ extensions: { pgcrypto } });
  await db.exec(SUPABASE_MINIMO);
  await db.exec(readFileSync("supabase/migrations/20261118000000_inicial.sql", "utf8"));
  await db.exec(readFileSync("supabase/migrations/20261119000000_lista_impresion.sql", "utf8"));
  await db.exec(readFileSync("supabase/migrations/20261120000000_catalogo.sql", "utf8"));
  await db.exec(readFileSync("supabase/seed.sql", "utf8"));
  await db.exec(`
    insert into auth.users (id, email) values
      ('${ADMIN}', 'admin@x.invalid'), ('${EMPLEADA}', 'empleadas@x.invalid'), ('${SIN_ROL}', 'otro@x.invalid');
  `);
  await como("service_role", null, `select public.establecer_pin($1, 'admin', 'Admin', '111111')`, [ADMIN]);
  await como("service_role", null, `select public.establecer_pin($1, 'empleada', 'Empleadas', '222222')`, [EMPLEADA]);
}, 120_000);

describe("seed", () => {
  it("carga 1,168 productos, 14 categorías y los 2 formatos probados", async () => {
    const r = await db.query<{ p: number; c: number; f: number }>(
      `select (select count(*)::int from productos) p, (select count(*)::int from categorias) c,
              (select count(*)::int from formatos_etiqueta where probado and activo) f`,
    );
    expect(r.rows[0]).toEqual({ p: 1168, c: 14, f: 2 });
  });
  it("el historial registra las altas como 'seed'", async () => {
    const r = await db.query<{ n: number }>(`select count(*)::int n from cambios where tipo = 'alta' and origen = 'seed'`);
    expect(r.rows[0].n).toBe(1168);
  });
  it("respeta el check de códigos sin guiones", async () => {
    await expect(db.query(`insert into productos (codigo, precio) values ('899-18', 10)`)).rejects.toThrow();
  });
});

describe("RLS", () => {
  it("anon no ve nada", async () => {
    const r = await como<{ n: number }>("anon", null, `select count(*)::int n from productos`);
    expect(r.rows[0].n).toBe(0);
  });
  it("un usuario autenticado SIN rol no ve nada", async () => {
    const r = await como<{ n: number }>("authenticated", sinRol, `select count(*)::int n from productos`);
    expect(r.rows[0].n).toBe(0);
  });

  it("empleada ve productos pero no los puede cambiar ni crear", async () => {
    const r = await como<{ n: number }>("authenticated", empleada, `select count(*)::int n from productos`);
    expect(r.rows[0].n).toBe(1168);
    const u = await como("authenticated", empleada, `update productos set precio = 1 where codigo = '869'`);
    expect(u.affectedRows).toBe(0);
    await expect(
      como("authenticated", empleada, `insert into productos (codigo, precio) values ('999999', 1)`),
    ).rejects.toThrow(/row-level security/);
  });

  it("empleada usa la lista de impresión y registra impresiones, pero no ve historial", async () => {
    await como("authenticated", empleada, `insert into lista_impresion (codigo, cantidad) values ('869', 3)`);
    const l = await como<{ agregado_por: string }>("authenticated", admin, `select agregado_por from lista_impresion where codigo = '869'`);
    expect(l.rows[0].agregado_por).toBe(EMPLEADA); // la lista es compartida
    await como(
      "authenticated",
      empleada,
      `insert into impresiones (clase, formato_id, total_etiquetas, detalle) values ('grande', 'grande-38x25', 3, '[]')`,
    );
    const c = await como<{ n: number }>("authenticated", empleada, `select count(*)::int n from cambios`);
    expect(c.rows[0].n).toBe(0);
    const i = await como<{ n: number }>("authenticated", empleada, `select count(*)::int n from impresiones`);
    expect(i.rows[0].n).toBe(0);
  });

  it("admin edita y el cambio queda en el historial como 'manual' con su usuario", async () => {
    const u = await como("authenticated", admin, `update productos set precio = 16 where codigo = '869'`);
    expect(u.affectedRows).toBe(1);
    const c = await como<{ tipo: string; origen: string; usuario: string; antes: { precio: number } }>(
      "authenticated",
      admin,
      `select tipo, origen, usuario, antes from cambios where codigo = '869' and tipo = 'precio'`,
    );
    expect(c.rows).toHaveLength(1);
    expect(c.rows[0]).toMatchObject({ tipo: "precio", origen: "manual", usuario: ADMIN });
    expect(Number(c.rows[0].antes.precio)).toBe(15);
  });

  it("nadie puede editar los formatos probados", async () => {
    const u = await como("authenticated", admin, `update formatos_etiqueta set nombre = 'x' where probado`);
    expect(u.affectedRows).toBe(0);
  });

  it("nadie del equipo ve los PINs", async () => {
    const r = await como<{ n: number }>("authenticated", admin, `select count(*)::int n from pines`);
    expect(r.rows[0].n).toBe(0);
  });
});

describe("lista de impresión (fase 2)", () => {
  it("agregar_a_lista suma de forma atómica y respeta RLS", async () => {
    await como("authenticated", admin, `select public.vaciar_lista()`);
    const a = await como<{ n: number }>("authenticated", empleada, `select public.agregar_a_lista('802', 1) n`);
    const b = await como<{ n: number }>("authenticated", admin, `select public.agregar_a_lista('802', 4) n`);
    expect([a.rows[0].n, b.rows[0].n]).toEqual([1, 5]);
    await expect(como("authenticated", sinRol, `select public.agregar_a_lista('802', 1)`)).rejects.toThrow(/row-level security/);
    await expect(como("anon", null, `select public.agregar_a_lista('802', 1)`)).rejects.toThrow(/permission denied/);
  });
  it("vaciar_lista borra todo (empleada también puede)", async () => {
    await como("authenticated", empleada, `select public.vaciar_lista()`);
    const r = await db.query<{ n: number }>(`select count(*)::int n from lista_impresion`);
    expect(r.rows[0].n).toBe(0);
  });
});

describe("catálogo y producto nuevo (fase 3)", () => {
  it("agregar_varios_a_lista suma repetidos y respeta cantidades", async () => {
    await como("authenticated", admin, `select public.vaciar_lista()`);
    const r = await como<{ n: number }>(
      "authenticated",
      empleada,
      `select public.agregar_varios_a_lista('[{"codigo":"869","cantidad":2},{"codigo":"84"},{"codigo":"869","cantidad":1}]') n`,
    );
    expect(r.rows[0].n).toBe(2);
    const l = await db.query<{ codigo: string; cantidad: number }>(`select codigo, cantidad from lista_impresion order by codigo`);
    expect(l.rows).toEqual([
      { codigo: "84", cantidad: 1 },
      { codigo: "869", cantidad: 3 },
    ]);
  });

  it("admin crea producto: queda pendiente, crea la categoría nueva, lo agrega a la lista y deja historial", async () => {
    await como("authenticated", admin, `select public.vaciar_lista()`);
    const r = await como<{ codigo: string; pendiente_multicomercio: boolean; precio: string }>(
      "authenticated",
      admin,
      `select * from public.crear_producto('77001', 'termo acero 500 ml', 149.999, 'TERMOS', 'grande', false, 3)`,
    );
    expect(r.rows[0]).toMatchObject({ codigo: "77001", pendiente_multicomercio: true });
    expect(Number(r.rows[0].precio)).toBe(150);
    const c = await db.query<{ origen: string }>(`select origen from categorias where nombre = 'TERMOS'`);
    expect(c.rows[0].origen).toBe("app");
    const l = await db.query<{ cantidad: number }>(`select cantidad from lista_impresion where codigo = '77001'`);
    expect(l.rows[0].cantidad).toBe(3);
    const h = await db.query<{ origen: string; usuario: string }>(`select origen, usuario from cambios where codigo = '77001' and tipo = 'alta'`);
    expect(h.rows[0]).toMatchObject({ origen: "manual", usuario: ADMIN });
  });

  it("no se puede crear con un código que ya existe ni con guion", async () => {
    await expect(como("authenticated", admin, `select public.crear_producto('869', 'x', 1, null, 'grande')`)).rejects.toThrow(/duplicate|llave duplicada|unique/i);
    await expect(como("authenticated", admin, `select public.crear_producto('899-18', 'x', 1, null, 'grande')`)).rejects.toThrow(/check/i);
  });

  it("empleada no puede crear productos (y no queda nada a medias)", async () => {
    await expect(
      como("authenticated", empleada, `select public.crear_producto('77002', 'x', 1, 'OTRA', 'grande')`),
    ).rejects.toThrow(/row-level security/);
    const c = await db.query<{ n: number }>(`select count(*)::int n from categorias where nombre = 'OTRA'`);
    expect(c.rows[0].n).toBe(0);
  });
});

describe("PIN", () => {
  const verificar = (pin: string, ip: string) =>
    como<{ usuario: string | null; rol: string | null; bloqueado: boolean }>(
      "service_role",
      null,
      `select * from public.verificar_pin($1, $2)`,
      [pin, ip],
    ).then((r) => r.rows[0]);

  it("el PIN correcto devuelve su usuario y rol", async () => {
    expect(await verificar("111111", "1.1.1.1")).toEqual({ usuario: ADMIN, rol: "admin", bloqueado: false });
    expect(await verificar("222222", "1.1.1.1")).toEqual({ usuario: EMPLEADA, rol: "empleada", bloqueado: false });
  });

  it("PIN incorrecto no devuelve usuario", async () => {
    expect(await verificar("333333", "2.2.2.2")).toEqual({ usuario: null, rol: null, bloqueado: false });
  });

  it("bloquea una IP tras 5 fallos en 15 min, aunque luego ponga el PIN bueno; otra IP sigue entrando", async () => {
    for (let i = 0; i < 4; i++) await verificar("000000", "3.3.3.3"); // + 0 previos en esta IP = 4
    expect((await verificar("000000", "3.3.3.3")).bloqueado).toBe(false); // 5.º fallo
    expect(await verificar("111111", "3.3.3.3")).toMatchObject({ usuario: null, bloqueado: true });
    expect(await verificar("111111", "4.4.4.4")).toMatchObject({ usuario: ADMIN, bloqueado: false });
  });

  it("establecer_pin exige 6 números y que no se repita", async () => {
    await expect(como("service_role", null, `select public.establecer_pin($1, 'admin', 'Admin', '12345')`, [ADMIN])).rejects.toThrow(/6 números/);
    await expect(como("service_role", null, `select public.establecer_pin($1, 'admin', 'Admin', '222222')`, [ADMIN])).rejects.toThrow(/otra persona/);
  });

  it("el navegador (authenticated/anon) no puede llamar a las funciones de PIN", async () => {
    await expect(como("authenticated", admin, `select * from public.verificar_pin('111111', 'x')`)).rejects.toThrow(/permission denied/);
    await expect(como("anon", null, `select * from public.verificar_pin('111111', 'x')`)).rejects.toThrow(/permission denied/);
    await expect(
      como("authenticated", admin, `select public.establecer_pin($1, 'admin', 'Admin', '999999')`, [ADMIN]),
    ).rejects.toThrow(/permission denied/);
  });
});
