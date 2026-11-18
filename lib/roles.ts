export type Rol = "admin" | "empleada";

/** Rutas que solo puede abrir el admin. Las empleadas solo imprimen. */
export const RUTAS_ADMIN = ["/catalogo", "/producto", "/sincronizar", "/historial", "/ajustes"];

export const esRutaAdmin = (ruta: string) =>
  RUTAS_ADMIN.some((r) => ruta === r || ruta.startsWith(r + "/"));

export const PIN_VALIDO = /^[0-9]{6}$/;
