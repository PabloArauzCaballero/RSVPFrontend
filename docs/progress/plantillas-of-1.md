# PL-OF-1 · «Otros eventos» con foto: el título quedaba bajo el dock a 360×800

## Causa raíz
`MediaImage` envuelve la foto de la portada en un `<picture>` (fuentes AVIF/WebP). El elemento de la grilla `.cdesign-cover` era el `<picture>`, no el `<img>`, así que todas las reglas escritas sobre `.cdesign-cover-photo` (`order`, `grid-column/row`, `justify-items`, anchos en %) no colocaban la foto. En la portada `editorial` en móvil la foto (410 px) quedaba primero y el título caía a y=748 (dock en 723). No era la semilla: `otros-evento.json` no cambia, así que **no hay PR de BE**. El mismo defecto descentraba la foto de `classic` a 360 px y estrechaba la de `corporate` a 1280 px (PL-FE146-1).

## Corrección (ronda 2, causa raíz única)
`packages/celebration-theme/styles.css`:
- `.cdesign-cover > picture { display: contents; }`: el `<img>` pasa a ser el elemento de la grilla y todas las reglas por `.cdesign-cover-photo` vuelven a funcionar. Se retira el selector `:is(picture, …)` de la ronda 1.
- `.cdesign-cover > picture > source { display: none; }`: con `display: contents` Chrome trata cada `<source>` como hijo de la grilla (`display: block`), abre una fila vacía y el `gap` de 1 rem empujaba foto y título hacia abajo (lo vio la prueba nueva en `editorial-oliva`, título a 725,9 con dock en 723,3).

## Pruebas
- `render.test.tsx`: la prueba anclada a un comentario se sustituye por aserciones sobre las reglas (`> picture { display: contents }`, `> picture > source { display: none }`, sin `:is(picture, …)`).
- Nuevo `apps/seo-web/e2e/plantillas-v2-portada.spec.ts` (PL-FE146-2/4): las 27 plantillas v2, con foto y sin ella. A 360×800: el `<picture>` es `display: contents`, el título (h1) termina por encima de `dock.top`, en `editorial` por encima de la foto y en `classic` la foto queda centrada (±1 px). Sin foto: no hay `<picture>` y el título queda sobre el dock. A 1280×900: en `corporate` la foto mide el ancho de la celda; en `editorial` está en la primera columna, junto al texto.

## Medidas a 360×800 (fixture `fixture-v2-otros-evento`, Chrome, `next build` + `next start`)
| | h1 (y) | texto de la portada | dock.top |
|---|---|---|---|
| Antes | 748–839 | 748–922 | 723 |
| Después | 322–413 | 322–496 | 723 |

Capturas (evidencia, no líneas base): `docs/progress/evidence/plantillas-of-1/antes-…png`, `despues-…png`.

## Verificación (ronda 2, Chrome de Playwright 1243, `next build` + `next start` con `RSVP_VISUAL_NOW` y el fixture de contrato, puerto propio)
- `plantillas-v2-portada.spec.ts` (nuevo) + `plantillas-v2-sobrio.spec.ts`: 222 pasadas (65 + 157).
- `plantillas-v2-bodas|fiestas|infantil-ritos|v2.spec.ts`: 643 pasadas.
- La prueba nueva falló sin la regla de `<source>` (solo `display: contents`): `editorial-oliva` 360×800 con foto, título en 725,9 y dock en 723,3. Con la regla, pasa.
- `celebration-theme`: `vitest run` 3015 pasadas; `tsc --noEmit` (celebration-theme y seo-web) en 0; eslint de `packages/celebration-theme` y de la spec nueva en 0.
- `harness:validate` en verde; `packages/contracts` `generate.mjs --check` y `design-tokens` `--check` en verde. `generate.mjs --verify-source` y gitleaks no se pudieron ejecutar en este entorno (sin red a la fuente y sin el binario).
- Sin ejecutar: backend real, iOS/Android, Safari/Firefox (el fixture es de contrato).

## Líneas base macOS que cambian
Ninguna.

## Reversión
Revertir el commit: solo CSS y una prueba.

## Verificación del PR #160 del 27 de noviembre de 2026

El cambio del carrusel de #156 agregó selectores válidos con `:is(picture, …)`. La aserción de PL-OF-1 buscaba esa sintaxis en toda la hoja CSS y fallaba también en la base de Coolify `d6d4aef8`. La búsqueda se limita a selectores de `.cdesign-cover`, con las aserciones existentes sobre `display: contents`, los `source` y el orden en móvil. [Check fallido](https://github.com/PabloArauzCaballero/RSVPFrontend/actions/runs/46043195429/job/140655833242?pr=160)

`yarn workspace @rsvp/celebration-theme test src/design/render.test.tsx -t PL-OF-1` pasó con la hoja CSS actual y volvió a identificar el selector histórico al reintroducirlo en una copia temporal. El paso `yarn turbo run test --concurrency=2` con los filtros de `scripts/test-filters.mjs` completó sus 11 tareas, incluidas las 3015 pruebas de `celebration-theme`.
