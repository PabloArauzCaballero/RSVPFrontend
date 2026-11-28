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
plantillas-v2-extra.spec.ts -> 205 passed (151 antes; el bloque V1/V2 pasó de 18 a 72 casos)
plantillas-v2-portadas-existentes.spec.ts -> 120 passed
```
Primera corrida (antes de afirmar `centred` en Black tie): 12 fallos de Black tie en la prueba nueva, porque el documento de Black tie también centra el texto; la aserción se corrigió (foto de ancho completo) y la corrida final está en verde.

## Ronda 3 · actualización con la oficial y corrector de la nube · 2026-11-27
Se fusionó (merge, sin rebase ni push forzado) `chore/deploy-contabo-coolify` en `eb392573` (incluye FE #146 y #157) sin conflictos.

### La base de portadas estaba obsoleta: la oficial ya movió 34 de 120 medidas
FE #146 (PL-OF-1) hace `display: contents` el `<picture>` de **toda** portada (`styles.css`, `.cdesign-cover > picture`). Con esa regla, 34 de las 120 medidas de `e2e/fixtures/portadas-base.json` (grabado en `58ddce68`) ya no coinciden en la oficial (por ejemplo `arena-terracota 360`: foto de x 33 a x 74,2), y el `pictureDisplay` de las 60 con foto pasa de `block` a `contents`. Con la base vieja, `plantillas-v2-portadas-existentes.spec.ts` daba **60 failed, 60 passed** sobre el merge: el cambio no era de este PR. La base se volvió a grabar en la oficial (`eb392573`, build propia, `COVER_GEOMETRY_RECORD`): 120 passed en la oficial y 120 passed en esta rama. La regla de las seis plantillas (`data-align`) sigue ganando a `picture { display: contents }` solo en ellas (especificidad), y las 30 existentes no reciben el atributo.

### Comandos y salidas (merge `28ba6234` + este commit; Linux, Chrome `/usr/bin/google-chrome`, `next build` + `next start` sobre `fixture-api.mjs`; NO backend real; yarn 4.10.3)
```
yarn install --mode=skip-build -> OK
yarn typecheck (turbo, 19 tareas) -> 19 successful
yarn test (turbo, 33 tareas) -> 33 successful (celebration-theme: 18 archivos, 3282 tests; seo-web: 25 archivos, 210 tests)
npx eslint packages/celebration-theme apps/seo-web/e2e --max-warnings 0 -> rc=0
node scripts/validate-harness.mjs -> Harness frontend: 28 carriles, 61 skills y recarga por prompt válidos.
next build (apps/seo-web) -> OK
playwright test plantillas-v2 (v2, bodas, fiestas, infantil-ritos, sobrio, extra, portada de FE #146, portadas-existentes), sin reintentos -> 1287 passed (13.8m)
  (los 4 fallos de 360x800 de la ronda 2 ya no existen: los arregló FE #146)
```
Contraste sobre píxeles pintados (texto oculto con `-webkit-text-fill-color: transparent`, captura recorriendo la página, peor píxel bajo la caja de cada texto no tapado por el dock; 72 casos = 6 × con/sin foto × claro/oscuro × 360/768/1280; 0 casos bajo 4,5): peor texto por plantilla Rumbo 6,04 · Mesa 5,86 · Disco 6,40 · Black tie 5,78 (oscuro) · Solitario 6,32 · Rosa 6,03. Se miden entre 89 % y 100 % de las cajas de texto por caso; las demás quedan bajo el dock en el recorrido y se miden aparte en `plantillas-v2-extra.spec.ts` (AA en el DOM).
Negativos: `/c/fixture-v2-no-existe` -> 404; `/c/fixture-v2-pedida-rosa/no-existe` -> 404; `/c/fixture-v2-pedida-rosa/regalos` -> 200. Mutación: quitar `&& PHOTO_ON_TEXT_AXIS.has(context.theme.id)` de `render.tsx` hace fallar `extra.test.tsx` («arena-terracota: not to contain data-align»); se restauró (`git checkout`).

### NO probado
Backend real, Docker y PostgreSQL (la web leyó el fixture); `contracts:validate`; gitleaks (no instalado); macOS, Safari, Firefox, iOS/Android, lector de pantalla; texto sobre foto real (N/A: foto arriba y texto debajo).

### PL-EXTRA-3 (sin tocar; registrado en `bugs/catalogo`)
Reproducido en este merge: el h1 de `pedida-rosa` mide 47,99 px a 360, 56 px a 768 y 56 px a 1280, aunque el lienzo de escritorio del documento pide `size: 104`. `Canvas` (`render.tsx:266`) toma `phone.get(id) ?? wide.get(id)`. Arreglarlo cambia la portada de las 36 plantillas, así que no entra en este PR.

## Ronda 4 · corrector FE (HEAD revisado 2b448cea)

- PL-143-R4-1: `data-heading-face="script"` solo se emite si el id del tema es uno de las seis (`SCRIPT_TITLE_FACTS_IN_BODY`, mismo criterio que R2-2). Prueba `extra.test.tsx` (R4-1): 30 plantillas existentes x 7 familias script, una copia con otro id y Great Vibes -> sin atributo; las seis con Great Vibes -> con atributo. Mutación (quitar el filtro por id) -> falla en `arena-terracota + great-vibes`.
- PL-143-R4-2 (PREGUNTA PARA PABLO, no resuelta): `PHOTO_ON_TEXT_AXIS` y `SCRIPT_TITLE_FACTS_IN_BODY` dependen de `theme.id`. Una copia de una de las seis con otro id pierde el arreglo de eje y la fuente del cuerpo en los datos. Depende de cómo el BE identifica las copias (id propio, `sourceTemplateId`, `key`): ¿qué campo debe usar el FE para reconocer una copia?
- PL-143-R4-4: merge (no rebase) de `origin/chore/deploy-contabo-coolify` (9425493d2) sin conflictos; `portadas-base.json` no cambió (120 passed).
- PL-143-R4-5: `plantillas-v2-extra` y `plantillas-v2-sobrio` miden también 390x844 con la aserción PL-130-M2.
- R4-3, R4-6, R4-7: declarados, sin tocar en esta ronda.

## Integración nube 3 (2026-11-28) · merge de la oficial b04345d2
- Merge (no rebase) de `origin/chore/deploy-contabo-coolify` b04345d2 sin conflictos; `packages/contracts` y `query-hooks` sin diferencia frente a la oficial (no se re-vendoriza: este PR no cambia contrato; depende de BE #163 solo por las plantillas sembradas).
- yarn 4.10.3 vía corepack con `COREPACK_NPM_REGISTRY=https://registry.npmjs.org` y `NODE_USE_ENV_PROXY=1` (`repo.yarnpkg.com` bloqueado). `yarn install --immutable` OK.
- `yarn typecheck` 19/19 OK; `yarn lint:code` rc=0; `node scripts/validate-harness.mjs` OK.
- `yarn test`: seo-web 224, design-editor 450, query-hooks 210, ui 333, forms 65, auth 89 (1 skipped heredado), design-tokens 91, api-client 17, ui-web 15, i18n 18, telemetry 8, contracts 6. celebration-theme 3293/3293 y universal 853/853 al correrlos solos; bajo turbo en paralelo (4 CPU) un test de cada uno agotó su tiempo (extra.test R4-1 a 5 s; guests.test) y pasó aislado. Es sensibilidad a carga, no regresión; no se tocó el tiempo de espera.
- Chrome real (chromium 1243 preinstalado) contra `next build` + `next start` sobre `fixture-api.mjs`, `--trace off`: extra 217/217, portadas-existentes 120/120, sobrio 171/171.
- NO probado: backend real, gateway/Kong, RabbitMQ, MinIO, Docker, iOS/Android, Safari/Firefox, lector de pantalla, gitleaks (sin binario), `test:visual` contra líneas base de macOS.

## Líneas base macOS que cambian
Ninguna. Capturas nuevas solo en `docs/progress/evidence/plantillas-extra/` (360/768/1280, claro y oscuro, con y sin foto) y `contraste.md` / `contrast.jsonl`.

## Reversión
Revertir el PR; las filas sembradas en un entorno se quedan hasta que se archiven (la migración tiene `--revert` para las no editadas).

## Ronda 3 · 2026-11-28 · maquetación de escritorio de Mesa larga, Rumbo, Solitario y Disco (PL-FE-V2-HUECOS)

Entorno: Linux, Google Chrome `/usr/bin/google-chrome`, `next build` + `next start` sobre `apps/seo-web/scripts/fixture-api.mjs` (NO backend real). Yarn 4 instalado desde `@yarnpkg/cli-dist` (`repo.yarnpkg.com` bloqueado).

Reproducción (nueve documentos de Otros, Despedida y Pedida a 360 y 1280, midiendo el lienzo de la portada en el DOM):

| documento a 1280 | antes | después |
| --- | --- | --- |
| Mesa larga: dibujo de la mesa | 1016 × 968 px (llena la primera pantalla) | 291 px de alto, 4 de 12 columnas |
| Rumbo: tramo vacío bajo la portada | 448 px | 64 px (solo el `gap` de la rejilla) |
| Solitario: tramo vacío | 448 px | 64 px |
| Disco: tramo vacío | 288 px | 64 px |

A 360 px no cambia nada (el teléfono ya estaba bien). Los otros cinco documentos no se tocan.

Causa raíz: `stack()` de `bodas.py` hace que un elemento con `hero=<filas>` ocupe esas filas; la rejilla solo crece en las ocho filas que cubre el titular, de modo que las filas restantes (56 en Rumbo y Solitario, 36 en Disco) quedaban vacías. El dibujo ya se dimensiona por su ancho, así que `hero` no hacía falta. En Mesa larga la mesa abarcaba las 12 columnas con 160 px de relleno lateral y el dibujo escalaba con el ancho.

Corrección (`extra.py`, regenerado con `python3 extra.py src/design/documents`; los mismos bytes van a `seeds/templates/design-v2/` del BE): se quita `hero=` de Rumbo, Solitario y Disco y la mesa pasa a 4 columnas centradas sin relleno.

Pruebas: `extra.test.tsx` (ningún elemento de la portada de escritorio abarca más de 8 filas ni un dibujo pasa de 6 de 12 columnas; falla con los cuatro documentos antiguos) y `plantillas-v2-extra.spec.ts` (los nueve documentos a 360 y 1280: tramo vacío ≤ 120 px y dibujo ≤ 600 px). Con Chrome real: `plantillas-v2-extra` + `plantillas-v2-portadas-existentes` 355 casos, sin fallos tras ajustar el criterio de la prueba nueva.
