# F4 c4 · grupo sobrio como documentos de diseño v2 (estado)

Rama FE `feat/plantillas-f4c4-sobrio` y rama BE `feat/plantillas-f4c4-sobrio`, ambas desde `feat/plantillas-f4c1-bodas` de cada repositorio (pila: #115 → #121 → #126 PR b → c1 → este). Hermanos en paralelo: c2 fiestas, c3 infantil y ritos.

## Qué hay
- Siete documentos v2: Minimalista, Arena y terracota, Corporativo, Corporativo grafito, Inauguración, Fiesta patronal y Otros eventos (`packages/celebration-theme/src/design/documents/*.json`; los mismos bytes en BE `seeds/templates/design-v2/`). Los genera y valida `packages/celebration-theme/scripts/design-documents/sobrio.py`, que reutiliza el constructor y las comprobaciones de `bodas.py` (contraste AA, matiz fuera del amarillo).
- Fichas de personalidad: `docs/design/plantillas-f4c4/FICHAS-SOBRIO.md`, con la paleta clara y oscura y el contraste medido de cada par.
- Registro: `documents/sobrio.ts` (ids deterministas de las semillas v1, P20). `fixture-api.mjs` añade los ids y los títulos de ejemplo con dos sentencias `Object.assign` propias, para que los merges con c2 y c3 no toquen las mismas líneas.
- Sin CSS nuevo: la agenda numerada de Corporativo grafito reutiliza `display: "list"` del bloque «F4 c1» de `styles.css`.
- Pruebas: `src/design/sobrio.test.tsx` (81), `apps/seo-web/e2e/plantillas-v2-sobrio.spec.ts`, BE `tests/test_design_v2_sobrio_seeds.py` (6).

## Límites honestos
Ver la sección «Aproximaciones dentro del contrato» de las fichas: no hay cuencos en la biblioteca de dibujos (taza y onda), el ornamento del documento solo admite `none`, `flourish` o `rule`, el tamaño del titular es uno por elemento (el del escritorio no se lee) y las variantes `corporate` y `classic` centran la portada. Minimalista, Corporativo y Corporativo grafito, y Fiesta patronal conservan el `sectionOrder` y el `layout` v1. Arena y terracota mueve `dressCode` antes de `gifts` y pasa a `classic`; Inauguración pasa a `classic` y Otros a `editorial` (detalle en la pregunta 4 de las fichas).

## Líneas base macOS que cambiarían
Ninguna: el PR solo añade documentos, pruebas y rutas de fixture.

## Reversión
Revertir el PR: los documentos no se siembran (la migración es F4 z), no hay datos que deshacer.

## Verificación (qué se ejecutó, 2026-11-25)
- `packages/celebration-theme`: `vitest run` → 2809 pruebas en verde (pila integrada) (81 nuevas en `sobrio.test.tsx`: lectura, AA claro y oscuro, matiz fuera del amarillo, oscuro propio, composición propia, P22, `/r/{listingId}`, es-BO/en-US, con y sin foto, animaciones dentro del contrato, lector nativo, un solo objeto en la portada de Minimalista, agenda de grafito); `tsc --noEmit` limpio; eslint de los archivos nuevos sin avisos.
- BE: `manage.py test tests.test_design_v2_sobrio_seeds tests.test_design_v2_seeds tests.test_design_v2_bodas_seeds` → verdes (validador `validate_design`, sin avisos de contraste, claves = semillas v1, sin amarillo); `ruff check` limpio. La suite completa con Postgres no se corrió en esta ejecución: estas pruebas son `SimpleTestCase` y no usan base de datos.
- Playwright (Google Chrome for Testing 158.0.8127.36, `/usr/bin/google-chrome`, `next build` + `next start` + fixture de contrato, **no** el backend real): `e2e/plantillas-v2-sobrio.spec.ts` → **115 pasadas** (repetido el 2026-11-25 sobre la pila c1 → c2 → c3 → c4 integrada): 7 plantillas × con/sin foto × claro/oscuro × 360/768/1280 (regalos visible, ≥ 44 px, en pantalla al final del scroll, sin desborde, contraste AA medido en el DOM, lienzo con la paleta del documento), axe sin violaciones a 360 px (28), agenda numerada, un solo objeto en Minimalista, una sola entrada y movimiento reducido.
- Capturas Linux (evidencia, no líneas base): `docs/progress/evidence/plantillas-f4c4/` (360 y 1280, claro y oscuro, con y sin foto).
- **Sin ejecutar:** recorrido con backend real, iOS/Android, Safari/Firefox, lector de pantalla, gitleaks, `harness:validate`, `apps/universal`, texto sobre foto real (las fotos del fixture son degradados de ejemplo).
