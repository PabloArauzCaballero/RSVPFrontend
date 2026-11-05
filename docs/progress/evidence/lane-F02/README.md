# Evidencia F02 · Design tokens y NativeWind (2026-11-03)

| REQ | Estado | Comando / artefacto | Resultado |
|---|---|---|---|
| REQ-F02-01 | PASS | `packages/design-tokens/src/tokens-pipeline.test.ts` (4 tests), `yarn workspace @rsvp/design-tokens check:generated` | `src/*.ts` es la unica fuente; `scripts/generate.mjs` emite `generated/tokens.json|css`; preset (`create-preset.cjs`) y CSS lo leen. Se eliminaron los hex duplicados de `tailwind-preset.cjs` y de `apps/seo-web/app/globals.css` (test: ningun hex de la paleta en globals.css). Se conservo la paleta aguayo y fuentes (se agrego `onWine`, y teal/vermilion salen de `aguayo`). |
| REQ-F02-02 | PARTIAL | Test "changing one token ... reaches preset, CSS and JSON" (copia temporal con primary cambiado) + sonda Playwright | Propagacion fuente->preset->web/NativeWind probada. Capturas por plataforma: solo web (seo-web y Expo web); iOS/Android sin ejecutar -> no PASS. |
| REQ-F02-03 | PASS (web) | `packages/ui/src/index.test.tsx` (dark vs light con la misma arbol), Playwright `colorScheme: dark` en :8100 y :3100 `data-theme=dark` | `@rsvp/ui` ya no usa `colors.light` fijo: `useTheme()`/`UiProvider scheme`. Playwright: boton primary rgb(140,29,90) claro -> rgb(255,141,190) oscuro; utilidad `bg-surface-muted` #F2ECF1 -> #311A28. Nativo real sin ejecutar. |
| REQ-F02-04 | PASS (Expo web) / nativo BLOCKED | `nativewind-browser-probe.txt`; bundles ios/android compilan con CSS NativeWind | `className="rounded-lg border border-border bg-surface-muted p-4"` y `flex-row flex-wrap gap-3` se aplican (radio 12px, padding 16px, gap 12px, colores desde tokens). Antes de este trabajo habia cero `className`. |
| REQ-F02-05 | PASS | `tokens-pipeline.test.ts` ("same origin") | seo-web (`tailwind-preset`) y universal (`tailwind-preset-native`) salen del mismo `createPreset`. |
| REQ-F02-06 | PASS | `apps/seo-web/tests/no-native-ui-boundary.test.ts` (3 tests) | Bug previo: regex `/\\.[jt]sx?$/` no filtraba nada (prueba vacia) y solo miraba `app/`. Ahora escanea app, components, lib y package.json, prohibe `@rsvp/ui`, react-native, nativewind, expo*; test negativo con fixtures en las 3 carpetas y todas las formas de import (5 violaciones detectadas, `@rsvp/ui-web` permitido) + test de que se escanean >10 archivos reales. |

## Defecto
Ver F01: darkMode con selector de atributo rompia la compilacion nativa. Ademas NativeWind web lanza "Cannot manually set color scheme" con `darkMode:'media'`: se usa `class` y el seguimiento del sistema va por variables `prefers-color-scheme` (sin errores de consola, verificado).

## No cubierto
Capturas iOS/Android; nota: seo-web no sigue el esquema del sistema (solo `data-theme=dark`), por decision de no alterar la landing.

## Actualización 2026-11-04

- **Snapshots visuales con línea base (REQ-F02-02/F03-06):** `apps/seo-web/playwright.config.ts` y `e2e/catalogo.visual.spec.ts` (`yarn workspace @rsvp/seo-web test:visual`, Chrome vía `CHROMIUM_PATH`). `toHaveScreenshot` sobre `/catalogo` en claro/oscuro a 360/768/1280 más la landing a 360/1280. Línea base en `apps/seo-web/e2e/__screenshots__/` (generada en macOS con Chrome; **no** se agregó a CI porque el render en Linux difiere y habría falsos positivos: pendiente generar la línea base en el runner). Segunda corrida contra la línea base: 7/7 verdes. La línea base la generó el mismo agente que la compara: falta aprobación humana.
- **Defecto hallado por la comprobación de desborde:** `/catalogo` desbordaba 27 px a 360 px (h1 de 56 px, `componentes` no cabe) y los hijos de grid no tenían `min-w-0`. Corregido en `packages/ui-web/src/index.tsx`.
- Bundles nativos iOS/Android compilan (ver F01). Capturas nativas reales: BLOQUEADO (sin simulador/dispositivo en este entorno).
