# Plantillas F5 · editor de invitaciones

Rama apilada sobre `feat/f1-diseno-v2-esquema` (FE #115). Plan: `PLAN-PLANTILLAS.md` en `bugs/catalogo` (P1, P5, P6, P9, P15, P19, P21, P22).

## PR a · carcasa, modelo, historial y autoguardado (2026-11-24)

- **Paquete nuevo `@rsvp/design-editor`:** modelo de estado sobre `DesignDocumentV2` (operaciones puras, historial de 100 pasos con fusión de ediciones seguidas), guardas espejo del botón de regalos (P22), autoguardador con `If-Match` y carcasa web (`EditorShell`).
- **`@rsvp/query-hooks` `design/`:** `designApi` (endpoints de BE #135) y `useCelebrationDesign`/`useCreateDesign`.
- **App:** ruta web `/diseno?c=` (`DesignEditorScreen`); en iOS y Android un aviso (el editor es web-first, P10).
- **Nivel de verificación:** `TESTED` contra un cliente simulado y un arnés en memoria. **No** `VERIFIED`: no se corrió contra el backend real (#135 sin fusionar, sin Docker aquí) ni en Mac/iOS/Android.
- **Evidencia visual:** `docs/progress/evidence/plantillas-f5/a-*.png` (Chromium de Linux; las líneas base macOS no se tocan).

### Pendiente / abierto
- Contrato 1.3.0 de Template/Media aún no vendorizado: `designApi` está tipada a mano; falta prueba de conformidad cuando #135 se fusione.
- Los dibujos del lienzo en PR a son un esquema de cajas (wireframe); el renderizador real llega con F6.

## PR d · HTML saneado y CSS acotado (2026-11-25)

- `sanitizeHtml` (parse5, lista blanca, idempotente, sin scripts/iframes/formularios/svg/estilos en línea, enlaces solo https/mailto/tel, imágenes solo del almacén de medios, enlaces directos a proveedores sin `href`) y `scopeCss` (postcss: todo bajo `.rsvp-invitation`, guarda `:not(.rsvp-protected)`, sin `@import`/`@font-face`/`@keyframes`, `url()` solo a medios, sin `position: fixed|sticky`, `z-index` ≤ 100, texto ≥ 13 px, propiedades que ocultan o mueven ancestros fuera de la lista).
- Corpus hostil: 61 vectores HTML y 82 de CSS en `src/test/{html,css}.test.ts`.
- **Bloqueo para publicar código propio:** el backend (`rules.py`) responde 422 `CUSTOM_CODE_UNAVAILABLE` a cualquier `custom` no vacío. Hace falta un PR de BE con la misma validación (sin él, el editor sanea pero el servidor lo rechaza al guardar). No abierto en esta ejecución.
- El renderizador (F6) debe aplicar `scopeCss`/`sanitizeHtml` al pintar y dar a `.rsvp-protected` un `z-index` de 1000 (`PROTECTED_Z_INDEX`).

## PR e · contraste en vivo, publicar y versiones (2026-11-25)

- `ContrastPanel`: `design.contrastWarnings` en vivo (ambas paletas); avisa y ofrece el color más cercano que pasa; **nunca bloquea** (P19).
- `PublishPanel` + `VersionsGateway`: publicar con nombre (vacía la caja, vacía antes el autoguardado y publica con la versión de borrador ya guardada), historial con hora en la zona de la celebración, restaurar (copia al borrador, **no publica**; reanuda el autoguardado desde la versión nueva). Publicar con un guardado en conflicto/rechazado se detiene con mensaje.
- Pantalla `/diseno` conectada a `designApi.publish/versions/restore`.
- Nivel `TESTED` (arnés en memoria y cliente simulado); sin backend real.

## PR b · modo Básico (2026-11-25)

- `BasicPanel`: cambiar de plantilla (compatibles con el tipo de evento; se convierten con `convertV1ToV2`, un solo paso de deshacer, el código propio se conserva), colores de las dos paletas, tipografías solo del catálogo curado (Poppins e IBM Plex ya no están), preajustes de espaciado y de relleno, secciones activas/inactivas y su orden (la de regalos siempre visible y bloqueada), textos de bloques (título, párrafo, cita, botón; un cuadro vaciado se ignora).
- Pantalla `/diseno` trae las plantillas con `templateApi.compatible`.
- Nivel `TESTED` (arnés y cliente simulado); sin backend real.

## PR c · lienzo libre (2026-11-25)

- Modelo (`model/canvas.ts`): pasar un lienzo `flow` a `free` (altos por defecto, apilado en orden), crear el lienzo de escritorio a partir del móvil (×3, 12 columnas, P9), colocar con límites (columnas y 4000 px), giro en pasos de 5°, capas (frente/fondo, ±100), relleno y margen en múltiplos de 4, paleta de componentes sin medios (título, texto, cita, botón, cuenta atrás, ornamento, espaciador, HTML) y quitar elementos (la portada y el botón de regalos no se quitan).
- UI: arrastre, tirador de tamaño y de giro por puntero, flechas (Shift cambia el tamaño) y Suprimir, inspector numérico y paleta. El botón de regalos se mueve y cambia de tamaño pero el editor rechaza girarlo, ocultarlo, quitarlo o dejarlo bajo 44 px, diciendo por qué.
- Pendiente (no hecho): guías de alineación, selección múltiple, imagen/galería/video/mapa/música/dibujo en la paleta (necesitan medios o F3/F6) y animación por elemento. «Tapado por otro elemento» solo lo comprueba el servidor.
- Nivel `TESTED`.
