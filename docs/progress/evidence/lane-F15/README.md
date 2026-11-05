# Evidencia · F15 RSVP público por magic link · 2026-11-04
Comandos (2026-11-04): `corepack yarn turbo run typecheck test lint` → 66/66 tareas OK; `corepack yarn eslint . --max-warnings 0` → exit 0. Navegador: `CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ...` (ver cada guion).

## Contra el BACKEND REAL (2026-11-05)
Guion: `apps/seo-web/scripts/e2e-live-rsvp.mjs` (Chrome real; web Next `next start` :3000 y app Expo web exportada :8200 contra Kong `http://localhost:28000`; anfitrión real vía `POST /identity/auth/register`, celebración publicada con `unregisteredRsvpMode=AUTO_ACCEPT`, invitados e enlaces únicos reales). Resultado: `live-result.json`; capturas `live-*.png`. Contratos: guest-rsvp 1.10.0, notification 1.4.0.

Observado: formulario 360/768/1280 con axe limpio; confirmar con acompañante y dieta (el anfitrión lo ve CONFIRMED por API); recarga conserva; editar = PATCH 200 y el anfitrión ve el cambio; token inválido sin datos de la celebración; enlace legado `/rsvp/{token}` (sin `?c=`) llama `POST /rsvp/resolve` 200 y termina en `/c/{slug}/rsvp/{token}`; desconocido = 401 -> pantalla no disponible; pedir más acompañantes de los permitidos deja una solicitud PENDING_REVIEW; no registrado consulta `public-settings` antes del formulario, registra y devuelve el enlace una vez; RESTRICTED (cambiado por el anfitrión, visible a Guest en pocos segundos) oculta el formulario y muestra `content.hostContact` de la celebración pública.

El resto de este documento (más abajo) describe la corrida anterior **contra mock de contrato**; los REQ que arriba no figuran como observados en vivo siguen con esa evidencia (mock) y no deben leerse como probados contra servicios reales.
- Pruebas: `corepack yarn workspace @rsvp/seo-web test` (76; `tests/rsvp-page.test.tsx` 22 con RTL), `@rsvp/query-hooks` (43), `@rsvp/forms` (5), `@rsvp/auth` (71).
- Navegador real: `node apps/seo-web/scripts/e2e-rsvp.mjs` (next build + next start + Chrome, 360/768/1280, axe sin críticos/serios, sin scroll horizontal, sin errores de consola) → `e2e-result.json`.

## Límite de la evidencia de la corrida con mock (histórico; la corrida contra el backend real está arriba)
Esta sección describe SOLO la primera corrida (2026-11-04). Desde 2026-11-05 la sección «Contra el BACKEND REAL» cubre lo observado en vivo, y lo que allí no figura sigue sin probarse contra servicios reales. La corrida con mock se ejecutó contra `packages/testing/src/contract-mock.ts`: un doble **escrito desde el OpenAPI** (guest-rsvp 1.9.0, notification vigente) y las reglas observables de `http-server.ts`. Acredita la capa frontend frente a respuestas con forma de contrato; **no** acredita que los servicios reales respondan así (en esa corrida no se levantó el backend; eso ya no vale para lo listado arriba). No hay iOS ni Android ni dispositivo. Estado del carril: `TESTED` en web/Expo web; **no `DONE`**.

Enlace único: `${origin}/c/{slug}/rsvp/{token}` (`personalLinkUrl`, `packages/auth/src/deep-links`); `/rsvp/{token}` redirige si trae `?c=slug`; sin slug no se puede resolver (ver BLOCKERS). Slug→celebrationId con `GET /celebrations/public/{slug}` (no `celebrationFor`, eliminado).

| REQ | Estado | Prueba | Capturas |
|---|---|---|---|
| REQ-F15-01 formulario | PASS (mock de contrato) | vitest + e2e: POST `status/requestedCompanions` con `Idempotency-Key`, Bearer opaco; validación; teclado; foco al encabezado | A9-formulario-{360,768,1280}, A13-validacion-360 |
| REQ-F15-02 confirmado/editable + cuenta atrás | PASS (mock) | PATCH, `timer`, acompañantes pendientes de aprobación | A10-confirmado-*, A10-editando-1280, A10-en-US-360 |
| REQ-F15-03 fuera de plazo | PASS (mock) | `editable:false` y 409 `RsvpWindowClosed` (fecha en zona de la celebración); a quién escribir = nombres de anfitriones (el contrato no expone contacto) | A11-fuera-de-plazo-* |
| REQ-F15-04 token inválido | PASS (mock) | 401/404/slug inexistente → misma pantalla sin título, anfitriones ni fecha; HTML del servidor sin datos | A12-token-invalido-* |
| REQ-F15-05 no registrado | PASS (mock) | AUTO_ACCEPT: alta con consentimiento y enlace de un solo uso (no se guarda); RESTRICTED: 403 con explicación. El modo no es público: se descubre al enviar | A13-no-registrado-*, A13-alta-ok-360, A13-restringido-403-* |
| REQ-F15-06 conexión lenta | PASS (mock) | offline conserva campos, reintento con la misma `Idempotency-Key` crea 1 RSVP, borrador sobrevive recarga (sessionStorage, clave sin token), 429/503/422 | REQ-F15-06-sin-conexion-360 |
| Privacidad | PASS | noindex + `Referrer-Policy: no-referrer` + `Cache-Control: no-store`; token ni en URL de API, storage, query keys ni DOM de error | e2e-result.json |

Animación: no se añadió movimiento salvo el giro del indicador de carga (se detiene con `prefers-reduced-motion`). No cubierto: Lighthouse de estas rutas, lector de pantalla manual, backend real.
