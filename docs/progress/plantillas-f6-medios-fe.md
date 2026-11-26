# Plantillas F6 · medios y embebidos (frontend)

Rama `feat/plantillas-f6-medios`, apilada sobre `feat/f1-diseno-v2-esquema` (FE #115). Pruebas del 2026-11-25.

| Pieza | Nivel | Evidencia |
|---|---|---|
| `packages/celebration-theme/src/media/*` (imágenes AVIF/WebP, fondos con velo, fachadas, reproductor MP3, lista blanca) | TESTED | `yarn workspace @rsvp/celebration-theme test`: 101 pruebas OK |
| Cola de subida, hooks, tipos | TESTED | `yarn workspace @rsvp/query-hooks test`: 144 OK (10 de la cola) |
| `MediaUploader` | TESTED en jsdom | `yarn workspace @rsvp/universal test`: 660 OK (6 nuevas) |
| CSP `frame-src` | TESTED | una prueba compara `next.config.js` con `FRAME_HOSTS` |
| Capturas Linux (Chromium 1243, 360 y 1280, claro y oscuro) | RUNS | `harness/shoot.mjs`; 0 peticiones de red antes del toque |
| Playwright contra el backend real, axe, línea base visual | NO PROBADO | el entorno no tiene el stack Docker; las líneas base de macOS no se tocaron |

La CSP sigue en `Report-Only` (decisión previa de A6): solo se añadió `frame-src` con la lista y `media-src 'self' https:`.
Los contratos de `packages/contracts` están fijados a BE `7d36479` (Template/Media 1.4.0). Re-fijarlos al BE más nuevo rompe `FONT_FAMILIES` (catálogo de fuentes de FE #115), así que queda para cuando #115 lo refleje.
SoundCloud no está en el renderizador (decisión de Pablo, 2026-11-25).
