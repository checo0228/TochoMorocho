Pega esto como primer mensaje en Claude Code, abierto en la carpeta del repo:

---

Lee CLAUDE.md completo, docs/PREGUNTAS.md y revisa design/, data/ y docs/referencia/.

Luego:
1. Dime en 5 líneas qué entendiste del proyecto y qué dudas te quedan que no estén en PREGUNTAS.md.
2. Propón la estructura de carpetas, el esquema SQL de Supabase (con RLS) y las librerías exactas a usar.
3. Espera mi OK antes de escribir código.

Después de mi OK trabaja por fases (ver "Plan por fases" en CLAUDE.md). Al final de cada fase:
- corre los tests (incluido el de decodificar códigos de barras a 203 dpi),
- haz commit,
- dime qué tengo que probar en la tienda.

No cambies la especificación de etiquetas sin decírmelo: está probada en la impresora.
