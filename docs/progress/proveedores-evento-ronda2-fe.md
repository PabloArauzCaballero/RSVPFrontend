# Proveedores para mi evento, ronda 2 (FE): atribución en /cotizar, prueba de trabajo, arranque y recorridos

Rama `feat/req-proveedores-evento-fe`, sobre la ronda 1 (`25afa2cc`). Nube, 2026-11-28 (UTC). Sin PR ni fusión. RSVPFrontend es público: nada de secretos ni datos personales (todo dato de este documento y del recorrido es sintético).

## Qué cambia

- **Atribución en `/p/{slug}/cotizar`.** La pestaña recuerda en `sessionStorage` (solo esa pestaña del navegador) el id público de la celebración, su tipo de evento y el instante (`OriginRemember`). El formulario de cotización lee ese origen (vigencia 2 h) y manda `origin {surface:'CELEBRATION_SITE', celebrationId, eventType}` en el cuerpo del POST. La dirección de `/cotizar` no lleva celebración, slug, guestId ni token; el `Referer` hacia la API es solo el origen del sitio (`strict-origin-when-cross-origin`) y la pestaña va con `no-referrer`. Sin pasar por la pestaña no se manda `origin`. (Prueba: unitarias, y Chrome real: cuerpo, referer y URL.)
- **Prueba de trabajo** (`lib/quote-proof.ts`, sin script de terceros): al enviar como anónimo, si el backend corre `PROVIDER_ANON_QUOTES=proof`, pide un desafío fresco a `GET /providers/quote-access`, lo resuelve en el navegador cediendo el hilo cada 1 500 intentos, muestra «Verificando que eres una persona…» (`role=status`) y envía `proof {challenge, nonce}`. Si el backend no puede consultarse, envía sin prueba y decide el servicio. Si las cotizaciones anónimas están cerradas (`off`), el formulario dice que hay que iniciar sesión y deshabilita el envío (hoy daba 401 después de llenar todo). `PROOF_FAILED` (403) tiene su mensaje es-BO/en-US.
- **Interruptor.** `GUEST_MARKETPLACE` (seo-web, apagada por defecto; ver `docs/runbooks/releases.md`) ya existía. Nuevo: si el catálogo responde 404 (su propio `GUEST_MARKETPLACE` apagado), la pestaña es 404 igual que con el interruptor del sitio apagado, no una página de error. Con ella apagada no hay ruta ni entradas. **Por celebración: no se hizo** (necesita un campo de celebration-site; decisión de Pablo, ver el documento del backend).
- **Miniaturas 3D (punto 4):** ya estaban reintegradas en la ronda 1; se comparó byte a byte con `wip/respaldo-20261128/archivos` (`sueltos/marketplace-muestras/webp`): los 120 WebP son idénticos. No se reintegraron los scripts de render (three.js, Python) ni las láminas: no son triviales (dependencia de desarrollo y GPU) y siguen en esa rama; la excepción de `DESIGN.md` (E1 a E7) sigue pendiente de Pablo.

## Pruebas (2026-11-28, UTC)

| Comando | Resultado |
|---|---|
| `yarn install --immutable` | OK |
| `yarn lint` (eslint con 0 advertencias + turbo) | 19 de 19 tareas OK |
| `yarn typecheck` | 19 de 19 OK |
| `yarn test` | OK (turbo, exit 0); seo-web incluye `tests/quote-origin-proof.test.tsx` (11 pruebas nuevas) y 1 nueva en `tests/marketplace.test.tsx` |
| `yarn workspace @rsvp/seo-web build` | OK |
| `node apps/seo-web/e2e/mercado-recorrido.mjs` (Chrome real, backend real, 360 y 1280 px) | 27 de 27 comprobaciones |

Contra el backend real, en la base de datos de la prueba: con un Chrome normal los leads de cotización quedan `valid=true` con `origin {CELEBRATION_SITE, WEDDING}` y `celebrationId`; el directo, sin origen; con el user agent de Chrome headless el lead queda `bot` y la solicitud igual se entrega (regla ya existente `isBot`, que el recorrido evita con un user agent de escritorio).

**No probado:** iOS/Android y la app universal (su formulario de cotización nativo no manda `origin`: pendiente), Safari y Firefox, lector de pantalla real, Kong, celebration-site real (la lectura pública de la celebración la simula el puente de `e2e/mercado/dev-stack.mjs`), captcha externo (Turnstile), Playwright de la suite oficial contra el backend completo, gitleaks (no está instalado; diffs revisados a mano, sin secretos), contraste y 200 % de zoom medidos, movimiento reducido (esta ronda no agrega animación).

