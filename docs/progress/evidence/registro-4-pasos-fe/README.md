# Evidencia · Registro en 4 pasos, frontend (FE-S1 a FE-S6) · 2026-11-28

Base: `origin/chore/deploy-contabo-coolify` @ `1045ff8a`, más FE #177 (`fix/movil-sin-backend`, por merge, sin rebase). Contratos: Identity **2.3.1** vendorizado de RSVPBackend oficial @ `96d7fbb4` (ya con BE #177 y #181). Lo que no tenía recomendación escrita: `docs/progress/registro-4-pasos-fe-sin-recomendacion.md`.

Nivel alcanzado: **TESTED** (Vitest) y **VERIFIED en Chromium web a 360 y 1280 px contra Identity y Notification reales** (Postgres 16 no superusuario, Redis, RabbitMQ; solo `api.resend.com` es un simulador local que guarda los correos). **iOS y Android: NO verificados.** Nada es `DONE`.

## Diferencias entre este entorno y CI/producción

- Sin Docker: no hay Kong. Un proxy (`apps/universal/scripts/live/registro-backend-local.mjs`) hace `/identity/*` → Identity y CORS. El límite por IP de Kong (10/min, 100/h) **no se probó**; el 429 de L11 está **INJECTED** con `page.route`.
- Los correos no salen por Resend real: el código se lee del correo que Notification renderizó, vía `GET /__test/mail`.
- Chromium preinstalado (`/opt/pw-browsers/chromium-1243`), no Chrome estable.
- `yarn turbo typecheck` falla en `src/push/lifecycle.tsx` SOLO si existe `apps/universal/.expo/types` (lo genera `expo start`, ignorado por git); falla igual en la base sin mis cambios y pasa sin esa carpeta, como en CI.

## Comandos y resultados

| Comando | Resultado |
|---|---|
| `yarn harness:validate` | válido |
| `yarn lint:code` | exit 0 |
| `yarn workspace @rsvp/contracts check:generated` | verificado (8 contratos, identity 2.3.1) |
| `yarn typecheck` (sin `.expo/types`) | 19/19 |
| `yarn turbo run test:coverage --concurrency=2` | exit 0; universal 1154, ui 377, auth 92 (+3 en vivo), i18n 22, seo-web 322, query-hooks 336 |
| `yarn workspace @rsvp/universal build` | exit 0 (`expo export`) |
| `IDENTITY_LIVE_URL=… IDENTITY_LIVE_MAIL_URL=… yarn workspace @rsvp/auth test test/identity-live.test.ts` | 3/3 contra el servicio real (código→prueba→cuenta verificada; prueba de un solo uso; 202 igual y 422 igual para nuevo/existente) |
| `node apps/universal/scripts/live/registro-4-pasos.mjs` (360 y 1280) | **24/24 PASS**, `results.json` |
| gitleaks | **no instalado en este entorno: NO ejecutado.** Revisión manual del diff: sin secretos (el arnés lee la URL de administración de Postgres del entorno) |

## REQ → prueba

| REQ | Prueba | Resultado |
|---|---|---|
| FE-S1 armazón, progreso, atrás conserva, foco, movimiento reducido | `register-steps.test.tsx`; L5, L7 | PASS |
| FE-S2 paso 1, igual para correo nuevo y existente | jsdom (HTML idéntico) y **L2** (Chrome real: mismo texto y estructura; el dueño del correo existente recibe aparte el aviso con `/login`, sin dígitos ni correo); L3 (mismo mensaje con código malo); L12 (5 intentos agotan el código) | PASS |
| FE-S3/S4 pasos 2 a 4, contraseña única, términos, `registrationProof` | tests; **L1** (cuenta con `email_verified` verdadero, un solo correo) | PASS |
| FE-S5 login con correo, sin URL | tests; **L4** (`/login` sin query ni `@`; recarga limpia vacía) | PASS |
| FE-S6 figuritas | tests (una por paso, aria-hidden, sin amarillo); capturas | PASS (aprobación visual de Pablo pendiente) |
| R6 borrador en memoria | tests; **L9** (nada en storage/URL/cookie; recarga reinicia) | PASS |
| Accesibilidad | **L8** axe 0 críticas/serias en cada paso, claro y oscuro, 360 y 1280 | PASS |
| Casos negativos | 422 código, 422 prueba vencida, 409, 429 (INJECTED), sin red, 5xx | PASS (mocks de contrato en unitarias; real donde indica) |

Capturas (`*.png`): pasos 1 a 4 en claro y oscuro, 360 y 1280, y el paso del código con cuenta existente. Mostrar a Pablo para aprobar los cuatro dibujos nuevos.

## No verificado

iOS/Android y dispositivo real; teclado virtual móvil; VoiceOver/TalkBack; Kong real y su límite; Resend real; CI de GitHub (ver el PR); regresión visual contra líneas base (`e2e/__screenshots__/auth-registro*` cambian de aspecto: se regeneran fuera de este PR con el flujo de `visual-baselines`).

## Reversión

Revertir el PR: el backend sigue aceptando el registro sin prueba mientras `IDENTITY_REGISTER_REQUIRES_EMAIL_PROOF=false`. Si ya estuviera en `true`, ponerla en `false` antes de desplegar el frontend anterior.

## Revisión independiente (correcciones del 28-11)

- Los scripts vivos que llenaban el formulario de una página (`live/auth-buttons.mjs`, `live/responsive/auth.mjs`, `auth-e2e.mjs`, `auth-e2e-kong.mjs`) ahora usan `live/register-steps.mjs` (necesitan `MAIL_URL`) y ya no dan por bueno el 409 en pantalla. **Solo se comprobó su sintaxis (`node --check`); NO se reejecutaron** (necesitan Kong/mundo de prueba que este entorno no tiene).
- La prueba jsdom de «idéntico nuevo/existente» es estructural (tautológica con un doble de prueba); la prueba real es L2 en Chromium contra el servicio real.
- `registro-backend-local.mjs` ya no tiene contraseña por omisión: exige `IDENTITY_DB_PASSWORD`.
