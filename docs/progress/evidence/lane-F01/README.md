# Evidencia F01 · Turborepo y Expo Router (2026-11-03)

| REQ | Estado | Comando / artefacto | Resultado |
|---|---|---|---|
| REQ-F01-01 | PARTIAL (web y bundles nativos OK; ejecución iOS/Android no hecha) | `expo export --platform web` -> /private/tmp/claude-501/web-build-f01; `expo export --platform ios --platform android` (hermes) ; Playwright sobre :8100 `/catalogo` | Web exporta (el bloqueo de 2026-10-11 era de Windows, ya no aplica en macOS). Los bundles .hbc de iOS y Android se generan tras corregir el DEFECTO de abajo. No se abrió simulador ni dispositivo: no se declara verificado. |
| REQ-F01-02 | PASS | `yarn workspace @rsvp/seo-web build` (next build OK) + `next dev -p 3100`, `/`, `/catalogo` 200 | Render servidor, landing intacta (captura lane-F03/screens/seo-landing-regression-*.png). |
| REQ-F01-03 | PASS | `corepack yarn workspaces list` | Raíz + 2 apps + 17 packages (12 pedidos + config-tailwind, ui-web, telemetry, contracts, config-eslint...). |
| REQ-F01-04 | PARTIAL | `yarn turbo run typecheck test --continue`: 46/47 OK; `eslint .` | test+typecheck verdes salvo `@rsvp/config-eslint#test` (test en curso de otro carril: `node --test test/`, falla por 2 imports sin usar en su test). Lint real (ESLint + typescript-eslint) ya existe en la raiz (`yarn lint:code`); quedan 3 errores ajenos: `apps/universal/src/auth/auth-context.tsx` (no tocable) y `packages/config-eslint/test/no-literal-strings.test.js`. `turbo run build` universal = `expo export` web verde manual; no se corrio el `turbo run build` completo. |
| REQ-F01-05 | BLOCKED-EXTERNAL | `ls ../RSVPBackend/packages/contracts-types` | El `@rsvp/contracts` del backend no esta publicado y su `index.d.ts` solo trae 2 interfaces (README: "se activa en el carril 01"). Sustituto local: workspace `packages/contracts` generado con openapi-typescript desde los 8 specs congelados (`yarn workspace @rsvp/contracts generate`, `check:generated`). Instalar desde GitHub Packages sigue pendiente. |
| REQ-F01-06 | PASS (estructura) | `apps/universal/test/route-groups.test.ts` (2 tests: positivo y negativo con grupo/layout/pantalla ausentes y ruta suelta) | Los 5 grupos tienen `_layout` y pantalla. Navegacion real por grupo no se probo en dispositivo; (auth)/(guest)/(provider)/(host) eran stubs al auditar (otro agente los esta editando). |

## Defecto encontrado y corregido
`expo export --platform ios|android` fallaba: `SyntaxError: Unexpected token Ident("set")` porque `darkMode: ['class','[data-theme="dark"]']` genera `@cssInterop set darkMode attribute ...` que NativeWind nativo no parsea. Corregido en `packages/design-tokens/create-preset.cjs` (preset nativo usa `class`). Antes del arreglo ni iOS ni Android compilaban.

## No cubierto
iOS/Android en simulador o dispositivo; clon limpio siguiendo solo el README; versiones fijadas (no revisado); cobertura 85 %/75 %; 3 corridas CI; revision por otro eje.
