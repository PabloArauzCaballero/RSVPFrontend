# Evidencia · F21 App del invitado · 2026-11-04
Comandos (2026-11-04): `corepack yarn turbo run typecheck test lint` → 66/66 tareas OK; `corepack yarn eslint . --max-warnings 0` → exit 0. Navegador: `CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ...` (ver cada guion).

## Contra el BACKEND REAL (2026-11-05)
Guion: `apps/seo-web/scripts/e2e-live-rsvp.mjs` (Chrome real; web Next `next start` :3000 y app Expo web exportada :8200 contra Kong `http://localhost:28000`; anfitrión real vía `POST /identity/auth/register`, celebración publicada con `unregisteredRsvpMode=AUTO_ACCEPT`, invitados e enlaces únicos reales). Resultado: `live-result.json`; capturas `live-*.png`. Contratos: guest-rsvp 1.10.0, notification 1.4.0.

Observado: el enlace personal en la app Expo web (360/768/1280, axe limpio a 360) confirma contra el Guest real; el anfitrión lo ve CONFIRMED; token no se guarda en storage; `/rsvp/{token}` en la app resuelve con `POST /rsvp/resolve` y navega a `/c/{slug}/rsvp/{token}`; credencial desconocida = pantalla genérica. No probado: iOS/Android, universal links, push físico.

El resto de este documento (más abajo) describe la corrida anterior **contra mock de contrato**; los REQ que arriba no figuran como observados en vivo siguen con esa evidencia (mock) y no deben leerse como probados contra servicios reales.

## Límite de la evidencia de la corrida con mock (histórico; la corrida contra el backend real está arriba)
Esta sección describe SOLO la primera corrida (2026-11-04). Desde 2026-11-05 la sección «Contra el BACKEND REAL» cubre lo observado en vivo, y lo que allí no figura sigue sin probarse contra servicios reales. La corrida con mock se ejecutó contra `packages/testing/src/contract-mock.ts`: un doble **escrito desde el OpenAPI** (guest-rsvp 1.9.0, notification vigente) y las reglas observables de `http-server.ts`. Acredita la capa frontend frente a respuestas con forma de contrato; **no** acredita que los servicios reales respondan así (en esa corrida no se levantó el backend; eso ya no vale para lo listado arriba). No hay iOS ni Android ni dispositivo. Estado del carril: `TESTED` en web/Expo web; **no `DONE`**.

| REQ | Estado | Prueba | Capturas |
|---|---|---|---|
| REQ-F21-01 enrutador | PASS (unit) | `resolveDeepLink` + `app/+native-intent.ts`: https canónico, `rsvp://`, legado; enlaces ajenos → null | — |
| REQ-F21-02 abre la app | BLOCKED-EXTERNAL | AASA/assetlinks anuncian `/c/*/rsvp/*` y `/rsvp/*`; intent filter Android con `pathPattern`; verificación en iPhone/Android necesita dominio, appId y builds | — |
| REQ-F21-03 repliegue a web | PASS (web) | el mismo enlace funciona en Next (F15) y en Expo web | F1-* |
| REQ-F21-04 RSVP en la app | PASS en Expo web (mock); nativo no ejecutado | los 5 estados con los textos `rsvp.*` | F1-rsvp-invitado-*, F1-token-invalido-*, F1-confirmado-360, F1-no-registrado-360 |
| REQ-F21-05 regalos | NO HECHO (fuera del alcance pedido) | — | — |
| REQ-F21-06 sin registro | PASS | el token solo va en la cabecera Authorization; no se guarda | — |


## Cierre 2026-11-04 · REQ-F21-05 (regalos dentro de la app, Expo web) contra el backend real

Nivel `TESTED` en Chrome (360/768/1280) con Kong :28000 y la app exportada en :8081. **No DONE** (iOS/Android y universal links siguen sin verificarse).

- Ruta nueva `/c/{slug}/regalos/{token}` (`src/guest/gifts-screen.tsx`): la credencial opaca del enlace es el Bearer (verificado en las peticiones: todas `Bearer <token>`), sin cuenta; vive solo en memoria.
- Lista agrupada (aliados primero), reservar con Idempotency-Key, 201, 409 con alternativas, token de otra celebracion -> 404 sin datos (pantalla 'enlace de otra celebracion').
- Boton 'Ver en la tienda del aliado' abre `/r/{listingId}?surface=GIFT_LIST&celebrationId=..` (redirector); nunca la URL del partner. Desde la confirmacion del RSVP hay un acceso a la lista.
- Capturas: `G1-regalos-en-la-app-*`, `G2-reservar-360`, `G3-409-alternativas-360`, `G4-reservado-360`, `G5-token-de-otra-celebracion-360`. Resultado: `../live-run-closeout-all.json`.
- axe en 132 combinaciones pantalla x 360/768/1280 x claro/oscuro (web y Expo web, `axe-f22-f28.json`, script `apps/universal/scripts/axe-f22-f28.mjs`): **0 critical, 0 serious** tras corregir (antes 6 critical / 11 serious: `aria-required-children` en destinos, contraste del placeholder y etiquetas blancas en esquema oscuro). Quedan 126 hallazgos moderate/minor sin triar.
- Tambien se actualizo `apps/universal/scripts/e2e-guests.mjs` (ya no dice 'dispositivo local': `readAt` es del servidor, notification 1.4.0).
