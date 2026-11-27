# R7 FE · «No disponible y reemplazos» (serie regalos/proveedores)

Fecha: 2026-11-27. Rama `feat/regalos-r7-disponibilidad`, desde `1a419775` (punta de R5 FE). Contrato: `RSVPBackend@4977789e` (gift-list 1.19.0, provider-catalog 3.10.0).
Niveles: ver cada fila. Nada de lo de abajo está marcado `DONE`: falta el PR, la revisión humana y la integración con Provider real y RabbitMQ.

## Qué cambia

| Superficie | Cambio |
|---|---|
| Contratos | `chore(contracts)`: `yarn workspace @rsvp/contracts generate --ref 4977789e` (RSVP_BACKEND_REPO=clon local). Generado, sin ediciones a mano. |
| `packages/query-hooks` | `isGiftUnavailable`, `unavailableReasonOf`, `GiftAvailability`, `GiftUnavailableReason` (`types.ts`); `guestGiftState().unavailable` (sin reservar, sin unidades, sin botones); `arrangeGifts` trata como no disponible lo marcado; `replacements.ts` (ruta, fallos 403/404/503/sin red, `swapEntry`, códigos 422 del cambio) y `replacements-hooks.ts` (`useGiftReplacements`, cliente). |
| `packages/i18n` | `gifts.guest.unavailable.*` y `gifts.host.replacements.*`, es-BO y en-US (misma estructura; la prueba de paridad pasa). |
| Invitado, app (`apps/universal`) y web (`apps/seo-web`) | La tarjeta de un regalo no disponible se ve apagada (fondo atenuado, texto sin opacidad), con la etiqueta «No disponible» y la frase «El proveedor ya no lo ofrece», sin «Reservar», «Ver en la tienda», «Pedir por WhatsApp», unidades ni tarjeta «¿Lo compraste?». Una reserva que el invitado ya tenga sigue visible y cancelable. Si vuelve a AVAILABLE es la tarjeta normal. `seo-web` no importa `packages/ui`. |
| Anfitrión/organizador (app) | En su lista, el ítem no disponible muestra el motivo (`unavailableReason`, 9 valores), la etiqueta «No disponible» y el botón «Ver 3 reemplazos de la misma idea» (`aria-expanded`). El panel lee `listGiftReplacements` con `eventType` y, si hay, `city`; cada reemplazo tiene «Cambiar por este». Estados: cargando, vacío (con acceso al catálogo), sin idea, 403, 404 (relee la lista), 503, sin red con «Reintentar», 422 del cambio con texto propio. |

## Operación del cambio con un toque

El contrato **no define una operación de reemplazo** (`listGiftReplacements` solo lee y dice «It never writes: the host swaps with POST /items/batch»). Se usa `addGiftItemsBatch` (`POST /celebrations/{id}/items/batch`, `Idempotency-Key`) con una entrada: `productListingId` = el reemplazo, `giftIdeaCode` = la misma idea, `quantity` y `groupGiftEnabled` del regalo cambiado. Un regalo UNAVAILABLE no ocupa su idea (BE), así que el cambio entra. El regalo no disponible **se queda en la lista marcado** (el contrato no tiene operación para retirarlo; ver «Decisiones pendientes»).

## Hallazgo: el cable no dice UNAVAILABLE en `status`

El contrato 1.14.0 y el código de Gift (`wireGiftStatus`, `giftAvailability`) separan: `status` conserva el valor que tenía el regalo y `availability: "UNAVAILABLE"` (+ `unavailableReason` desde 1.19.0) dice que ya no se puede dar. El código FE de R1 comprobaba `item.status === "UNAVAILABLE"`, que **nunca ocurre en el cable real**: la lista del anfitrión mostraba «Disponible» para un regalo apagado. Verificado contra el servicio real (abajo). Ahora todo pasa por `isGiftUnavailable` (acepta ambas formas). La prueba R1 de `gifts-portal.test.tsx` se actualizó solo en lo que R7 cambia a propósito: el único botón de un ítem no disponible es el de reemplazos (antes, ninguno).

## Verificación

Comandos en la raíz de `/home/user/RSVPFrontend`, con el árbol limpio, salida literal resumida.

