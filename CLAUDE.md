# Etiquetas De Tocho Morocho

App web interna para generar etiquetas de precio con código de barras de la tienda **De Tocho Morocho** (importadora, León, Gto.). La usan la dueña (no técnica), su hijo Sergio y las empleadas, en la PC del mostrador (Windows + Chrome) y en el celular. Proyecto de la tienda: Supabase y Vercel (Hobby, conectado a GitHub `checo0228/TochoMorocho`, despliegue automático en cada push a `main`) van en las cuentas personales de Sergio, con el dominio `*.vercel.app`. Nada vive en Draft Studio.

Hoy las etiquetas se generan a mano con scripts de Python a partir de exportaciones de Multicomercio. La app reemplaza ese proceso: la dueña debe poder hacerlo sola.

## Estado actual
- Diseño UI hecho en Claude Design: `design/` (HTML exportado + assets del logo). Seguirlo.
- Catálogo al día (17 nov 2026): `data/catalogo.csv`, generado con `npm run catalogo:actualizar` a partir de `data/catalogo_2026-11-13.csv` y `data/muestras/productos_2026-11-17.xlsx`. Los cambios están en `data/catalogo_2026-11-17_cambios.md`.
- Generador de referencia probado en la impresora: `docs/referencia/etiquetas_ref.py` (+ PDFs de muestra). **La app debe producir PDFs equivalentes.**
- Archivos reales de Multicomercio para pruebas: `data/muestras/`.
- Fase 1 hecha: base Next.js + Supabase, login con PIN y tests. Despliegue: `docs/DESPLIEGUE.md`.
- Fase 2 hecha: pantalla Imprimir (escaneo con pistola y cámara, lista compartida en vivo, PDFs grande/chica, partes de 300 páginas). Los PDFs salen **idénticos píxel por píxel a 203 dpi** a los de `etiquetas_ref.py` (`tests/pdf.test.ts`).

## Stack
- Next.js (App Router, TypeScript), desplegado en Vercel.
- Supabase: Postgres + Auth. **Acceso por PIN de 6 números** con 2 roles en `app_metadata.rol`: `admin` (todo) y `empleada` (solo Imprimir: no ve catálogo, sincronizar ni historial, y no edita). El PIN se valida en `/api/pin` (bcrypt en Postgres, límite de intentos) y abre una sesión larga. RLS por rol: `es_admin()` / `es_equipo()`.
- PDFs generados **en el navegador** con jsPDF (`lib/etiquetas/pdf.ts`). Nada de PDFs en servidor. La vista previa en pantalla usa la misma composición (`componerEtiqueta`).
  - Code128: port propio de reportlab (`lib/etiquetas/code128.ts`), porque JsBarcode y bwip-js eligen otros juegos de caracteres (B/C) y dibujan otras barras. Está verificado contra reportlab con 3,011 códigos (`tests/fixtures/code128_reportlab.json`, generado con `scripts/fixture-code128.py`).
  - Anchos de texto con las métricas Adobe de Helvetica (`lib/etiquetas/metricas-helvetica.ts`). Las de jsPDF están redondeadas y descuadraban el centrado hasta 0.06 mm.
- Lectura de Excel en el navegador (SheetJS `xlsx` 0.20.3 desde cdn.sheetjs.com).
- Celular: escaneo con la cámara (BarcodeDetector) además de la pistola.
- UI en español de México, pensada para una persona no técnica: botones grandes, pocos pasos, mensajes claros.
- Secretos solo en variables de entorno (`.env.local`, Vercel). Nunca subir la service role key al repo.

## Hardware (probado)
- **Zebra ZD220d**, térmica directa, 203 dpi, driver ZDesigner v10.6 por USB.
- Escáneres en modo teclado USB (teclean el código + Enter): pistola y Honeywell/Metrologic Orbit MK7120 (bola, ya configurado a longitud mínima 1).
- Punto de venta: **Multicomercio** (Windows). Sin integración en vivo: solo intercambio de archivos Excel.

## Reglas de negocio (aprendidas a la mala, no cambiar)
- **Códigos sin guiones ni espacios.** Con teclado en español los escáneres convierten "-" en "'", y el código no se encuentra en caja. Validar `^[0-9A-Za-z]+$` (existe `901A`, alfanumérico, funciona). Al escanear: quitar espacios; si llega `'`, avisar.
- **Multicomercio reutiliza códigos para productos distintos** (lo hace la dueña a propósito con productos que ya no se surten: la app NO lo bloquea ni sugiere códigos). Si un código cambia de nombre, es OTRO producto: las etiquetas viejas con ese código ya no sirven y hay que reasignar tamaño. Si solo cambia el precio, hay que reimprimir todas las piezas.
- Producto con nombre vacío o "." en Multicomercio = sin nombre (descontinuado o pendiente). La etiqueta se imprime sin nombre.
- Tamaño de etiqueta por producto: `grande` | `chica` | vacío (no se puede imprimir hasta asignarlo).
- `etiqueta_unica = true`: se imprime 1 sola etiqueta aunque haya varias piezas (exhibición/anaquel).
- Producto creado en la app → `pendiente_multicomercio = true` hasta exportarlo y darlo de alta en Multicomercio.

