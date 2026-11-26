# Plantillas F6 · medios y embebidos (frontend)

Rama `feat/plantillas-f6-medios`, base `chore/deploy-contabo-coolify` (FE #115, #131 y #134 ya están en ella). Ronda 2 (2026-11-26, Linux).

| Pieza | Nivel | Evidencia |
|---|---|---|
| `packages/celebration-theme` (medios, velo por tema, fachadas, reproductor) | TESTED | `yarn workspace @rsvp/celebration-theme test`: 3016 OK (17 archivos) |
| Cola de subida con `reconcile` (PL-135-M1) | TESTED | `yarn workspace @rsvp/query-hooks test`: 150 OK |
| `MediaUploader` con REJECTED | TESTED en jsdom | `yarn workspace @rsvp/universal test`: 719 OK, 1 intermitente bajo carga (`account-links.test.tsx`, ajena) que pasa sola 12/12 |
| Contratos | TESTED | `generate --ref 209b813` (Template/Media 1.4.2, sin SoundCloud); `check:generated` y `check:source` OK |
| `yarn eslint . --max-warnings 0`, `yarn typecheck` (19 tareas), `yarn workspace @rsvp/seo-web build` | RUNS | salida 0 las tres |
| `yarn harness:validate` | RUNS | 28 carriles, 61 skills |
| gitleaks | NO PROBADO | el binario no está en el entorno |
| LCP | NO MEDIDO | |
| Playwright con Chrome real contra el backend real, axe, línea base visual | NO PROBADO | sin stack Docker; las líneas base de macOS no se tocaron |

La CSP sigue en `Report-Only` (decisión previa de A6). SoundCloud no está en el renderizador ni en el contrato (decisión de Pablo, 2026-11-25).
