# F4 c1 · grupo de bodas como documentos de diseño v2 (estado)

Rama FE `feat/plantillas-f4c1-bodas` (sobre `feat/plantillas-f4b-render-v2`, fusionada hasta `eddaf64`), rama BE `feat/plantillas-f4c1-bodas` (sobre `feat/plantillas-f4b-v2`, fusionada hasta `7e6a383`). Pila: #115 → #121 → #126 (PR b) → este.

## Qué hay
- Ocho documentos v2: Jardín botánico, Rosa antiguo, Editorial, Editorial granate, Editorial oliva, Bodas de oro, Bodas de plata y Pedida de mano (`packages/celebration-theme/src/design/documents/*.json`; los mismos bytes en BE `seeds/templates/design-v2/`). Los genera y valida `packages/celebration-theme/scripts/design-documents/bodas.py` (contraste AA, matiz fuera del amarillo).
- Fichas de personalidad: `docs/design/plantillas-f4c1/FICHAS-BODAS.md`.
- Registro: `documents/bodas.ts` (ids deterministas de las semillas v1, P20); `fixture-api.mjs` sirve `fixture-v2-<clave>` y `-sinfoto`.
- CSS (bloque «F4 c1» al final de `styles.css`): portada editorial como doble página desde 900 px, actos numerados con `display: "list"` y sello con color propio. Sin degradados ni mayúsculas.
- Pruebas: `src/design/bodas.test.tsx` (90), `apps/seo-web/e2e/plantillas-v2-bodas.spec.ts`, BE `tests/test_design_v2_bodas_seeds.py`.

## Límites honestos (preguntas para Pablo en el PR)
1. La variante de portada solo admite cinco valores (`classic`, `minimal`, `editorial`, `festive`, `corporate`): los ocho se reparten entre ellos y la diferencia viene de la composición, no de la foto. Ampliar el contrato permitiría un camafeo ovalado, un pasaporte o una foto en esquina.
2. Sello de lacre, telón y arco son aproximaciones: el elemento solo tiene `radius`, sin máscara ni `clip-path`.
3. Oro, Plata y Pedida conservan la lista de secciones de su semilla v1, que no incluye recomendaciones. ¿Se añaden?
4. El ornamento `laurel` como separador no es alcanzable: el id `laurel` ya es un dibujo (la corona). Se usa `laurel-esquina`.
5. Plata en variante `editorial` y Marfil (b) comparten foto en arco con Oro en `classic`: Plata y Marfil comparten el arco de la foto.

## Ronda 1 del orquestador (PL-128-M1..M6, m1-m3, m6)
- M1: merge (no rebase) de `feat/plantillas-f4b-render-v2` (FE) y `feat/plantillas-f4b-v2` (BE).
- M2: padding del sello de Rosa simétrico (`box(8)`) y se retira la regla `color: inherit` de `styles.css` (el color ya llega por `--cd-ink`). Prueba e2e: la inicial queda centrada (dx ≤ 2 px, dy ≤ 4 px) a 360 y 1280.
- M5 (causa raíz): en móvil el lienzo de la portada se detiene en 30 rem (480 px) y queda centrado; el titular editorial va sobre la foto en móvil y centrado verticalmente en escritorio.
- M3/M4: Plata (cifra y laurel lado a lado, 2 columnas cada uno) y Oro (cifra de 2 columnas, filete tras el nombre en escritorio) ponen el nombre antes del pliegue; Granate en escritorio baja las copas bajo el programa.
- M6: `caja-anillo` redibujada con la tapa levantada y tres nudillos de bisagra visibles (instantánea dorada actualizada solo para ese dibujo).
- m1/m3: secciones en 8 columnas, icono de 1 columna pegado al título, y cabeceras propias (Oro y Pedida centradas, Plata a la derecha). m2: Pedida usa `copas` en lugar de `rosa`.
- Aserción nueva en `plantillas-v2-bodas.spec.ts`: el `h1` de las 11 plantillas (8 + Marfil, Piñata, Gala), con y sin foto, queda dentro de la primera pantalla a 360×800, 768×1024 y 1280×900.
- Posición del `h1` (borde inferior, px) medida tras la ronda, con foto, 360 / 768 / 1280: Oliva 733/614/580, Oro 750/757/832, Plata 364/349/411, Pedida 741/622/512, Editorial 285/317/664, Granate 696/750/765. Marfil 686/693/687, Gala 613/727/893: sin cambios; Piñata 766/800/755 (a 768 baja de 744 a 800, dentro de la pantalla de 1024).

## Verificación (qué se ejecutó, 2026-11-25, tras la ronda 1)
- `packages/celebration-theme`: `vitest run` → 2582 pruebas en verde; `tsc --noEmit` y `eslint` limpios.
- BE: `manage.py test tests.test_design_v2_bodas_seeds tests.test_design_v2_seeds tests.test_design_v2 tests.test_design_hardening tests.test_design_gifts_useful_height` → 107 OK (validador, sin avisos de contraste, sin amarillo). La suite completa con Postgres 16 no se repitió en esta ronda (los cambios son solo bytes de semillas); la última corrida completa fue 239 OK.
- Los ocho JSON son idénticos byte a byte en FE y BE (`cmp`).
- Playwright (Chromium 1243, `next build` + `next start` + fixture de contrato, **no** el backend real): `e2e/plantillas-v2-bodas.spec.ts` → **197 pasadas** (130 anteriores + 66 del `h1` en primera pantalla + sello de Rosa).
- Capturas Linux (evidencia, no líneas base): `docs/progress/evidence/plantillas-f4c1/` recapturadas.
- **Sin ejecutar:** recorrido con backend real, iOS/Android, Safari/Firefox, lector de pantalla, gitleaks, `harness:validate`, `apps/universal`, texto sobre foto real, galería real (m5).

## Líneas base macOS que cambiarían
Cambian las de la portada de Marfil, Piñata y Gala (b) entre 481 y 899 px de ancho (p. ej. 768 px): el lienzo móvil de la portada ya no pasa de 480 px. No se tocaron las líneas base: hay que regenerarlas en el Mac de Pablo. Las del dock y B2/M4 son de PR b.

## Reversión
Revertir el PR: los documentos no se siembran (la migración es F4 z), así que no hay datos que deshacer. El CSS añadido solo actúa bajo `.celebration-design` con variante `editorial` o `display: "list"`.

## Avisos
- `apps/seo-web/pw.tmp.config.ts` llega de PR b con rutas de un entorno local; conviene retirarlo allí.