| Suite | Comando | Resultado |
|---|---|---|
| Lint | `corepack yarn lint` | exit 0, `Tasks: 19 successful, 19 total` |
| Typecheck | `corepack yarn typecheck` | exit 0, `Tasks: 19 successful, 19 total` |
| Pruebas (todo el monorepo) | `corepack yarn test` | exit 0, `Tasks: 33 successful, 33 total`; universal `66 passed (66)` / `861 passed (861)`; seo-web `28` / `254`; query-hooks `20` / `238`; api-client `4` / `17`; i18n `3` / `15`; contracts `1` / `6` |
| Build seo-web | `corepack yarn workspace @rsvp/seo-web build` | exit 0 |
| Contratos | `corepack yarn workspace @rsvp/contracts check:generated` | exit 0, `verified 8 contracts at ...@4977789e7a7a` |
| Arnés | `corepack yarn harness:validate` | exit 0, `28 carriles, 61 skills y recarga por prompt válidos` |
| `check:source` | `corepack yarn workspace @rsvp/contracts check:source` | no ejecutado: necesita `RSVP_BACKEND_REPO`/token y el commit `4977789e` solo está en el clon local de esta sesión; `generate` leyó ese mismo clon y `check:generated` lo verifica sin red. |
| gitleaks | | **no disponible** en el entorno (`which gitleaks` vacío). Búsqueda manual de secretos en el diff: ninguno; los tokens de la prueba viva se generan en `/var/tmp` y no se versionan. |

Pruebas nuevas (todas pasan), por nivel `TESTED` (mocks del gateway) salvo lo marcado:
- `packages/query-hooks/test/gift-replacements.test.tsx` (16): `isGiftUnavailable`, razones, estado de la tarjeta del invitado (sin botones, grupo/coordinador, vuelve a AVAILABLE), «Solo disponibles», ruta con patrones del contrato, 403/404/503/sin red, `swapEntry`, hook con cliente real y `fetch` grabador (sin reintento en 403/404, reintento único en pérdida de respuesta, lista vacía, deshabilitado).
- `apps/universal/test/gift-unavailable-r7.test.tsx` (19): lista del anfitrión (motivo, etiqueta, cifras, es/en), panel con 3 reemplazos y `eventType`, cambio con un toque (cuerpo exacto del batch, `Idempotency-Key`, relectura), doble toque = 1 solicitud, vacío, sin idea, 403 sin reintento, 404 que relee, sin red con «Reintentar», 503, 422 con texto propio, axe; tarjeta del invitado (apagada, sin controles, vuelve a normal, en-US, reserva propia visible, axe).
- `apps/seo-web/tests/gifts-r7.test.tsx` (4): misma tarjeta en la web, sin enlaces `/r/` cuando está apagada, normal al volver, en-US, axe.
- `apps/universal/test/gifts-portal.test.tsx`: una aserción R1 ajustada (ver arriba).

### Recorrido real (Playwright + Google Chrome de la máquina) · nivel `VERIFIED` parcial

`docs/progress/evidence/regalos-r7/live/` (scripts, `results.json`, `walk.out`) y `screens/` (capturas). **44/44 comprobaciones pasan.**

Qué es real y qué no:
- **Real:** el `gift-list-service` v2 de la rama BE `feat/regalos-r7-disponibilidad` en `4977789e` (build `dist` del worktree), sobre **PostgreSQL 16 real** (rol dueño sin superusuario, RLS activa, 21 migraciones aplicadas). Los regalos se crean por `POST /items/batch` y se apagan por el **camino real del consumidor** (`PostgresListingAvailabilityStore.apply` con un evento `provider.listing.availability-changed.v1` validado por el parser estricto).
- **Doble:** Provider Catalog (elegibilidad y recomendación por idea), Celebration (acceso MANAGE) y Guest (credencial del enlace) son los dobles en proceso de `test/integration/support.mjs` del BE. El gateway de la prueba (`live/gateway.ts`) envía `/gifts/*` al servicio real (cambiando el token de desarrollo de la app por un JWT RS256 firmado de prueba) y todo lo demás (celebración, sesión) a `@rsvp/testing` (mock de contrato, **no** backend). No hubo RabbitMQ, Kong, Notification ni Identity reales (no hay Docker en el entorno); no se probó el aviso al anfitrión por correo/push.
- **Frontend:** `expo export --platform web` de la app y servidor estático con `/api` del mismo origen (como el nginx de la imagen web). La app se sirve **con un parche local, no versionado, de `metro.config.js`** (ver «Hallazgos fuera de alcance»).

