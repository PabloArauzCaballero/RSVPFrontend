# F4 c1 · grupo de bodas como documentos de diseño v2 (estado)

Rama FE `feat/plantillas-f4c1-bodas` (sobre `feat/plantillas-f4b-render-v2`, fusionada hasta `18621ae`), rama BE `feat/plantillas-f4c1-bodas` (sobre `feat/plantillas-f4b-v2`, fusionada hasta `62abf07`). Pila: #115 → #121 → #126 (PR b) → este.

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
5. Plata en variante `editorial` y Oro en `classic`: dos plantillas de bodas comparten la foto en arco con Marfil (b).

## Verificación (qué se ejecutó, 2026-11-25)
- `packages/celebration-theme`: `vitest run` → 2560 pruebas en verde (90 nuevas en `bodas.test.tsx`: lectura, AA claro y oscuro, matiz fuera del amarillo, oscuro propio y distinto en las ocho, composición propia, P22, `/r/{listingId}`, es-BO/en-US, con y sin foto, animaciones dentro del contrato, lector nativo); `tsc --noEmit` limpio.
- BE (Postgres 16 real, rol `template_owner` sin superusuario, RLS): `manage.py test tests` → 239 en verde (3 omitidas ya existentes), con `test_design_v2_bodas_seeds.py` (6 casos: validador `validate_design`, sin avisos de contraste, claves = semillas v1, sin amarillo, oscuros y acentos distintos).
- Playwright (Chromium 1243 real, `next build` + `next start` + fixture de contrato, **no** el backend real): `e2e/plantillas-v2-bodas.spec.ts` → **130 pasadas**: 8 plantillas × con/sin foto × claro/oscuro × 360/768/1280 (regalos visible, ≥ 44 px, en pantalla al final del scroll, sin desborde, contraste AA medido en el DOM, lienzo con la paleta del documento), axe sin violaciones a 360 px (32), actos numerados, una sola entrada y movimiento reducido.
- Capturas Linux (evidencia, no líneas base): `docs/progress/evidence/plantillas-f4c1/` (360 y 1280, claro y oscuro, con y sin foto).
- **Sin ejecutar:** recorrido con backend real, iOS/Android, Safari/Firefox, lector de pantalla, gitleaks, `apps/universal` (dos copias de React en este entorno), texto sobre foto real (las fotos del fixture son degradados de ejemplo; ningún documento pone texto sobre la foto).

## Líneas base macOS que cambiarían
Ninguna por este PR (solo añade rutas y documentos nuevos). Las que cambian por el dock y B2/M4 son las de PR b.

## Reversión
Revertir el PR: los documentos no se siembran (la migración es F4 z), así que no hay datos que deshacer. El CSS añadido solo actúa bajo `.celebration-design` con variante `editorial` o `display: "list"`.

## Avisos
- `apps/seo-web/pw.tmp.config.ts` llega de PR b con rutas de un entorno local; conviene retirarlo allí.
