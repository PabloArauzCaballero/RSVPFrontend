# F23 · Primer regalo de tienda · 2026-11-13

**Alcance.** Regresión de `REQ-F23-03` y comprobación de estado de `REQ-F23-04`. El anfitrión agrega el primer regalo externo desde «De una tienda» y lo ve en «Mi lista».

**Referencias del frontend verificadas.**
- Base de integración: `origin/dev` en `3cb5e2dfd05e389d838a0d8d254e79efd9ccb50a`.
- Rama de despliegue en Contabo/Coolify (`docs/runbooks/deploy-contabo-coolify.md`): `origin/chore/deploy-contabo-coolify` en `a7f2f378a88754c96c3201d0844fe6d1c4edb284` (`https://rsvp.161.97.85.216.sslip.io` y `https://rsvp-web.161.97.85.216.sslip.io` apuntando a `https://rsvp-api.161.97.85.216.sslip.io`).
- El parche `RSVP_FRONT_F23_PRIMER_REGALO_TIENDA.patch` (SHA-256 `fa4dee36db55cf6623fd8a43efb93ac1a8d2ae1b4d79fac5d695b8bd5e370cae`) pasó `git apply --check` con salida `0` sobre ambas referencias y se aplicó en la rama `fix/f23-primer-regalo-tienda` desde `origin/dev`.

**Causa raíz.** En frontend `3cb5e2d`, el formulario enviaba directamente `POST /gifts/celebrations/{id}/items` con `source: EXTERNAL`. Gift exige que la celebración tenga una lista y devuelve `404 GIFT_LIST_NOT_FOUND` antes de escribir el ítem. El mapeo genérico del frontend mostraba el aviso de acceso a la celebración. El informe de Antigravity registra ese `404` vía Kong en TEST y un `201` al crear el ítem después de crear la lista.

**Cambio.** El alta externa crea la lista si recibe ese código exacto y vuelve a enviar el ítem una vez. Si otra solicitud creó la lista primero, se acepta el `409 GIFT_LIST_EXISTS` del endpoint de creación y se continúa con el alta. La lectura de «Mi lista» usa ese mismo código exacto para el estado vacío. Un `404 NOT_FOUND` conserva el aviso de acceso y los datos del formulario.

| Comando o comprobación | Salida | Resultado |
| --- | ---: | --- |
| `git apply --check` y `git diff --check` | 0 | Parche limpio en `origin/dev` (`3cb5e2d`) y `origin/chore/deploy-contabo-coolify` (`a7f2f37`) |
| `corepack yarn workspace @rsvp/universal test test/gifts-portal.test.tsx` | 0 | 38/38 pruebas en `gifts-portal.test.tsx` |
| `corepack yarn workspace @rsvp/universal test` | 0 | 28 archivos, 364/364 pruebas, incluidos alta inicial, lista creada en paralelo, error de acceso y reenvío acotado |
| `corepack yarn workspace @rsvp/query-hooks test` y `corepack yarn workspace @rsvp/api-client test` | 0 | 83/83 y 11/11 |
| `corepack yarn workspace <paquete> typecheck` para `@rsvp/universal`, `@rsvp/query-hooks` y `@rsvp/i18n` | 0 | Tipos verificados |
| `corepack yarn lint:code` (`eslint . --max-warnings 0`) y Gitleaks sobre `origin/dev..HEAD` | 0 | Sin advertencias ni secretos |
| `corepack yarn harness:validate` y `corepack yarn workspace @rsvp/contracts check:generated` | 0 | 28 carriles, 61 skills y 8 contratos del snapshot del repo verificados |
| `corepack yarn workspace @rsvp/universal build` y `corepack yarn workspace @rsvp/seo-web build` | 0 | Exportación web de `@rsvp/universal` (`web-build`) y compilación de `@rsvp/seo-web` completadas |
| `corepack yarn turbo run typecheck --affected` y `corepack yarn turbo run lint --affected` | 0 | 14/14 paquetes afectados en verde |
| `corepack yarn verify` (Windows 11 / Node 22.14.0) | 1 | Todos los paquetes afectados por F23 (`@rsvp/universal`, `@rsvp/query-hooks`, `@rsvp/i18n`, `@rsvp/ui`, `@rsvp/ui-web`) pasan; en Windows/ICU falla la aserción de espacio regular `7:00 p. m.` vs `7:00 p.\u00a0m.` en `@rsvp/celebration-theme` y `@rsvp/seo-web` |
| Recorrido E2E con Playwright y Google Chrome real contra Kong de TEST (`https://rsvp-api.161.97.85.216.sslip.io`) | 0 | Flujos de primer y segundo regalo de tienda, cuenta sin acceso y matriz 12/12 (`360`/`768`/`1280` px × `light`/`dark` × `es-BO`/`en-US`) con `0` violaciones críticas o serias de `axe` |