Resultados: anfitrión a 360/768/1280 px, claro/oscuro, es-BO/en-US: etiqueta, motivo, 3 reemplazos de la misma idea, lectura con `eventType=WEDDING`, axe **0 críticas / 0 serias** con el panel abierto; 503 y pérdida de red con mensaje y «Reintentar» que recupera; idea sin reemplazos → vacío; cambio con un toque → el BE tiene el producto nuevo con la misma idea, cantidad 2 y aporte coordinado, el regalo apagado sigue marcado, el producto cambiado ya no se ofrece, y repetirlo da `422 DUPLICATE_GIFT_IDEA`. Negativos directos al BE real: 401 sin token, 403 con credencial de invitado, 404 regalo ajeno/inexistente. Tarjeta del invitado 360 claro/es-BO y 1280 oscuro/en-US: axe 0 críticas / 0 serias.
- **Límite importante, `SIMULATED`:** el BE real **no envía** los regalos UNAVAILABLE a un invitado (`includeHidden: context.canManage`, decisión de Pablo 2026-11-26). Por eso la tarjeta apagada del invitado se vio con **una carga simulada**: el gateway marca `availability: "UNAVAILABLE"` en un regalo de la respuesta de invitado (`/__r7/inject`). La prueba con payload real del invitado muestra la tarjeta normal. Las capturas `guest-card-unavailable-SIMULATED-*` lo dicen en el nombre.
- No se probó: iOS/Android (solo Expo web), lector de pantalla real, teclado manual más allá de `aria-expanded`/roles y axe, la web Next (`seo-web`) en navegador (solo jsdom + build), movimiento reducido (R7 no agrega animación propia; la entrada de avisos usa la primitiva existente `Enter`), contraste de la web con axe de navegador (jsdom no lo calcula; la etiqueta usa los tokens `--tone-gray-*` ya existentes), contra Provider real.

## Accesibilidad y diseño (impeccable, ui-ux-pro-max, rsvp-accessible-states)

- Operate: una acción por fila, en el mismo lugar; el panel es una región con encabezado y el control dice si está expandido. El estado es palabra + etiqueta + frase, no solo color; no se usa `opacity` (el texto conserva el contraste), solo fondo atenuado.
- Objetivos táctiles ≥ 44 px; foco visible heredado de `ActionButton`/`Pressable`; mensajes sin detalles internos del BE; entradas conservadas tras un 4xx.
- Motion: N/A (no se agregó animación; decisión registrada aquí).

## Hallazgos fuera de alcance (no se tocaron)

1. `apps/universal/metro.config.js` quita el `.js` de toda importación relativa; con `postcss@8.5.29` (lock) `postcss.mjs` importa `./postcss.js`, Metro lo resuelve a sí mismo y toda pantalla que importa `design-editor`/`celebration-theme` falla al cargar con `Cannot read properties of undefined (reading 'stringify')` en `expo start --web` y en `expo export`. Para el recorrido se aplicó localmente `&& !context.originModulePath.endsWith('.mjs')` y se revirtió. Conviene un issue propio.
2. Tras correr Expo, `apps/universal/.expo/types` (ignorado por git) activa rutas tipadas y rompe `tsc` en `src/push/lifecycle.tsx` (`router.push(route)` con `string`). No ocurre en CI limpio; se borró `.expo` antes de la verificación final.

## Reversión

Un `git revert` de los commits de la rama revierte todo (sin migraciones ni variables nuevas). La app sigue siendo compatible con un BE anterior: sin `availability` la tarjeta es normal; sin `unavailableReason` el motivo es la frase genérica; el panel de reemplazos solo aparece en regalos no disponibles.

## Variables nuevas

Ninguna.

## Decisiones pendientes para Pablo

1. **Invitado ve el regalo apagado.** El plan §5.7 dice «se muestra apagado… con el texto», pero el contrato (decisión del 2026-11-26) no envía los UNAVAILABLE al invitado. El FE ya sabe pintarlo; hoy ningún invitado lo verá. ¿El BE debe enviarlos (p. ej. solo los que el invitado tiene reservados) o se queda oculto?
2. **Retirar el regalo apagado.** Tras «Cambiar por este», el regalo no disponible sigue en la lista del anfitrión (no hay operación de borrar/rechazar para un regalo del catálogo). ¿Se agrega al contrato una operación de reemplazo atómico («cambiar» = alta + retiro) o se acepta que queden ambos?
3. **Ciudad de los reemplazos.** El contrato de la celebración no tiene campo ciudad; la app la deduce de `content` (`citySlug`, `city`, `venueCity`) como el asistente de R4. Sin ciudad, los reemplazos no se ordenan por entrega.
4. **Avisos (correo/push) y «precio actualizado» al invitado.** R7 FE no tiene pantalla en el plan para los avisos de Notification ni para un aviso de «subió de precio»: solo se consume `currentPrice` (R5). Si se quiere un aviso en pantalla, falta decidir dónde.

