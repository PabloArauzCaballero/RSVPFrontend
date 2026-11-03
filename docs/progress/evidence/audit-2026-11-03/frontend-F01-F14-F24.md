# Auditoría Frontend F01–F14 y F24 (solo lectura)

Repo: /Users/pablo/Documents/GitHub/RSVP/RSVPFrontend. Fecha de la auditoría: 2026-11-03. Criterio: el código y las pruebas prevalecen sobre fichas y evidencias.
Estados: IMPL+PROBADO / IMPL sin prueba / PARCIAL / NO EXISTE / BLOQ-EXT (bloqueado por dependencia externa).
El % por carril = REQs en IMPL+PROBADO / 6 (criterio estricto: PARCIAL no cuenta). Las rutas de este informe son relativas al repo salvo que se indique otra cosa.

## 0. Resultados reales de ejecución (corridos hoy)

`corepack yarn workspace @rsvp/<ws> test` y `typecheck` en los 13 workspaces con scripts. Typecheck: exit 0 en los 13 (universal, seo-web, api-client, auth, celebration-theme, design-tokens, forms, i18n, query-hooks, telemetry, testing, ui, ui-web).

| Workspace | Archivos de test | Tests |
|---|---|---|
| @rsvp/universal | 2 | 26 |
| @rsvp/seo-web | 3 | 19 |
| @rsvp/celebration-theme | 3 | 28 |
| @rsvp/query-hooks | 2 | 9 |
| @rsvp/api-client | 2 | 6 |
| @rsvp/auth | 2 | 5 |
| @rsvp/i18n | 2 | 5 |
| @rsvp/ui-web | 1 | 3 |
| @rsvp/design-tokens | 1 | 2 |
| @rsvp/ui | 1 | 2 |
| @rsvp/forms | 1 | 1 |
| telemetry, testing | 0 | 0 |
| **Total** | **20** | **106 pasan, 0 fallan** |

No ejecuté `build` (expo export está documentado como colgado en `docs/progress/evidence/lane-F01/blockers.md`; `next build` escribiría en `.next` y no quise tocar los puertos 3100/8100 ni el repo), ni Lighthouse (la última corrida es de 2026-10-18, antes del rediseño de hoy). `turbo run build lint test` completo NO se verificó.

Hallazgo transversal: el script `lint` de 13 workspaces es `tsc --noEmit`. No hay ESLint real. `eslint.config.mjs` → `packages/config-eslint/base.js` solo contiene `ignores`. La regla `no-literal-strings` (`packages/config-eslint/rules/no-literal-strings.js`) existe pero no está registrada en ninguna configuración.

## 1. Resumen por carril

| Carril | IMPL+PROBADO | % | Comentario |
|---|---|---|---|
| F01 Turborepo/Expo Router | 2/6 | 33% | Sin `@rsvp/contracts`; build web universal sin verificar |
| F02 Tokens/NativeWind | 0/6 | 0% | Tokens duplicados a mano; test de frontera vacío; NativeWind sin uso |
| F03 Primitivas UI | 1/6 | 17% | Las 11 existen, pero faltan pruebas por estado y viewport; ui-web no es shadcn |
| F04 API client/hooks | 3/6 | 50% | Sin cliente generado; hooks de 4 dominios casi vacíos |
| F05 Auth/deep links | 0/6 | 0% | Login es un stub; todo en `packages/auth` está sin conectar a la app |
| F06 i18n/timezone | 4/6 | 67% | Falta preferencia persistente y lint real |
| F07 CI/EAS | 0/6 | 0% | Workflows versionados; firmas BLOQ-EXT; umbral Lighthouse dudoso |
| F08 seo-web bootstrap | 3/6 | 50% | |
| F09 Motor de temas | 6/6 | 100% | El mejor carril |
| F10 Sitio público | 5/6 | 83% | |
| F11 Alta y editor | 5/6 | 83% | |
| F12 Templates/preview/publicar | 4/6 | 67% | |
| F13 Configuración/switches | 4/6 | 67% | |
| F14 Admin | 2/6 | 33% | 6 de 11 módulos son placeholders |
| F24 Buscador proveedores | 4/6 | 67% | Con datos reales BLOQ-EXT (Provider Catalog sin HTTP) |

## 2. Detalle por REQ

### F01 · Turborepo y Expo Router

