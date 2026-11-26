# Plantillas F2: botón de regalos obligatorio y confirmar con acción (PL-A10, PL-A11)

Fecha: 2026-11-24. Rama `feat/plantillas-f2-regalos-confirmar`, apilada sobre `fix/plantillas-fase0-contraste-oscuro`.

## Qué se midió

`generar.mjs` renderiza con el renderer web real las 16 plantillas semilla de `RSVPBackend/seeds/templates/data` (peor caso: el tipo de evento **no** habilita regalos), en claro y oscuro, y las abre en Chromium a 360, 768 y 1280 px (96 combinaciones). Guarda una captura de página completa por combinación en `capturas/` y las mediciones en `mediciones.json`.

Criterios comprobados en cada combinación (el script sale con código 1 si falla alguno):

- el botón «Ver regalos» existe y la entrada «Regalos» está en el menú;
- botón de regalos, de confirmar y entrada del menú miden ≥ 44 px de alto;
- texto del botón ≥ 13 px (medido: 16,8 px);
- icono + texto;
- contraste del texto sobre el relleno ≥ 4,5:1 (mínimo observado: 4,54, Piñata en oscuro);
- sin desborde horizontal.

Resultado: `96 combinaciones; con incumplimientos: 0`.

## Colocación

- El botón vive en la sección «Regalos», justo antes de «Confirma tu asistencia» (o donde la plantilla la coloque).
- Para llegar rápido está la entrada **«Regalos» del menú** bajo la portada. Con 360 px de ancho el menú empieza entre 441 y 781 px de alto: a una pantalla de desplazamiento en un móvil, y ahí la entrada de Regalos es un toque. Se eligió el menú y no un segundo botón en la portada para no competir con el título ni duplicar el destino.

## Límites

- Las fuentes web (Google Fonts) no cargan en el entorno de la prueba: se ven las de respaldo; las fotos de la galería de prueba tampoco cargan (aparecen rotas). No afecta a las mediciones de los botones.
- Es el renderer web estático, no el servidor Next ni el backend real. Las capturas **no** son líneas base visuales.
- No se ejecutó el renderer nativo en iOS/Android: solo `react-native-web` en pruebas unitarias.
- Reproducir: `corepack yarn install && CHROMIUM_PATH=<chromium> SEEDS=../RSVPBackend/seeds/templates/data node docs/progress/evidence/plantillas-f2/generar.mjs`.

## Ronda 2 (Linux, 2026-11-24): confirmar con enlace personal, bloque rsvp en bands y base F0

Chromium real contra `next dev` de seo-web y `apps/seo-web/scripts/fixture-api.mjs` (es-BO en :28214 y en-US con `FIXTURE_LOCALE=en-US` en :28215), 360/768/1280, esquema claro y oscuro del sistema, con axe. Es un fixture de contrato, no el backend real. Archivos en `ronda2-linux/`: `mediciones-ronda2.json` y capturas `*-regalos-sin-enlace.jpg` / `*-confirmar-con-enlace.jpg`.

- Sin credencial: «Busca tu enlace personal» / «Find your personal link»; con credencial en `sessionStorage`: «Confirmar asistencia» / «Reply now». Mismo destino `/c/{slug}/rsvp`, mismo tamaño (246,4x52,5 a 360 px en es-BO; 233,2x52,5 en en-US), sin token en el DOM.
- Fondo del bloque rsvp (bands): idéntico con y sin galería.
- axe: 0 critical/serious; solo `landmark-unique` y `region` (moderate, preexistentes).
- seo-web no pinta el esquema oscuro de la plantilla en esta página (`data-color-scheme="light"` en ambos); el contraste oscuro se comprueba en la prueba de las 16 paletas de `celebration-theme`.
