# F4 c3 · grupo infantil y de ritos como documentos de diseño v2 (estado)

Rama FE `feat/plantillas-f4c3-infantil-ritos` y rama BE `feat/plantillas-f4c3-infantil-ritos`, ambas desde `origin/feat/plantillas-f4c1-bodas` de su repositorio (pila PR b → c1 → este). Hermanos en paralelo sobre la misma base: c2 (fiestas) y c4 (sobrio); este trozo solo añade archivos propios y, en lo compartido, dos sentencias `Object.assign` en `apps/seo-web/scripts/fixture-api.mjs`.

## Qué hay
- Cinco documentos v2: Cielo de bautizo, Menta infantil, Baby shower, Primera comunión y Graduación (`packages/celebration-theme/src/design/documents/*.json`; los mismos bytes en BE `seeds/templates/design-v2/`). Los genera y valida `packages/celebration-theme/scripts/design-documents/infantil-ritos.py` (reutiliza `bodas.py`: contraste AA, matiz fuera del amarillo). Claves, nombres, tipos de evento y secciones son los de las semillas de F4 PR a; el id es el determinista (`uuid5` de la `key`).
- Fichas de personalidad: `docs/design/plantillas-f4c3/FICHAS-INFANTIL-RITOS.md`.
- Registro: `documents/infantil-ritos.ts`; `fixture-api.mjs` sirve `fixture-v2-<clave>` y `-sinfoto`.
- CSS: ninguno nuevo. Las cinco se resuelven con el contrato y el CSS de c1 (variantes `classic`, `festive`, `minimal`, `editorial`, `corporate` y `display: "list"`).
- Pruebas: `src/design/infantil-ritos.test.tsx` (59), `apps/seo-web/e2e/plantillas-v2-infantil-ritos.spec.ts` (82), BE `tests/test_design_v2_infantil_ritos_seeds.py` (7).

## Límites honestos (preguntas para Pablo en el PR)
1. No hay dibujo de nube ni máscara de foto: las nubes de Cielo de bautizo son el ornamento `onda`. ¿Se añade una nube a la biblioteca de bautizo (F3)?
2. Menta infantil y Baby shower compartían Quicksand/Nunito en las semillas; aquí Menta usa Fredoka/Mulish. ¿Se cambia también la semilla v1?
3. La variante de portada solo admite cinco valores (pregunta 13 ya abierta): Primera comunión usa `editorial` (foto 4:5) y Graduación `corporate` (foto 4:3).
4. Primera comunión pasa del azul de su semilla a un violeta litúrgico (255°) para no confundirse con Cielo de bautizo (208°) y Graduación (224°). ¿Se acepta el cambio de color?
5. El renderizador fija la altura de las filas de la portada por contenido: el documento solo decide orden, columnas y giro.

## Verificación (qué se ejecutó, 2026-11-25)
- `packages/celebration-theme`: `tsc --noEmit` limpio; `vitest run` → 2728 pruebas en verde tras integrar c1 corregido y c2 (59 nuevas de c3: lectura, AA claro y oscuro, matiz fuera del amarillo, oscuro propio y distinto, composición propia, objetos dibujados, parejas tipográficas distintas, P22, `/r/{listingId}`, es-BO/en-US, con y sin foto, animaciones dentro del contrato, lector nativo). `eslint` limpio en los archivos nuevos y `tsc` de `apps/seo-web` limpio.
- BE (Postgres 16 real, rol sin superusuario): `manage.py test tests` → 246 en verde (3 omitidas ya existentes), con `test_design_v2_infantil_ritos_seeds.py`: validador `validate_design`, sin avisos de contraste, claves, tipos de evento y secciones iguales a la semilla, sin amarillo, oscuros y acentos distintos.
- Playwright (Google Chrome for Testing 158.0.8127.36, `/usr/bin/google-chrome`, `next build` + `next start` + fixture de contrato, **no** el backend real): **112 pasadas** (repetido el 2026-11-25 tras la integración de c1 y c2 y la regeneración de los JSON) (5 plantillas × con/sin foto × claro/oscuro × 360, 768 y 1280, regalos visible y ≥ 44 px, sin desborde, AA medido en el DOM, paleta propia, axe sin violaciones a 360 px, actos numerados y una sola entrada con movimiento reducido); capturas Linux en `docs/progress/evidence/plantillas-f4c3/` (360 y 1280, claro y oscuro, con y sin foto).
- **Sin ejecutar:** recorrido con backend real, iOS/Android, Safari/Firefox, lector de pantalla, gitleaks, `apps/universal` (dos copias de React en este entorno), texto sobre foto real (las fotos del fixture son degradados de ejemplo).

## Ronda 2 (PL-132-M3, m1)
- Defecto: a 360×800 con foto, el h1 de Cielo de bautizo (y=773–864) y de Graduación (648–746) no quedaba por encima del dock (y=723). El spec no lo medía.
- Pruebas nuevas en `plantillas-v2-infantil-ritos.spec.ts` (30: 5 plantillas × con/sin foto × 360×800, 768×1024 y 1280×900): el h1 y el texto de la portada terminan por encima de `dock.top` y ninguna palabra del h1 se parte. Antes de corregir fallaban 2 (Cielo y Graduación a 360×800 con foto).
- Corrección en `infantil-ritos.py` (portadas móviles): Cielo conserva una nube y la paloma en la misma fila y pasa la segunda nube bajo el título; Graduación reduce el birrete y el diploma y pone el filete bajo el título. Primera comunión sube el peso del titular de Cormorant a 600/700 (m1). m2 (sonajero y cochecito de Baby shower) queda sin cambiar: no es un defecto medible y se reporta a Pablo.

## Líneas base macOS que cambiarían
Ninguna: solo se añaden rutas y documentos nuevos.

## Reversión
Revertir el PR: los documentos no se siembran (la migración es F4 z), así que no hay datos que deshacer.