| REQ | Estado | Evidencia |
|---|---|---|
| 01 `apps/universal` corre en iOS/Android/web | PARCIAL | `apps/universal/app/_layout.tsx` (Stack + AppProviders). No hay evidencia de ejecución en dispositivos. `build` web (expo export) documentado como colgado (`docs/progress/evidence/lane-F01/blockers.md`). Los tests corren con react-native-web en vitest, no en Metro. |
| 02 `apps/seo-web` con Next App Router | IMPL+PROBADO | `apps/seo-web/app/**`, con `revalidate` y `generateMetadata`. Corrida en vivo en `docs/progress/evidence/lane-F08/audit.json` (status 200 y 404 reales). Tests en `apps/seo-web/tests/seo.test.tsx`. |
| 03 Workspaces Yarn 4 con 2 apps y 12 packages | IMPL+PROBADO | `corepack yarn workspaces list` devuelve raíz + 2 apps + 15 packages (superset: config-tailwind, ui-web y telemetry de más). |
| 04 `turbo run build lint test` verde | PARCIAL | `turbo.json` y `.github/workflows/ci.yml` existen. test y typecheck verdes hoy (106 tests). `lint` = `tsc` (no es lint). `build` de universal no verificado. |
| 05 `@rsvp/contracts` desde GitHub Packages | NO EXISTE | Ningún `package.json` depende de `@rsvp/contracts`. Solo `.npmrc` con el registry. Los tipos son escritos a mano (`packages/query-hooks/src/celebration/types.ts`; `request<T>` genérico). |
| 06 Grupos `(auth)`, `(host)`, `(provider)`, `(admin)`, `(guest)` | IMPL sin prueba | Existen los 5 directorios con `_layout.tsx` (más `(dev)`). Ningún test verifica la separación. `(auth)/login`, `(guest)/invitacion`, `(provider)/portal` y `(host)/inicio` son stubs de `Surface` de 2 líneas. |

### F02 · Tokens y NativeWind

| REQ | Estado | Evidencia |
|---|---|---|
| 01 Tokens definidos una sola vez | PARCIAL | `packages/design-tokens/src/colors.ts`, `spacing.ts` y `typography.ts` están en TS. Los mismos hex se copian a mano en `packages/design-tokens/tailwind-preset.cjs` (const `light` y `dark`) y en `apps/seo-web/app/globals.css`. Sin generación ni test de paridad. El test (`tokens.test.ts`, 2 tests) solo compara claves y 3 valores. |
| 02 Un token cambia y se refleja en 4 plataformas | NO EXISTE | No hay capturas por plataforma (solo web en `docs/progress/evidence/`). Como el preset tiene hex duplicados, cambiar `colors.ts` no llega a Tailwind. |
| 03 Modo oscuro con mismos tokens | PARCIAL | El tema oscuro existe en `colors.dark`, en `[data-theme='dark']` de `globals.css` y en celebration-theme (probado). Pero `packages/ui/src/index.tsx` usa `const palette = colors.light` fijo (sin dark en primitivas nativas). En `tailwind-preset.cjs` las clases usan `colors: light` literal, y las variables `--color-*` del bloque oscuro no las consume nadie. |
| 04 NativeWind configurado | PARCIAL | `apps/universal/babel.config.js`, `metro.config.js`, `tailwind.config.js` y `global.css` están configurados. Ningún archivo de `apps/universal/src`, `app` ni `packages/ui/src` usa `className`. Todo es `StyleSheet`. Nada prueba que las utilidades funcionen. |
| 05 Tailwind en seo-web leyendo el mismo package | IMPL sin prueba | `apps/seo-web/tailwind.config.js` usa `@rsvp/design-tokens/tailwind-preset`. En la práctica el estilo es CSS propio (`globals.css`, variables hex duplicadas). |
| 06 Frontera: seo-web no importa `packages/ui`, con test | IMPL sin prueba efectiva | `apps/seo-web/tests/no-native-ui-boundary.test.ts` tiene un bug: la regex `/\\.[jt]sx?$/` exige una barra invertida literal, así que no filtra ningún archivo y el test pasa en vacío (verificado con node). Además solo escanea `app/`, no `components/` ni `lib/`. Hoy ningún archivo importa `@rsvp/ui` (grep), pero el test no lo garantiza. |

### F03 · Primitivas UI

