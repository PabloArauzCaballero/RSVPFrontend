# Plantillas F7 · moderación en el frontend

Corrige: PL-142-R4 (parte FE, decisiones de Pablo del 2026-11-26 en BE #143). Rama `feat/plantillas-f7-moderacion-fe`, contra `chore/deploy-contabo-coolify`. Pareja de BE #167 (READY) y de BE #143 (borrador, aviso por correo).

## Qué entra

- **Contratos provisionales.** `packages/contracts` vendorizado desde la cabeza de BE #167 (**`9e97de01103fe11ad24f3298faed83e254fd8e58`**, rama `feat/plantillas-f7-moderacion-decisiones`, **PROVISIONAL: #167 no está fusionado**; antes `bf93c097`) con el generador del repo (`RSVP_BACKEND_REPO=… yarn workspace @rsvp/contracts generate --ref 9e97de01…`): Celebration **1.8.0** y Template/Media **1.9.1**. Son versiones provisionales: el lock exige versiones crecientes en el orden de fusión y BE #167 puede renumerarse a 1.7.0 de Template/Media si se fusiona antes que #164. Al fusionar el backend hay que volver a vendorizar desde la rama oficial (`generate --ref <sha oficial>`); mientras tanto `check:source` pasa contra ese commit y el candado apunta a él.
- **Denuncia pública** (`apps/seo-web/components/report-invitation.tsx`): pie discreto «Denunciar esta invitación» y, solo si la página reproduce el MP3 propio, «Denunciar la música» (envía `element: { kind: "SECTION", id: "music" }`; solo se revisa la música). Diálogo nativo `<dialog>` (foco atrapado, Escape, foco de vuelta al botón), motivo de la lista cerrada, comentario opcional salvo `OTHER`, contador, errores 422/404/429 (con minutos de `Retry-After`)/red sin perder el texto. Sin sesión ni datos personales; ni IP ni correo.
- **Estado oculto en la invitación** (`packages/celebration-theme`): `hiddenElements` de la vista pública. Sin música propia no hay reproductor ni caja vacía; el botón de regalos `/c/{slug}/regalos`, «Confirmar asistencia», la portada y las fotos siguen. Un fondo o foto que responde 404 (oculto, borrado o enlace viejo en HTML cacheado) deja su caja sin cámara dibujada detrás del texto si es decorativo. La música de YouTube o Spotify no es un archivo del servicio de medios y no se juzga aquí (pregunta abierta).
- **Vista previa del administrador** (`apps/universal/src/admin/reports.tsx`, ruta `/admin/denuncias`, pestaña «Denuncias» del grupo Revisión): cola por estado, detalle de una denuncia (el comentario de un extraño se pinta como texto, nunca como marcado), decisiones, historial y archivos ocultos de esa celebración (`GET /media/celebrations/{id}/assets`, `hidden: true`; el ADMIN gestiona todas). «Ver archivo oculto» pide `POST /media/admin/assets/{id}/preview-links`; el enlace (un solo uso, 5 min) vive solo en el estado del componente (`gcTime: 0`, nunca una consulta con caché), se muestra como `<img>`/`<audio>` y cada nueva petición es otro enlace. Si el navegador no logra abrirlo (usado, vencido) lo dice y ofrece pedir otro. 409 `ASSET_NOT_QUARANTINED`/`ASSET_NOT_HIDDEN`, 403, 404 y red tienen su texto.
- **Mock de contrato:** `PublicPageStatus` ya trae `moderation` (anulable) en 1.8.0; el mock de `@rsvp/testing` y su prueba lo reflejan (la prueba `visual-mock` fallaba en la rama sin ese campo).
- **i18n:** `moderation.*` en es-BO y en-US (tuteo), más `admin.nav.reports`.

## Lo que NO entra (preguntas para Pablo en el PR)

- Pantalla «Moderación» del anfitrión (qué se ocultó, motivo, guía y apelación única): el correo de BE #143 la menciona; no se construyó. Los contratos ya la permiten (`GET /celebrations/{id}/moderation`, `POST …/takedowns/{id}/appeal`).
- Resolver, descartar, restaurar y decidir apelaciones desde la pantalla del administrador (`/resolution`, `/restoration`, `/appeal-decision`): hoy solo se leen y se mira lo oculto.
- Historial de `GET /media/admin/assets/{id}/preview-audit`: el hook no se usa todavía; el detalle de la denuncia sí muestra la auditoría de Celebration.

## Evidencia (Linux, Chrome real, 2026-11-27)

Ver el cuerpo del PR para comandos y salidas. Capturas en `docs/progress/evidence/plantillas-f7/` (Chromium de Linux contra el fixture del sitio y contra respuestas de prueba; nunca línea base). **Nivel: `TESTED`**, no `VERIFIED`: no hubo backend real, ni TEST (inalcanzable desde el sandbox), ni iOS/Android.

## Límites declarados

- El POST de la denuncia, las respuestas de moderación de Celebration y el enlace de vista previa los responde la prueba, no el backend real de BE #167: no se probó el corte inmediato contra el gateway con este FE.
- El navegador solo entrega `Retry-After` a la página si el gateway lo expone entre orígenes (`Access-Control-Expose-Headers`). Si no lo expone, el invitado ve «inténtalo más tarde» en lugar de los minutos. A confirmar con backend.
- La app nativa muestra la imagen con `Image` y la música con un botón que abre el enlace (consume el enlace de un solo uso en el navegador); no se ejecutó en iOS ni Android. En web son `<img>` y `<audio>` reales.
- CSP/`img-src` de la app universal en producción no se revisó para el origen público de medios y el redireccionamiento de 30 s al almacenamiento.
- gitleaks no está instalado en el sandbox: el escaneo de secretos queda como bloqueo externo.
- Líneas base Playwright (macOS) intactas: ninguna cambia ni se regeneró; `screens.ts` del universal no incluye la pantalla nueva.

## Corrección de la ronda 1 (2026-11-27)

### Qué cambió

- **PL-155-1.** `useHiddenAssetPreview` declara `retry: false` (antes dependía del valor por defecto). Pruebas nuevas: un solo POST tras un 500 y tras red caída con un `QueryClient` que reintenta mutaciones (`retry: 2`), y al desmontar no queda la mutación en caché ni el enlace en ninguna consulta. La prueba que decía «no guarda nada en caché» sin afirmarlo se reemplazó.
- **PL-155-4.** La aserción anulada con `.catch` ahora afirma el foco inicial en «Motivo».
- **PL-155-V1.** La región `role="status"` está montada antes de tener texto; el título de la confirmación toma el foco; mientras envía, el botón usa `aria-disabled` (no `disabled`, que suelta el foco) y un `ref` impide el doble envío. Además, el formulario se limpia al cerrar: antes, en la segunda denuncia, `showModal()` enfocaba la confirmación anterior y el foco acababa en `body`.
- **PL-155-V2.** Abrir una denuncia enfoca su encabezado (presente desde la carga); volver enfoca el botón que la abrió (o la introducción si una relectura de la cola ya no la trae); pedir el enlace no deshabilita el botón. `move-focus.ts` (web) y `move-focus.native.ts` (VoiceOver/TalkBack, sin ejecutar). `Button` de `@rsvp/ui` expone `buttonRef`.
- **PL-155-V3 / PL-155-6.** El tipo de elemento y el estado de la celebración se muestran en palabras (es-BO y en-US); el id queda como «Referencia interna».
- **Hallazgo nuevo (corrector).** BE #167 (`bf93c097`) escribe `CONTENT_RESTORED` en el historial (migración `0009`, `appeals.ts`, y `e2e/gateway/reports-live.mjs` lo exige), pero el enum `ModerationAuditEntry.action` de su OpenAPI 1.8.0 no lo lista: la pantalla habría pintado la clave i18n. El FE lo traduce y una acción desconocida se muestra como «Otra acción». **Falta en BE:** añadir `CONTENT_RESTORED` al enum y volver a vendorizar.
- **PL-155-5.** Si la cola devuelve 100 filas (el máximo del contrato), la pantalla avisa de que puede haber más nuevas. No hay paginación ni filtro: es una pregunta abierta para Pablo.
- **PL-155-V5 (parcial).** El parámetro `{{slug}}` de `moderation.admin.row` ahora es `{{target}}`. El texto «no guardamos tu dirección» no se tocó: su redacción es pregunta para Pablo.
- **PL-155-V6.** El contador baja completo a su propia línea cuando no cabe.
- **PL-155-7.** `playwright.states.config.ts` vuelve a ser solo `HOST` y el administrador tiene `playwright.admin-states.config.ts` (base común en `playwright.states.shared.ts`). `admin-reports-denied.spec.ts` prueba en Chrome que un HOST es rechazado.

### No cambiado

- **PL-155-V4** (bloquear el desplazamiento del fondo): forma parte de la pregunta 2 de la ronda 1 (b) para Pablo; no se decidió. **PL-155-V7:** observación sin cambio pedido.
- **PL-155-2 (depende de BE, no se modificó).** `infra/kong/kong.yml:357`, tanto en `bf93c097` como en la rama oficial del backend: `exposed_headers` no incluye `Retry-After`. Con sitio y gateway en orígenes distintos, `ApiError.retryAfterSeconds` queda vacío y el invitado ve «más tarde». Haría falta: añadir `"Retry-After"` a esa lista y, en `e2e/gateway/kong-live.mjs` (o `reports-live.mjs`), provocar el 429 con un `Origin` cruzado y afirmar `Access-Control-Expose-Headers`. El FE ya lee el encabezado. Autorizarlo o aceptar el texto genérico es pregunta para Pablo. El e2e del 429 añade ese encabezado en su respuesta falsa, así que no acredita el gateway.
- **PL-155-8 (info):** el HTML público se cachea 60 s; el audio oculto ya responde 404 en el origen.
- **PL-155-9 (info):** sigue sin recorrido contra backend real; no fusionar antes de fusionar BE #167, volver a vendorizar y recorrer el gateway. `PL-142-R4` y el hallazgo del enum siguen sin registrar en `bugs/catalogo`.

### CI (`affected` sobre `3bbd6d8a`, PL-155-3)

Log real (run 45966000508, job 140394712889): único fallo `@rsvp/design-editor#test:coverage`, `canvas-ui.test.tsx > inspector and palette > edits the selected element numerically…`, 5398 ms, `Test timed out in 5000ms`. El PR no toca `packages/design-editor` (entra en `--affected` por `celebration-theme`). Es el patrón del issue FE #140. FE #144 (abierto, checks en verde) baja turbo a `--concurrency=2` y quita la doble pasada, que reduce la contención; **no parte este caso concreto**, así que no está demostrado que lo elimine. No se subió ningún timeout.

### Salidas de la verificación (2026-11-27, macOS, Node 24.18.1, yarn 4.10.3, Google Chrome de `/Applications`)

Sobre el árbol de `6b4a0bff` (corrección `3872ee34` más la oficial `470144bf`); después solo cambió este documento.

```
yarn lint --force                          exit=0  turbo 19/19, 0 en caché (antes, eslint . --max-warnings 0)
yarn typecheck --force                     exit=0  turbo 19/19, 0 en caché
yarn harness:validate                      exit=0  28 carriles, 61 skills
node --test scripts/test-filters.test.mjs  exit=0  5/5
contracts check:generated y check:source   exit=0  8 contratos, ref bf93c097441c
query-hooks        16 archivos, 174/174
i18n                3 archivos, 15/15
ui                 20 archivos, 333/333
celebration-theme  18 archivos, 3023/3023
seo-web            26 archivos, 227/227
universal          62 archivos, 759/759
contracts           1 archivo, 6/6
testing            exit=0
playwright.states.config.ts (universal, sesión HOST)        2 passed (rechazo a HOST y preview-states)
playwright.admin-states.config.ts (universal, sesión ADMIN) 13 passed
seo-web playwright.config.ts plantillas-f7-denuncia.spec.ts 23 passed (next build + start, fixture)
```

- La primera ejecución de `playwright.states.config.ts` falló (1 de 2): la prueba esperaba «Acceso denegado…», pero al HOST lo corta antes `RouteGuard` con «Esta sección es de otra cuenta». Se corrigió la aserción; la tabla de arriba es la ejecución posterior.
- `lint` y `typecheck` ejecutados justo después de las pruebas en navegador fallaron en `src/push/lifecycle.tsx` (archivo igual al de la oficial): `expo start` deja en `apps/universal/.expo/types` las rutas tipadas, ignoradas por git. Sin esa carpeta pasan 19/19. Queda como deuda ajena a este PR: con rutas tipadas generadas, ese `router.push(route)` no compila.
- Mutaciones de PL-155-1, repetidas y revertidas: `retry: 2` hace fallar 3 de 25 pruebas de `moderation` (las dos de «un solo POST» y la del 409/403); `gcTime: 600000` hace fallar 1 de 25 (la de caché).
- No se ejecutó `coverage` ni nada con Docker. Sigue sin recorrido contra backend real: nivel `TESTED`.

## Sincronización con la oficial `0fdd74f6`, re-vendorizado y cierre de N1/N2 (2026-11-27, Linux, Node 22.23.5)

- **Merge (no rebase)** de `chore/deploy-contabo-coolify` (`0fdd74f6`; la base anterior era `6a2b8a7f`). Conflictos solo en `packages/contracts/backend.lock.json` y `src/generated/index.ts` (la oficial trae `c3158a49`, Celebration 1.5.0); resueltos regenerando, no a mano.
- **Contratos (PROVISIONAL).** `backend.lock.json` apuntaba a `bf93c097`, anterior a la cabeza actual de BE #167 (`9e97de01`, Template/Media 1.9.1: `HEAD` del enlace de vista previa responde 405 y `variant` inválido responde 400; incluye además la oficial del BE con Gift 1.14.0 y Provider 3.4.0, idénticos a los que ya traía la oficial del FE). Re-vendorizado con `RSVP_BACKEND_REPO=/home/user/RSVPBackend node scripts/generate.mjs --ref 9e97de01103fe11ad24f3298faed83e254fd8e58`: cambia solo `specs/template-media.openapi.json`, `src/generated/template-media.ts`, `index.ts` y el lock. Hay que volver a vendorizar desde la oficial al fusionar BE #167.
- **N1 (baja, corregido).** `report-invitation.tsx`: un contador de intento (`attempt`) se incrementa al cerrarse el diálogo (también si el navegador fuerza `close`) y libera el cerrojo `inFlight`; una respuesta (éxito o error) de un intento ya cerrado se ignora. Pruebas nuevas (3): `close` durante el envío con respuesta tardía (éxito y error) y reapertura antes de la respuesta con envío nuevo. Sin el arreglo fallan las 3.
- **N2 (baja, corregido).** `reports.tsx`: «Reintentar» de los archivos ocultos y del detalle se desmonta al volver a pedir; ahora entrega el foco al encabezado de su sección antes de `refetch`. Pruebas nuevas (2); sin el arreglo fallan las 2.
- **N3 (info, declarado, sin cambio).** `returnTo` se borra al enfocar la fila: si una relectura de la cola aún en curso quita la fila después, el foco se pierde. No reproducido; fuera de alcance de esta ronda.
- **N4 (info, declarado, sin cambio).** Exponer `aria-disabled`/`aria-busy` mientras se pide el enlace exige cambiar `Button` de `@rsvp/ui` (su estado `loading` deshabilita el botón y suelta el foco): no es trivial y afecta a todo el producto. El nombre accesible sí cambia («Pidiendo el enlace…») y el doble envío está impedido por `useSingleMutation`.
- **PL-155-2 (BE, no tocado).** `Retry-After` no está en `exposed_headers` de Kong; sin el cambio, entre orígenes distintos el invitado ve siempre «más tarde». Lo resuelve BE, no este PR.
- **Pendiente de BE.** El enum `ModerationAuditEntry.action` de `9e97de01` sigue sin `CONTENT_RESTORED`; el FE lo traduce y una acción desconocida cae en «Otra acción».

### Efecto visible para el video demo
Invitación pública con «Denunciar esta invitación» en el pie (y «Denunciar la música» cuando suena el MP3 propio) y, una vez que moderación oculta la música, la invitación **sin reproductor de música** y sin hueco: la historia es 192 px más corta, con el botón de regalos y «Confirmar asistencia» intactos. Del lado ADMIN: `/admin/denuncias` con la cola, el detalle y «Ver archivo oculto» (enlace de un solo uso).

### Verificación sobre el árbol fusionado (Linux, Node 22.23.5, Chrome `/usr/bin/google-chrome`)
```
RSVP_BACKEND_REPO=/home/user/RSVPBackend  contracts check:generated -> exit 0 (8 contratos, template-media 1.9.1)
RSVP_BACKEND_REPO=/home/user/RSVPBackend  contracts check:source    -> exit 0 (ref 9e97de01103f)
tsc --noEmit: universal, seo-web, query-hooks, contracts, celebration-theme  -> exit 0 (5 de 5)
vitest (--maxWorkers=3): universal 62 archivos 783/783 · seo-web 26 archivos 231/231 (report-invitation 20/20) · query-hooks 16 archivos 187/187
                         celebration-theme 18 archivos 3024/3024 · contracts 6/6 · i18n 16/16 · ui 20 archivos 333/333
eslint . --max-warnings 0 -> exit 0 · validate-harness -> 28 carriles, 61 skills
e2e seo-web  plantillas-f7-denuncia.spec.ts (fixture + next build + next start)      -> 23 passed (1,2 min)
e2e universal playwright.states.config.ts (HOST, mock de contratos)                  -> 2 passed
e2e universal playwright.admin-states.config.ts (ADMIN, mock de contratos)           -> 13 passed
```
Mutación N1 (se vuelve al componente anterior): fallan las 3 pruebas nuevas de `report-invitation`. Mutación N2 (se vuelve a `reports.tsx` anterior): fallan las 2 nuevas de `admin-reports` (36/36 con el arreglo).

**No probado:** gateway real, backend real ni TEST (las respuestas de moderación y el 429 son del fixture/mock; `Retry-After` entre orígenes no se prueba); iOS, Android, Safari y Firefox; gitleaks (binario no disponible en esta máquina); coverage y Docker; el foco con un lector de pantalla real.

## Integración nube 3 (2026-11-28)
- Orden: oficial `b04345d2` → FE #143 (`2a69afda`) → FE #145 (`9ec63569`) → este PR (un solo merge de #145, que ya contiene a los otros dos). Conflictos: `render.tsx` (se conservan `ownMusicGone` de este PR y `animationOf`/`Doors` de #145), `query-hooks/celebration/types.ts` (comentario de `HIDDEN` de este PR) y los contratos (regenerados).
- Contratos re-vendorizados contra BE `f5076715` (#167 integrado sobre #164, #163, #159 y la oficial 0902b70b): celebration 1.8.0, template-media 1.9.1, provider-catalog 3.7.0, gift-list 1.15.0. Sustituye al pin provisional 9e97de01. `check:generated` OK; `check:source` NO ejecutado. Re-vendorizar con el SHA real cuando BE #167 se fusione.
- `yarn typecheck` 19/19; `yarn lint:code` 0; vitest: celebration-theme 3365, universal 889, query-hooks 235, seo-web 244, design-editor 483, ui 333, auth 89 (1 saltado heredado), forms 65, design-tokens 92, api-client 17, ui-web 15, contracts 6, telemetry 8 (turbo, concurrencia 2, 33/33 tareas).
- Chrome real (chromium 1243), `--trace off`: seo-web denuncia 23; universal HOST 2 y ADMIN 13 (con `EXPO_OFFLINE=1`, mock de contratos); seo-web sobre la fusión: f6 medios+libre 40, fidelidad 78, portadas-existentes 120, extra 217, sobrio 171, f6 ataques 414.
- NO probado: backend real, gateway/Kong (`Retry-After` entre orígenes), RabbitMQ, MinIO, Docker, iOS/Android, Safari/Firefox, lector de pantalla, gitleaks (sin binario). `CONTENT_RESTORED` y `Retry-After` en Kong siguen siendo requisitos del BE.
