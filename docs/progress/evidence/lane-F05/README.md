# F05 · Sesión, guards y deep links: evidencia (2026-11-03)

Entorno: Identity real (Spring Boot 3.5, `apps/identity-service`, bootRun en :3200) con Postgres 17.6 y Redis efímeros (contenedores `f05-pg` :5445 y `f05-redis` :6395, ya eliminados); app universal exportada con `expo export --platform web` y servida en :8200; Chromium headless (Playwright). Identity corrió **sin Kong**: el script de e2e hace de pasarela solo para quitar el prefijo `/identity` y responder CORS. Credenciales, JWT, rotación y revocación las decidió Identity.

| REQ | Estado | Comando / artefacto | Resultado |
|---|---|---|---|
| REQ-F05-01 login, registro, recuperación | PASS (Expo web, Identity real). iOS/Android: no ejecutado | `node apps/universal/scripts/auth-e2e.mjs` (`auth-e2e.log`, `auth-e2e-result.json`); `IDENTITY_LIVE_URL=http://localhost:3200 IDENTITY_LIVE_DIRECT=1 yarn workspace @rsvp/auth test` (`auth-live-identity.log`) | 31/31 pasos: credencial inválida (401 neutro, datos conservados), sin conexión, 5xx, 409 correo repetido, validación local (12 caracteres), registro HOST/PROVIDER, recuperación 202, Enter envía. Live: registro, 409, 401, login, rotación, replay rechazado |
| REQ-F05-02 sesión persistida segura | PARTIAL. Nativo: TESTED con SecureStore simulado (no en dispositivo). Web cookie httpOnly: BLOCKED (backend) | `yarn workspace @rsvp/auth test` (adaptador nativo: reinicio, corrupto, clear); `apps/universal/test/auth.test.tsx` ("sobrevive a un reinicio") | Identity no emite cookie de sesión (requiere cambio en Identity). La web guarda la sesión solo en memoria: **recargar la página cierra la sesión** (limitación conocida). `expo-secure-store ~15.0.7` instalado y conectado (`src/platform/secure-storage.ts`) |
| REQ-F05-03 guards por rol | PASS | `packages/auth/test/guards.test.ts` (5 roles x 5 grupos, 31 casos); `apps/universal/test/auth.test.tsx` (RouteGuard, redirección con `returnTo`); `auth-e2e-forbidden.mjs` (`auth-e2e-forbidden-result.json`, `acceso-denegado-provider-admin-1280.png`) | Un PROVIDER con token real de Identity ve "sin acceso" en `/admin` y `/celebraciones`, y llega a `/portal`. Esa corrida usó el token de desarrollo (`EXPO_PUBLIC_DEV_ACCESS_TOKEN`, `--dev`), no un login en vivo. Layouts `(host)`, `(admin)`, `(provider)` protegidos |
| REQ-F05-04 universal/app links | BLOCKED-EXTERNAL | `apps/seo-web/tests/invitation-link.test.tsx`; `packages/auth/test/deep-links.test.ts` | Hecho: ruta de la app `/rsvp/[token]`, AASA/assetlinks (404 sin ids, JSON válido con ids), `parseMagicLink` endurecido. Faltan dominio verificado, Team ID/huella y iPhone/Android físicos. `rsvp://rsvp/<token>` en nativo sin probar |
| REQ-F05-05 repliegue a web | PARTIAL | `apps/seo-web/tests/invitation-link.test.tsx` (8 tests); `yarn build` lista `/rsvp/[token]`; `next start` en :3200: `/rsvp/abc` 200, `noindex`, enlace `rsvp://rsvp/abc` | La ruta `/rsvp/<token>` ya existe (antes 404). Resolver el token a una invitación requiere el servicio Guest (no existe): la página lo dice. "Funciona en ambos casos" no probado en dispositivo |
| REQ-F05-06 cierre de sesión | PASS (web, Identity real) | `auth-e2e.mjs`: `logout-revocation.txt`, `refresh-requests.txt`; tests de `SessionManager` | Botón "Cerrar sesión" envía `POST /identity/auth/logout` y borra el token local; reusar el refresh token da 401 en Identity. Renovación silenciosa real: 401 -> `POST /identity/auth/refresh` -> reintento con token rotado (`celebraciones-tras-refresh-1280.png`) |