| REQ | Estado | Evidencia |
|---|---|---|
| 01 Las 11 primitivas con variantes | PARCIAL | `packages/ui/src/index.tsx` y `packages/ui-web/src/index.tsx` tienen Button, Input, Select, Checkbox, Card, Sheet, Modal, Toast, Table, DatePicker y FileUpload. La única variante es Button primary/secondary. DatePicker nativo es un `TextInput` con placeholder `AAAA-MM-DD`. |
| 02 Estados carga/error/vacío/deshabilitado probados | PARCIAL | Existe la prop `state` en todas. Tests: `packages/ui/src/index.test.tsx` (2 tests, 7 de 11 primitivas; sin Sheet, Modal, Toast ni Card) y `packages/ui-web/src/index.test.tsx` (3 tests). Cubren una fracción de la matriz primitiva × estado. |
| 03 Roles y etiquetas de accesibilidad | IMPL+PROBADO | RN: `accessibilityRole`/`accessibilityLabel` (ui). Web: `role="dialog"`, `aria-invalid`, `aria-busy`. Asertados en ambos tests (roles `button`, `radiogroup`, `checkbox`, `alert`, `dialog`, `table`). |
| 04 Equivalentes en `ui-web` con shadcn/ui | PARCIAL | `ui-web` está escrito a mano (clases `.rsvp-button`... definidas en el CSS de seo-web). No usa shadcn/ui. La API difiere (`onPress` vs `onClick`, `FileUpload.onSelect(file?)`). |
| 05 Catálogo navegable | IMPL sin prueba | `apps/universal/app/(dev)/catalogo.tsx` y `apps/seo-web/app/catalogo/page.tsx` (`ComponentCatalog`). Ningún test; muestra pocos estados. |
| 06 Responsive 360/768/1280 | NO EXISTE | No hay prueba ni captura de primitivas a 3 anchos. |

Nota: las pantallas del anfitrión no usan `@rsvp/ui`. Usan sus propias primitivas en `apps/universal/src/host/ui.tsx` (180 líneas) con una paleta propia. `@rsvp/ui` solo se usa en los 4 stubs. Esto sobrestima el valor de F03.

### F04 · API client y hooks

| REQ | Estado | Evidencia |
|---|---|---|
| 01 Cliente generado desde `@rsvp/contracts` | NO EXISTE | `packages/api-client/src/client.ts` es un fetch genérico `request<T>`. El comentario de `types.ts` lo declara, pero no hay generador ni contracts. Un cambio de contrato no rompe la compilación. |
| 02 Interceptor con token y refresh silencioso | IMPL+PROBADO (cliente) | `packages/api-client/src/client.ts:~58` (401 → refresh único → reintento). Test en `packages/api-client/test/client.test.ts`. En la app, `createAppClient` (`apps/universal/src/platform/providers.tsx`) pasa un `refreshSession` que lanza "Session refresh belongs to lane F05". El refresh no funciona en la app real. |
| 03 `correlationId` propagado | IMPL+PROBADO | Cabecera `x-correlation-id` en `client.ts`. Test: `client.test.ts` ("propagates a correlation id"). La traza en backend no se verificó. |
| 04 Hooks por dominio | PARCIAL | Celebración/template/media: completos (`packages/query-hooks/src/celebration/*`, probados en `celebration-api.test.ts`). guest, gift, provider y notification: 1-2 hooks genéricos cada uno (`src/guest/index.ts` tiene 11 líneas), sin pruebas. |
| 05 Política de caché e invalidación | IMPL+PROBADO | `src/policy.ts`, `src/invalidation.ts`, `src/keys.ts`. Tests: `invalidation.test.ts` y "mutations invalidate..." en `celebration-api.test.ts`. |
| 06 Errores 401/403/409/422 | PARCIAL | `packages/api-client/src/errors.ts` más test de mapeo. Las pantallas tratan 409 (recarga) y 422 (`missingFieldsOf`). No hay tratamiento de 401 en la UI (el refresh lanza). |

### F05 · Auth, sesión y deep links

