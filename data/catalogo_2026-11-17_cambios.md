# Actualización del catálogo

- Base: `data/catalogo_2026-11-13.csv` (1160 productos)
- Excel: `data/muestras/productos_2026-11-17.xlsx` (1168 productos)
- Resultado: `data/catalogo.csv` (1168 productos; 854 grandes, 268 chicas, 46 sin tamaño, 11 inactivos, 12 etiqueta única)

## Nuevos (8) — sin tamaño
- 1162 · coche fosfo de 3 · $130.00 · JUGUETES
- 1161 · city truck · $145.00 · JUGUETES
- 1164 · muñeco marvel · $205.00 · JUGUETES
- 1166 · maquillaje niña · $219.00 · JUGUETES
- 1165 · piano vaca · $249.00 · JUGUETES
- 1163 · computadora · $250.00 · JUGUETES
- 1167 · maquillaje maleta · $395.00 · JUGUETES
- 1168 · set construccion · $398.00 · JUGUETES

## Código reutilizado / nombre cambiado (31) — se quitó el tamaño
- 859: "tren madera" → "bocina roja" (tenía grande)
- 865: "cascanueces" → "calceta delgada" (tenía grande)
- 840: "cascanueces gde" → "castillo bco" (tenía grande)
- 327: "rodillera simple" → "papel navideño" (tenía grande)
- 362: "camino sencillo" → "calceta gruesa" (tenía grande)
- 1063: "gorilita" → "casita" (tenía grande)
- 1075: "moño patrio gde" → "set coche fosfo" (tenía chica)
- 1158: "rompecabeza fomi" → "karaoke niña" (tenía grande)
- 1119: "espejo cinamon" → "pony" (tenía grande)
- 1141: "gusano de 3" → "muñeca" (tenía chica)
- 464: "guia flor" → "globo suelto" (tenía grande)
- 2055: "labial lip" → "(sin nombre)" (tenía chica)
- 2080: "labial chocolate" → "(sin nombre)" (tenía chica)
- 2105: "labial peludo" → "(sin nombre)" (tenía chica)
- 2155: "mascarilla volumen" → "(sin nombre)" (tenía chica)
- 2151: "sombra favor" → "(sin nombre)" (tenía grande)
- 2063: "bolsa esponja" → "brocha nacarada" (tenía grande)
- 654: "sombra cafe gde" → "pila 1ora" (tenía chica)
- 2146: "(sin nombre)" → "bocina cafe" (tenía chica)
- 90018: "quita pelusa electrico" → "lente sonido" (tenía grande)
- 607: "(sin nombre)" → "vela sorpresa" (tenía grande)
- 77: "arbol 240 hs" → "estrella arbol" (tenía grande)
- 51: "arbol 240 hd" → "luna arbol c/luz" (tenía grande)
- 73: "arbol c/luz" → "serie 200 n" (tenía grande)
- 8: "villa escalera" → "caja casita ch" (tenía grande)
- 15: "camino elegante" → "serie 300 n" (tenía grande)
- 49: "(sin nombre)" → "caja casita gde" (tenía grande)
- 746: "(sin nombre)" → "estrellota" (tenía grande)
- 222: "pupilente" → "collar perro broche" (tenía chica)
- 239: "cepillo flor" → "calceta compresion" (tenía grande)
- 505: "(sin nombre)" → "clip peine" (tenía grande)

## Solo cambió el precio (2)
- 802 · inflable: $1300.00 → $1400.00
- 750 · porta brocha: $135.00 → $175.00

## Ya no vienen en el Excel (0) — marcados inactivos

## Rechazados (0)

## Tamaños asignados (18 nov 2026, indicación de Sergio)
- Chica: 746 estrellota.
- Grande: los 8 nuevos (1161–1168) y los demás códigos reutilizados (859, 865, 840, 362, 1063, 1075, 1158, 1119, 1141, 2063, 654, 2146, 90018, 607, 77, 51, 73, 8, 15, 49, 222, 239, 505).
- Sin etiqueta (se quedan sin tamaño): 327 papel navideño, 464 globo suelto.
- Pendientes: los 5 que quedaron sin nombre (2055, 2080, 2105, 2155, 2151) y los 7 sin tamaño de siempre (89920, 89913, 432, 443, 2054, 90034, 90022).
- Aplicado en producción con `npm run tamanos:asignar` (solo a los que no tenían tamaño).