## Evidencia del navegador contra el gateway de TEST (`https://rsvp-api.161.97.85.216.sslip.io`)

Se construyó `@rsvp/universal` con `EXPO_PUBLIC_API_URL=https://rsvp-api.161.97.85.216.sslip.io` y se sirvió en `http://localhost:8081` (origen permitido por CORS en Kong de TEST), ejecutando Playwright con Google Chrome real contra Identity, Celebration y Gift reales en TEST:

1. **Celebración nueva creada desde la UI sin lista previa (`44e44436-3267-4bb6-ba17-d617ce223169`, `externalMode: "RESTRICTED"`, `partnerPriorityEnabled: false`):**
   - Al abrir `/regalos?c=44e44436-3267-4bb6-ba17-d617ce223169`, `GET /gifts/celebrations/44e44436-3267-4bb6-ba17-d617ce223169/items` devolvió `404 GIFT_LIST_NOT_FOUND` (`X-Correlation-ID: 0b2cf6ea-fddd-4c90-9197-1416fdfb1855`) y «Mi lista» mostró el estado vacío sin error.
   - En **Regalos → Agregar regalo → De una tienda**, al guardar el primer regalo (`Cafetera expreso`, `https://tienda.example/cafetera-expreso`, `850` BOB):

   | Orden | Método y ruta | HTTP y código | `X-Correlation-ID` |
   | ---: | --- | --- | --- |
   | 1 | `POST /gifts/celebrations/44e44436-3267-4bb6-ba17-d617ce223169/items` | `404 GIFT_LIST_NOT_FOUND` | `63e1e812-4a06-4f4c-9e97-97f0431c2f18` |
   | 2 | `POST /gifts/celebrations/44e44436-3267-4bb6-ba17-d617ce223169/gift-list` | `201` | `0f9a0f93-233f-4159-ba2a-c62221753fd2` |
   | 3 | `POST /gifts/celebrations/44e44436-3267-4bb6-ba17-d617ce223169/items` | `201` (`status: "PROPOSED"`) | `cc473d21-0f67-4503-950d-49cf42253387` |
   | 4 | `GET /gifts/celebrations/44e44436-3267-4bb6-ba17-d617ce223169/items` | `200` (1 regalo visible en «Mi lista») | `7c7f1a35-8f62-45d2-9c8c-1371363508c3` |

2. **Segundo regalo de tienda en la misma celebración (`44e44436-3267-4bb6-ba17-d617ce223169`):**
   - Al guardar `Juego de vasos` (`https://tienda.example/juego-vasos`, `240` BOB), se envió un único `POST /gifts/celebrations/44e44436-3267-4bb6-ba17-d617ce223169/items` que devolvió `201` (`status: "PROPOSED"`, `X-Correlation-ID: 5eb832cd-0dd0-47ba-8efa-c122c8139c60`), sin invocar `POST /gift-list`.
   - `GET /gifts/celebrations/44e44436-3267-4bb6-ba17-d617ce223169/items` devolvió `200` (`X-Correlation-ID: 114879a4-7515-4985-9d07-1b142afa8db9`) y «Mi lista» mostró ambos regalos (`Cafetera expreso` y `Juego de vasos`, `REGALOS 2`).

3. **Cuenta sin acceso a la celebración (`44e44436-3267-4bb6-ba17-d617ce223169`):**
   - Al navegar directamente con otra cuenta anfitriona, `GET /celebrations/44e44436-3267-4bb6-ba17-d617ce223169` devolvió `404 NOT_FOUND` (`X-Correlation-ID: 601980b1-d977-46a2-b610-392978d39f4c`) y la interfaz mostró «No encontramos esta celebración o no tienes acceso a ella.» sin exponer regalos.
   - Contra los endpoints de Gift directamente: `GET /gifts/celebrations/44e44436-3267-4bb6-ba17-d617ce223169/items` devolvió `404 NOT_FOUND` (`X-Correlation-ID: 15b79f8b-4a3f-4cf5-8d6a-66efbe531ab7`) y «Mi lista» mostró el aviso de error de acceso con botón «Reintentar» (no el estado vacío); `POST /gifts/celebrations/44e44436-3267-4bb6-ba17-d617ce223169/items` devolvió `404 NOT_FOUND` (`X-Correlation-ID: eee1aad4-0859-48dc-81de-cf62cfcbf40d`) en un solo POST (sin llamar a `POST /gift-list`), mostró el aviso de acceso y conservó los valores ingresados en el formulario (`Lámpara de mesa`, `https://tienda.example/lampara`, `310`).

