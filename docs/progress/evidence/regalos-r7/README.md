# R7 FE · «No disponible y reemplazos» (serie regalos/proveedores)

Fecha: 2026-11-27; correcciones de la revisión FE #154: 2026-11-28 (M41). Rama `feat/regalos-r7-disponibilidad`, desde `1a419775` (punta de R5 FE). Contrato vigente en la punta: `RSVPBackend@a8a46a29` (gift-list 1.20.0, provider-catalog 3.11.0); la corrida viva se hizo contra `RSVPBackend@4977789e` (ver «Recorrido real»). Base R5 integrada por merge: `origin/feat/regalos-r5-invitado` en `12dfb4e5`.
Niveles: ver cada fila. Nada de lo de abajo está marcado `DONE`: falta el PR, la revisión humana y la integración con Provider real y RabbitMQ.

## Qué cambia

| Superficie | Cambio |
|---|---|
| Contratos | `chore(contracts)`: `yarn workspace @rsvp/contracts generate --ref 4977789e` (RSVP_BACKEND_REPO=clon local). Generado, sin ediciones a mano. |
| `packages/query-hooks` | `isGiftUnavailable`, `unavailableReasonOf`, `GiftAvailability`, `GiftUnavailableReason` (`types.ts`); `guestGiftState` conserva una guarda `isGiftUnavailable` (falla en cerrado: sin reservar ni botones si llegara uno); `arrangeGifts` parte de `guestVisible`; `replacements.ts` (ruta, fallos 403/404/503/sin red, `swapEntry`, códigos 422 del cambio) y `replacements-hooks.ts` (`useGiftReplacements`, cliente). |
| `packages/i18n` | `gifts.host.replacements.*` (las claves `gifts.guest.unavailable.*` se retiraron con M41), es-BO y en-US (misma estructura; la prueba de paridad pasa). |
| Invitado, app (`apps/universal`) y web (`apps/seo-web`) | **El invitado nunca ve un regalo UNAVAILABLE (M41, decisión de Pablo).** `guestVisible` es el único filtro del invitado (`isGiftUnavailable` + estado): la lista, el título de la portada, el enlace directo y el bloque de regalos del RSVP salen de él; un enlace directo a uno apagado muestra «ya no está en la lista» sin filtrar su título. Sin tarjeta apagada, sin etiqueta y sin frase en el invitado. `seo-web` no importa `packages/ui`. |
| Anfitrión/organizador (app) | En su lista, el ítem no disponible muestra el motivo (`unavailableReason`, 9 valores), la etiqueta «No disponible» y el botón «Ver 3 reemplazos de la misma idea» (`aria-expanded`). El panel lee `listGiftReplacements` con `eventType` y, si hay, `city`; cada reemplazo tiene «Cambiar por este». Estados: cargando, vacío (con acceso al catálogo), sin idea, 403, 404 (relee la lista), 503, sin red con «Reintentar», 422 del cambio con texto propio. |

## Operación del cambio con un toque

El contrato **no define una operación de reemplazo** (`listGiftReplacements` solo lee y dice «It never writes: the host swaps with POST /items/batch»). Se usa `addGiftItemsBatch` (`POST /celebrations/{id}/items/batch`, `Idempotency-Key`) con una entrada: `productListingId` = el reemplazo, `giftIdeaCode` = la misma idea, `quantity` y `groupGiftEnabled` del regalo cambiado. Un regalo UNAVAILABLE no ocupa su idea (BE), así que el cambio entra. El regalo no disponible se queda en la lista marcado hasta que el proveedor lo vuelva a ofrecer o el anfitrión lo quite (`removeGiftItem`, gift-list 1.20.0; 409 mientras tenga reservas).

## Hallazgo: el cable no dice UNAVAILABLE en `status`

El contrato 1.14.0 y el código de Gift (`wireGiftStatus`, `giftAvailability`) separan: `status` conserva el valor que tenía el regalo y `availability: "UNAVAILABLE"` (+ `unavailableReason` desde 1.19.0) dice que ya no se puede dar. El código FE de R1 comprobaba `item.status === "UNAVAILABLE"`, que **nunca ocurre en el cable real**: la lista del anfitrión mostraba «Disponible» para un regalo apagado. Verificado contra el servicio real (abajo). Ahora todo pasa por `isGiftUnavailable`, que lee solo `availability` (un `status: "UNAVAILABLE"` heredado no marca nada, como en R1; `GiftItemStatus` se deriva del contrato, PF-6). De las pruebas R1 de `gifts-portal.test.tsx` solo cambia a propósito la lista de botones del anfitrión (el de reemplazos y el de quitar); las dos del invitado y la del anfitrión con `status` heredado vuelven a su texto de R1.

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
- `apps/seo-web/tests/gifts-r7.test.tsx`: M41 en la web (lista sin el regalo apagado, sin etiqueta ni frase, vacío si es el único, enlace directo = «ya no está en la lista» sin filtrar el título, es-BO y en-US, tarjeta normal intacta).
- `apps/universal/test/gifts-portal.test.tsx`: una aserción R1 ajustada (ver arriba).

