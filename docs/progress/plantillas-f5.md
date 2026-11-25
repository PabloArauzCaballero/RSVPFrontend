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

### Pendiente / abierto
- `GIFTS_BLOCK_TEXT_TOO_LARGE` y la altura útil (padding + borde) del botón de regalos no están espejados en `guards.ts`: ningún gesto del editor de PR a los provoca; hay que espejarlos cuando lleguen los controles de tipografía y relleno (PR b/c).
- Los avisos P19 solo se muestran tras un guardado (o los que traiga el registro); el servidor los envía al crear, guardar y restaurar.
- Contrato 1.3.0 de Template/Media aún no vendorizado: `designApi` está tipada a mano; falta prueba de conformidad cuando #135 se fusione.
- Los dibujos del lienzo en PR a son un esquema de cajas (wireframe); el renderizador real llega con F6.
