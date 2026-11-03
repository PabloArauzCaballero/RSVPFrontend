# Auditoría de avance real · Frontend · 2026-11-03

Método: cada REQ contrastado con código y pruebas. Se ejecutaron 106 tests (todos pasan) y typecheck de 13 workspaces (exit 0); no se corrieron build ni Lighthouse. Informes por REQ en esta carpeta.

| Eje | Carriles | REQs probados | % |
|---|---|---|---|
| Pablo | F01–F07 | 10/42 | 24 % |
| Leonardo | F08–F14, F24 | 33/48 | 69 % |
| Miguel y Fabio | F15–F23, F25–F28 | 0/78 | 0 % |
| **Total** | 28 | **43/168** | **26 %** |

Por carril: F01 33 · F02 0 · F03 17 · F04 50 · F05 0 · F06 67 · F07 0 · F08 50 · F09 100 · F10 83 · F11 83 · F12 67 · F13 67 · F14 33 · F24 67 · F15–F23 y F25–F28 0 (F15 ≈25 % y F21 ≈15 % de trabajo parcial sin prueba).

## Correcciones al registro
- F14 figuraba `REGRESSION_VERIFIED` pero 6 de 11 módulos admin son placeholders; moderación y métricas no existen. Capturas de F10 solo de A1, A4, A5 y A21.
- `@rsvp/contracts` no existe: REQ-F01-05 y F04-01 sin hacer; tipos manuales.
- `packages/auth` sin conectar (F05 0/6): login es stub, `refreshSession` lanza error. `/rsvp/<token>` no tiene ruta en seo-web (solo `/c/[slug]/rsvp/[token]`).
- Test de frontera seo-web→@rsvp/ui (REQ-F02-06) pasa en vacío por una regex que no filtra archivos.
- `lint` es `tsc`; la regla `no-literal-strings` existe pero no está habilitada. Lighthouse 100 es medición manual del 18-oct, previa al rediseño.
- El commit c3a0599 ("RSVP wiring") no conecta nada: el formulario valida pero no hace peticiones.
- `/r/{listingId}` y `/p/{slug}` no existen (404).
- Rutas de 5 líneas de `(host)` y `(admin)` delegan en pantallas reales con estados probados; los stubs auténticos son `login`, `invitacion`, `portal` e `inicio`.
- Hecho y no registrado: rediseño de seo-web 2026-11-03 (paleta aguayo, tipografías, landing, cabecera y pie, i18n `landing`).
