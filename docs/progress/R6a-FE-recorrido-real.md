# R6a FE · recorrido real (Chrome + backend real por Kong)

Fecha: 2026-11-27. Serie de regalos, R6a (`ctx` del miembro en los enlaces `/r/{listingId}`).
Nivel alcanzado: **TESTED** para los casos 1 a 6 con las salvedades de la sección «Límites». El caso 3 **no** se comporta como pide el encargo (ver «Hallazgos»).

## Qué se probó y contra qué

| Pieza | Versión / SHA |
| --- | --- |
| FE (`feat/regalos-r6a-leads`, PR #147) | `fbc73c27` |
| BE (`feat/regalos-r6a-leads-v2`, PR #158) | `d3b4b50e` |
| Navegador | Chromium 158.0.8127.36 (build del sandbox, `/opt/pw-browsers/chromium`) vía Playwright 1.62.1 (`--trace off`, sin `playwright install`) |
| Node | v22.23.5 en el host; contenedores `node:24.18.1` |
| Docker / Compose | 29.9.3 / v5.7.1, proyecto `walk6a` |
| Gateway | Kong 3.9.1 DB-less con el `infra/kong/kong.yml` del BE, sin tocar |
| Datos | Postgres 17.6, RabbitMQ 4.1.4, Redis 8.2.1 |
| Servicios reales (imágenes construidas del BE) | identity-service (jar de Gradle), celebration-site, guest-rsvp, gift-list (+workers), provider-catalog (+workers) |
| FE servido | `seo-web` de producción (`next build` + `next start -p 3100`, `RSVP_API_URL` = Kong) en `http://localhost:3100` (3100 está en la lista de orígenes CORS de Kong) |

Configuración propia de la prueba (un override en `/var/tmp/walk6a`, fuera del repo): puertos de host 59000 a 59200 (Kong en 59000), `GIFT_LEAD_CONTEXT_TTL_SECONDS=60` (mínimo permitido; el TTL por defecto es 300 s), `LEAD_CONTEXT_SIGNING_KEY` generada con `openssl rand -base64 32` al momento y solo en un `.env` privado (no figura aquí), la misma clave en Gift (`GIFT_LEAD_CONTEXT_SIGNING_KEY`) y Provider (`PROVIDER_LEAD_CONTEXT_SIGNING_KEY`), `PROVIDER_KYP_ENCRYPTION_KEY` y claves de contacto de Guest también generadas. Sin MinIO ni Notification ni Template/Media.

### Cómo se levantó

```
docker compose -p walk6a --env-file <privado> -f infra/docker-compose.yml -f <override> --profile apps \
  up -d --build postgres rabbitmq redis kong identity-service celebration-site-service guest-rsvp-service \
  gift-list-service provider-catalog-service gift-list-workers provider-marketplace-workers
cd apps/seo-web && NEXT_DIST_DIR=.next-walk RSVP_API_URL=http://127.0.0.1:59000 NEXT_PUBLIC_API_URL=http://127.0.0.1:59000 corepack yarn next build
                   NEXT_DIST_DIR=.next-walk ... corepack yarn next start -p 3100
PLAYWRIGHT_MODULE=<wt>/node_modules/playwright/index.mjs CHROMIUM_PATH=/opt/pw-browsers/chromium SITE_LOG_FILE=<log de next start> \
  node docs/progress/evidence/r6a-recorrido/recorrido-real.mjs
docker compose -p walk6a ... down -v     # al terminar: 0 contenedores, volúmenes y red eliminados
```

Adaptaciones del sandbox (no tocan el repo): Docker Hub devolvía 429, así que `kong`, `redis`, `node` y `eclipse-temurin` se bajaron de `mirror.gcr.io` y se re-etiquetaron con su nombre original; las imágenes `node` se re-derivaron añadiendo la CA del proxy de salida (`NODE_EXTRA_CA_CERTS`) para que `yarn install` funcione en el build; el jar de Identity se compiló en el host (Gradle) y se empaquetó con un Dockerfile mínimo en `/var/tmp`, porque el build de Gradle dentro del contenedor no confía en la CA del proxy. La imagen de MinIO (`cgr.dev`) está bloqueada por el proxy: no hay MinIO.

## Datos de prueba

Todo por la API con cuentas desechables `@example.test`, salvo dos accesos directos que se declaran:

1. **SQL (escritura, `provider_db`)**: el PRODUCTO se marca `published=true, completeness='COMPLETE'`. Un producto necesita FOTO para publicarse (`LISTING_INCOMPLETE`, falta `PHOTO`), la foto necesita MinIO y MinIO no se pudo levantar. Sin eso Gift rechaza el regalo (`CATALOG_PRODUCT_UNAVAILABLE`). Los casos de `/r` por navegación directa usan **servicios** (`type=SERVICE`), que sí se crean y publican por API.
2. **SQL (escritura, `identity_db`)**: `email_verified_at` de la cuenta bootstrap ADMIN. `IDENTITY_BOOTSTRAP_ADMIN_EMAIL` solo concede ADMIN a una cuenta con correo verificado y no hay camino HTTP para verificarlo sin Notification. El proveedor se verifica luego por HTTP (`POST /providers/{id}/verify`) con ese ADMIN.

El estado de los leads se lee por la API del propietario del proveedor (`GET /providers/{id}/leads`), sin SQL.

Ciclo: proveedor + 8 servicios + 1 producto → anfitrión (cuenta HOST), celebración publicada, lista de regalos con el producto (`CATALOGED`) → `GET /gifts/celebrations/{id}/items` del anfitrión devuelve `leadContext` (210 caracteres, `v1.<carga>.<firma>`).

## Resultados por caso

Guion: `docs/progress/evidence/r6a-recorrido/recorrido-real.mjs`. Salida cruda: `resultados.json` y `logs-conteo.json` en la misma carpeta (sin `ctx`, sin tokens, sin contraseñas).
El Chrome del sandbox no sale a internet: el destino del proveedor es un dominio ficticio y la carga final falla con `ERR_TUNNEL_CONNECTION_FAILED`. Se verifica el 302 y su `Location`, no la carga del destino.
El UA de Chromium headless contiene «HeadlessChrome» y Provider lo clasifica `bot` (`lead-policy.ts`, `BOT_PATTERN`); por eso el contexto de navegación fija el UA de un Chrome de escritorio con la misma versión. Es un ajuste de la prueba.

| Caso | Resultado | Observado |
| --- | --- | --- |
| 1. Anfitrión con `ctx` firmado hace clic desde la página de regalos | **OK** | Clic real sobre «Ver en la tienda del aliado» (`a.gift-partner-link`): el navegador pide `/r/{producto}?...&ctx=...` (el `ctx` viaja solo en la navegación), seo-web responde **302** con `Location` al destino (`utm_source`, `utm_medium`, `correlationId`; sin `ctx`). Lead: `valid=false`, `billable=false`, `invalidReason=HOST_OR_PLANNER`, `surface=GIFT_LIST`. Repetido por navegación directa con otro `ctx` real y un servicio: 302, `Cache-Control: no-store`, mismo lead inválido. |
| Control | **OK** | Sin `ctx` y `surface=GIFT_LIST`: 302 y lead `valid=true`, `billable=true` (línea base de «se evalúa normal»). |
| 2. `ctx` vencido o falso | **OK** | Falso (forma válida firmada con otra clave): 302, lead válido y cobrable. Alterado (firma modificada de un token real): 302, lead válido. **Vencido real**: se emitió por Gift, se esperó 126 s (TTL 60 s + tolerancia 60 s) y se usó: 302, lead válido. |
| 3. `surface=PREVIEW` sin token | **FALLA frente a lo esperado** | 302, pero el lead queda `valid=false`, `invalidReason=PREVIEW`, `surface=PREVIEW`: **no** se evalúa como un clic normal. Ver «Hallazgos». |
| 4. `ctx` de más de 512 caracteres | **OK** | Con 520 caracteres el FE lo descarta: 302 y lead válido y cobrable. La misma petición directa al backend (sin el filtro del FE) responde **422 `INVALID_LEAD_CONTEXT`**, así que el filtro es lo que evita la página de error. Frontera de 512 exactos (no verificable): se reenvía, 302 y lead normal. |
| 5. `href` sin `ctx`; página de error sin `ctx` en la URL | **OK** | En la página de regalos, donde el anfitrión tiene `ctx` en la lectura, el único `a[href^="/r/"]` es `/r/{producto}?destination=OFFICIAL_SITE&surface=GIFT_LIST&celebrationId=...`; el HTML no contiene el `ctx` y el `href` no cambió tras el clic. Páginas de error de `/r` abiertas con `ctx` en la URL: **404** (listing inexistente) y **400** (celebrationId inválido, backend 422), con `x-robots-tag: noindex`, `no-store`; tras la carga `location.href` ya no tiene `ctx` (`history.replaceState`) y el HTML tampoco lo contiene. Capturas a deviceScaleFactor 2 en `evidence/r6a-recorrido/` (`01-...-1280.png`, `02-error-404-...-360-light.png`, `03-error-400-...-360-dark.png`). |
| 6. Logs sin `ctx` ni datos personales | **OK** | `docker logs` de los 13 contenedores del proyecto (identity, guest, provider y workers, gift y workers, celebration, migraciones, Postgres, Redis, RabbitMQ, Kong) y el log de `next start`: 0 coincidencias con los 5 `ctx` usados (3 reales emitidos por Gift, 1 falso y 1 alterado) (completos y por segmento de carga/firma), con `ctx=`, con `v1.eyJ`, con las contraseñas y los tokens de acceso de la prueba, con correos `@example.test` y con los nombres de la celebración, una vez excluidos los detalles de clave duplicada de Postgres (ver abajo). Provider registra una línea JSON por petición con la ruta plantilla (`/r/:id`, estado), sin query; Kong usa el formato seguro (`status` y duración). |

### Datos personales en los logs de Postgres (fuera del alcance de R6a)

`walk6a-postgres-1` contiene 8 líneas `DETAIL: Key (email)=(walk-admin2@example.test) already exists.` Vienen de que, al preparar el stack, se registró varias veces la cuenta ADMIN de arranque (Identity responde 409 y Postgres escribe el valor en su log). No salen del flujo de `/r`, pero muestran que un registro duplicado deja el correo en el log de Postgres. Observación para Identity, no es un hallazgo de este PR.

## Hallazgos

1. **Caso 3, divergencia FE/BE sobre `surface=PREVIEW` sin token.** El BE (`d3b4b50e`) clasifica `PREVIEW` antes que nada: `apps/provider-catalog-service/src/marketplace/domain/policy/lead-policy.ts:77` (`if (input.surface === 'PREVIEW') return 'PREVIEW'`), sin mirar el `ctx`, y `docs/progress/DECISIONS.md:861` lo acepta a propósito («PREVIEW es gratis y lo elige el cliente, M-2, riesgo aceptado»; atarlo a un `ctx` firmado queda como decisión pendiente de Pablo). Los comentarios del FE dicen lo contrario: `packages/ui-web/src/index.tsx:58-60` («sin token el clic se evalúa como uno normal (decisión M-2)») y `apps/universal/src/platform/partner-link.ts:19-20`. Hoy un clic `surface=PREVIEW` sin token queda inválido (`PREVIEW`) y no se cobra: subcobra, nunca sobrecobra. No rompe un punto fundamental ni el redirect (302 en todos los casos), pero el comentario del FE es incorrecto frente a la decisión vigente. Se corrige el comentario o se cierra D-n; esa decisión es del dueño del producto. No se modificó código.
2. Sin otros fallos. El FE no reenvía el `ctx` al destino ni lo deja en `href`, `Location`, URL visible de errores ni logs.

## Límites (qué NO se probó)

- La página pública de regalos lee la lista con la credencial del invitado y Gift responde `leadContext: null` a un invitado; hoy ninguna pantalla de seo-web muestra enlaces a un miembro. Para ejercitar el clic de un MIEMBRO en el navegador se interceptó solo `GET /gifts/celebrations/*/items` y se respondió con la lectura **real** del anfitrión (el `ctx` lo firmó Gift). Es el único dato interceptado; el `ctx` y su efecto en Provider son reales.
- La app universal (Expo) no se ejercitó: el recorrido es seo-web. 360/768/1280 px, claro/oscuro y en-US completos y axe no se ejecutaron en este recorrido (solo 1280 claro en la página de regalos y 360 claro/oscuro en errores, es-BO). No se comparó contra línea base visual.
- Sin MinIO: producto sin foto real (SQL declarado), fotos y documentos de proveedor sin probar. Sin Notification ni Template/Media. Sin Kong JWT sync (`kong-jwt-sync` no se levantó: las rutas protegidas no exigen JWT en el borde, cada servicio valida el suyo).
- `PROVIDER_SELF` y `ctx` de otra celebración no se recorrieron aquí. `surface=PREVIEW` con `ctx` firmado de portal no existe todavía.
- No se probaron migraciones hacia abajo ni la reversión; la ejecución cubre solo lectura de leads, no concurrencia ni 429 de `/r`.
- Un solo cliente IP; la deduplicación de 24 h de gift-list se evitó usando un listing distinto por caso.

## Reversión

Esta evidencia no cambia código: solo agrega esta nota, el guion y capturas. Para borrarla basta revertir su commit. El stack temporal se destruyó con `docker compose -p walk6a ... down -v`.
