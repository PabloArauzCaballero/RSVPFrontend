# Plantillas F6 · medios y embebidos (frontend)

Rama `feat/plantillas-f6-medios`, base `chore/deploy-contabo-coolify` (FE #115, #131 y #134 ya están en ella). Ronda 3 (2026-11-26, Linux). El cuerpo del PR y este archivo dan las mismas cifras.

| Pieza | Nivel | Evidencia |
|---|---|---|
| `packages/celebration-theme` (medios, velo por tema, fachadas, reproductor) | TESTED | `yarn workspace @rsvp/celebration-theme test`: 3023 OK (17 archivos) |
| Cola de subida con `reconcile` (PL-135-M1) | TESTED | `yarn workspace @rsvp/query-hooks test`: 150 OK |
| `MediaUploader` con REJECTED | TESTED en jsdom | `yarn workspace @rsvp/universal test`: 722 OK (60 archivos), sin intermitentes en la corrida de la ronda 3 |
| Contratos | TESTED | `generate --ref 209b813` (Template/Media 1.4.2, sin SoundCloud); `check:generated` y `check:source` OK |
| `yarn eslint . --max-warnings 0`, `yarn typecheck` (19 tareas), `yarn workspace @rsvp/seo-web build` | RUNS | salida 0 las tres |
| `yarn harness:validate` | RUNS | 28 carriles, 61 skills |
| gitleaks | NO PROBADO | el binario no está en el entorno |
| LCP | NO MEDIDO | |
| Playwright con Chrome real contra el backend real, axe, línea base visual | NO PROBADO | sin stack Docker; las líneas base de macOS no se tocaron |

La CSP sigue en `Report-Only` (decisión previa de A6). SoundCloud no está en el renderizador ni en el contrato (decisión de Pablo, 2026-11-25).

## Capturas Linux: cómo se regeneran

Las capturas usan `MediaBackdrop` con el velo de cada paleta (`requiredScrim`), no un velo fijo. Se rehacen con:

```
CHROMIUM_PATH=/usr/bin/google-chrome bash docs/progress/evidence/plantillas-f6/harness/build.sh
```

`build.sh` empaqueta `entry.tsx` con esbuild, crea una foto de relleno (degradado gris, con `sharp`) y corre `shoot.mjs`, que escribe los PNG y cuenta las peticiones antes del toque (0 a la red en los cuatro casos). El peor caso del velo (foto negra y blanca) lo miden las pruebas unitarias, no la captura.

`shoot.mjs` ya no tiene ruta de respaldo: recibe la carpeta de trabajo como segundo argumento (`node shoot.mjs <outDir> <workDir>`) o en `HARNESS_DIR`, y sale con código 2 y un mensaje si falta. `build.sh` la crea y la exporta.

## Check `affected` (run 45813278889)

Falló en `@rsvp/design-editor#test` por tiempo de espera (5000 ms) bajo carga de CI, no por este PR (que no toca `design-editor`; entra por depender de `celebration-theme`). Causa y arreglo de raíz: issue #140 y FE #144 (casos largos partidos, sin subir el timeout).