## Modelo de datos
`productos`
| campo | tipo | nota |
|---|---|---|
| codigo | text PK | `^[0-9A-Za-z]+$` |
| nombre | text | puede venir vacío |
| precio | numeric(10,2) | |
| categoria | text | |
| tamano | text | 'grande' \| 'chica' \| null |
| activo | boolean | |
| etiqueta_unica | boolean | default false |
| pendiente_multicomercio | boolean | default false |
| updated_at | timestamptz | |

`lista_impresion` (codigo, cantidad, agregado_por, created_at): la lista sobrevive recargas y la comparte todo el equipo, en vivo entre celular y PC (Realtime).
`cambios` (historial: codigo, tipo, antes, despues, fecha, origen 'sync'|'manual'): sirve para "qué cambió" y para auditar.

Carga inicial: `data/catalogo.csv` → `supabase/seed.sql` (`npm run db:seed-sql`): 1,168 productos (854 grandes, 268 chicas, 46 sin tamaño, 11 inactivos, 12 etiqueta única). Hay 46 sin tamaño: los 7 de siempre, los 8 nuevos (1161–1168) y 31 códigos reutilizados al 17 nov. **No** incluye costos: la app no los necesita.

Otras tablas: `categorias`, `impresiones` (historial de impresiones), `formatos_etiqueta` (los 2 probados más los que se configuren), `pines` e `intentos_pin` (solo servidor).

## Pantallas
1. **Login** con teclado de PIN (`/entrar`).
2. **Imprimir** (principal). Campo de búsqueda/escaneo siempre enfocado:
   - Código exacto + Enter → agrega a la lista (o suma 1).
   - Texto → sugerencias por nombre.
   - Código inexistente → admin: abre "Producto nuevo" con el código precargado; empleada: aviso "avísale a la encargada".
   - Lista con cantidad −/+, chip de tamaño y quitar.
   - Resumen: grandes = N etiquetas; chicas = N etiquetas = ceil(N/3) hileras.
   - Botones "Descargar PDF grandes" y "Descargar PDF chicas", con recordatorio del preset del driver.
   - Si el PDF tiene más de 300 páginas, ofrecer dividirlo en partes (la cola de impresión de Windows se traba con trabajos grandes).
3. **Producto nuevo**: código, nombre, precio, categoría, tamaño, con vista previa en vivo de la etiqueta. Al guardar: se agrega a la lista y queda pendiente para Multicomercio.
4. **Catálogo**:
   - Búsqueda y filtros: categoría, tamaño, sin tamaño, pendientes, activos.
   - Edición rápida y "Agregar a impresión".
   - Imprimir por categoría.
5. **Sincronizar con Multicomercio**:
   - (a) Subir el Excel de productos → resumen de cambios → el usuario aplica y, con un clic, "Agregar a impresión" los que necesitan etiqueta nueva.
   - (b) "Exportar pendientes" a Excel.
   - (c) Opcional: subir el reporte de existencias para sugerir cantidades.

### Detección de cambios al sincronizar (comparar por código contra la BD)
| caso | regla | acción sugerida |
|---|---|---|
| Código nuevo | no existía | asignar tamaño, imprimir |
| Código desaparecido | ya no viene | marcar inactivo (no borrar) |
| Nombre cambió | producto distinto con código reutilizado | **alerta fuerte**: etiquetas viejas inválidas; reasignar tamaño; imprimir todas |
| Solo precio cambió | | reimprimir todas las piezas |
| Nombre quedó vacío | descontinuado | avisar |
| Mismo nombre aparece con otro código | código movido (p. ej. "cable v8" 249→248) | avisar: quitar etiquetas viejas del código anterior |
| Activo cambió | | actualizar |

Probar con `data/muestras/productos_2026-11-04.xlsx` → `productos_2026-11-13.xlsx`. Resultado esperado: 0 códigos nuevos o eliminados; 30 con nombre cambiado, entre ellos 2 movidos (cable v8 249→248, kit envase 269→626); 1 solo-precio (869 gorro navidad $15); 6 que quedaron sin nombre (2093, 2146, 607, 49, 746, 505); 0 cambios de activo. Ojo: hay nombres repetidos en el catálogo, así que la detección de "movidos" debe tolerar duplicados.

## Formatos de Multicomercio
**Excel de productos** (`.xlsx`, una hoja). Buscar las columnas **por encabezado** en la fila 0, no por posición (la exportación cambia):
- Encabezados: `Artículo | | | SKU | Código | Se vende por | impuestos | Marca | Proveedor | Precio 1 | Activo | Costo`.
- Fila de categoría: columna B = `Categoría : NOMBRE (COUNT=n)` → extraer NOMBRE.
- Fila de producto: B = nombre ("." = sin nombre); Código (texto); Precio 1 (puede venir 62.9999 → redondear a 2 decimales); Activo = "Verdadero"/"Falso".
- Ignorar filas sin precio (la última fila trae basura).