| REQ | Estado | Evidencia |
|---|---|---|
| 01 Login, registro, recuperación | PARCIAL / BLOQ-EXT | `packages/auth/src/identity/client.ts` (`IdentityClient`: login/register/refresh/recovery/logout). Solo recovery y logout tienen test. No hay pantalla: `apps/universal/app/(auth)/login.tsx` = 2 líneas (`Surface` con título). `BLOCKERS.md`: Identity no emite cookies ni login funcional. |
| 02 Sesión persistida segura | PARCIAL | `packages/auth/src/session/stores.ts`: `createNativeSessionStore` recibe un adaptador. `expo-secure-store` no está instalado ni conectado. `createWebSessionStore` es un no-op que devuelve null. La app usa `createAppSessionStore` (`apps/universal/src/platform/session.ts`), con token de desarrollo `EXPO_PUBLIC_DEV_ACCESS_TOKEN`. |
| 03 Guards por rol | PARCIAL | `canAccessRoute` (`packages/auth/src/guards/roles.ts`): no se usa en ninguna app y no tiene test. Los guards reales son ad hoc: `canUseHostWorkspace` (`apps/universal/src/host/gate.tsx`) e `isPlatformAdmin` (`src/admin/admin-screen.tsx`), probados en `host.test.tsx` y `admin.test.tsx`. Los grupos `(provider)`/`(guest)` no tienen guard. |
| 04 Universal/app links | BLOQ-EXT / PARCIAL | Rutas `apps/seo-web/app/.well-known/{apple-app-site-association,assetlinks.json}/route.ts` (404 sin env, correcto). `app.config.ts` condicional a `EXPO_PUBLIC_LINK_DOMAIN`. `parseMagicLink`/`verification` probados en `packages/auth/test/deep-links.test.ts`. Ninguna pantalla de la app consume un enlace entrante (`Linking`/`useURL` no aparecen). |
| 05 Repliegue a web | PARCIAL (inconsistente) | `magicLinkUrl` y el AASA usan `/rsvp/<token>`. seo-web no tiene la ruta `/rsvp/[token]` (solo `/c/[slug]/rsvp/[token]`, que además `robots.ts` bloquea con `/c/*/rsvp`). El enlace de repliegue daría 404. `RsvpForm` (`apps/seo-web/components/rsvp/rsvp-form.tsx`) no envía nada: solo muestra un aviso de "lista para enviarse". |
| 06 Cierre de sesión limpio | IMPL sin prueba | `SessionManager.logout` (`packages/auth/src/session/session-manager.ts`) borra y revoca. Sin test de la clase y sin uso en la UI. |

### F06 · i18n, formatos y timezone

| REQ | Estado | Evidencia |
|---|---|---|
| 01 i18next en RN y Next | IMPL+PROBADO | `packages/i18n/src/index.ts` (React) y `src/server.ts` (RSC). Usado en `apps/universal/src/platform/providers.tsx` y en seo-web. Test: `test/resources.test.ts` ("synchronous translator"). |
| 02 `es-BO` y `en-US` completos | IMPL+PROBADO | `packages/i18n/test/resources.test.ts`: mismas claves, ninguna vacía (ahora incluye `landing`). Cobertura de catálogo solamente; los textos de `@rsvp/ui` y de los formularios RSVP están fijos en español (fuera del catálogo). |
| 03 Intl para fechas/números/moneda | IMPL+PROBADO | `packages/i18n/src/format/*.ts` más `packages/celebration-theme/src/format.ts` (duplica formatters). Test: `test/format.test.ts`. |
| 04 Horas en la timezone de la celebración | IMPL+PROBADO | `formatCelebrationTime` y `celebration-theme/src/format.ts`. Tests: `renderer.test.tsx` ("REQ-F10-05": 7:00 p. m. La Paz, también en en-US), `format.test.ts`, `seo.test.tsx`. Corrida en vivo con navegador en Madrid (`scripts/audit.mjs`, `timezoneId: Europe/Madrid`). |
| 05 Detección con preferencia explícita | PARCIAL | `resolveLocale(explicit, system)` probado (el explícito gana). seo-web: `?lang=` (`lib/locale.ts`). En universal solo `deviceLocale()`; no hay selector ni persistencia de la preferencia del usuario (`AppProviders` recibe `locale` solo por prop). |
| 06 Test que detecta cadenas fuera de i18n | PARCIAL | Dos tests por regex sobre JSX: `apps/seo-web/tests/i18n-boundary.test.ts` (lista fija de archivos) y "no hand-written copy" en `apps/universal/test/admin.test.tsx` (solo `src/host` y `src/admin`). No hay lint: la regla de ESLint existe pero no está habilitada. No cubren `packages/ui`, RSVP ni `components/landing.tsx`. |

### F07 · CI, EAS y pipelines

