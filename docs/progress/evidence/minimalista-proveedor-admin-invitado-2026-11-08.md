# Rediseño minimalista: proveedor, admin, invitado y acceso (2026-11-08)

Rama `feat/diseno-minimalista`. Alcance: `apps/universal/src/provider`, `src/admin`, `src/guest`, `src/auth` y las pantallas de `app/` que no son del anfitrión. El anfitrión (`src/host`) y `packages/ui` son de otros carriles; aquí solo se consumen. Sin commit, sin push y sin regenerar capturas base. Este documento cambia el **aspecto**; la estructura de `feat/reorganizacion-ux` (acción primaria arriba a la derecha, `OverflowMenu`, `FilterSelect`, nombres accesibles, testIDs) no se toca.

Reglas leídas íntegras: `AGENTS.md`, `docs/design/minimalista-brief.md` (manda), `.agents/skills/minimalist-ui/SKILL.md`. Donde la skill choca con AGENTS.md (contraste AA, 44 px, foco, reduced-motion, i18n, oscuro) manda AGENTS.md.

## Qué decidió cada skill

| Skill | Decisión que salió de ella |
|---|---|
| `minimalist-ui` | Lienzo hueso, tinta, tarjetas de 1 px con radio 12, botón primario tinta de radio 6 sin sombra, etiquetas pastel en píldora, titulares Newsreader 500 con tracking -0.02 a -0.03 em, metadatos en Geist Mono, sin degradados ni vidrio ni sombras. Se aplicó el protocolo 8.1 (macro-espacio primero): hoja de invitación de 640 px con relleno de 48 px y 64 px de aire bajo ella. No se aplicaron el fondo ambiental ni el grano de la sección 6/7: el brief los quita («sin decorado») y AGENTS.md exige `prefers-reduced-motion`. |
| `impeccable` (+ `craft-floor`) | Modo **Persuade** para la invitación y los estados de enlace (el nombre del evento es el punto focal, se compromete la dirección «papel de invitación»); modo **Operate** para proveedor y admin (precisión y contención). `craft-floor`: nada de kicker sobre el titular, nada de `border-left` de color, nada de tarjeta dentro de tarjeta (la ficha del proveedor es una sola tarjeta; el hito ya no lleva fondo), sin glifos en lugar de iconos, cifras tabulares en importes, selección de texto tematizada (`::selection` con pastel azul de `tones`). |
| `ui-ux-pro-max` | Prioridad 1-2: contraste, foco de 2 px en tinta en todo control, objetivos de 44 px (alto 48 en campos y botones del acceso), el estado elegido en «Voy / No puedo» nunca depende del color (relleno tinta + cheque dibujado o aro). Prioridad 4: un solo conjunto de iconos y la ilustración solo en bienvenida y estados vacíos. Prioridad 5: sin scroll horizontal a 360. Prioridad 6: cuerpo 16 px con interlineado 1.6, tokens semánticos en vez de hex sueltos. |
| `visual-hierarchy-composition` | Un punto focal por pantalla: en la portada es el nombre del evento (56 px serif; 40 px bajo 520 px de ancho), después quién invita (18 px), después fecha y lugar (13 px mono, muted). Se sube **una** palanca por nivel: escala para el título, color para lo secundario, espacio para separar la pregunta del titular (regla de 1 px más 32 px). Proximidad: el nombre, quien invita y la fecha van juntos a 16 px; el bloque de respuesta queda a 32 px. Patrón Z en el acceso ancho: logo arriba a la izquierda, formulario a la derecha. |
| `typography-systems` | Dos familias (Newsreader + Geist; mono solo para metadatos y cifras de progreso). Escala: 56/40 para el nombre del evento, 34 el título de acceso, 30 la pregunta, 22 secundarios, 16 cuerpo, 13-14 apoyo. Interlineado 1.08 en títulos, 1.6 en cuerpo. `tabular-nums` en precios del invitado y en las tablas del admin. Se quitó el peso 800 y los 700 de etiquetas (ahora 500/600). Las fuentes se cargan con `font-display: swap`; la exportación de página única ignora `app/+html.tsx`, así que `src/platform/fonts.ts` añade la hoja una sola vez (ver hallazgos). |
| `frontend-beautiful-ui` | Profundidad con borde de 1 px, no con sombra (el oscuro lo refuerza con superficie más clara: `surface` sobre `canvas`). Radios anidados: hoja 12, campos y botones de respuesta 8, botón 6. Alineación óptica: el cheque dentro del botón «Voy» va en el centro con el texto, a 28 px. Oscuro compuesto en carbón cálido, no invertido. Estados vacíos con explicación y acción (se conservan los de `EmptyState`). Anti-slop evitado: sin degradado, sin tarjetas idénticas con sombra, sin píldoras en contenedores grandes. |
| `ux-clarity-usability` | Prueba de los 3 segundos: la invitación dice cómo se llama el evento, quién invita y la única pregunta («¿Nos acompañas?») con dos respuestas del mismo tamaño. Reconocer en vez de recordar: «Voy / No puedo» como dos toques; lo opcional (dieta, mensaje) sigue plegado. La acción primaria no se movió de sitio. El panel editorial del acceso no repite el formulario: acompaña y no compite. |
| `frontend-responsive-layout` | Mobile-first: la hoja es la misma a 360 y a 1280 (columna de 640 px con `maxWidth`), con relleno y tamaño del titular que cambian en un solo corte (520 px). El acceso pasa a dos columnas a 900 px (cabe la columna editorial). `Stack` del admin fija una medida de 720 px para que selectores y filas compartan bordes. El resumen del admin usa `flexBasis 300` + `flexWrap`: una columna a 360, dos a 768 y 1280, sin media queries. Matriz 360/768/1280 en es-BO y en-US, claro y oscuro (abajo). |
| `ui-quality-review` | Revisión con rúbrica sobre capturas reales (sección «Revisión»). Hallazgos corregidos en la propia pasada: franja blanca de `StickyActions` sobre fondo hueso en el registro (el panel estrecho del acceso pasa a `surface`), metadato mono que cortaba la línea en «·» (13 px), selector del admin más ancho que la lista (medida de 720 px), resumen del admin como una lista de líneas sin jerarquía (ahora teselas con borde). |
| `rsvp-accessible-states` | Estados enumerados por pantalla: carga (esqueleto con la forma de la hoja y de los botones), vacío, error recuperable con reintento, sin conexión, enlace caducado, plazo cerrado y dato parcial. Todos conservados; solo cambió su aspecto. Foco visible en tinta, orden de teclado intacto, errores asociados al campo (`aria-describedby`), `role=alert` en avisos, `aria-pressed`/`aria-checked` en los grupos de opción, ninguna información solo por color (punto + palabra en las etiquetas, cheque o aro en las respuestas). Movimiento: se reutiliza `Enter` y el cheque; todo respeta reduced-motion. |