### Recorrido real (Playwright + Google Chrome de la máquina) · nivel `VERIFIED` parcial

`docs/progress/evidence/regalos-r7/live/` (scripts, `results.json`, `walk.out`) y `screens/` (capturas). **44/44 comprobaciones pasaron en la corrida original; sin las 10 del invitado simulado quedan 34/34.**

Qué es real y qué no:
- **Real:** el `gift-list-service` v2 de la rama BE `feat/regalos-r7-disponibilidad` en `4977789e` (build `dist` del worktree), sobre **PostgreSQL 16 real** (rol dueño sin superusuario, RLS activa, 21 migraciones aplicadas). Los regalos se crean por `POST /items/batch` y se apagan por el **camino real del consumidor** (`PostgresListingAvailabilityStore.apply` con un evento `provider.listing.availability-changed.v1` validado por el parser estricto).
- **Doble:** Provider Catalog (elegibilidad y recomendación por idea), Celebration (acceso MANAGE) y Guest (credencial del enlace) son los dobles en proceso de `test/integration/support.mjs` del BE. El gateway de la prueba (`live/gateway.ts`) envía `/gifts/*` al servicio real (cambiando el token de desarrollo de la app por un JWT RS256 firmado de prueba) y todo lo demás (celebración, sesión) a `@rsvp/testing` (mock de contrato, **no** backend). No hubo RabbitMQ, Kong, Notification ni Identity reales (no hay Docker en el entorno); no se probó el aviso al anfitrión por correo/push.
- **Frontend:** `expo export --platform web` de la app y servidor estático con `/api` del mismo origen (como el nginx de la imagen web). La app se sirve **con un parche local, no versionado, de `metro.config.js`** (ver «Hallazgos fuera de alcance»).

Resultados: anfitrión a 360/768/1280 px, claro/oscuro, es-BO/en-US: etiqueta, motivo, 3 reemplazos de la misma idea, lectura con `eventType=WEDDING`, axe **0 críticas / 0 serias** con el panel abierto; 503 y pérdida de red con mensaje y «Reintentar» que recupera; idea sin reemplazos → vacío; cambio con un toque → el BE tiene el producto nuevo con la misma idea, cantidad 2 y aporte coordinado, el regalo apagado sigue marcado, el producto cambiado ya no se ofrece, y repetirlo da `422 DUPLICATE_GIFT_IDEA`. Negativos directos al BE real: 401 sin token, 403 con credencial de invitado, 404 regalo ajeno/inexistente.
- **Invitado:** el BE real **no envía** los regalos UNAVAILABLE a un invitado (`includeHidden: context.canManage`) y el FE tampoco los muestra si llegaran (M41). La prueba viva lo comprueba contra el servicio real («BE guest list: the UNAVAILABLE gifts are NOT sent to a guest» y «BE guest now sees the replacement and still not the dead gift»). Se retiraron la sección 5 de `walk.mjs` (tarjeta simulada del invitado), su inyección en `gateway.ts`, sus 10 líneas de `walk.out` / `results.json` y las 4 capturas `guest-card-*` (dos eran `SIMULATED`). **No se volvió a correr el recorrido vivo** tras estas correcciones (necesita el BE `test/integration/support.mjs`, PostgreSQL y el clon del BE, que no existen en esta sesión): `walk.out` y `results.json` son los de la corrida original sin las líneas del invitado simulado (34 de 44; no es una corrida nueva).
- No se probó: iOS/Android (solo Expo web), lector de pantalla real, teclado manual más allá de `aria-expanded`/roles y axe, la web Next (`seo-web`) en navegador (solo jsdom + build), movimiento reducido (R7 no agrega animación propia; la entrada de avisos usa la primitiva existente `Enter`), contraste de la web con axe de navegador (jsdom no lo calcula; la etiqueta usa los tokens `--tone-gray-*` ya existentes), contra Provider real.

## Accesibilidad y diseño (impeccable, ui-ux-pro-max, rsvp-accessible-states)