## Arranque (para otro agente)

1. PostgreSQL 16 UTC, rol no superusuario (lo crea la prueba): `initdb -D <dir> -U postgres --auth=trust`, `postgresql.conf`: `port=5443`, `timezone='UTC'`, `listen_addresses='127.0.0.1'`; arrancar con `pg_ctl` como usuario `postgres`.
2. Backend (repo RSVPBackend, rama `feat/req-proveedores-evento-be`): `yarn install --immutable`, compilar `packages/platform-{telemetry,auth,outbox,messaging}` (`yarn build`; avisan de `Buffer` y emiten igual) y, en `apps/provider-catalog-service`, `yarn build`.
3. Pila mínima: `PROVIDER_IT_SHARED_POSTGRES_URL=postgres://postgres@127.0.0.1:5443/postgres node ../../e2e/mercado/dev-stack.mjs` (desde `apps/provider-catalog-service`). Imprime el puente en `http://127.0.0.1:8000`, la celebración de muestra `ana-y-luis` y los slugs de 3 proveedores. Queda corriendo.
4. Frontend (esta rama): `yarn install --immutable`, `yarn workspace @rsvp/seo-web build`, `cd apps/seo-web && RSVP_API_URL=http://127.0.0.1:8000 GUEST_MARKETPLACE=on npx next start -p 3100` (`NEXT_PUBLIC_API_URL` se fija al compilar: por defecto `http://localhost:8000`, que coincide).
5. `MERCADO_PROVIDER_SLUG=<slug> MERCADO_OUT=<carpeta> node apps/seo-web/e2e/mercado-recorrido.mjs` (Chrome en `/usr/bin/google-chrome` o `CHROME_PATH`). Con `MERCADO_WEB_OFF=<url de otro seo-web sin GUEST_MARKETPLACE>` también comprueba el 404 del interruptor apagado.

## Recorridos con Chromium que siguen pendientes (otro agente, con la pila completa)

1. Invitación real → entrada discreta «Proveedores» → pestaña → ficha → WhatsApp por `/r/` (verifica `surface=CELEBRATION_SITE` y `celebrationId` en el lead) → vuelta; después de responder el RSVP, la línea bajo el enlace de regalos. En 320, 360, 768 y 1280 px, claro y oscuro, con `prefers-reduced-motion`.
2. Fila de categorías con teclado (Tab, Enter, foco visible, `aria-current`), 200 % de zoom y lector de pantalla; categoría sin resultados, ciudad sin resultados, error del catálogo («Reintentar») y catálogo vacío (sin entrada).
3. «Cerca de mí» con geolocalización concedida y denegada.
4. Cotización: cada estado con backend real: modo `proof` (hecho), `captcha` con Turnstile real, `off` (hecho en pruebas, falta en navegador), 429 por IP, dispositivo y contacto con el mensaje de espera, 403, 422 por mensaje con enlaces; dos cotizaciones seguidas al mismo proveedor con el mismo correo (la segunda se entrega, su lead es `dup`).
5. Anfitrión: que su propia pestaña de vista previa no cobra (queda como limitación declarada en la web anónima; ver el documento del backend).
6. Interruptor: apagar `GUEST_MARKETPLACE` en seo-web y en el backend, y comprobar 404 de la pestaña, ausencia de entradas y de la lectura `view=marketplace`.
7. App instalada (iOS y Android): la ruta `/c/{slug}/proveedores` abre dentro de la vista web; el formulario nativo de cotización no manda `origin`.

## Contratos y pin del backend (requisito de la cola de fusión)

`packages/contracts` (spec vendorizado `provider-catalog` 3.15.0 y tipos generados) se regeneró con `generate --ref 28e570072c75…`, el SHA de la **rama** del backend `feat/req-proveedores-evento-be`; sirve para tipar y para que `check:generated` pase. `backend.lock.json` debe fijar el backend **desplegado**: al fusionar el BE hay que volver a correr `RSVP_BACKEND_REPO=../RSVPBackend yarn workspace @rsvp/contracts generate --ref <SHA fusionado>` y abrir el PR de FE con ese lock; mientras tanto este FE **no puede fusionarse antes que el BE** (orden: mapas → imágenes → proveedores). Los textos «3.15.0» (compose, runbook, este documento) siguen la decisión de coordinación de versiones.