| REQ | Estado | Evidencia |
|---|---|---|
| 01 `turbo --affected` | IMPL sin prueba | `.github/workflows/ci.yml` (`yarn turbo run build lint typecheck test --affected`). No hay evidencia de una corrida en CI. |
| 02 Tests, lint y typecheck bloqueantes | PARCIAL | ci.yml ejecuta los tres. "lint" es `tsc`. Que el fallo bloquee el merge depende de branch protection, no verificable desde el repo. |
| 03 EAS Build firmado | BLOQ-EXT | `.github/workflows/eas-build.yml` y `eas.json` existen. Sin `EXPO_TOKEN`/credenciales (`docs/progress/evidence/lane-F07/blockers.md`). |
| 04 TestFlight / Internal Testing | BLOQ-EXT | `eas.json` `submit` con `${EXPO_ASC_APP_ID}`; sin cuentas. |
| 05 EAS Update | PARCIAL / BLOQ-EXT | `app.config.ts` (`runtimeVersion`, `updates.url` condicional al projectId) y `docs/runbooks/releases.md` (comando `eas update`). No hay workflow ni projectId. |
| 06 Lighthouse CI sobre rutas indexables, umbral 95 | PARCIAL | `.github/workflows/lighthouse.yml` mide solo `http://localhost:3000` (la home, sin backend). Pasa `.lighthouserc.json` como `budgetPath`. Ese parámetro de `treosh/lighthouse-ci-action` espera un `budget.json`, no un archivo `ci.assert`, así que el umbral 0.95 probablemente no se aplica (a verificar en una corrida real). Las 3 rutas de F24 y las de F10 solo se miden con `apps/seo-web/scripts/audit.mjs`, a mano. |

### F08 · seo-web bootstrap

| REQ | Estado | Evidencia |
|---|---|---|
| 01 App Router con SSR/ISR | IMPL+PROBADO | `apps/seo-web/app/page.tsx` (`revalidate`), `lib/api.ts` (data cache de 60 s), `app/c/[slug]/page.tsx` (dinámica). Corrida en vivo en `docs/progress/evidence/lane-F08/audit.json`. |
| 02 Metadatos dinámicos | IMPL+PROBADO | `lib/metadata.ts` y `generateMetadata`. Test: `seo.test.tsx` ("REQ-F08-02/03"). |
| 03 Open Graph para WhatsApp | IMPL+PROBADO | `celebrationMetadata` (openGraph/twitter), `htmlLimitedBots: /.*/` en `next.config.js`. Test unitario; la vista previa real en WhatsApp no se probó. |
| 04 JSON-LD | PARCIAL | `Event`: `lib/json-ld.ts` más test (offset -04:00). `LocalBusiness`: helper `localBusinessJsonLd` sin uso ni test en ninguna página (pertenece a F25). |
| 05 sitemap.xml y robots.txt | IMPL, prueba parcial | `app/sitemap.ts` (home, `/proveedores`, categorías y celebraciones publicadas), `app/robots.ts` (probado en seo.test.tsx). El sitemap no tiene test y no incluye las 99 rutas categoría×ciudad (B3). |
| 06 Lighthouse SEO > 95 en CI | PARCIAL | `audit.json` (2026-10-18): SEO 1.0 en home, A1, A4, A5, B1-B3, medido a mano. Es anterior al rediseño de hoy y no se re-midió. CI solo mide la home y con umbral dudoso (ver F07-06). |

### F09 · Motor de temas

| REQ | Estado | Evidencia |
|---|---|---|
| 01 Cinco layouts | IMPL+PROBADO | `packages/celebration-theme/src/layouts/index.ts`. Test: `renderer.test.tsx` (it.each × 5, snapshots light/dark en `__snapshots__/renderer.test.tsx.snap`) y `index.test.ts`. "Snapshot visual" = snapshot de HTML, no de píxeles. |
| 02 Tema desde Template/Media | IMPL+PROBADO | `theme.ts` `themeFromTemplate`. Test `index.test.ts` "REQ-F09-02" y datos degradados. |
| 03 `CelebrationRenderer` único | IMPL+PROBADO | `renderer.tsx`; secciones en `sections/index.tsx`. |
| 04 Variables CSS web y contexto RN | IMPL+PROBADO (web y RNW) | `themeVariables` (`theme.ts`), `native.tsx` más `theme-context.tsx`. Tests: `index.test.ts` y `native.test.tsx` (react-native-web). No se corrió en iOS/Android. |
| 05 Template nuevo sin desplegar | IMPL+PROBADO | `renderer.test.tsx` ("REQ-F09-05"). Se carga de `/media/templates/{id}` (`apps/seo-web/lib/celebration.ts`). |
| 06 Templates compatibles por tipo | IMPL+PROBADO | `compatibleTemplates` y `index.test.ts` "REQ-F09-06". Uso en la UI: `useCompatibleTemplates` en `template-gallery.tsx`. |

