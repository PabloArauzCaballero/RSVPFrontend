# Plantillas extra: Otros, Despedida y Pedida (decisión 6 de Pablo, 2026-11-25)

Ramas FE y BE `feat/plantillas-extra-otros-despedida-pedida` (se retoma el WIP `b0cc6cb` / `5ba9a37`; se compararon con `feat/plantillas-f4d-nuevas` del orquestador, que tiene otros nombres y documentos distintos: se conservó el WIP, que ya traía la prueba de migración con filas editadas). PRs enlazados: ver sus cuerpos.

## Qué hay
- Seis documentos v2 (`otros-rumbo`, `otros-mesa`, `despedida-disco`, `despedida-esmoquin`, `pedida-solitario`, `pedida-rosa`) generados por `scripts/design-documents/extra.py`, registro `documents/extra.ts`, arte en `hero-art.ts`. BE: semillas v1 031-036 y los mismos bytes en `seeds/templates/design-v2/`.
- «P20 no pisa filas editadas» ya estaba en la rama oficial (`migrate_templates_to_v2`: `skipped` con motivo `edited`, `--include-edited` apagado); aquí solo se prueba con las seis filas nuevas.
- Ronda PL-130-M2 propia: el nuevo `e2e/plantillas-v2-extra.spec.ts` falló en 8 casos (h1 o texto de portada bajo el dock a 360×800; h1 de Mesa larga fuera de la ventana a 1280). Corregido en `extra.py`: Mesa larga pone los nombres antes de la mesa, Rumbo/Disco/Solitario/Rosa reducen los dibujos con relleno horizontal, Black tie pasa a la variante `corporate`.

## Hallazgos propios
- PL-EXTRA-1: la prueba `plantillas-v2-sobrio.spec.ts` de la rama oficial falla para `otros-evento 360x800` con foto en este entorno (h1 en 839 > dock 723). No se toca (fuera de alcance); se informa.

## Ronda 1 del orquestador (corrección)
- PL-FE143-V1 (alta): Allura solo en titulos de 32 px o mas; fecha, lugar, cuenta atras, horarios y sedes usan Mulish (`data-heading-face="script"` en `render.tsx` y regla en `styles.css`). Prueba e2e: ningun nodo de texto con Allura bajo 32 px, en las seis a 360/768/1280.
- PL-FE143-V2: la foto en arco o circulo comparte eje con el texto cuando el documento centra la portada (`data-align="center"`); el aro del arco queda a 13 px de los nombres. Prueba e2e: eje de la foto = eje del h1 (±1,5 px).
- PL-FE143-V3: los nombres van primero en el telefono en las seis; 360×640 no es parte de la regla PL-130-M2 (360×800 y 390×844): cifras en la ficha; pregunta a Pablo.
- PL-FE143-V4: Rumbo, Disco y Solitario tienen dibujo heroe en escritorio (`hero=` de `bodas.py:stack`).
- PL-FE143-V5: Solitario 206° (a 51° de Pedida de mano), Black tie con copa de vino; prueba de matiz >= 30° entre hermanas de un tipo.
- PL-FE143-1/-3: se registra PL-EXTRA-2 en `bugs/catalogo`; `seeded-palettes.json` y `seed-palettes.ts` ya no citan ramas que se borran tras el squash.
- Hallazgo nuevo (no corregido aqui): `Canvas` toma la tipografia del elemento movil (`phone.get(id) ?? wide.get(id)`), de modo que `typography` del lienzo de escritorio (tamano 72/80/104, alineacion) no se aplica; las portadas de escritorio usan el tamano fluido del movil. Se registra en `bugs/catalogo`.

## Ronda 2 del orquestador (corrección) · 2026-11-27

Entorno: Linux, Google Chrome `/usr/bin/google-chrome` con el proxy del entorno para cargar Google Fonts, `next build` + `next start` sobre `apps/seo-web/scripts/fixture-api.mjs` (NO backend real). `yarn` no es alcanzable desde el sandbox (`repo.yarnpkg.com` bloqueado): dependencias instaladas con npm en un directorio fuera del repo y enlazadas; `gitleaks` no está instalado (no se ejecutó en esta ronda). Playwright con un config temporal fuera del repo (mismos `use` que `playwright.config.ts`, sin `webServer`).