4. **Celebración con `partnerPriorityEnabled: true` en Celebration (`d3ec5237-6b37-4528-8f42-690a7538fd40`):**
   - Al guardar `Tostadora inox` (`https://tienda.example/tostadora`, `420` BOB) en «De una tienda», la secuencia observada fue `POST /items` → `404 GIFT_LIST_NOT_FOUND` (`X-Correlation-ID: 7830af07-451f-47bb-8e1d-77cd966faadc`), `POST /gift-list` → `201` (`X-Correlation-ID: a4795325-a01a-4b2c-810f-fa34ec33e904`) y `POST /items` → `201` (`status: "PROPOSED"`, `X-Correlation-ID: bed6f43c-0d9b-4d11-a1a9-b81d36c6c502`). Como `createList` envía `POST /gift-list` sin cuerpo, Gift inicializa `gift_lists.partner_priority_enabled = false`; el caso en que Gift responde `409 PARTNER_CATALOG_FIRST` tras crear la lista y reenvía con `confirmAfterAlternatives: true` está cubierto en `apps/universal/test/gifts-portal.test.tsx`.

5. **Matriz responsive, tema, idioma y accesibilidad (`axe`):**
   - Se verificaron las 12 combinaciones (`360`, `768` y `1280` px × `light`/`dark` × `es-BO`/`en-US`) en la pantalla «De una tienda» tras el alta, con `0` violaciones críticas o serias de `axe`.

**Estado de evidencia.** `TESTED` en navegador real (Google Chrome + Playwright) contra Kong y servicios reales de TEST (`https://rsvp-api.161.97.85.216.sslip.io`). Pendiente revisión humana del PR hacia `dev` y actualización de la rama de despliegue `chore/deploy-contabo-coolify` en Coolify.

**Reversión.** Revertir el cambio del frontend mediante PR y reconstruir la aplicación si ya se desplegó. Las listas y regalos creados usan los endpoints y datos existentes de Gift.

## Promoción a la rama de Coolify · 2026-11-13

Base de despliegue `a7f2f37`. Se incorporó el squash de [#21](https://github.com/PabloArauzCaballero/RSVPFrontend/pull/21), `a392529`, mediante cherry-pick. El código de producción coincide con el de `dev` para los seis archivos del arreglo. La prueba de integración de regalos conserva los casos de agenda que ya tenía la rama de despliegue.

| Verificación de la rama candidata | Resultado |
| --- | --- |
| `corepack yarn install --immutable`, `corepack yarn lint`, `corepack yarn typecheck`, `corepack yarn harness:validate`, `corepack yarn workspace @rsvp/contracts check:generated`, `git diff --check` y Gitleaks sobre el diff | Salida 0. Tipos y lint en 18 workspaces, 8 contratos vendorizados y cero hallazgos de secretos. |
| `corepack yarn test`; `corepack yarn workspace @rsvp/universal test test/gifts-portal.test.tsx`; `corepack yarn workspace @rsvp/universal test:coverage --maxWorkers 2` | Salida 0. Suite general 30/30 tareas al repetirla, 38 pruebas dirigidas y 370 pruebas de la app con cobertura de líneas de 90,34 %. La primera ejecución concurrente dio fallos intermitentes en pruebas de invitados y proveedor. |
| `corepack yarn workspace @rsvp/universal build` y `corepack yarn workspace @rsvp/seo-web build` | Salida 0. Se inspeccionó el bundle de Expo `entry-af1dea7afb0bfcb2517358cfbe9bb0cc.js` con el entorno de TEST. |
| Chromium y Playwright con Kong de TEST | Salida 0. Se sirvieron los archivos de la versión publicada y de la candidata en el navegador bajo el mismo origen. Las peticiones de la app se reenviaron al gateway real por HTTPS. El bundle publicado devolvió `404 GIFT_LIST_NOT_FOUND` en el único POST y mostró el aviso de acceso. La candidata creó la lista y guardó el primer ítem con la secuencia `404 → 201 → 201 PROPOSED`. El segundo se guardó con un solo POST y los dos aparecieron en «Mi lista» con `GET 200`. Una celebración inexistente conservó el aviso de acceso. |
| Accesibilidad web del formulario | 12 de 12 combinaciones con 360, 768 y 1280 px, tema claro y oscuro, español e inglés y movimiento reducido. Sin desborde horizontal ni hallazgos serios o críticos de axe. |

La prueba usó una cuenta sintética y una celebración de prueba sin publicar, archivada al finalizar. Pendiente incorporar esta rama y verificar el bundle servido por Coolify tras la compilación. Reversión mediante PR y reconstrucción de Expo web desde la referencia anterior.