### F10 · Sitio público

| REQ | Estado | Evidencia |
|---|---|---|
| 01 A1–A8 | IMPL+PROBADO | `app/c/[slug]/page.tsx` y `[section]/page.tsx` (con `sectionForPath`; 404 si la sección no tiene contenido). `seo.test.tsx` renderiza la portada y la sección `faq`; el resto vía `sections/index.tsx` (renderer.test). Capturas solo de A1, A4 y A5. |
| 02 A21 no publicada | IMPL+PROBADO | `app/c/[slug]/not-found.tsx` y `loadPublicPage` → null con 404. Test "A21" en `seo.test.tsx`; 404 verificado en vivo (`audit.json`). |
| 03 Responsive por snapshot 360/768/1280 | PARCIAL | Capturas en `docs/progress/evidence/lane-F10/` (A1, A4, A5, A21; faltan A2, A3, A6, A7, A8) más axe y check de overflow en `scripts/audit.mjs` (manual). No son snapshots automatizados. |
| 04 Idioma del visitante con repliegue | IMPL+PROBADO | `requestedLanguage` y cabecera `accept-language` en `loadPublicPage`. Tests en `seo.test.tsx` ("REQ-F10-04", `requestedLanguage`). |
| 05 Itinerario en timezone de la celebración | IMPL+PROBADO | `renderer.test.tsx` y `seo.test.tsx` (REQ-F10-05). |
| 06 Partners vía redirector | IMPL+PROBADO | `partnerHref` → `/r/...`, `rel=sponsored`. Tests: `renderer.test.tsx` y `seo.test.tsx` (REQ-F10-06; escaneo del DOM). La ruta `/r/` no existe en seo-web; el redirector es del backend o de otro carril. |

### F11 · Onboarding y editor

| REQ | Estado | Evidencia |
|---|---|---|
| 01 C3–C5 con vista previa en vivo | IMPL+PROBADO | `apps/universal/src/host/onboarding.tsx` (3 pasos) y `template-gallery.tsx` (renderer nativo en vivo). Tests: `host.test.tsx` ("C2–C5", "REQ-F12-01/02"). Ruta: `app/(host)/onboarding/[step].tsx`. |
| 02 C7–C12 con guardado y validación | IMPL, prueba parcial | `content-editor.tsx` (6 secciones: general, anfitriones, lugares, historia, itinerario, secciones), `gallery-editor.tsx`. Tests de pantalla solo para general e historia; los helpers (`toWallClock`, `scheduleContent`) tienen test. Lugares, itinerario y secciones no tienen test de pantalla. |
| 03 C13 traducciones | IMPL+PROBADO | `translation-editor.tsx`. Test "REQ-F11-03". |
| 04 Roles del anfitrión desde el tipo de evento | IMPL+PROBADO | `onboarding.tsx` (`type.hostRoles`). Test "REQ-F11-04" (boda vs quinceañera). |
| 05 Subida prefirmada con progreso, reordenar, portada | IMPL+PROBADO | `packages/query-hooks/src/media/upload.ts` (XHR con progreso) y `gallery-editor.tsx`. Tests: `celebration-api.test.ts` ("direct upload with progress") y `host.test.tsx` (C12: archivo inválido, reorden/portada). |
| 06 409 al editar en dos pestañas | IMPL+PROBADO | If-Match más `ErrorNotice` con recarga. Test "REQ-F11-06". |

### F12 · Templates, preview, publicación