## Ronda 2 (revisión independiente sobre c54cb6cd)

Cambios: el cambio con un toque tiene una sola rama de error (si pudo aplicarse —sin respuesta o 5xx— dice «No sabemos si el cambio se aplicó…» y el reintento repite la MISMA `Idempotency-Key`; 422 conocido, su texto; otro, `GiftErrorNotice`); la mutación del lote vive en `GiftsBody` (la clave por cuerpo sobrevive al cierre y reapertura del panel) y el panel limpia un error ajeno al abrirse; tras el cambio el foco vuelve a «Ver reemplazos» de la fila; `ActionButton` acepta `accessibilityLabel` opcional (en `apps/universal/src/host/ui.tsx`, no en `packages/ui`) y los botones «Cambiar por este: {nuevo} (reemplaza {viejo})» tienen nombre propio que empieza con el texto visible; «Ver reemplazos de la misma idea» ya no dice «3»; `.gift-row.gift-row--unavailable` conserva el padding; se quitó `gifts.guest.unavailable.label` (sin uso); la prueba de reserva propia comprueba el botón de cancelar. Pruebas nuevas: pérdida de red en el cambio con la misma clave en el reintento y una sola alerta, nombres accesibles, foco con `document.activeElement`.
Sin cambios (decisión de Pablo): el BE oculta los UNAVAILABLE al invitado.

### Ronda 3 (sobre 8cd24ae1)

- El error y el estado ocupado del cambio son de la fila dueña (`swapOwner` en `GiftsBody`, fijado al llamar a `mutate`); se quitó el `reset()` al abrir, así el aviso «No sabemos si…» persiste al cerrar y reabrir. Prueba con dos filas no disponibles y dos paneles abiertos.
- La clave de idempotencia es una por cuerpo (`createBodyKeys`, un `Map` creado en `GiftsBody`): el reintento de A repite la clave de A aunque se haya probado B en medio. `useAddGiftBatch` recibe un tercer parámetro opcional `keys`; sin él se comporta como antes (la prueba del asistente R4 sigue en verde) y `BatchKeys.reset` acepta un cuerpo opcional. Prueba unitaria de ambos.
- Se quitó la clave muerta `error.swap.unknown`; el botón ocupado deja de llevar `accessibilityLabel` para que «Cambiando…» sea su nombre.
- **Límite:** el retorno del foco al botón «Ver reemplazos» solo se verificó en web (jsdom con `document.activeElement`); no está verificado en iOS ni Android.

### gitleaks (binario oficial 8.28.0, descargado de GitHub releases a /var/tmp)

`gitleaks git --log-opts="1a419775..HEAD" --redact -v .` → `6 commits scanned. scanned ~194215 bytes (194.21 KB) in 191ms. no leaks found`.

### Suites de la ronda 2

| Suite | Resultado |
|---|---|
| `corepack yarn lint` | exit 0, `Tasks: 19 successful, 19 total` |
| `corepack yarn typecheck` | exit 0, `Tasks: 19 successful, 19 total` |
| `corepack yarn test` | exit 0, `Tasks: 33 successful, 33 total`; universal `66 passed (66)` / `864 passed (864)`; seo-web `28` / `254`; query-hooks `20` / `238`; i18n `3` / `15` |
| `corepack yarn workspace @rsvp/seo-web build` | exit 0 |
| `corepack yarn workspace @rsvp/contracts check:generated` | exit 0, `verified 8 contracts at …@4977789e7a7a` |
| `corepack yarn harness:validate` | exit 0 |

### Suites de la ronda 3

gitleaks 8.28.0 sobre `1a419775..HEAD` (hasta el commit de código de la ronda 3): `9 commits scanned … no leaks found`.

| Suite | Resultado |
|---|---|
| `corepack yarn lint` | exit 0, `Tasks: 19 successful, 19 total` |
| `corepack yarn typecheck` | exit 0, `Tasks: 19 successful, 19 total` |
| `corepack yarn test` | exit 0, `Tasks: 33 successful, 33 total`; universal `66` / `865`; seo-web `28` / `254`; query-hooks `20` / `240`; i18n `3` / `15` |
| build seo-web | exit 0 |
| `check:generated` | exit 0, `verified 8 contracts at …@4977789e7a7a` |
| `harness:validate` | exit 0 |
