# Etiquetas De Tocho Morocho

App web interna para generar etiquetas de precio con código de barras de la tienda **De Tocho Morocho** (importadora, León, Gto.). La usan 2 personas: la dueña (no técnica) y su hijo. Es un proyecto de la tienda, independiente de cualquier agencia.

## Stack
- Next.js (App Router, TypeScript) desplegado en Vercel.
- Supabase: Postgres + Auth (login por correo). Solo 2 usuarios, sin roles.
- PDFs generados **en el navegador** (jsPDF + bwip-js o JsBarcode). Nada de generar PDFs en el servidor.
- UI en español de México. Diseño: seguir el diseño de Claude Design (carpeta `/design` o el enlace que se indique).

## Hardware (ya probado en la tienda)
- Impresora **Zebra ZD220d** (térmica directa, 203 dpi), driver ZDesigner v10 por USB.
- Escáneres: pistola y escáner de bola Honeywell/Metrologic Orbit MK7120 (modo teclado USB: teclean el código + Enter).
- Punto de venta: **Multicomercio** (Windows). La app NO se integra en vivo; solo intercambia archivos Excel.

## Reglas de negocio
- **Los códigos son solo dígitos.** Los escáneres convierten el guion "-" en apóstrofo "'" con el teclado en español, así que un código con guion nunca se encuentra en caja. Validar `^\d+$` al crear o editar. Normalizar entradas del escáner: quitar espacios y, si llega `'`, avisar.
- Cada producto tiene tamaño de etiqueta: `grande` o `chica` (o vacío = falta asignar; no se puede imprimir hasta asignarlo).
- Producto creado en la app → `pendiente_multicomercio = true` hasta que se exporte y se dé de alta en Multicomercio.

## Modelo de datos (tabla `productos`)
| campo | tipo | nota |
|---|---|---|
| codigo | text PK | solo dígitos |
| nombre | text | puede venir vacío en el catálogo heredado |
| precio | numeric(10,2) | |
| categoria | text | |
| tamano | text | 'grande' \| 'chica' \| null |
| activo | boolean | |
| pendiente_multicomercio | boolean | default false |
| updated_at | timestamptz | |

Opcional: tabla `lista_impresion` (codigo, cantidad, usuario) para que la lista sobreviva recargas y se comparta entre los 2 usuarios.

Carga inicial: `data/catalogo_inicial.csv` (1,160 productos, ya sin guiones y con tamaño asignado; 38 sin tamaño, 11 inactivos).

## Pantallas
1. **Login** por correo.
2. **Imprimir** (principal): campo de búsqueda/escaneo siempre enfocado. Código exacto existente + Enter → agrega (o suma 1). Texto → sugerencias por nombre. Código inexistente → abre "Producto nuevo" con el código precargado. Lista con cantidad −/+, chip de tamaño, quitar. Resumen: grandes = N etiquetas; chicas = N etiquetas = ceil(N/3) hileras. Botones "Descargar PDF grandes" y "Descargar PDF chicas".
3. **Producto nuevo**: código, nombre, precio, categoría, tamaño, con vista previa en vivo de la etiqueta. Al guardar: se agrega a la lista y queda pendiente en Multicomercio.
4. **Catálogo**: búsqueda; filtros por categoría, tamaño, sin tamaño, pendientes y activos; edición rápida; "Agregar a impresión".
5. **Sincronizar**: (a) subir el Excel de productos de Multicomercio → mostrar resumen de cambios → aplicar; (b) "Exportar pendientes" a Excel. La plantilla oficial de importación de Multicomercio aún no la tenemos: por ahora exportar columnas código, nombre, precio, categoría, y dejar el formato aislado en una función para cambiarlo después.

## Formato del Excel de productos de Multicomercio (todo.xlsx)
- Una sola hoja. Fila 0 = encabezados: `Artículo | | | Código | Precio 1 | Activo`.
- Filas de categoría: columna B = `Categoría : NOMBRE (COUNT=n)` → extraer NOMBRE.
- Filas de producto: B = nombre (puede ser "." = sin nombre), D = código (texto), E = precio (puede venir como 62.9999 → redondear a 2 decimales), F = "Verdadero"/"Falso".
- La última fila puede traer basura (código sin precio) → ignorar filas sin precio.
- El reporte de existencias (.xls) es XML SpreadsheetML generado por FastReport, no un Excel binario (por si después se usa).

## Especificación de etiquetas (PROBADA EN LA IMPRESORA, no cambiar sin probar)
Unidades en mm. Origen (0,0) = esquina inferior izquierda de la página (convertir si la librería usa la superior). Código de barras **Code128**, sin texto integrado (el número se dibuja aparte), sin quiet zone añadida por la librería. Ancho de módulo en múltiplos de 0.125 mm (203 dpi).

**Grande — página 38 × 25 mm, 1 etiqueta por página**
- Nombre: Helvetica-Bold 7 pt, centrado, base en y = 25 − 2.7; si no cabe en 35.5 mm de ancho, reducir de 0.25 en 0.25 hasta 4.5 pt. Omitir si el nombre está vacío o es ".".
- Precio: Helvetica-Bold 10.5 pt, centrado, base en y = 25 − 6.6, formato `$ 1,234.00`.
- Barras: alto 12.5 mm, y = 3.0; módulo 0.375 mm, y si el ancho pasa de 33 mm, módulo 0.25 mm. Centrado horizontal.
- Número del código: Helvetica 6 pt, centrado, base en y = 0.8.

**Chica — rollo de 3 por hilera, página 90 × 13 mm, 3 etiquetas por página**
- Etiqueta de 27 × 13 mm en x = 1.5, 31.5 y 61.5 mm (separación de 3 mm).
- Precio: Helvetica-Bold 8 pt, centrado en la etiqueta, base en y = 9.2.
- Barras: alto 5.6 mm, y = 3.0; módulo 0.25 mm (si con 0.375 cabe en ≤ 25.4 mm se puede usar 0.375). Ancho máximo 25.4 mm.
- Número del código: Helvetica 5 pt, base en y = 1.1.
- Sin nombre. Las etiquetas se llenan de izquierda a derecha y de hilera en hilera; la última hilera puede quedar incompleta.

**Configuración del driver de la Zebra (instrucción para el usuario, mostrar en la UI)**
- Grande: Ancho 38 mm, Alto 25 mm, Tipo de medio "Etiquetas con espacios".
- Chica: Ancho 90 mm, Alto 13 mm, "Etiquetas con espacios".
- Imprimir siempre en **Tamaño real** (no "Ajustar"). Calibrar la Zebra al cambiar de rollo (mantener el botón y soltar al 2.º parpadeo).

## Verificación
- Test automatizado: renderizar páginas de muestra a 203 dpi en blanco y negro y decodificar cada código de barras (por ejemplo con zxing) comparando contra el código esperado.
- Casos borde: códigos de 1 a 5 dígitos, nombres de 29+ caracteres, precio con decimales raros, nombre vacío.