| REQ | Estado | Evidencia |
|---|---|---|
| 01 C14 solo compatibles | IMPL+PROBADO | `templates-screen.tsx`, `template-gallery.tsx`. Test "REQ-F12-01/02". |
| 02 Cambiar de template no pierde contenido | IMPL+PROBADO (por construcción) | El `PUT` envía solo `{templateId}` (test). No hay prueba de ida y vuelta "idéntica". |
| 03 C15 preview escritorio/tableta/móvil | IMPL+PROBADO | `device-preview.tsx` (`DEVICE_WIDTHS` 360/768/1280, renderer nativo a ese ancho). Test "REQ-F12-03". |
| 04 C16 checklist con campos del 422 | IMPL+PROBADO | `publish-checklist.tsx` (`taskFor`, `missingFieldsOf`). Test "REQ-F12-04". |
| 05 Publicar y despublicar con confirmación | PARCIAL | Publicar con confirmación: probado. Despublicar y archivar (`ConfirmDialog`): implementados, sin test. |
| 06 Copiar/compartir con vista previa WhatsApp | IMPL, prueba parcial | `publish-checklist.tsx` (clipboard/`Share`, tarjeta `whatsapp-card`). El test solo verifica el contenido de la tarjeta tras publicar. La copia al portapapeles no tiene test. La tarjeta es una maqueta, no el OG real. |

### F13 · Configuración y switches

| REQ | Estado | Evidencia |
|---|---|---|
| 01 C17 idiomas/zona/moneda/fecha límite | IMPL, prueba parcial | `settings-screen.tsx`. Test solo de fecha límite (REQ-F13-06); el guardado de idiomas/zona/moneda no tiene test. |
| 02 C18 cuatro switches | IMPL+PROBADO | `modes-screen.tsx` (`SWITCHES` más `partnerPriority`). Test "REQ-F13-02/03/04". |
| 03 Explica la consecuencia antes de confirmar | IMPL+PROBADO | Mismo test (el PUT no sale hasta confirmar). |
| 04 Refleja que no es retroactivo | IMPL+PROBADO | `host.modes.nonRetroactive` (texto fijo "seguirán pendientes"). No hay conteo de pendientes reales (`SwitchWithConsequence` de ui tiene `pendingCount`, pero la pantalla no lo usa). |
| 05 Solo anfitrión y planner | PARCIAL | `gate.tsx`: `HOST_ROLES = HOST, PLANNER, ADMIN`, y `!roles.length` también pasa (sin rol = anfitrión). Test solo con GUEST. ADMIN y los anónimos entran, contra la ficha. |
| 06 Fecha límite pasada avisa congelado | IMPL+PROBADO | `deadlinePassed`/`nowInZone`. Test "REQ-F13-06". |

### F14 · Admin

| REQ | Estado | Evidencia |
|---|---|---|
| 01 E1–E12 con sus operaciones | PARCIAL / BLOQ-EXT | Reales: E2 dashboard, E3 templates (`src/admin/templates.tsx`), E4 tipos de evento (`event-types.tsx`), E12 operación (`other-screens.tsx`). E7: campo de ID + botón verificar. E5, E6, E8, E9, E10, E11: `PendingModuleScreen` que solo muestra "servicio no disponible" (`other-screens.tsx:~90`). Sin pantalla E1. |
| 02 Editor de `EventTypeDefinition` | IMPL+PROBADO | `src/admin/event-types.tsx`. Tests: `admin.test.tsx` (round-trip y E2E a nivel de componente: crear GRADUACION y usarlo en el alta). |
| 03 Cola de verificación | PARCIAL | `VerificationScreen`: solo POST `/providers/{id}/verify` por ID tecleado; sin cola, sin rechazar/suspender. Sin test (solo el denegado). |
| 04 Moderación | NO EXISTE | Placeholder (E8). BLOQ-EXT (sin API). |
| 05 Métricas de leads | NO EXISTE | Placeholder (E11). BLOQ-EXT. |
| 06 Solo ADMIN | IMPL+PROBADO | `AdminScreen` (`isPlatformAdmin`). Test "REQ-F14-06" (HOST y GUEST × 6 pantallas). Basado en claims del token de desarrollo; sin login real. |

### F24 · Buscador de proveedores