**Reporte de existencias** (`.xls`): en realidad es XML SpreadsheetML generado por FastReport, no un Excel binario. Código en columna B, descripción en F, existencia en O (índice 14). Puede traer existencias negativas o con decimales → tratar ≤0 como 0.

**Importación a Multicomercio**: se usa el mismo formato del Excel de productos que exporta Multicomercio. "Exportar pendientes" genera ese formato, aislado en una función.

**Llegada** (`llegada_ejemplo.xlsx`, opcional): código, nombre, cantidad, tamaño (g/ch) y nuevo (s/n). Sirve para llenar la lista con las piezas que llegaron. La columna "nuevo" se ignora.

## Especificación de etiquetas (PROBADA EN LA IMPRESORA, no cambiar sin probar)
Unidades en mm. Origen (0,0) = esquina inferior izquierda de la página; jsPDF usa la superior, así que convertir `y_jspdf = alto − y`. Código de barras **Code128**, sin texto integrado (el número se dibuja aparte) y sin quiet zone añadida. Ancho de módulo en múltiplos de 0.125 mm (203 dpi). Precio con formato `$ 1,234.00`. Fuente Helvetica.

**Grande: página 38 × 25 mm, 1 etiqueta por página**
- Nombre: Helvetica-Bold 7 pt, centrado, base en y = 25 − 2.7. Si no cabe en 35.5 mm, bajar de 0.25 en 0.25 pt hasta 4.5 pt. Omitir si está vacío o es ".".
- Precio: Helvetica-Bold 10.5 pt, centrado, base en y = 25 − 6.6.
- Barras: alto 12.5 mm en y = 3.0. Módulo 0.375 mm; si el ancho pasa de 33 mm, usar 0.25 mm. Centrado.
- Número: Helvetica 6 pt, centrado, base en y = 0.8.

**Chica: rollo de 3 por hilera, página 90 × 13 mm**
- Etiquetas de 27 × 13 mm en x = 1.5, 31.5 y 61.5 mm. Se llenan de izquierda a derecha; la última hilera puede quedar incompleta.
- Precio: Helvetica-Bold 7 pt, alineado a la derecha en x = 27 − 0.8, base en y = 9.2.
- Nombre: Helvetica 5.5 pt (baja hasta 4 pt), alineado a la izquierda en x = 0.8, base en y = 9.2. Ancho máximo = 27 − 1.6 − ancho del precio − 1 mm. Si aun así no cabe, truncar con "…". Omitir si está vacío.
- Barras: alto 5.4 mm en y = 3.0. Módulo 0.375 mm si cabe en 25.4 mm; si no, 0.25 mm. Centrado.
- Número: Helvetica 5 pt, centrado, base en y = 1.1.

**Tamaños configurables**: los 2 formatos probados son fijos y no se editan (`lib/etiquetas/spec.ts`). Si cambia el rollo, el admin crea un formato nuevo copiando uno probado; queda marcado como "sin probar" hasta imprimir una hoja de prueba.

**Driver de la Zebra (mostrarlo en la UI junto al botón de descarga)**
- Presets: Grande = 38 × 25 mm; Chica = 90 × 13 mm; tipo de medio "Etiquetas con espacios".
- Imprimir siempre en **Tamaño real** (nunca "Ajustar").
- Al cambiar de rollo: calibrar (mantener el botón y soltarlo al 2.º parpadeo).
- Si la cola se traba (trabajo detenido en "Imprimiendo", luz verde fija): cancelar todo y reiniciar la PC o el servicio de cola de impresión. **Nunca reenviar el mismo trabajo.**

## Verificación (obligatoria antes de dar algo por terminado)
- Test automatizado (`npm test`): renderizar los PDFs a 203 dpi en blanco y negro (equivalente a `pdftoppm -r 203 -mono`: mupdf WASM + umbral) y decodificar cada código con zxing (zxing-wasm), etiqueta por etiqueta en su posición. Debe coincidir con el esperado. Utilidad: `tests/util/barras.ts`.
- RLS y PIN: `tests/base-de-datos.test.ts` aplica la migración y el seed en PGlite.
- Comparar visualmente contra los PDFs de `docs/referencia/` (mismas posiciones).
- Casos borde: códigos de 1 a 5 dígitos, `901A`, nombres de 29+ caracteres, precio 62.9999, nombre vacío, precio ≥ $1,000.
- Test del parser y del diff con los dos Excel de muestra (resultado esperado arriba).

## Plan por fases
1. **Base**:
   - Limpiar el repo: mover el diseño a `design/` y quitar los zips viejos.
   - Next.js + Supabase con esquema, RLS, login y seed desde `catalogo.csv`.
   - Despliegue en Vercel.
2. **Imprimir**: lista, escaneo y PDFs grande/chica con sus tests.
3. **Catálogo + Producto nuevo.**
4. **Sincronizar**: importar, diff, aplicar, exportar pendientes y existencias opcionales.
5. Después: impresión directa por ZPL con Zebra Browser Print, para evitar el driver y la cola de Windows (por evaluar).

Ver preguntas abiertas en `docs/PREGUNTAS.md`.