## Cambios por pantalla

- **Portada del invitado** (`src/guest/frame.tsx`): sin banda azul, sin patrón de tejido ni arcos (`WeavePattern`, `HeroArt` eliminados). Página hueso, hoja blanca de 1 px con radio 12 y 48 px de relleno, logo en tinta, nombre del evento en serif de 56 px, quién invita, fecha y lugar en mono, regla de 1 px y debajo la respuesta. Estados de enlace (`link-states.tsx`): ilustración pastel de 104 px, título serif de 32 px.
- **Responder** (`answer-fields.tsx`, `rsvp-screen.tsx`): «Voy» y «No puedo» de 72 px de alto, borde de 1 px, en serif; el elegido se rellena con tinta (dos respuestas, mismo peso, distintas por la marca: cheque o aro). Contador de acompañantes en serif. El fondo de anillos del hito (`MomentBackdrop`) desaparece.
- **Regalos del invitado** (`gifts-screen.tsx`): filas con hairline, nombre en serif, precio en cifras tabulares, botones del sistema.
- **Acceso** (`auth-ui.tsx`, `screens.tsx`, `organizations-screen.tsx`, `not-found-screen.tsx`): ancho: columna editorial hueso (logo, ilustración pastel, titular serif de 56 px y una línea de cuerpo) y formulario sobre blanco; estrecho: cabecera con el logo y formulario en blanco. Campos de 1 px, botón tinta de 48 px, enlaces subrayados, selector de idioma con borde, opción de rol con cheque dibujado.
- **Portal del proveedor** (`overview-screen.tsx`, `parts.tsx`): la banda de noche con barra de progreso azul pasa a una tarjeta blanca de 1 px con avatar pastel, título serif, etiqueta pastel y barra de 4 px en tinta; el hito es una tarjeta lisa. El resto hereda la nueva barra, cabecera y tarjetas de `host/ui`.
- **Admin** (`other-screens.tsx`, `shared.tsx`): resumen en teselas con borde (bento), medida de 720 px común. Estado operativo con punto + palabra (nunca solo color).
- **Documento web** (`app/+html.tsx`, `platform/theme-boot.ts`, `platform/fonts.ts`): Geist, Geist Mono y Newsreader; selección de texto en pastel de `tones`.

