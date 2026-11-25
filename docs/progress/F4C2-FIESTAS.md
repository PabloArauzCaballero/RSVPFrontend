# F4 c2 · grupo de fiestas como documentos de diseño v2 (estado)

Rama FE `feat/plantillas-f4c2-fiestas` (sobre `feat/plantillas-f4c1-bodas`, integrada por merge en `63ec2c3`), rama BE `feat/plantillas-f4c2-fiestas` (sobre `feat/plantillas-f4c1-bodas`). Pila: ... → PR b → c1 → este.

## Qué hay
- Siete documentos v2: Festivo, Fiesta lila, Cumpleaños adulto, Fiesta temática, Fin de año, Despedida y Reencuentro (`packages/celebration-theme/src/design/documents/*.json`; los mismos bytes en BE `seeds/templates/design-v2/`). Los genera y valida `scripts/design-documents/fiestas.py` (reutiliza `bodas.py`: contraste AA, matiz fuera del amarillo).
- Claves, nombres, etiquetas de evento y orden de secciones: los de las semillas v1 de F4 PR a. Registro: `documents/fiestas.ts` (ids = uuid5 de la clave, P20).
- Fichas de personalidad: `docs/design/plantillas-f4c2/FICHAS-FIESTAS.md`.
- Sin CSS nuevo: usa las variantes y el lienzo existentes. Pruebas: `src/design/fiestas.test.tsx` (87), `apps/seo-web/e2e/plantillas-v2-fiestas.spec.ts`, BE `tests/test_design_v2_fiestas_seeds.py` (6).

## Límites honestos (preguntas para Pablo)
1. Se mantiene la pregunta 13 (contrato de animación y marcos): vinilo que gira, bola que cuelga o cañón que dispara se aproximan con `scale`/`draw`/`fade`; no hay máscara ni rotación continua.
2. La variante de portada solo admite cinco valores: siete plantillas se reparten entre ellos (festive ×2, corporate ×2) y la diferencia viene del lienzo.
3. Los acentos de las semillas v1 de Despedida y Cumpleaños adulto eran dos petróleos casi iguales; Despedida pasa a verde esmeralda `#0F766E`. ¿Se acepta el cambio de matiz?
4. Fin de año, Fiesta temática y Bodas de plata comparten familia azul (matices 218°, 227°, 214°) y se distinguen por luminosidad y composición.
5. Solo Reencuentro conserva recomendaciones en su lista de secciones.

## Verificación (qué se ejecutó, 2026-11-25)
- `packages/celebration-theme`: `vitest run` → 2669 en verde (87 nuevas de c2 sobre la base c1 corregida); `tsc --noEmit` limpio; eslint `--max-warnings 0` sobre `src/design` y el spec nuevo, limpio.
- BE: `DJANGO_ENV=development manage.py test tests.test_design_v2_fiestas_seeds tests.test_design_v2_bodas_seeds` → 12 en verde (`validate_design`, sin avisos de contraste, claves = semillas v1, sin amarillo). **No** se corrió la suite completa con Postgres.
- Playwright con Google Chrome for Testing 158.0.8127.36 (`/usr/bin/google-chrome`, vía `CHROMIUM_PATH`; no el Chromium 1243 empaquetado), `next build` + `next start` + fixture de contrato, **no** backend real: `plantillas-v2-fiestas.spec.ts` → **113 pasadas** (recorrido repetido tras la integración de c1 y la regeneración de los JSON) (7 × con/sin foto × claro/oscuro × 360/768/1280: regalos visible ≥ 44 px, sin desborde, AA medido en DOM, paleta del documento; axe en 360; una sola entrada y movimiento reducido).
- Capturas Linux (evidencia, no líneas base): `docs/progress/evidence/plantillas-f4c2/`.
- **Sin ejecutar:** backend real, iOS/Android, Safari/Firefox, lector de pantalla, gitleaks, `harness:validate`, `apps/universal`, texto sobre foto real.

## Líneas base macOS que cambiarían
Ninguna (solo añade documentos, rutas de fixture y pruebas).

## Reversión
Revertir el PR: los documentos no se siembran (migración F4 z); no hay datos que deshacer.