- Los scripts de `live/` importan `test/integration/support.mjs` del BE, que no existe en este repo: son evidencia, no código ejecutable aquí.
- Operate: una acción por fila, en el mismo lugar; el panel es una región con encabezado y el control dice si está expandido. En la lista del anfitrión el estado es palabra + etiqueta + motivo, no solo color.
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

1. ~~Invitado ve el regalo apagado~~ **Resuelta (M41):** el invitado no lo ve, ni en web ni en app; el anfitrión sí, con los reemplazos.
   - **Nueva, pendiente de Pablo (F5 de la revisión):** un invitado con una reserva ACTIVA sobre un regalo que se apaga deja de verlo en la lista y no puede cancelarla desde ahí. El anfitrión puede liberarla (`release-*`). ¿«Mis reservas» debe seguir mostrándola y permitir cancelar? Anotada en `docs/progress/DECISIONS.md`.
2. ~~Retirar el regalo apagado~~ **Resuelta en el BE 1.20.0:** existe `removeGiftItem` y el anfitrión ya puede quitarlo de la lista (la UI está en esta rama).
3. **Ciudad de los reemplazos.** El contrato de la celebración no tiene campo ciudad; la app la deduce de `content` (`citySlug`, `city`, `venueCity`) como el asistente de R4. Sin ciudad, los reemplazos no se ordenan por entrega.
4. **Avisos (correo/push) y «precio actualizado» al invitado.** R7 FE no tiene pantalla en el plan para los avisos de Notification ni para un aviso de «subió de precio»: solo se consume `currentPrice` (R5). Si se quiere un aviso en pantalla, falta decidir dónde.

## Ronda 2 (revisión independiente sobre c54cb6cd)

Cambios: el cambio con un toque tiene una sola rama de error (si pudo aplicarse —sin respuesta o 5xx— dice «No sabemos si el cambio se aplicó…» y el reintento repite la MISMA `Idempotency-Key`; 422 conocido, su texto; otro, `GiftErrorNotice`); la mutación del lote vive en `GiftsBody` (la clave por cuerpo sobrevive al cierre y reapertura del panel) y el panel limpia un error ajeno al abrirse; tras el cambio el foco vuelve a «Ver reemplazos» de la fila; `ActionButton` acepta `accessibilityLabel` opcional (en `apps/universal/src/host/ui.tsx`, no en `packages/ui`) y los botones «Cambiar por este: {nuevo} (reemplaza {viejo})» tienen nombre propio que empieza con el texto visible; «Ver reemplazos de la misma idea» ya no dice «3»; `.gift-row.gift-row--unavailable` conserva el padding; se quitó `gifts.guest.unavailable.label` (sin uso); la prueba de reserva propia comprueba el botón de cancelar. Pruebas nuevas: pérdida de red en el cambio con la misma clave en el reintento y una sola alerta, nombres accesibles, foco con `document.activeElement`.
El BE oculta los UNAVAILABLE al invitado y, desde M41, el FE también.

### Ronda 3 (sobre 8cd24ae1)

- El error y el estado ocupado del cambio son de la fila dueña (`swapOwner` en `GiftsBody`, fijado al llamar a `mutate`); se quitó el `reset()` al abrir, así el aviso «No sabemos si…» persiste al cerrar y reabrir. Prueba con dos filas no disponibles y dos paneles abiertos.
- La clave de idempotencia es una por cuerpo (`createBodyKeys`, un `Map` creado en `GiftsBody`): el reintento de A repite la clave de A aunque se haya probado B en medio. `useAddGiftBatch` recibe un tercer parámetro opcional `keys`; sin él se comporta como antes (la prueba del asistente R4 sigue en verde) y `BatchKeys.reset` acepta un cuerpo opcional. Prueba unitaria de ambos.
- Se quitó la clave muerta `error.swap.unknown`; el botón ocupado deja de llevar `accessibilityLabel` para que «Cambiando…» sea su nombre.
- **Límite:** el retorno del foco al botón «Ver reemplazos» solo se verificó en web (jsdom con `document.activeElement`); no está verificado en iOS ni Android.

### gitleaks (binario oficial 8.28.0, descargado de GitHub releases a /var/tmp)

`gitleaks git --log-opts="1a419775..HEAD" --redact -v .` → `6 commits scanned. scanned ~194215 bytes (194.21 KB) in 191ms. no leaks found`.

> Las rondas 2 a 4 describen el estado de entonces (tarjeta apagada del invitado, contratos `@cdfc3573`); lo vigente es la «Ronda 5» y el resto del documento.

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