Capturas (360/768/1280): `login-*.png`, `registro-*.png`, `recuperar-*.png`, estados `login-credencial-invalida-1280.png`, `login-sin-conexion-1280.png`, `registro-correo-existente-1280.png`, `recuperar-enviado-1280.png`, `login-en-1280.png`, `invitacion-enlace-1280.png`, `portal-proveedor-1280.png`. axe (wcag2a/aa, 2.1/2.2 aa): 0 críticas/serias en las 3 pantallas x 3 anchos (`axe-*.json`); sin desborde horizontal.

Defectos encontrados y corregidos: (1) `packages/api-client`: una respuesta 2xx sin cuerpo (202 de recuperación) lanzaba SyntaxError; ahora devuelve `undefined` (test añadido). (2) `IdentityClient`/stores: el JWT se decodificaba sin relleno base64 y sin UTF-8; `parseMagicLink` lanzaba con URLs inválidas; el store nativo fallaba con JSON corrupto. (3) `refreshSession` era un `throw`; ahora rota de verdad. (4) `returnTo` incluía parámetros de ruta dinámica. (5) El enlace `/rsvp/<token>` no tenía página.

No cubierto: iOS/Android, dispositivos físicos, cookie httpOnly, resolución real de invitaciones, prueba "3 corridas seguidas en CI", cobertura >=85 % medida, revisión de código por otro eje, snapshots visuales aprobados por humano.
Nota de build: `expo export` cachea `EXPO_PUBLIC_*`; al cambiar `EXPO_PUBLIC_API_URL` usar `--clear`.

## Sesión web por cookie httpOnly (2026-11-03)

`IdentityClient(api, "cookie")` (web, cuando no hay keychain) envía `X-Session-Transport: cookie` con `credentials: "include"`; el refresh token no pasa por JavaScript. `SessionManager.restore()` con la memoria vacía intenta un refresh por cookie, así que recargar la página conserva la sesión; una cookie muerta termina en `anonymous`. `TokenPair.refreshToken` es opcional y `Session.refreshToken` vale `""` en este modo. El contrato `identity.openapi.json` se regeneró desde el backend.

| Prueba | Nivel | Resultado |
|---|---|---|
| login/refresh/logout con cabecera y sin cuerpo; native sin cabecera | TESTED (fetch simulado) | PASS |
| restore por cookie, cookie muerta, store nativo sin restore, `setTokens` sin `refreshToken` conserva el anterior | TESTED | PASS |

`corepack yarn turbo typecheck test lint`: 65/65 tareas, exit 0 (auth 69, universal 60, api-client 11). **No cubierto:** recorrido real en navegador contra Identity+Kong (`auth-e2e.mjs` no se reejecutó: Docker caído y el backend sin la imagen nueva); CORS con credenciales no observado. Nivel: TESTED, no VERIFIED.

### Sesión web por cookie · actualización con Identity real (2026-11-03)

`auth-e2e.mjs` adaptado y ejecutado en Chrome contra Identity real (Spring `bootRun`, Postgres/Redis efímeros, app exportada con `EXPO_PUBLIC_API_URL`): **31/31 pasos, 3 corridas seguidas** (`auth-e2e.log`). Pasos nuevos o cambiados: la cookie `rsvp_refresh` existe con `httpOnly`, `SameSite=Strict`, `Path=/identity/auth`, `Secure`; `document.cookie` no la lista y ningún token llega a `localStorage`/`sessionStorage`; **recargar la página conserva la sesión** (restore por cookie); logout sin cuerpo, cookie borrada y el token viejo da 401 en Identity (`cookie-session.txt`, `logout-revocation.txt`). La bandera `staleOnce` del script pasó a ser por contexto: era global y daba un falso fallo intermitente. La pasarela del script sigue siendo un stand-in, pero el CORS con credenciales y el `Set-Cookie` se comprobaron aparte contra **Kong real** (ver evidencia del carril 07).

`corepack yarn turbo typecheck test lint`: 65/65. Cada carga de la web hace un `POST /auth/refresh` de sondeo (401 si no hay cookie). REQ-F05-02 pasa a PASS en web; iOS/Android siguen sin ejecutarse.