## Verificación

Exportación propia (`EXPO_PUBLIC_API_URL=http://localhost:28000`, servida en :8600/:8700, CORS del gateway) contra el backend real (Kong :28000, Postgres, Identity, Celebration, Guest, Gift, Provider; `template-media` y el almacenamiento de objetos no están levantados en este mundo).

### Resultados reales (export propia `mdr-final`, servida en :8700, hash del bundle comprobado contra lo servido)

| Prueba | Resultado |
|---|---|
| `tsc --noEmit` (apps/universal) | limpio |
| Vitest de apps/universal completo | 27 archivos, 329 pruebas, todas verdes (sin `skip`/`only`, ninguna aserción debilitada) |
| `provider-admin-buttons.mjs` a 768 y 360 | 98 PASS, 11 BLOCKED, 0 FAIL, 0 errores de página (los 11 BLOCKED son brechas de backend o servicios no levantados, idénticos a la línea base: sin PATCH/DELETE de oferta, sin revocar rol, sin almacenamiento de objetos ni `template-media`) |
| `provider-admin-buttons.mjs` a 1280 | 97 PASS, 1 FAIL, 11 BLOCKED. El FAIL era `innerText()` de la etiqueta «Verificado», que ahora se dibuja en mayúsculas por CSS. Se cambió a `textContent()` con igualdad estricta (mismo texto exacto, no más débil). **No se reejecutó 1280 tras el cambio: pendiente.** |
| `auth-buttons.mjs` a 1280, 768 y 360 | 53/53 en cada ancho |
| `gifts-buttons.mjs` a 768 y 360 | 52/52 PASS en cada ancho |
| `gifts-buttons.mjs` a 1280 | **No válido**: el sembrado del mundo falló con 502 del servicio de regalos en ese instante. Pendiente de reejecutar. |
| Barrido responsivo `responsive/provider-admin.mjs` (360/768/1280, es-BO/en-US, claro/oscuro) | 1596 PASS, 23 FAIL, todos `f-theme` a 360 oscuro: el botón primario de la barra fija inferior ocupa una fila entera de muestras y es claro (tinta = hueso en oscuro). Es diseño, no un fallo: el chequeo se escribió para la identidad anterior. Se ajustó `scheme.mjs` para no muestrear botones (sigue juzgando el fondo de página). **No se reejecutó tras el ajuste: pendiente.** |
| Barrido `responsive/auth.mjs` y `responsive/gifts.mjs` | **Pendientes**: el de acceso seguía en marcha (en 360 claro, todo PASS hasta ese punto) al cerrar, y el de regalos no empezó en esta export. |

Incidente de método, para que nadie use los registros antiguos: una primera tanda se lanzó contra :8600, que otro agente ocupaba con otra exportación (colores de la identidad anterior). Se detectó por el hash del bundle y por los fondos `rgb(24,33,90)`; se descartó entera y se repitió en :8700 (propia, con hash verificado).

Capturas revisadas a mano (360/768/1280, claro y oscuro, es-BO y en-US): acceso (entrada, registro, recuperar, 404), portada y respuesta del invitado, regalos, enlace inválido, portal del proveedor (resumen, ofertas, agenda, resultados, perfil, documentos, destinos) y admin (resumen, verificación, operación, plantillas, usuarios). Quedan en el scratchpad, no en el repositorio.

### Hallazgos y notas para otros carriles
- La exportación de página única (`output: "single"`) **ignora `app/+html.tsx`**: ni la identidad anterior ni la nueva cargaban sus fuentes. Se resolvió en `src/platform/fonts.ts` (inyecta la hoja una vez). Un `@import` en `global.css` se descartó en el empaquetado.
- `StickyActions` (packages/ui, de Base) dibuja la regla superior 16 px más ancha que el contenido de la hoja del invitado; menor, no se tocó.
- `scheme.mjs` es compartido con el carril del anfitrión: el cambio de no muestrear botones les afecta igual.
- No probado: nativo (iOS/Android; las fuentes siguen siendo las de plataforma), lector de pantalla, zoom de texto al 200 %, contraste medido con herramienta propia más allá de axe dentro del barrido (que dio 0 fallos serios en el provider-admin).