## Ronda 4 (merge de R5 `12dfb4e5` y contratos `@cdfc3573`)

- Merge (no rebase) de `origin/feat/regalos-r5-invitado` en `12dfb4e5`. Conflictos resueltos conservando los dos lados: `guest-card.ts` (`unavailable` de R7 sobre el `heldUnits` y el botón para `SOLE` de R5; con regalo no disponible no hay botones), `ActionButton` (se tomó la versión de R5 con `accessibilityLabel`, equivalente a la mía), la tarjeta del invitado en app y web (`claimAnnouncement` de R5 + `!state.unavailable` de R7) y los generados (regenerados).
- `chore(contracts)` aparte: `generate --ref cdfc3573`. El cambio de gift-list 1.19.0 son solo descripciones (nombre del coordinador y ronda 3 del BE): no afecta al código FE.
- gitleaks 8.28.0 sobre `1a419775..HEAD`: `17 commits scanned. no leaks found`.

| Suite | Resultado |
|---|---|
| `corepack yarn lint` | exit 0, `Tasks: 19 successful, 19 total` |
| `corepack yarn typecheck` | exit 0, `Tasks: 19 successful, 19 total` |
| `corepack yarn test` | exit 0, `Tasks: 33 successful, 33 total`; universal `66` / `872`; seo-web `28` / `260`; query-hooks `20` / `244`; i18n `3` / `15` |
| build seo-web | exit 0 |
| `check:generated` | exit 0, `verified 8 contracts at …@cdfc35737c75` |
| `harness:validate` | exit 0 |


## Ronda 5 (correcciones de la revisión FE #154 sobre 787cb5d8, M41)

Cambios: el invitado no ve un regalo UNAVAILABLE (F1); un enlace directo a uno apagado cae en «ya no está en la lista» sin filtrar el título (F2); `GiftItemStatus` se deriva del contrato y `isGiftUnavailable` lee solo `availability` (F3, PF-6); `GIFT_UNAVAILABLE_REASONS` se comprueba contra el tipo del contrato en compilación; comentarios de versión y de «quitar de la lista» corregidos (F4); evidencia del invitado simulado retirada (F6). F5 queda como decisión de Pablo en `docs/progress/DECISIONS.md`.

Las tres pruebas de R1 que R7 había reescrito vuelven a su texto original (`apps/seo-web/tests/gifts.test.tsx`, y en `apps/universal/test/gifts-portal.test.tsx` «the guest never sees it, even if a response carried it» y la del `status` heredado del anfitrión).

Corrido en el árbol de esta ronda (salida real; no se corrió nada más):

| Suite | Comando | Resultado |
|---|---|---|
| Typecheck | `yarn workspace {@rsvp/query-hooks,@rsvp/i18n,@rsvp/seo-web,@rsvp/universal} typecheck` | exit 0 en los cuatro |
| Lint | `eslint --max-warnings 0` sobre los `.ts/.tsx` modificados | exit 0 (no se corrió `yarn lint` de todo el monorepo) |
| Pruebas | `yarn workspace @rsvp/query-hooks test` | `23` archivos / `299 passed` |
| | `yarn workspace @rsvp/i18n test` | `3` / `18 passed` |
| | `yarn workspace @rsvp/seo-web test` | `29` / `279 passed` |
| | `yarn workspace @rsvp/universal test` | 1.ª corrida: 2 fallos y 2.ª: 1 fallo, los dos en `test/upload-drop.test.tsx` (tiempo de espera con la máquina cargada y poca memoria; otro fallo distinto cada vez). `test/upload-drop.test.tsx`, `gift-unavailable-r7.test.tsx` y `gifts-portal.test.tsx` juntos: `90 passed (90)`. **No se logró una corrida completa de universal en verde**; el archivo `upload-drop` no se toca en este PR |
| Build seo-web | `yarn workspace @rsvp/seo-web build` | exit 0 |
| Contratos | `yarn workspace @rsvp/contracts check:generated` | exit 0, `verified 8 contracts at …@a8a46a29b885` (gift-list 1.20.0, provider-catalog 3.11.0) |
| Arnés | `yarn harness:validate` | `28 carriles, 61 skills y recarga por prompt válidos` |
| gitleaks | `gitleaks git --log-opts="origin/dev..HEAD" --redact` (8.28.0) | ver el resultado en el cuerpo del PR (se corre sobre el SHA final) |

No corrido: `yarn lint` del monorepo completo, `check:source`, el recorrido vivo con Playwright (ver arriba), iOS/Android.
