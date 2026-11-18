# Preguntas abiertas

Respuestas de Sergio. Claude Code: si una respuesta está vacía, usar la opción marcada como default y seguir.

## Cuentas y despliegue
1. ¿Qué correo de la tienda se usa para Supabase y Vercel? ¿Ya están creadas las cuentas?
   R: Ya están creadas. Supabase y Vercel van en las cuentas personales de Sergio. Vercel se pensó en la cuenta de Draft, pero no puede ver un repo personal del que solo es colaborador.
2. ¿Dominio propio o basta `tochomorocho.vercel.app`? (default: vercel.app)
   R: Default: dominio de Vercel.
## Uso diario
3. ¿En qué equipo se usa? ¿Solo la PC del mostrador (Windows + Chrome) o también el celular? Con celular se podría escanear con la cámara. (default: solo PC)
   R: PC del mostrador (Windows + Chrome) **y** celular (escaneo con cámara).
4. ¿Quién inventa hoy el código cuando llega un producto nuevo: tu mamá o Multicomercio? ¿Quieres que la app sugiera el siguiente código libre y **bloquee reutilizar códigos**? Reutilizarlos es la raíz del problema de etiquetas viejas que escanean otro producto. (default: sugerir y advertir)
   R: Los inventa la dueña. **No** sugerir ni bloquear: reutilizar códigos de productos que ya no se surten es intencional.
5. Flujo de alta: ¿el producto se crea primero en la app y luego en Multicomercio, o al revés (Multicomercio → subir Excel → imprimir)? (default: soportar ambos)
   R: Primero en Multicomercio → exportar Excel → subir a la app → detecta nuevos y modificados → actualiza BD → imprimir.
6. ¿Quieres cantidades sugeridas a partir del reporte de existencias? (default: sí, opcional)
   R: Sí.
## Impresión
7. ¿Basta con descargar el PDF e imprimir, o quieres imprimir directo desde la app? Directo sería con ZPL y Zebra Browser Print: evita el driver y las trabas de la cola de Windows, pero hay que instalar un programa en la PC y volver a probar todo en la impresora. (default: PDF ahora; ZPL en fase 5)
   R: Basta con descargar el PDF.
8. Si el proveedor de rollos nuevo cambia la medida (no 38×25 o no 3×27×13), ¿la app debe permitir configurar tamaños? (default: no, fijos)
   R: Sí, permitir configurar tamaños.
## Datos
9. ¿Las categorías son una lista fija (las de Multicomercio) o se pueden crear nuevas en la app? (default: lista de Multicomercio + "nueva" con aviso)
   R: "SI" (ambiguo) → se toma el default: lista de Multicomercio + "nueva" con aviso.
10. ¿Se guarda historial de precios e impresiones? (default: sí, tabla `cambios`)
    R: Sí.
11. ¿Tienes la plantilla de importación de Multicomercio? Exporta una de ejemplo y súbela a `data/muestras/`.
    R: Se usa el mismo Excel que exporta Multicomercio (`data/muestras/productos_2026-11-17.xlsx`). "Exportar pendientes" genera ese mismo formato.
12. Hay 7 productos sin tamaño: 89920 triptico, 89913, 432, 443, 2054 (sin nombre), 90034 lampara mano buy, 90022 guante fitnes. ¿Grande o chica?
    R: Se quedan sin tamaño (pendientes). La app pide elegir tamaño al agregarlos a la lista.
## Acceso
13. Tu mamá: ¿correo + contraseña con sesión que no expire (default), o PIN corto en la PC de la tienda?
    R: PIN de admin + PIN de empleadas. Empleadas: solo imprimir etiquetas; sin ver catálogo/BD ni modificar nada.
## Respuestas adicionales (18 nov 2026)
- `llegada_ejemplo.xlsx`: columnas código, nombre, cantidad, tamaño (g/ch), nuevo (s/n). La columna "nuevo" no hace falta porque la sincronización ya detecta los productos nuevos. La subida de la llegada para llenar la lista con cantidades queda como opcional en la Fase 4.
- Excel del 17 nov copiado a `data/muestras/productos_2026-11-17.xlsx`. Contra el del 13 nov: 8 nuevos (1161–1168), 31 con nombre cambiado, 2 solo de precio (802, 750), 0 desaparecidos.
