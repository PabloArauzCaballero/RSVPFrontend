# Ronda 2 de recorridos de regalos: consolidación y clave de error del portal

Rama `fix/regalos-recorridos-ronda2` sobre `chore/deploy-contabo-coolify` @68af6eb6.

## Hallazgos

| Punto | Estado observado | Acción |
| --- | --- | --- |
| Remonte de la pantalla al cruzar el ancho en `apps/universal/src/host/shell.tsx` | **No reproducible en el código actual.** `ShellChrome` ya mantiene un solo árbol (la ranura de contenido es siempre el segundo hijo) y `Screen` conserva los mismos nodos entre 768 y 960 px (arreglado por #153/#158). No hay defecto que corregir. | Se añade una prueba de regresión más exigente (acción, línea de estado y pestañas, cruces 959/960/767/768) que pasa antes y después. No se inventó un cambio de código. |
| Clave inexistente `portal.errors.state.unavailable` (`apps/universal/src/provider/errors.tsx:45`) | **Defecto real.** El objeto `state` (network, unavailable, storage, server) estaba anidado por error en `portal.services.new.errors` y no en `portal.errors`; `PortalErrorState` mostraba la clave cruda como título en 503/500/red/almacenamiento, en es-BO y en-US. Nadie leía la ubicación antigua. | `state` se mueve a `portal.errors` en ambos catálogos. Pruebas que fallaban antes: `packages/i18n/test/resources.test.ts` (2) y `apps/universal/test/portal-error-state.test.tsx` (2). Pasan después. |

PR existente que cubriera la rama: ninguno (revisados todos, estado `all`; #147/#149/#152 no se tocan).

## Verificación observada

- `yarn lint`, `yarn typecheck`, `yarn build`: verdes (19/19 tareas cada uno).
- `yarn test`: 1088 de 1090 en la corrida completa; los 2 fallos (`gift-assistant.test.tsx`, `portal-preview-links.test.tsx`) son de tiempo bajo carga: ambos archivos pasan al ejecutarse solos (69/69). No se tocan.
- Playwright (Chromium preinstalado, proyecto `transitions`, mock del contrato): 7/7, incluidos el cruce de 960 px de 1280 a 360 y de 360 a 1280 con foco y texto conservados.
- Capturas del cruce en vivo con «Marta» escrito en el filtro de invitados: `ronda2-evidencia/cruce-1280.png`, `cruce-360.png`, `cruce-1280-vuelta.png` (valor y foco conservados en las tres).

## No verificado

- Pantalla de error del portal capturada en Chrome contra un 503 real: solo prueba de componente (jsdom) y de catálogo.
- iOS/Android nativo; gateway real del backend (las pruebas usan el mock del contrato).

## Reversión

`git revert` de los commits de esta consolidación; es solo datos de i18n y pruebas, sin migraciones.