| REQ | Estado | Evidencia |
|---|---|---|
| 01 B1 portada | IMPL+PROBADO (auditoría) | `apps/seo-web/app/proveedores/page.tsx` (categorías, ciudades destacadas, `SearchForm`). Sin test unitario; auditado en vivo (SEO 1.0, `audit.json`). |
| 02 B2 SSR paginado indexable | IMPL+PROBADO | `proveedores/[categoria]/page.tsx` y `ProviderResults` (`rel=prev/next`). Test en `seo.test.tsx` ("REQ-F24-05") con datos simulados. Datos reales BLOQ-EXT (Provider Catalog sin HTTP): hoy muestra "no disponible". |
| 03 B3 categoría×ciudad | IMPL+PROBADO (auditoría) | `[categoria]/[ciudad]/page.tsx`, con 99 rutas estáticas (`generateStaticParams`) y metadatos propios. Sin test unitario; auditado. |
| 04 B4 filtros geo/precio/verificado/disponibilidad | PARCIAL | `proveedores/buscar/page.tsx` y `SearchForm` (categoría, ciudad, precio, fecha, verificado). Sin geo real (solo ciudad). Se prueba el constructor de la query, no la página. |
| 05 JSON-LD ItemList | IMPL+PROBADO | `itemListJsonLd` y `ProviderResults`. Test verifica la forma, no una validación contra el esquema de schema.org. |
| 06 Lighthouse SEO > 95 en CI sobre 3 rutas | PARCIAL | 1.0 medido a mano el 18-oct, sin re-medir tras el rediseño. CI solo mide la home (ver F07-06). |

## 3. Hecho pero NO registrado en `docs/progress/`

- `STATUS_LOG.md` tiene una única fila (F08–F14, F24). No hay fila de F01–F07: ni el trabajo hecho (CI, EAS, auth, i18n, tokens, ui, api-client) ni sus bloqueos como estado.
- No existe ningún registro del rediseño de hoy de seo-web (landing, `colors.ts`, `tailwind-preset.cjs`, `globals.css`, `landing` i18n). Ocho archivos modificados sin commit.
- El commit `c3a0599` "RSVP form schema and web RSVP status/form wiring" (`packages/forms`, `components/rsvp/*`) es trabajo de F15 y no tiene registro.
- Las fichas siguen en "Estado inicial NOT_STARTED". Las evidencias están en una sola nota (`evidence/lanes-F08-F14-F24.md`), sin evidencia por REQ para F02, F03, F04 y F06.
- `DECISIONS.md` dice "sin regla de lint (no existe en el repo)", pero `packages/config-eslint/rules/no-literal-strings.js` sí existe (sin habilitar).

## 4. Marcado hecho pero inexistente o sobrestimado

1. **REQ-F01-05 `@rsvp/contracts`**: no existe; F04-01 (cliente generado) cae con él. Toda la capa de tipos es manual.
2. **F02-06**: el test de frontera pasa en vacío (regex mal escrita) y solo mira `app/`.
3. **F02-01/02/03 y NativeWind (F02-04)**: tokens duplicados a mano, sin capturas por plataforma, `@rsvp/ui` sin dark mode, NativeWind sin un solo `className`.
4. **F03**: `ui-web` no es shadcn/ui; la API difiere de la nativa; las pantallas reales usan `host/ui.tsx` propio, no `@rsvp/ui`. No hay pruebas responsive.
5. **F05**: `packages/auth` está completo en teoría y casi sin conectar. Login es un stub, la sesión de la app es un token de desarrollo, el refresh lanza error, `canAccessRoute` y `SessionManager` no se usan, y el enlace de repliegue `/rsvp/<token>` no tiene ruta en seo-web.
6. **`STATUS_LOG` "REGRESSION_VERIFIED"** para F14 y F24: F14 tiene 6/11 módulos placeholder y F24 no tiene datos reales. La nota ya lo reconoce con "parcial/bloqueado". El estado de F10 afirma "A1–A8 con capturas", pero solo existen A1, A4, A5 y A21.
7. **Lighthouse "medido en CI" (F08-06, F24-06)**: solo hay medición manual (pre-rediseño). El workflow mide la home y con un `budgetPath` que probablemente no aplica el umbral.
8. **`lint` en turbo** es `tsc`: REQ-F01-04, F06-06 y F07-02 se apoyan en un lint que no existe.
9. **F09-01 "snapshot visual"** son snapshots de HTML, no visuales.
10. **F14-03**: la "cola de verificación" es un campo de ID; sin rechazar ni suspender.

## 5. Notas sobre rutas stub en `apps/universal/app`

Las rutas de 5 líneas de `(host)/*` y `(admin)/admin/*` NO son stubs: delegan en pantallas reales de `apps/universal/src/host` y `src/admin` (~1.800 líneas, con estados de carga/error/403/409 probados). Los stubs auténticos (solo `Surface` con título) son 4: `(auth)/login.tsx`, `(guest)/invitacion.tsx`, `(provider)/portal.tsx` y `(host)/inicio.tsx`. Las 6 rutas admin de módulos pendientes son placeholders que muestran "servicio no disponible".
