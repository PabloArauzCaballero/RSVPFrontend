# Evidencia · F17 Resumen y bandejas RSVP · 2026-11-04
Comandos (2026-11-04): `corepack yarn turbo run typecheck test lint` → 66/66 tareas OK; `corepack yarn eslint . --max-warnings 0` → exit 0. Navegador: `CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ...` (ver cada guion).

## Contra el BACKEND REAL (2026-11-05)
Guion: `apps/seo-web/scripts/e2e-live-rsvp.mjs` (Chrome real; web Next `next start` :3000 y app Expo web exportada :8200 contra Kong `http://localhost:28000`; anfitrión real vía `POST /identity/auth/register`, celebración publicada con `unregisteredRsvpMode=AUTO_ACCEPT`, invitados e enlaces únicos reales). Resultado: `live-result.json`; capturas `live-*.png`. Contratos: guest-rsvp 1.10.0, notification 1.4.0.

Observado: resumen de la UI = `guest-summary` de la API (tras la proyección eventual); bandeja de acompañantes muestra la solicitud real y aprobar en la UI la saca de la bandeja y sube `approvedCompanions`; reporte lista respuestas y el CSV de catering descarga sin nombres ni correos. (El endpoint de bandeja lista solo solicitudes abiertas; la aprobación se verifica por salida de la bandeja y `approvedCompanions`.)

El resto de este documento (más abajo) describe la corrida anterior **contra mock de contrato**; los REQ que arriba no figuran como observados en vivo siguen con esa evidencia (mock) y no deben leerse como probados contra servicios reales.
- Pruebas: `@rsvp/universal` (150), `@rsvp/query-hooks` (43). Navegador: `e2e-guests.mjs`. Artefactos: `reporte-rsvp-ejemplo.csv`, `catering-ejemplo.csv` (descargados desde el navegador).

## Límite de la evidencia de la corrida con mock (histórico; la corrida contra el backend real está arriba)
Esta sección describe SOLO la primera corrida (2026-11-04). Desde 2026-11-05 la sección «Contra el BACKEND REAL» cubre lo observado en vivo, y lo que allí no figura sigue sin probarse contra servicios reales. La corrida con mock se ejecutó contra `packages/testing/src/contract-mock.ts`: un doble **escrito desde el OpenAPI** (guest-rsvp 1.9.0, notification vigente) y las reglas observables de `http-server.ts`. Acredita la capa frontend frente a respuestas con forma de contrato; **no** acredita que los servicios reales respondan así (en esa corrida no se levantó el backend; eso ya no vale para lo listado arriba). No hay iOS ni Android ni dispositivo. Estado del carril: `TESTED` en web/Expo web; **no `DONE`**.

| REQ | Estado | Prueba | Capturas |
|---|---|---|---|
| REQ-F17-01 portada C6 (`/inicio`; `(host)/index.tsx` chocaría con `/`) | PASS (mock) | confirmados, sin responder, acompañantes, días a la fecha límite, solicitudes abiertas (`openCompanionRequests`) | C6-resumen-* |
| REQ-F17-02 reporte | PASS (mock) | lista filtrable con dieta y mensaje | C24-reporte-* |
| REQ-F17-03 bandeja | PASS (mock) | aprobar/rechazar de un toque; 409 refresca la lista | C26-bandeja-*, C26-aprobada-1280 |
| REQ-F17-04 frescura | PASS (mock) | "Actualizado…" + aviso de atraso/`stale` desde `freshness` | C6-resumen-* |
| REQ-F17-05 CSV | PASS | RFC 4180 + neutralización de `= + - @ \t \r`; archivo de catering desde `catering-report` (sin nombres ni contactos) | *.csv |
| REQ-F17-06 sin recalcular | PASS | las cifras son las del read model; prueba que no hay POST/recuento | C6-resumen-* |

Nota: "confirmar → ver conteo sin duplicados" probado con repetición idempotente en el mock; la proyección asíncrona real no se midió.
