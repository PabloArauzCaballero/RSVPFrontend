# Evidencia · rediseño con el DOne Brand Kit v3 · 2026-11-06

Rama `feat/rediseno-marca` sobre `origin/dev` (80b3f92). Nivel declarado: **RUNS** para web (Chrome de macOS contra servidor de contrato de ejemplo) y **WRITTEN** para iOS/Android (el bundle compila, no se ejecutó en dispositivo ni simulador). **No** hay recorrido contra el backend real.

## Observado
| Qué | Comando | Resultado |
|---|---|---|
| Tests de la app | `yarn workspace @rsvp/universal test` (vitest) | 193 pasan |
| Tests de `@rsvp/ui` | `yarn workspace @rsvp/ui test` | 25 pasan |
| Tests i18n / tokens / seo-web | `vitest run` en cada paquete | pasan (12 / 6 / 106) |
| Typecheck y lint | `tsc --noEmit`, `eslint --max-warnings 0` | 0 errores |
| Compuerta visual + axe Expo | `CHROMIUM_PATH=… yarn workspace @rsvp/universal test:visual` | corrida limpia sin `--update-snapshots`: 159 pasan, exit 0. Incluye axe (WCAG 2.1 A/AA, sin críticas ni serias) a 390 y 1440 px en las 51 rutas |
| Bundle nativo | `expo export --platform ios --platform android` | exit 0 (iOS y Android) |
| Harness | `yarn harness:validate` | exit 0 |
| gitleaks | `gitleaks detect --no-git` | 6 hallazgos, los mismos 6 que `origin/dev` sin estos cambios (0 nuevos) |

## No probado (bloqueos)
- **Backend real:** las pantallas se pintaron contra `@rsvp/testing` (contract-mock) más `scripts/visual-fixtures.ts`; un mock acredita solo la capa que ejercita.
- **iOS/Android en dispositivo o simulador:** fuente empaquetada, logo SVG y marco móvil nativos sin ejecutar.
- **Oscuro y es-BO:** la compuerta corre en claro y con el idioma del navegador de prueba (en-US). Las pantallas de anfitrión, admin y proveedor usan la paleta clara fija (ya era así antes de este cambio).
- **Linux:** las imágenes base son de macOS y no han sido revisadas por una persona.
- **Estados 401/403/409/429:** no se recorrieron en esta entrega.

## Hallazgos de axe corregidos en esta entrega
- Ingreso y registro sin región `main`.
- Checkbox de consentimiento sin `aria-checked`.
- Áreas con scroll sin foco de teclado (`scrollable-region-focusable`).
- Barra de respuestas expuesta como `progressbar` sin valor (ahora decorativa; la frase y la leyenda dicen cada número).
- Botones de alternancia con «✓» como texto (ahora `ToggleChip` con `role=checkbox` y marca dibujada).