### PL-FE143-R2-2 · el cambio de motor ya no mueve las portadas existentes
- Causa: `data-align="center"` en `CoverBlock` (y su regla `picture { width: 100%; display: flex }`) se emitía para todo documento con `typography.align: "center"` en la portada, también para las plantillas que ya existían.
- Solución: `render.tsx` solo emite `data-align` si el `theme.id` está en `EXTRA_TEMPLATE_IDS` (ahora en `documents/extra-ids.ts`, sin importar los JSON). Las 30 plantillas existentes no reciben el atributo ni la regla.
- Prueba: `e2e/plantillas-v2-portadas-existentes.spec.ts` mide h1 y foto (`getBoundingClientRect`) de las 30 existentes, con y sin foto, a 360 y 1280 (120 casos) contra `e2e/fixtures/portadas-base.json`, medido en la rama oficial `58ddce68` (tolerancia 1 px), y comprueba que no hay `data-align` ni `display:flex` en el `<picture>`. Prueba unitaria equivalente en `design/extra.test.tsx`.
```
base 58ddce68 (grabación, COVER_GEOMETRY_RECORD)       -> 120 passed (3.0m)
0adae467 (antes de la corrección), misma prueba        -> 52 failed, 68 passed: 22 casos con geometría distinta (foto x 33 -> 74 en jardin-botanico, cielo-bautizo,
                                                          arena-terracota, fiesta-patronal; x 16 -> 68 en bodas-de-oro e inauguracion; 405 -> 318 en gala y editorial-granate
                                                          a 1280; h1 x 33 -> 45,7 en menta-infantil con y sin foto; h1 x 296 -> 393 en fin-de-ano-sinfoto) y 30 con el atributo
2b051796 (con la corrección), misma prueba             -> 120 passed (2.7m)
```
- Decisión pendiente (no la tomo yo): si el mismo arreglo debe alcanzar a las plantillas existentes (es plausiblemente la corrección correcta del mismo defecto de eje), se amplía el conjunto con una línea y se regeneran las líneas base de esta prueba. Va como pregunta 5 en el PR.

### PL-FE143-R2-4 · cobertura del eje foto/texto
`plantillas-v2-extra.spec.ts`: `data-align=center` se afirma en Mesa larga, Black tie, Solitario y Rosa (y su ausencia en Rumbo y Disco); en las que llevan foto en arco o círculo se afirma que la foto es más estrecha que la portada y que su eje coincide con el del h1 (±1,5 px); en Black tie, que la foto ocupa todo el ancho. Ahora corre con y sin foto, en claro y oscuro, a 360/768/1280 (72 casos; antes 18, condicionales).

### Comandos y salidas
```
packages/celebration-theme: npx tsc --noEmit -> rc=0 · npx vitest run -> Test Files 18 passed (18), Tests 3281 passed (3281)
apps/seo-web: npx tsc --noEmit -> rc=0
npx eslint packages/celebration-theme apps/seo-web/e2e --max-warnings 0 -> sin salida, rc=0
node scripts/validate-harness.mjs -> Harness frontend: 28 carriles, 61 skills y recarga por prompt válidos.
next build (apps/seo-web, NEXT_DIST_DIR=.next-visual) -> OK (incluye el chequeo de tipos de la app)
playwright test plantillas-v2 (todas las v2, Chrome real, fixture): ver «Corrida final» abajo
```

### Corrida final (commit `7eb3665a`, Chrome real, fixture, sin reintentos)
```
playwright test plantillas-v2 (v2, v2-bodas, v2-fiestas, v2-infantil-ritos, v2-sobrio, v2-extra, v2-portadas-existentes) -> 6 failed, 1119 passed (12.5m)
  4 preexistentes a 360x800 (PL-OF-1, arreglados en FE #146): fin-de-ano, bodas-de-plata, primera-comunion, otros-evento («title ends above the dock»);
     fallan igual en la rama oficial 58ddce68 (la misma prueba, build propia).
  2 intermitentes de plantillas-v2.spec.ts «gifts button EMPTY» (gala light/dark 390px; la carrera del color de fondo del dock durante su transición, con la máquina bajo carga de memoria):
     10/10 pasan al repetirlos (--repeat-each=5); en la rama oficial el mismo grupo también falló 1 de 228 (marfil light 320px, `--repeat-each=2`). No tocan portadas ni este PR.
plantillas-v2-extra.spec.ts (151 antes -> 72 + 72 + 18 + 1 ahora, todos en verde en la corrida final)
plantillas-v2-portadas-existentes.spec.ts -> 120 passed
```
Primera corrida (antes de afirmar `centred` en Black tie): 12 fallos de Black tie en la prueba nueva, porque el documento de Black tie también centra el texto; la aserción se corrigió (foto de ancho completo) y la corrida final está en verde.

## Líneas base macOS que cambian
Ninguna. Capturas nuevas solo en `docs/progress/evidence/plantillas-extra/` (360/768/1280, claro y oscuro, con y sin foto) y `contraste.md` / `contrast.jsonl`.

## Reversión
Revertir el PR; las filas sembradas en un entorno se quedan hasta que se archiven (la migración tiene `--revert` para las no editadas).
