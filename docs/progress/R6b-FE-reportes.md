# R6b FE · reportes de leads, ctx del portal y vista previa con enlaces (FE #150)

Fuera de carril; sigue §5.9 y R6 del plan «Regalos solo de proveedores cargados» (D-10 #33 a #35) y la sección «Lo que falta para el portal» de FE #147. Contrato pinneado a BE `f612d243` (rama `feat/regalos-r6b-reportes` del BE, aún sin fusionar; provider-catalog 3.10.0, gift-list 1.18.0): hay que regenerar con el SHA fusionado cuando el BE entre. Fecha de la evidencia: 2026-11-28. Nivel: **TESTED** (jsdom, red simulada) más un recorrido con Chrome real de la ronda 3 (ver «Evidencia»). No VERIFIED.

## Qué hay
- Portal `/portal/leads`: filtros mes, producto y botón; por clic producto, botón, fecha en la zona del proveedor, tipo de evento y ciudad (PF-1: nada de celebración ni invitado; `Lead.context` cerrado, A35).
- Portal `/portal/metricas`: reporte mensual por producto y botón (válidos, no válidos por motivo, cobrables).
- Admin `/admin/metricas`: reporte de leads para cobro con mes, proveedor y descarga CSV.
- seo-web `/r/{listingId}`: reenvía `eventType` y el `ctx` del portal (I-6); ya no envía `sessionId` (M34). Los emisores de enlaces (lista de regalos de la app y de seo-web, `PartnerLink`, `partnerRedirectUrl`) envían el `eventType` (código de la celebración, validado con la misma forma que `/r`). **La ciudad (`city`) todavía no se llena con tráfico real:** el builder la admite, pero la vista pública de la celebración no trae ciudad y ningún emisor tiene de dónde sacarla sin cambiar el contrato; queda como brecha (ver «Pendiente de decisión»).
- Reportes en el idioma de la app: `locale` viaja en el reporte del proveedor, el del admin, su CSV y la lista de leads, y forma parte de las claves de consulta (el servidor lee `?locale=` antes de `Accept-Language`; el contrato OpenAPI no declara ese parámetro en estas operaciones, pero el servicio lo resuelve igual: conviene declararlo en el BE).
- Vista previa de la ficha (`/portal/productos/{id}?paso=resumen`): los botones abren el destino real con el ctx `PREVIEW` (M-2). El ctx se pide a `POST /providers/{id}/lead-context`, se renueva desde su `expiresAt` (3 min antes, al volver a primer plano y, una vez, al entrar en el margen) y nunca va en un `href`, en el DOM, en una clave de consulta ni en un enlace copiable. Sin ctx los botones quedan apagados.

## No hay (y por qué)
- **`PROVIDER_OWNER` sin llamador:** ninguna pantalla del portal abre hoy un `/r/` a una oferta propia fuera de la vista previa. El hook y `portalRedirectUrl` lo soportan y están probados.
- iOS y Android no probados. La comparación visual contra capturas de macOS no se regenera en Linux. El recorrido con Chrome real de la «Evidencia de la ronda 3» (vista previa, 360/768/1280, claro/oscuro, en-US, axe) se hizo sobre la punta anterior `7dcee78f`; **esta ronda de correcciones no lo repitió** (no se levantó el BE real) y por eso lo cubren solo las pruebas de pantalla con red simulada.
- «Compartido» en nativo: el CSV del admin se comparte como texto por la hoja del sistema (`Share`), no como archivo; ya no se anuncia «Compartimos…» si se cierra la hoja (`dismissed`). Compartirlo como archivo exige `expo-file-system` y `expo-sharing`, que el repositorio no trae.
- Pendiente de decisión de Pablo: la lista de leads ya no muestra la fecha del evento ni el número de invitados de las cotizaciones (coherente con A35/PF-1, pero es una pérdida visible para el proveedor; pregunta H4 de `estado-nube2-regalos`). Y la brecha de `city` descrita arriba.

## Comandos y resultados de la ronda 2 (historial; las cifras vigentes están en «Evidencia de la ronda 4»)
| Comando | Resultado |
|---|---|
| `corepack yarn typecheck` | exit 0, 19/19 |
| `corepack yarn lint` | exit 0, 19/19 |
| `corepack yarn workspace @rsvp/contracts check:generated` | exit 0, 8 contratos en `1151e6f14597` (el lock actual es `f612d243`; ver ronda 4) |
| api-client / ui-web / query-hooks / seo-web `test` (sobre la punta `624c42f9`) | exit 0: 19 / 22 / 192 / 227 |
| universal `test` | exit 0: 809 pruebas, 64 archivos (sobre `624c42f9`). Una primera corrida simultánea con el build de seo-web salió con exit 1 sin que yo viera el motivo; la repetición a solas pasó |
| `corepack yarn workspace @rsvp/seo-web build` | exit 0 |
| `gitleaks git --log-opts="origin/chore/deploy-contabo-coolify..HEAD"` v8.28.0 | no leaks found, con `.gitleaksignore` (2 huellas exactas de `6c57caa1`, fixtures falsos corregidos en `76c572c4`; sin él: 2 `generic-api-key`) |

Pruebas nuevas de esta ronda: `apps/universal/test/portal-preview-links.test.tsx` (9) y `packages/query-hooks/test/lead-report.test.tsx` (+3, renovación desde `expiresAt`).

## Reversión
Revertir el PR (o desplegar la imagen anterior de FE). Los contratos vuelven con `generate --ref d3b4b50e311933f987d25af80da2f2a284b14820`.

## Regla para quien use el `ctx` del portal

Sigue el patrón de R6a: el `ctx` no va en el `href`, se añade al navegar y se renueva al volver el foco. Es un bearer de 15 min: nunca en un enlace que se copie o comparta, ni en una clave de consulta.

## Evidencia (BE real, Chrome real)

Ver `docs/progress/evidence/r6b/`: capturas del recorrido, el CSV descargado y los scripts de siembra y recorrido. Entorno: Postgres, RabbitMQ y Redis en Docker; Kong 3.9.1 en Docker con el `kong.yml` del BE; Identity (jar compilado con gradle) y provider-catalog (build local) en el host; Expo web real contra `http://localhost:8000`. Sin `kong-jwt-sync` ni MinIO ni gift-list.

## No verificado

- `HOST_OR_PLANNER` (necesita el `ctx` firmado por gift-list; no se levantó gift-list): solo está cubierto por pruebas unitarias.
- Clics hechos con `curl` al gateway (`/r/{listingId}`), no a través del sitio seo-web.

## Cómo se levantó el entorno del recorrido (ronda 3)

Todo en una máquina Linux con Docker. Nada de esto entra al repositorio; los scripts de `evidence/r6b/` leen y escriben en `R6B_DIR` (por omisión `/var/tmp/r6b`).

1. **Infraestructura del BE (`feat/regalos-r6b-reportes` en `1151e6f`):** `cp .env.example .env && docker compose up -d postgres rabbitmq redis`. MinIO: las imágenes del compose (`cgr.dev`, `quay.io`) no se pueden bajar en el sandbox; se usó `bitnamilegacy/minio` con `--network host`, y `mc` (`bitnamilegacy/minio-client`) para crear `provider-media` (con `mc anonymous set download local/provider-media/public`) y `provider-documents`.
2. **Servicios en el host:** Identity (`./gradlew bootJar` y `java -jar`, con `IDENTITY_SIGNING_KEY_PEM` de `scripts/gen-identity-dev-key.mjs`), provider-catalog (`yarn workspace @rsvp/provider-catalog-service build`, `yarn db:migrate`, `yarn catalog:seed`, `node dist/runtime/main.js`) y su worker de fotos (`node dist/runtime/marketplace-workers-main.js`), con `PROVIDER_LEAD_CONTEXT_SIGNING_KEY` (base64 de 32 bytes) y `PROVIDER_MEDIA_BUCKET=provider-media`.
3. **Gateway:** Kong 3.9.1 en Docker con `infra/kong/kong.yml` del BE, `--add-host <servicio>:host-gateway` para cada upstream y el puerto 8000. Sin `kong-jwt-sync` (los servicios validan el JWT).
4. **ADMIN real:** registrar `e2e-admin@example.test` con Identity sin la variable; **marcar el correo verificado por SQL en la base de prueba** (`UPDATE identity_user SET email_verified_at = now() WHERE email = ...`, no hay camino HTTP sin leer el correo); reiniciar Identity con `IDENTITY_BOOTSTRAP_ADMIN_EMAIL` y volver a iniciar sesión.
5. **Proveedores:** `siembra-r6b.mjs` crea dos proveedores y marca `VERIFIED` **por SQL en `provider_db`** (`UPDATE provider SET status='VERIFIED'`, solo datos de prueba, como `provider-portal-live.mjs`), una oferta de servicio cada uno y los clics. `siembra-producto-1.mjs` y `siembra-producto-2-ficha-completa.mjs` crean un producto, lo completan (ficha, foto real por URL prefirmada a MinIO y worker hasta `READY`) y lo publican.
6. **Frontend:** Expo web (`npx expo start --web --port 8081` para el proveedor y `8100` para el admin; son orígenes que Kong ya permite) con `EXPO_PUBLIC_API_URL=http://localhost:8000`, `EXPO_PUBLIC_SITE_URL=http://localhost:3100` y **`EXPO_PUBLIC_DEV_ACCESS_TOKEN`** igual al `accessToken` de un login real de Identity (la sesión de desarrollo; caduca a los 15 min, hay que reiniciar Expo con uno nuevo); seo-web con `RSVP_API_URL=http://localhost:8000 npx next dev -p 3100`.
7. **Recorridos:** `node recorrido-r6b.mjs` (reportes, CSV) y `node recorrido-r6b-vista-previa.mjs` (vista previa real, `/r` por seo-web, viewports, claro y oscuro, en-US, axe con `@axe-core/playwright`, ya en las dependencias del repositorio). Chrome real (`/usr/bin/google-chrome`).

El sitio de destino (`tienda.example`, `wa.me`) se simula con `context.route`; el navegador no sale a internet.

## Evidencia de la ronda 3 (punta de la rama)

| Comprobación | Resultado |
|---|---|
| `yarn lint` / `yarn typecheck` / `yarn build` | exit 0, 19/19 cada uno |
| `yarn test` | exit 0, 33/33 tareas: universal 812, seo-web 227, query-hooks 193, api-client 19, ui-web 22, ui 333, design-editor 441, celebration-theme 3014, auth 89 (1 omitida preexistente), i18n 15, forms 65, design-tokens 91, contracts 6, telemetry 8 |
| `check:generated` | 8 contratos en `1151e6f14597` |
| Vista previa real: «Ver en la tienda» → seo-web `/r` (302) → Kong → `tienda.example` | lead `PREVIEW` no válido y no facturable en `/portal/leads` y en el reporte (PRODUCT_PAGE: 0 válidos) |
| Clic por seo-web `/r` en Chrome con `eventType=BIRTHDAY&city=la-paz` | lead válido con tipo de evento y ciudad en `/portal/leads` |
| 4 pantallas × 360/768/1280 × claro/oscuro (+ en-US en 360 y 1280) = 40 combinaciones | 0 desbordes horizontales, 0 claves crudas, axe (wcag2a, wcag2aa, wcag21a, wcag21aa): 0 violaciones |

Capturas en `evidence/r6b/` (`viewports/` trae 360 y 1280, claro y oscuro; el resto está en `axe-resultados.json` por combinación).

## Evidencia de la ronda 4 (correcciones de la revisión independiente; punta posterior a `7dcee78f`)

Corrido en Linux, jsdom, red simulada (el yarn 4.10.3 se ejecutó desde el `.yarn/releases` de otro checkout porque corepack no pudo bajarlo sin red).

| Comprobación | Resultado |
|---|---|
| `yarn typecheck` (turbo) | exit 0, 19/19 |
| `yarn lint` | exit 0, 19/19 |
| `yarn build` | exit 0, 19/19 |
| `yarn workspace @rsvp/contracts check:generated` | exit 0 |
| `yarn test` completo | una corrida con otras tareas pesadas en la máquina dio exit 1 por pruebas de universal con tiempo agotado o sin relación con este cambio (guests, categorías admin) y por mis pruebas nuevas aún sin ajustar; tras corregirlas, universal a solas: 973 pruebas, 74 archivos, todas pasan; seo-web 276 pasan; query-hooks 283 pasan (incluye las nuevas) |
| Archivos tocados, repetidos aislados | `portal-preview-links` 14, `lead-reports` 26, `files` 4, `guest-gifts-r5`, `provider-admin-buttons`, `guests`, `admin-modules`: pasan |

**No corrido en esta ronda:** gitleaks (no está instalado en esta máquina), el recorrido con Chrome real y axe (no se levantó el BE real; la evidencia de la ronda 3 es de la punta anterior), iOS y Android, y las capturas de macOS. No se regeneraron contratos.

Hallazgos de la revisión corregidos: M1 (el `eventType` viaja en los enlaces; `city` queda como brecha), M2 (vista previa sin ráfaga de POST y sin «Preparando» eterno; pulsar un ctx caducado lo avisa), M3 (esta documentación y los comentarios de versión), M4 (`locale` en los reportes y la lista), m1 a m9 (ver el historial de commits). Notas: el vocabulario «toques» (portal) y «clics» (admin) se mantiene porque son públicos distintos y el modelo de cobro se llama CPC; se unificó «Cobrable» y se aclaró que el tope es informativo.
