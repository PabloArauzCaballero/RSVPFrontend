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

Rama `feat/plantillas-f5b-guarda-altura-util`, sobre `feat/plantillas-f5-editor` (1a0ddf4). Hay que fusionarla (o apilar la cadena #122-#125 sobre ella) **antes** de exponer los controles de relleno, borde, tamaño y tipografía.

- `guards.ts` espeja `rules.py` (BE `feat/f1-diseno-v2-almacen`): altura útil = h·rowHeight − (padding superior + inferior) − 2·borde; menos de 44 px es `GIFTS_BLOCK_TOO_SMALL`; etiqueta > 32 px o con `size × lineHeight` (por defecto 1,25) mayor que la altura útil es `GIFTS_BLOCK_TEXT_TOO_LARGE`.
- `giftsIssues` revisa **todas** las páginas cuyo lienzo móvil aloja el botón (antes solo la primera), como el servidor.
- i18n es-BO/en-US del nuevo código; `TOO_SMALL` explica que se descuentan relleno y borde.
- Pruebas vitest: 44 px útiles exactos pasan y 36 px (relleno superior, inferior o borde) fallan; caja rotada; 33 px; línea que no cabe; segunda página. Nivel `TESTED`. Paridad con `validate_design` del BE (`rules.py`) comparada sobre 4000 documentos generados: 0 diferencias en estas reglas sin rotación; con rotación, `guards.ts` mide la caja envolvente igual que el BE (prueba vitest dedicada). Las pruebas de borde usan valores literales en rejilla de 8 px y se comprobaron con mutaciones locales de `guards.ts` (`>`→`>=`, línea 1,25→1,2, ignorar `padding.bottom`/`padding.top`, caja sin rotar): cada una hace fallar al menos una prueba.
- **Aviso de apilado:** las ramas #122-#125 parten de a42a687 (anterior a las rondas 2-3 de #121 y a esta guarda) y sus controles de relleno (#124) y del inspector (#125) hoy no pasan por estas guardas.


## PR e · contraste en vivo, publicar y versiones (2026-11-25)

- `ContrastPanel`: `design.contrastWarnings` en vivo (ambas paletas); avisa y ofrece el color más cercano que pasa; **nunca bloquea** (P19).
- `PublishPanel` + `VersionsGateway`: publicar con nombre (vacía la caja, vacía antes el autoguardado y publica con la versión de borrador ya guardada), historial con hora en la zona de la celebración, restaurar (copia al borrador, **no publica**; reanuda el autoguardado desde la versión nueva). Publicar con un guardado en conflicto/rechazado se detiene con mensaje.
- Pantalla `/diseno` conectada a `designApi.publish/versions/restore`.
- Nivel `TESTED` (arnés en memoria y cliente simulado); sin backend real.

## PR b · modo Básico (2026-11-25, corregido en la ronda 1 de revisión)

- `BasicPanel`: cambiar de plantilla (compatibles con el tipo de evento; se convierten con `convertV1ToV2`, un solo paso de deshacer, el código propio se conserva), colores de las dos paletas, tipografías solo del catálogo curado (Poppins e IBM Plex ya no están), preajustes de espaciado y de relleno, secciones activas/inactivas y su orden (la de regalos siempre visible y bloqueada).
- **Textos, con la verdad sobre los datos reales.** `convertV1ToV2` no produce bloques de título, párrafo, cita ni botón: sus bloques son `cover, story, schedule, venues, gallery, dressCode, faq, recommendations, rsvpCta, giftsCta`, y la historia, el itinerario, las preguntas y los lugares leen los datos de la celebración, no el documento. Lo que un documento convertido sí tiene de texto propio son las etiquetas opcionales de los botones de **regalos** y de **confirmar** (`config.label`): el panel «Textos» las edita (vaciarlas devuelve el texto automático) y los 16 documentos de referencia del contrato lo prueban. Los bloques `heading`, `text`, `quote` y `button` se editan cuando el documento los trae (p. ej. tras añadirlos en Avanzado). Un texto obligatorio que se vacía muestra el motivo en línea y, al salir del cuadro, vuelve al anterior con aviso: nunca en silencio.
- **Dibujos:** «Dibujo de la portada» guarda el **id** del catálogo de dibujitos (F3, PR #116) como bloque `illustration` (acento de la plantilla, trazado al entrar) bajo los elementos de la portada, en los dos lienzos. **La biblioteca F3 no está en la base de esta rama** y el contrato sigue declarando `illustrationSet: "none"`: el editor recibe el catálogo por la prop `drawings` y, sin ella, dice «todavía no está disponible». La pantalla `/diseno` aún no la pasa. El arnés de e2e lista tres ids reales de F3 (`anillos`, `ramo`, `pastel-bodas`). **Confirmado con BE** (`feat/f1-diseno-v2-almacen` 93caaee, `validate_design`): acepta el bloque `illustration` de portada con `illustrationSet: "none"` (112 documentos verificados: 16 goldens x base, dibujo, dibujo cambiado, dibujo quitado, foto, foto quitada, textos). **Pendiente:** conectar el catálogo real cuando F3 esté fusionado.
- **Fotos:** «Foto de portada» (elegir y quitar, por id de medio, como fondo `media` de la página de portada con velo) está implementada contra la costura `media` y probada con un doble; **la API de medios (F6) no está en la base**, así que sin fuente el panel dice «todavía no está disponible» y no simula subidas. La galería no se elige en el diseño: usa las fotos de la celebración.
- Estados: cargando y error con «Reintentar» en las listas de plantillas, dibujos y fotos; lista vacía de plantillas con mensaje. Las opciones de espaciado y relleno siguen el patrón de radiogrupo con flechas, Inicio y Fin. Al reactivar una sección se respetan los elementos que el anfitrión había ocultado a mano (mientras dure la sesión del editor; deshacer lo cubre siempre). Los títulos del panel no llevan iconos y «Texto» ya no se repite («Color del texto»).
- El esquema del lienzo pinta la paleta y las tipografías elegidas (variables `--wf-*`, esquema claro u oscuro de la página), y el botón de regalos con su relleno y su tinta; la nota del botón avisa de que el relleno global no lo cambia. Sigue siendo un esquema, no el renderizador real (F6).
- Nivel `TESTED` (vitest y arnés en Chrome real); sin backend real.

- **Límites de texto (PL-124-R2-N1):** `TEXT_LIMITS` va por tipo y campo y coincide con el `maxLength` del contrato vendorizado (botón de regalos y de confirmar 40, título 200, párrafo 5000, cita 1000, autor 120, botón 60). La prueba `text-limits.test.tsx` recorre todos los campos editables contra `components.schemas.DesignBlock*` y falla si uno diverge o si aparece un texto del contrato sin límite. El campo se detiene en el límite, muestra el contador («n de N caracteres», ligado por `aria-describedby`) y avisa al llegar. El autoguardado ya no puede chocar con un 422 por longitud.

### Ronda 1 de la revisión del PR #123 (2026-11-25)

- **B1** la prueba de la pantalla usa `getByTestId("save-status")` (hay tres regiones `status`); sin debilitar la aserción.
- **M1** restaurar siempre pregunta («Sí, restaurar la versión N») y dice qué se reemplaza; si hay cambios que no llegaron al servidor (reintentando, conflicto o rechazado) lo dice con todas las letras, y si el guardado falla al pulsar sin haberlo avisado, vuelve a preguntar. Restaurar es **un paso deshacible** (`replace` conserva el historial): «Puedes deshacerlo» ahora es verdad.
- **M2** una sola lista de avisos de contraste: la del servidor cuando respondió sobre este mismo documento y, hasta entonces, la vista previa local con la misma regla (`design.contrastWarnings`, espejo de `colour.py`). Se retiró la sección duplicada; el botón dice «Usar #… en … del tema …, sobre …» (nombre único y que contiene el texto visible).
- **M3** publicar retiene el autoguardado (`hold`): lo escrito mientras publica no se marca guardado, no compite con la publicación y se guarda después desde la versión que respondió el servidor.
- **M4** historial con estados cargando, error (con «Reintentar»), vacío y «Ver más versiones» (`nextBefore`); «Restaurando…» propio; 409/401/403/422 de publicar y de restaurar con mensajes propios; el 409 detiene el guardado como un conflicto normal y ofrece «Cargar la versión del servidor».
- **Menores** m1 paginación, m2 «sin cambios» desde la versión publicada que ya conoce el editor (no de la lista), m3 `{{minimum}}` en en-US, m4 mayúscula inicial, m5 nombre accesible por versión, m6 pruebas; estilos: `ul` ya no hereda la caja ámbar y `.de-swatch` no se redefine.
- Nivel `TESTED` (vitest, arnés Playwright con Chrome); sin backend real. Las capturas Linux nuevas están en `evidence/plantillas-f5/e-versiones-*` y `e-restaurar-confirmar-1280.png`; no se tocó ninguna línea base de macOS.

## PR c · lienzo libre (2026-11-25)

- Modelo (`model/canvas.ts`): pasar un lienzo `flow` a `free` (altos por defecto, apilado en orden), crear el lienzo de escritorio a partir del móvil (×3, 12 columnas, P9), colocar con límites (columnas y 4000 px), giro en pasos de 5°, capas (frente/fondo, ±100), relleno y margen en múltiplos de 4, paleta de componentes sin medios (título, texto, cita, botón, cuenta atrás, ornamento, espaciador, HTML) y quitar elementos (la portada y el botón de regalos no se quitan).
- UI: arrastre, tirador de tamaño y de giro por puntero, flechas (Shift cambia el tamaño) y Suprimir, inspector numérico y paleta. El botón de regalos se mueve y cambia de tamaño pero el editor rechaza girarlo, ocultarlo, quitarlo o dejarlo bajo 44 px, diciendo por qué.
- Pendiente (no hecho): guías de alineación, selección múltiple, imagen/galería/video/mapa/música/dibujo en la paleta (necesitan medios o F3/F6) y animación por elemento. «Tapado por otro elemento» solo lo comprueba el servidor.
- Nivel `TESTED`.

## PR c · ronda 1 (revisión A/B: accesibilidad y táctil del lienzo)

- **A1 teclado completo:** Enter/Espacio seleccionan; flechas mueven (Mayús: paso grande, un cuarto de las columnas y 5 filas); Alt+flechas cambian el tamaño; R gira (Mayús+R al revés); Re Pág/Av Pág suben/bajan la capa; Supr quita. Todo pasa por `useCommands` (mismas operaciones que el puntero y el inspector). Ayuda visible enlazada con `aria-describedby`.
- **A2 anuncios:** una región `role="status"` para todo el editor (`announce` en el contexto). Dice cada gesto (el de puntero, una vez al soltar), cada límite y cada rechazo con su motivo (Supr sobre el botón de regalos: «es obligatorio…»). Tras quitar, el foco pasa al siguiente elemento o al lienzo de la página (`focusAfter`).
- **A3 asas:** dibujo de 20 px, área que responde de 44 px (`::after` con `inset: -14px`); `aria-hidden` (el teclado hace lo mismo, ya no son `role="img"`). La prueba mide el pseudoelemento y hace hit testing a 21 px (sí) y 26 px (no).
- **A4 inspector:** borrador por campo; confirma con Enter o al salir, Escape revierte, fuera de rango o decimal muestra error en línea (`aria-invalid`, `aria-describedby`) sin aplicar. Teclear «10» en Alto funciona.
- **A5 táctil:** `touch-action: none` solo en el elemento seleccionado y sus asas; el lienzo y los elementos sin seleccionar dejan desplazar la página (un dedo sobre un elemento no seleccionado ya no inicia gesto: el toque lo selecciona; deseleccionar es con un clic en el fondo, no al empezar a tocar). Prueba Playwright móvil con eventos táctiles reales (CDP) a 360 px: el dedo desplaza la página sobre un elemento sin seleccionar y arrastra el seleccionado sin mover la página.
- **m1** contornos de elementos y del lienzo con `--de-field` (>= 3:1, medido en claro y oscuro). **m2** oculto: borde discontinuo, fondo apagado, etiqueta con icono y nombre accesible «, oculto»; CSS duplicado/muerto retirado. **m3** títulos de página del lienzo a `h2` (axe sin ninguna violación, de cualquier impacto, a 360/768/1280, claro/oscuro). **m4** a <= 960 px el inspector es una hoja plegable fija abajo y el botón «Ir al inspector del elemento» / «Volver al elemento» enlaza ambos. **m5** textos por defecto de la paleta en i18n (`palette.default.*`). **m6** este apartado. **m7** pruebas de teclado, tamaño de asas y no remontado del elemento (mismo nodo DOM tras mover).
- **Antes/después:** las pruebas nuevas contra el código anterior: vitest 21 fallos de 29; Playwright 10 fallos de 11. Después: 313/313 en `design-editor`, 11/11 en Playwright.
- **Pendiente (no hecho):** la hoja abierta tapa parte del lienzo hasta que se pliega (se decide a mano); guías de alineación y selección múltiple; verificación en Safari/iOS con dedo real; lectores de pantalla reales (solo se comprobó el árbol de accesibilidad y axe); animación por elemento sigue fuera (sin movimiento nuevo salvo el giro del guardado).
- **Nivel:** `TESTED` (vitest y Chromium de Linux con el arnés). Líneas base macOS que cambian: ninguna.

## PR c · ronda 2 (revisión del orquestador: PL-125-R2-V1..V6)

- **V1 (mayor):** a ≤ 960 px la hoja del inspector mide como máximo 45 vh (el cuerpo se desplaza dentro de ella), tiene botón «Cerrar» visible (es-BO «Cerrar», en-US «Close») y, al abrirla o al cambiar de elemento seleccionado, el elemento se desplaza a la franja libre sobre la hoja (margen 24 px; el pie de la página crece 45 vh mientras está abierta). Prueba Playwright a 360×800 y 768×1024: el rect del elemento termina por encima de la hoja y la hoja no pasa de 45 vh.
- **V2:** el `summary` lleva chevron (arriba cerrada, abajo abierta; la prueba compara su transformación) y Escape cierra la hoja devolviendo el foco al elemento. Un Escape dentro de un campo con borrador sigue revirtiendo el borrador primero.
- **V3:** el área de 44 px de un asa que cae dentro del botón de regalos de otro elemento ya no inicia el gesto: el toque selecciona el botón. El dibujo de 20 px del asa conserva su prioridad. La prueba falla sin el cambio y pasa con él.
- **V4:** la prueba de «r» afirma «Texto: giro de 5 grados.» y `rotate(5deg)`, y Mayús+R vuelve a 0.
- **V5:** `E2E_PORT` en `playwright.config.ts` (idéntico al de #124) y en `e2e/vite.config.ts`.
- **V6:** Escape suelta el foco del elemento (el foco pasa a `body`); la prueba comprueba que ↓, ↑, Espacio, Re Pág y Av Pág ya no llegan con `defaultPrevented` (con el elemento enfocado, Av Pág sí lo toma). No se mide el desplazamiento real: el Chromium sin cabeza de Linux no desplaza con teclas ni en una página sin foco.
- **Pruebas nuevas** sobre el botón de regalos: Alt+↑ por debajo de 44 px, girar y mover el texto junto a él, mover el botón sobre el texto y enviarlo al fondo con el texto encima; todo se rechaza con su motivo en `role="status"` y `role="alert"` sin cambiar el estilo.
- **Cifras (Linux, Chromium real, puerto 42634):** `eslint packages/design-editor packages/i18n` sin salida; `tsc --noEmit` en design-editor sin errores; vitest design-editor 313/313, i18n 15/15, universal 667/667; Playwright `design-editor` 44/44 (eran 39 de este carril más las del arnés base; 5 nuevas del carril). Salidas en `docs/progress/evidence/plantillas-f5/`.
- **Pendiente:** NVDA/JAWS y dedo real en Safari/iOS; el desplazamiento por teclado en un navegador con cabeza.
- **Nivel:** `TESTED`. Líneas base macOS que cambian: ninguna (capturas Linux en `docs/progress/evidence/plantillas-f5/c2-*.png`).
