# Plantillas F5 · editor de invitaciones

Rama apilada sobre `feat/f1-diseno-v2-esquema` (FE #115). Plan: `PLAN-PLANTILLAS.md` en `bugs/catalogo` (P1, P5, P6, P9, P15, P19, P21, P22).

## PR a · carcasa, modelo, historial y autoguardado (2026-11-24)

- **Paquete nuevo `@rsvp/design-editor`:** modelo de estado sobre `DesignDocumentV2` (operaciones puras, historial de 100 pasos con fusión de ediciones seguidas), guardas espejo del botón de regalos (P22), autoguardador con `If-Match` y carcasa web (`EditorShell`).
- **`@rsvp/query-hooks` `design/`:** `designApi` (endpoints de BE #135) y `useCelebrationDesign`/`useCreateDesign`.
- **App:** ruta web `/diseno?c=` (`DesignEditorScreen`); en iOS y Android un aviso (el editor es web-first, P10).
- **Nivel de verificación:** `TESTED` contra un cliente simulado y un arnés en memoria. **No** `VERIFIED`: no se corrió contra el backend real (#135 sin fusionar, sin Docker aquí) ni en Mac/iOS/Android.
- **Evidencia visual:** `docs/progress/evidence/plantillas-f5/a-*.png` (Chromium de Linux; las líneas base macOS no se tocan).

## PR a · ronda 2 (corrección de la revisión 1)

- **M1:** `useCelebrationDesign` ya no refetch al enfocar la ventana ni al reconectar, y la pantalla usa `key={record.id}`; el guardador no se recrea al cambiar el registro. Recargar es una acción explícita tras un conflicto (`onReload` devuelve el borrador nuevo y el editor hace `load` + `resume`). Pruebas que fallan antes y pasan después en `query-hooks` y `universal`.
- **M2:** un 4xx no detiene el guardado para siempre: el documento rechazado no se reenvía, la siguiente edición reanuda con la misma versión y «Reintentar ahora» lo reenvía. 401 ofrece «Iniciar sesión de nuevo» (vuelve a `/diseno?c=`); 403 explica sin acción; 413 y los códigos conocidos tienen texto propio y el código queda solo como referencia para soporte.
- **M3:** `guards.ts` espeja `GIFTS_BLOCK_COVERED` y `GIFTS_BLOCK_LOW_CONTRAST` de `rules.py`/`colour.py` (BE #135, rama `feat/f1-diseno-v2-almacen`). Comparado con `validate_design` del BE sobre 584 documentos generados (estilos solid/outline/link, paletas, bordes, fondos, z, orden, rotación): 0 diferencias. Se corrigieron los tipos `DesignBackground` (`role`, `fit`, `illustrationId`) y `DesignPage.background` según el contrato.
- **m1:** i18n es-BO/en-US de páginas y bloques (`designEditor.section.*`, `designEditor.block.*`) con respaldo al id. **m2:** el conflicto dice que se descartan los cambios sin guardar y pide confirmación antes. **m3:** avisos P19 visibles con sugerencia aplicable; `versions` con `limit/before/nextBefore` y `document` obligatorio. **m5:** sin landmarks anidados; a 360 px las páginas se pliegan y el lienzo queda en la primera pantalla.
- **Visual:** el lienzo es el protagonista (papel sobre mesa, interruptor de lienzo junto a la vista, barra quieta). Estados: cargando (pantalla), vacío (sin páginas / página sin elementos), guardado, cambios, guardando, reintento, detenido, conflicto (con confirmación), rechazo, sesión, permiso y avisos de contraste.
- **Movimiento:** la única animación nueva es el giro del anillo «guardando» (transform, 900 ms, estado de progreso del guardado); con `prefers-reduced-motion` queda quieto y el texto sigue diciendo «Guardando…». Se mantienen la transición de ancho del lienzo (240 ms, orienta el cambio móvil/escritorio) y el toque de 120 ms; ambos se anulan con movimiento reducido.
- **Evidencia (Chromium de Linux):** `a-lienzo-{claro,oscuro}-{360,768,1280}.png`, `a-estado-*.png`. 21 pruebas Playwright con axe sin hallazgos a 360/768/1280, claro y oscuro. **Líneas base macOS que cambiarían: ninguna** (el repositorio no versiona líneas base de `/diseno` ni del paquete `design-editor`).

## PR a · ronda 3 (revisión 2: 0 bloqueantes, 0 mayores, menores)

- **PL-121-R2-M1 (WCAG 1.4.11):** `--de-field` claro `#8A8880` -> `#858379`. Contraste del borde sobre surface / canvas / surface-muted / danger-bg: claro 3,80 / 3,52 / 3,19 / 3,16 (antes 3,55 / 3,29 / 2,97 / 2,95); oscuro 4,83 / 5,29 / 4,33 / 4,36 (sin cambio de token). Prueba `src/test/contrast.test.ts` (lee `editor.css`; falla con los valores anteriores) y aserción en el Playwright (bordes calculados desde estilos de Chrome).
- **m-B (401):** el aviso decía que lo que se ve no se pierde, pero «Iniciar sesión de nuevo» navegaba en la misma pestaña (`router.push`, el editor se desmonta y la pantalla nueva carga del servidor). No se pudo recorrer la navegación real (sin backend); se resolvió por diseño: el login se abre en otra pestaña (`window.open`, con respaldo a la navegación si el navegador lo bloquea), el editor sigue montado con las ediciones y «Ya entré, reintentar» guarda desde él. Texto es-BO/en-US ajustado. NO VERIFICADO contra el backend real: que la renovación por cookie de refresco permita el reintento tras entrar en la otra pestaña.
- **m-2:** botón de peligro con fondo pastel (`danger-bg`) y texto `danger` (6,91:1 claro, 8,44:1 oscuro); mesa del lienzo en oscuro `#272725` (`surfaceMuted` de DESIGN.md), más clara que el canvas `#151514`.

### Pendiente / abierto
- ~~`GIFTS_BLOCK_TEXT_TOO_LARGE` y la altura útil del botón~~: espejados en la rama `feat/plantillas-f5b-guarda-altura-util` (ver abajo).
- Los avisos P19 solo se muestran tras un guardado (o los que traiga el registro); el servidor los envía al crear, guardar y restaurar.
- Contrato 1.3.0 de Template/Media aún no vendorizado: `designApi` está tipada a mano; falta prueba de conformidad cuando #135 se fusione.
- Los dibujos del lienzo en PR a son un esquema de cajas (wireframe); el renderizador real llega con F6.

## PR d · HTML saneado y CSS acotado (2026-11-25)

- `sanitizeHtml` (parse5, lista blanca, idempotente, sin scripts/iframes/formularios/svg/estilos en línea, enlaces solo https/mailto/tel, imágenes solo del almacén de medios, enlaces directos a proveedores sin `href`) y `scopeCss` (postcss: todo bajo `.rsvp-invitation`, guarda `:not(.rsvp-protected)`, sin `@import`/`@font-face`/`@keyframes`, `url()` solo a medios, sin `position: fixed|sticky`, `z-index` ≤ 100, texto ≥ 13 px, propiedades que ocultan o mueven ancestros fuera de la lista).
- Corpus hostil: 61 vectores HTML y 82 de CSS en `src/test/{html,css}.test.ts`.
- **Bloqueo para publicar código propio:** el backend (`rules.py`) responde 422 `CUSTOM_CODE_UNAVAILABLE` a cualquier `custom` no vacío. Hace falta un PR de BE con la misma validación (sin él, el editor sanea pero el servidor lo rechaza al guardar). No abierto en esta ejecución.
- El renderizador (F6) debe aplicar `scopeCss`/`sanitizeHtml` al pintar y dar a `.rsvp-protected` un `z-index` de 1000 (`PROTECTED_Z_INDEX`).
## PR b · prerrequisito: guardas de altura útil y tamaño de etiqueta (2026-11-25)

Rama `feat/plantillas-f5b-guarda-altura-util`, sobre `feat/plantillas-f5-editor` (fbf83cd). Hay que fusionarla (o apilar la cadena #122-#125 sobre ella) **antes** de exponer los controles de relleno, borde, tamaño y tipografía.

- `guards.ts` espeja `rules.py` (BE `feat/f1-diseno-v2-almacen`): altura útil = h·rowHeight − (padding superior + inferior) − 2·borde; menos de 44 px es `GIFTS_BLOCK_TOO_SMALL`; etiqueta > 32 px o con `size × lineHeight` (por defecto 1,25) mayor que la altura útil es `GIFTS_BLOCK_TEXT_TOO_LARGE`.
- `giftsIssues` revisa **todas** las páginas cuyo lienzo móvil aloja el botón (antes solo la primera), como el servidor.
- i18n es-BO/en-US del nuevo código; `TOO_SMALL` explica que se descuentan relleno y borde.
- Pruebas vitest: 44 px exactos pasan, 45 px de relleno fallan; borde; 33 px; línea que no cabe; segunda página. Nivel `TESTED`. No se comparó otra vez contra `validate_design` del BE (sin entorno Python aquí): la comparación de 584 documentos de PR a no cubre estas dos reglas.
- **Aviso de apilado:** las ramas #122-#125 parten de a42a687 (anterior a las rondas 2-3 de #121 y a esta guarda) y sus controles de relleno (#124) y del inspector (#125) hoy no pasan por estas guardas.


## PR e · contraste en vivo, publicar y versiones (2026-11-25)

- `ContrastPanel`: `design.contrastWarnings` en vivo (ambas paletas); avisa y ofrece el color más cercano que pasa; **nunca bloquea** (P19).
- `PublishPanel` + `VersionsGateway`: publicar con nombre (vacía la caja, vacía antes el autoguardado y publica con la versión de borrador ya guardada), historial con hora en la zona de la celebración, restaurar (copia al borrador, **no publica**; reanuda el autoguardado desde la versión nueva). Publicar con un guardado en conflicto/rechazado se detiene con mensaje.
- Pantalla `/diseno` conectada a `designApi.publish/versions/restore`.
- Nivel `TESTED` (arnés en memoria y cliente simulado); sin backend real.

### Ronda 1 de la revisión del PR #123 (2026-11-25)

- **B1** la prueba de la pantalla usa `getByTestId("save-status")` (hay tres regiones `status`); sin debilitar la aserción.
- **M1** restaurar siempre pregunta («Sí, restaurar la versión N») y dice qué se reemplaza; si hay cambios que no llegaron al servidor (reintentando, conflicto o rechazado) lo dice con todas las letras, y si el guardado falla al pulsar sin haberlo avisado, vuelve a preguntar. Restaurar es **un paso deshacible** (`replace` conserva el historial): «Puedes deshacerlo» ahora es verdad.
- **M2** una sola lista de avisos de contraste: la del servidor cuando respondió sobre este mismo documento y, hasta entonces, la vista previa local con la misma regla (`design.contrastWarnings`, espejo de `colour.py`). Se retiró la sección duplicada; el botón dice «Usar #… en … del tema …, sobre …» (nombre único y que contiene el texto visible).
- **M3** publicar retiene el autoguardado (`hold`): lo escrito mientras publica no se marca guardado, no compite con la publicación y se guarda después desde la versión que respondió el servidor.
- **M4** historial con estados cargando, error (con «Reintentar»), vacío y «Ver más versiones» (`nextBefore`); «Restaurando…» propio; 409/401/403/422 de publicar y de restaurar con mensajes propios; el 409 detiene el guardado como un conflicto normal y ofrece «Cargar la versión del servidor».
- **Menores** m1 paginación, m2 «sin cambios» desde la versión publicada que ya conoce el editor (no de la lista), m3 `{{minimum}}` en en-US, m4 mayúscula inicial, m5 nombre accesible por versión, m6 pruebas; estilos: `ul` ya no hereda la caja ámbar y `.de-swatch` no se redefine.
- Nivel `TESTED` (vitest, arnés Playwright con Chrome); sin backend real. Las capturas Linux nuevas están en `evidence/plantillas-f5/e-versiones-*` y `e-restaurar-confirmar-1280.png`; no se tocó ninguna línea base de macOS.
