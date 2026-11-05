# Evidencia · F18 Notificaciones in-app y preferencias · 2026-11-04
Comandos (2026-11-04): `corepack yarn turbo run typecheck test lint` → 66/66 tareas OK; `corepack yarn eslint . --max-warnings 0` → exit 0. Navegador: `CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ...` (ver cada guion).

## Contra el BACKEND REAL (2026-11-05)
Guion: `apps/seo-web/scripts/e2e-live-rsvp.mjs` (Chrome real; web Next `next start` :3000 y app Expo web exportada :8200 contra Kong `http://localhost:28000`; anfitrión real vía `POST /identity/auth/register`, celebración publicada con `unregisteredRsvpMode=AUTO_ACCEPT`, invitados e enlaces únicos reales). Resultado: `live-result.json`; capturas `live-*.png`. Contratos: guest-rsvp 1.10.0, notification 1.4.0.

Observado en vivo: canales (PATCH, lectura de vuelta), horario de silencio 23-7 validado/guardado/restaurado a `DEFAULT`, tipos de evento (`companionRequested` silenciado). **NO observado en vivo: la bandeja con avisos del anfitrión y `readAt`/marcar leída**: en este stack el servicio de Notification no generó ningún aviso para el anfitrión en 45 s (ni tras `PUT recipients`; sin trazas de consumo de eventos en su log), así que la UI mostró el estado vacío. El flujo de leído por servidor (`POST .../read`, sin 'leído por dispositivo') está probado solo contra el mock de contrato 1.4.0 (vitest) y hooks (query-hooks).

El resto de este documento (más abajo) describe la corrida anterior **contra mock de contrato**; los REQ que arriba no figuran como observados en vivo siguen con esa evidencia (mock) y no deben leerse como probados contra servicios reales.

## Límite de la evidencia (leer primero)
Todo se ejecutó contra `packages/testing/src/contract-mock.ts`: un doble **escrito desde el OpenAPI** (guest-rsvp 1.9.0, notification vigente) y las reglas observables de `http-server.ts`. Acredita la capa frontend frente a respuestas con forma de contrato; **no** acredita que los servicios reales respondan así. No se levantó el backend real. No hay iOS ni Android ni dispositivo. Estado del carril: `TESTED` en web/Expo web; **no `DONE`**.

| REQ | Estado | Prueba | Capturas |
|---|---|---|---|
| REQ-F18-01 centro | PASS (mock) | no leídos primero, abrir lleva al destino (solo para plantillas conocidas; sin acción inventada) | C31-notificaciones-* |
| REQ-F18-02 centro nativo | PARCIAL | mismo componente RN en web; iOS/Android no ejecutados | — |
| REQ-F18-03 preferencias por canal | PASS (mock) | email, WhatsApp, SMS, push: PATCH `/notifications/celebrations/{id}/preferences` | preferencias-*, preferencias-guardada-1280 |
| REQ-F18-04 se respetan de verdad | BLOCKED-EXTERNAL | solo se prueba que se guardan y releen; que el backend las respete al enviar requiere el servicio real | — |
| REQ-F18-05 leída / todas | PASS con límite | actualización optimista; el contrato **no tiene** campo leído: se guarda por dispositivo (SecureStore/localStorage) | C31-todo-leido-360 |
| REQ-F18-06 horario de silencio | BLOCKED-EXTERNAL | el contrato no lo expone; la pantalla lo dice en vez de simularlo | preferencias-* |
