# Evidencia · F16 Gestión de invitados · 2026-11-04
Comandos (2026-11-04): `corepack yarn turbo run typecheck test lint` → 66/66 tareas OK; `corepack yarn eslint . --max-warnings 0` → exit 0. Navegador: `CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ...` (ver cada guion).

## Contra el BACKEND REAL (2026-11-05)
Guion: `apps/seo-web/scripts/e2e-live-rsvp.mjs` (Chrome real; web Next `next start` :3000 y app Expo web exportada :8200 contra Kong `http://localhost:28000`; anfitrión real vía `POST /identity/auth/register`, celebración publicada con `unregisteredRsvpMode=AUTO_ACCEPT`, invitados e enlaces únicos reales). Resultado: `live-result.json`; capturas `live-*.png`. Contratos: guest-rsvp 1.10.0, notification 1.4.0.

Observado: login del anfitrión por UI contra Identity; lista con búsqueda; alta por UI guarda el invitado y llama UNA vez `PUT /notifications/celebrations/{id}/recipients` (200); importación CSV (2 importados, 1 con error) y una sola llamada PUT; enlace único emitido y mostrado enmascarado, secreto fuera del DOM. Nota: la sincronización de destinatarios tras el alta pública NO aplica desde el navegador del invitado (el PUT exige credencial de anfitrión; Guest/RSVP la hace por su cuenta según el contrato).

El resto de este documento (más abajo) describe la corrida anterior **contra mock de contrato**; los REQ que arriba no figuran como observados en vivo siguen con esa evidencia (mock) y no deben leerse como probados contra servicios reales.
- Pruebas: `corepack yarn workspace @rsvp/universal test` (150; `test/guests.test.tsx`). Navegador: `node apps/universal/scripts/e2e-guests.mjs` (export web de Expo + Chrome, 360/768/1280, axe) → `e2e-result.json`.

## Límite de la evidencia de la corrida con mock (histórico; la corrida contra el backend real está arriba)
Esta sección describe SOLO la primera corrida (2026-11-04). Desde 2026-11-05 la sección «Contra el BACKEND REAL» cubre lo observado en vivo, y lo que allí no figura sigue sin probarse contra servicios reales. La corrida con mock se ejecutó contra `packages/testing/src/contract-mock.ts`: un doble **escrito desde el OpenAPI** (guest-rsvp 1.9.0, notification vigente) y las reglas observables de `http-server.ts`. Acredita la capa frontend frente a respuestas con forma de contrato; **no** acredita que los servicios reales respondan así (en esa corrida no se levantó el backend; eso ya no vale para lo listado arriba). No hay iOS ni Android ni dispositivo. Estado del carril: `TESTED` en web/Expo web; **no `DONE`**.

| REQ | Estado | Prueba | Capturas |
|---|---|---|---|
| REQ-F16-01 lista | PASS (mock) | `guest-list` del read model: búsqueda, filtro, 50 por página con 500 invitados (50 nodos), vacío, vacío filtrado, error+reintento, 403 | C19-lista-*, C19-busqueda-360, C19-vacio-filtrado-360 |
| REQ-F16-02 alta | PASS (mock) | validación al escribir/guardar; correo o teléfono E.164 (contrato 1.9.0) | C20-alta-*, C20-validacion-360, C20-guardado-360 |
| REQ-F16-03 CSV | PASS (mock) | informe con línea, campo y motivo por fila; cabecera inválida. Selector de archivo solo en web; en nativo se pega | C21-informe-por-fila-*, C21-importar-vacio-1280 |
| REQ-F16-04 grupos | PARCIAL | crear, listar con conteo, asignar al crear y mover desde la ficha (GET/POST groups, PATCH guest). **Sin mesas ni arrastrar**: el contrato no las tiene | C22-grupos-* |
| REQ-F16-05 detalle y enlace | PASS (mock) | emitir, reemitir y revocar con confirmación; copiar; compartir (Web Share, copia como respaldo) | C23-* |
| REQ-F16-06 enlace nunca completo | PASS | se muestra `abcd…wxyz`; el secreto completo no está en el DOM ni en caché ni storage | C23-enlace-enmascarado-* |

No cubierto: compartir en iOS/Android (la hoja nativa no se ejecutó), 500 invitados contra backend real.
