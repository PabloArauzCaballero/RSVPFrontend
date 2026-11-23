# Espejo web en la app · slice 1: la invitación pública (`/c/{slug}` y sus secciones)

Fecha: 2026-11-20 · Rama `feat/espejo-web-movil` (base `chore/deploy-contabo-coolify` @ `129d366`) · Carriles relacionados: F10 (sitio público), F21 (app del invitado).

**Resultado observable:** quien abre `https://<dominio>/c/{slug}` en la app (o en la app servida en el navegador) ve la misma invitación que el sitio público: portada con foto según el layout, secciones en el orden del template, navegación a la página propia de cada sección (`/historia`, `/itinerario`, `/lugares`, `/galeria`, `/dress-code`, `/faq`, `/recomendaciones`), «Cómo llegar», fotos a tamaño completo, recomendaciones por el redirector y selector de idioma de la celebración.
Antes: la imagen desplegada respondía «Esta página no existe» a `/c/{slug}` ([captura](antes-dev-c-slug-sin-ruta-360.png)).

Nivel alcanzado: **VERIFIED en Expo web (Chrome real) contra el backend real de dev**. **No** verificado en iOS ni Android (ningún simulador o dispositivo en esta corrida).

## Requisitos del slice

| ID | Requisito | Estado | Comando / artefacto | Resultado |
|---|---|---|---|---|
| ESP-01 | `/c/{slug}` renderiza la invitación con los datos del servidor, sin sesión | PASS | `scripts/live/invitation-mirror.mjs` · [results.json](results.json) | 3 celebraciones publicadas × 360/768/1280 × claro/oscuro × es-BO/en-US = 36 combinaciones: h1 igual al título del servidor, sin desborde horizontal, 0 errores de consola |
| ESP-02 | Página propia de cada sección en la dirección de la web | PASS | ídem | 6 navegaciones (`/historia`, `/lugares`, `/galeria`): una sola sección, h1 con su nombre |
| ESP-03 | «Cómo llegar» abre mapas fuera de la app | PASS | ídem | 3/3 abren `google.com/maps` (punto marcado o búsqueda por nombre) |
| ESP-04 | Recomendaciones de partner solo por `/r/{listingId}` | TESTED | `test/guest-invitation.test.tsx`, `native.test.tsx` | `surface=APP` + `celebrationId`; id no UUID → sin enlace. Ninguna celebración de dev tiene recomendaciones: no observado en vivo |
| ESP-05 | Idiomas de la celebración; contenido con `Accept-Language` | PASS | live + test | `roxana-y-pedro` en en-US muestra «Roxanne», «Our story», «Get directions» |
| ESP-06 | Negativo 404 (slug inexistente) | PASS | live | gateway 404 → «Esta celebración no está disponible» + ir al inicio |
| ESP-07 | Negativo: ruta que no es sección no consulta nada | PASS | live | 0 peticiones a `/celebrations/public/` |
| ESP-08 | Negativo: sección vacía o no ubicada → 404 | TESTED | `guest-invitation.test.tsx` | `dress-code` vacío → no disponible |
| ESP-09 | 5xx ≠ 404, con reintento | TESTED | ídem | 503 → «no disponible por ahora» + Reintentar |
| ESP-10 | Template/fotos caídos no tumban la invitación | TESTED | ídem | 503/502 en media → aspecto por defecto, sin foto |
| ESP-11 | Accesibilidad (axe wcag2a/aa) | PASS | live | 0 critical/serious en 36 combinaciones, tras dos correcciones halladas aquí (abajo) |
| ESP-12 | Columna del layout en pantallas anchas | PASS | live + test | 1280 px: columna de 720 px centrada, como `--celebration-max-width` |

## Hallazgos corregidos durante la verificación en vivo

1. axe `aria-required-children` (serious) en las 36 combinaciones: la navegación usaba `role="menu"` sin `menuitem`. Ahora `role="navigation"`, como el `<nav>` de la web. Prueba de regresión en `native.test.tsx`.
2. axe `color-contrast` (serious) en oscuro con dos idiomas: el selector usaba la paleta de la app sobre la invitación clara. Ahora usa la tinta de la plantilla. Prueba de regresión en `guest-invitation.test.tsx`.
3. A 1280 px la invitación se estiraba a todo el ancho; ahora respeta el `maxWidth` del layout.

## Comandos (2026-11-20, macOS, Node 22)

```
yarn turbo run test typecheck lint      → se detuvo en @rsvp/contracts#test (preexistente, ver abajo) tras 24/45 tareas; corregido: con --continue (rama del slice 2, que incluye este) 65/66, única falla esa
  apps/universal vitest                  → 29 archivos, 386+ pruebas OK (13 nuevas de la invitación)
  packages/celebration-theme vitest      → 44 OK (11 nuevas del renderer con acciones)
  packages/query-hooks vitest            → 89 OK
  apps/seo-web vitest                    → 140 OK (usa sections/index.tsx refactorizado)
yarn lint:code (eslint --max-warnings 0) → exit 0
yarn harness:validate                    → exit 0
expo export --platform web               → Exported: web-build
node scripts/live/invitation-mirror.mjs  → 50/50 PASS, exit 0
```

Cómo reproducir: `EXPO_PUBLIC_API_URL=http://localhost:8300/api expo export --platform web`, servir `web-build` con un proxy que reenvíe `/api/*` al gateway de dev con `Origin: https://dev.done.arauzsoftware.com` (su CORS no admite localhost), y `SLUGS=sofia-y-victor-boda,roxana-y-pedro,fabio CHROMIUM_PATH=<Chrome> node apps/universal/scripts/live/invitation-mirror.mjs`. El script genera todas las capturas; aquí se guarda una muestra (el resto queda referenciado en `results.json`).

## Límites y fuera de alcance

- **iOS/Android no probados**: el renderer usa solo primitivas RN (`Pressable`, `Image`, `ScrollView`, `Linking`), pero sin simulador ni dispositivo no se declara.
- Los universal links de `/c/{slug}` dependen de `apple-app-site-association`/`assetlinks.json`, que todavía no se sirven (bloqueo de F05/F21).
- `@rsvp/contracts#test` falla porque `specs/gift-list.openapi.json` vendorizado difiere del checkout hermano de `RSVPBackend`. No se tocó `packages/contracts`; es una deriva entre repos, fuera del propósito de este PR.
- Las capturas `fullPage` muestran el primer viewport: la invitación se desplaza dentro de su `ScrollView`.
- Movimiento: no se añadió animación (motion design: la navegación entre secciones es un cambio de página, sin transición propia).

Siguientes slices del espejo: directorio de proveedores (`/proveedores/...`), microsite del partner (`/p/{slug}`, catálogo, agenda, cotizar) y catálogo (`/catalogo`).

---

# Slice 2: la lista de regalos (`/c/{slug}/regalos`, `/regalos/{id}`)

Fecha: 2026-11-20 · Rama `feat/espejo-movil-regalos` (sobre el slice 1).

**Resultado observable:** en la app, la lista de regalos funciona en las mismas direcciones y con lo mismo que la web (A14/A15): filtros por precio máximo, origen y «solo disponibles» con contador; aliados primero; foto del producto del aliado; «Ver en la tienda» para regalos externos; página propia de cada regalo; vuelta a la invitación. `/c/{slug}/regalos` sin token abre con la credencial guardada en la sesión (o pide el enlace), y `/regalos/{token}` sigue funcionando: un segmento UUID es un regalo y cualquier otro es la credencial.

Mundo de prueba en TEST (dev): celebración `qa-espejo-movil` del anfitrión de prueba, publicada, con 3 regalos externos aprobados y una invitada QA con asistencia confirmada (script fuera del repo; el token no se versiona).

| ID | Requisito | Estado | Comando / artefacto | Resultado |
|---|---|---|---|---|
| ESP-20 | El enlace personal abre la lista con la credencial como Bearer y la guarda en la sesión | PASS | `scripts/live/gifts-mirror.mjs` · [gifts-results.json](gifts-results.json) | 3/3 regalos, todas las lecturas con `Bearer`, `sessionStorage` con la misma clave que la web |
| ESP-21 | `/c/{slug}/regalos` sin token en la dirección | PASS | live | abre con la credencial guardada |
| ESP-22 | Filtros: precio máximo, origen, solo disponibles, quitar | PASS | live + `guest-gifts-mirror.test.tsx` | 450 Bs → 2 regalos; «De nuestros aliados» → estado vacío filtrado; quitar → 3 |
| ESP-23 | Detalle `/c/{slug}/regalos/{id}` | PASS | live | h1 = título del regalo, una sola fila, nota de aliado y vuelta a la lista |
| ESP-24 | «Ver en la tienda» sale de la app | PASS | live | nueva pestaña pide `https://tienda.example/cafetera` (dominio reservado: no carga, se verifica la petición) |
| ESP-25 | Negativo: sin enlace no hay lista anónima | PASS | live | 401 → «Abre tu enlace de invitación» + ir a mi invitación |
| ESP-26 | Negativo: token falsificado | PASS | live | «Tu enlace ya no funciona» y la credencial se olvida |
| ESP-27 | Foto del producto del aliado y enlace por `/r/{listingId}` | TESTED | `guest-gifts-mirror.test.tsx` | la lista QA no tiene regalos de aliado: no observado en vivo |
| ESP-28 | 360/768/1280 × claro/oscuro × es-BO/en-US, axe | PASS | live | 12/12 sin desborde, 0 critical/serious, 0 errores de consola |

Además: el contador decía «1 regalos» (también en la web). La clave pasa a plural i18next (`count_one`/`count_other`) en ambos idiomas.

```
yarn turbo run test typecheck lint --continue → 65/66 tareas OK; única falla @rsvp/contracts#test (preexistente)
  apps/universal                            → 30 archivos, 396 pruebas (guest-gifts-mirror 9 nuevas; gifts-portal 39 sin cambios de aserción)
  apps/seo-web                              → 140 (arrange delega en arrangeGifts compartido)
yarn lint:code                              → exit 0
node scripts/live/gifts-mirror.mjs          → 21/21 PASS, exit 0
```

Límites: iOS/Android no probados; en nativo la credencial vive en memoria del proceso (se pierde al cerrar la app); reservar en vivo no se repitió en este slice porque el flujo de reserva no cambió (cubierto por `gifts-portal.test.tsx`).

---

# Slice 3: el directorio de proveedores (`/proveedores`, `/buscar`, `/{categoria}`, `/{categoria}/{ciudad}`)

Fecha: 2026-11-20 · Rama `feat/espejo-movil-directorio` (sobre el slice 2).

**Resultado observable:** en la app, el directorio funciona en las mismas direcciones y con los mismos parámetros que la web (B1–B4): portada con búsqueda, categorías, ciudades destacadas y pasos para cotizar; resultados filtrados por categoría, ciudad, precio máximo, fecha, solo verificados y «cerca de mí» (donde la plataforma ofrece geolocalización); páginas por categoría y por categoría + ciudad con migas, contador, paginación y enlaces cruzados. Cada resultado abre `/p/{slug}` (el micrositio es el slice siguiente). Las impresiones se cuentan con la misma regla que la web.

Categorías, ciudades, la construcción de la consulta, la paginación y el agrupador de impresiones pasan a `@rsvp/query-hooks`; la web los reexporta y no cambia de comportamiento.

**Hallazgo corregido en ambas superficies:** las categorías que el admin agrega (en dev: `PASTRY`, `KITCHENWARE`) se mostraban como clave cruda (`directory.category.PASTRY`), tanto en la web como en la app. Ahora se usa la traducción propia, luego el nombre que publica `GET /providers/categories` y, al final, el código (`categoryLabel`).

| ID | Requisito | Estado | Comando / artefacto | Resultado |
|---|---|---|---|---|
| ESP-30 | `/proveedores/buscar` muestra lo mismo que `GET /providers` | PASS | `scripts/live/directory-mirror.mjs` · [directory-results.json](directory-results.json) | 6/6 en el mismo orden |
| ESP-31 | Formulario → dirección de la web → mismos resultados | PASS | live | `?categoria=catering` = `category=CATERING` (1) |
| ESP-32 | `/proveedores/{categoria}` | PASS | live | contador «Hay 1 proveedor verificado de catering en Bolivia.» |
| ESP-33 | `/proveedores/{categoria}/{ciudad}` sin resultados | PASS | live | `salones/santa-cruz` → estado vacío con salida al directorio |
| ESP-34 | Negativo: ciudad inexistente | PASS | live + test | no es página y no consulta nada |
| ESP-35 | Resultado → `/p/{slug}` | PASS | live | `/p/multicenter-59388c` |
| ESP-36 | Impresiones como en la web | PASS | live + `directory.test.tsx` | 1 POST, solo `listingIds` + `surface=SEARCH`, sin repetidos; a 360 px cuentan los 4 visibles de 6 |
| ESP-37 | Nombres de categoría publicados, nunca la clave | PASS | live + tests (app, web, query-hooks) | 0 claves crudas |
| ESP-38 | 503 ≠ vacío, con reintento | TESTED | `directory-mirror.test.tsx` | |
| ESP-39 | Portada y búsqueda en 360/768/1280 × claro/oscuro × es-BO/en-US, axe | PASS | live | 24/24 sin desborde, 0 critical/serious, 0 errores |
| ESP-40 | Rutas públicas sin inicio de sesión | TESTED | `directory-mirror.test.tsx` | `/proveedores*` y `/p/*` en el grupo público; `/regalos/proveedores` sigue siendo del anfitrión |

```
yarn turbo run test typecheck lint --continue → 65/66 (única falla @rsvp/contracts#test, preexistente)
  universal 408 · seo-web 141 · query-hooks 93
yarn lint:code → 0 · yarn harness:validate → 0
node scripts/live/directory-mirror.mjs → 33/33 PASS, exit 0
```

Límites: iOS/Android no probados; «cerca de mí» solo aparece donde existe `navigator.geolocation` (la app web), porque la app nativa no incluye un módulo de ubicación; la paginación no se observó en vivo (dev tiene 6 resultados, menos que una página) y queda probada en tests; el JSON-LD y los metadatos SEO son exclusivos de la web indexable y no aplican a la app.

---

# Slice 4: el micrositio del proveedor (`/p/{slug}`, `/catalogo`, `/catalogo/{sku}`, `/agenda`, `/cotizar`)

Fecha: 2026-11-20 · Rama `feat/espejo-movil-micrositio` (sobre el slice 3).

**Resultado observable:** desde el directorio, la app abre el micrositio del proveedor como la web (B5–B11): nombre del negocio, ofertas verificadas, sobre el proveedor, cobertura, contacto después del aviso de la plataforma y siempre por `/r/{listingId}` (`surface=APP`); catálogo; ficha con la entrega antes de cualquier botón; agenda con días libres en la zona del proveedor y pedido de fecha; carrito de cotización con confirmación. Cotizar y pedir fecha usan la sesión de la app; un 401 lleva al login de la app con vuelta a la página.

El modelo del socio (`partnerFromListings`, `addressText`, orden de contactos), `todayIn`, `shiftMonth`, `dayState` y los mensajes de error de cotización pasan a `@rsvp/query-hooks/provider/partner`; la web los reexporta.

**Hallazgo corregido en ambas superficies:** la cobertura repetía la misma zona escrita distinto («Santa cruz de la sierra», «Santa Cruz de la Sierra», «la-paz»/«La Paz»). `uniqueZones` la muestra una vez.

| ID | Requisito | Estado | Comando / artefacto | Resultado |
|---|---|---|---|---|
| ESP-50 | h1 = nombre del negocio (`GET /providers/{id}`) | PASS | `scripts/live/partner-mirror.mjs` · [partner-results.json](partner-results.json) | «Katering Grecia» |
| ESP-51 | Ofertas = tarjetas verificadas del socio | PASS | live | 6/6 |
| ESP-52 | Aviso antes del contacto; contacto por `/r/` | PASS | live | `/r/{listingId}?destination=WHATSAPP&surface=APP` |
| ESP-53 | Cobertura sin duplicados | PASS | live + `directory.test.tsx` | 2 zonas (antes 5) |
| ESP-54 | Catálogo | PASS | live | 6 ofertas |
| ESP-55 | Ficha: entrega antes de cotizar y contactar (REQ-F25-04) | PASS | live + test | |
| ESP-56 | Agenda = `GET /calendar` en la zona del proveedor | BLOCKED-EXTERNAL en vivo · TESTED | `partner-mirror.test.tsx` | `multicenter-59388c` no tiene disponibilidad. El proveedor QA propio (`proveedor-de-prueba-qa-ccc9c0`) quedó con disponibilidad diaria de 08 a 22 h, una oferta publicada con entrega y enviado a verificación (2026-11-20), pero sigue en `PENDING_VERIFICATION`: su calendario público responde 404 hasta que un ADMIN lo verifique |
| ESP-57 | Pedir fecha sin sesión → 401 → login de la app | BLOCKED-EXTERNAL en vivo · TESTED | test | mismo bloqueo que ESP-56 (falta la verificación de un ADMIN); el test cubre 401, 409 y éxito |
| ESP-58 | Cotizar: oferta preseleccionada, formulario incompleto rechazado sin enviar | PASS | live | 4 alertas, ningún POST a `/quotes` |
| ESP-59 | Cotizar: envío con unidades menores enteras, confirmación, 429, 401 | BLOCKED-EXTERNAL en vivo · TESTED | test | el envío real irá al proveedor QA propio (no crea leads ajenos) cuando un ADMIN lo verifique; hoy su micrositio no existe para el público |
| ESP-60 | Socio inexistente / no verificado / catálogo caído | PASS (vivo: inexistente) · TESTED | live + test | |
| ESP-61 | Micrositio, agenda y cotizar en 360/768/1280 × claro/oscuro × es-BO/en-US, axe | PASS | live | 36/36 sin desborde, 0 critical/serious |

```
yarn turbo run test typecheck lint --continue → 65/66 (única falla @rsvp/contracts#test, preexistente)
  universal 420 · seo-web 141 · query-hooks 94
yarn lint:code → 0
node scripts/live/partner-mirror.mjs SLUG=multicenter-59388c → 48/48, exit 0 (una comprobación marcada NOT OBSERVED)
```

Límites: iOS/Android no probados. Agenda y envío de cotización solo con pruebas (sin disponibilidad en dev y sin crear leads reales). Captcha de cotizaciones anónimas: la app no muestra Turnstile; si el despliegue lo exige, el servidor responde 403 y la app lo dice («quote.errors.captcha»), y con sesión no aplica. Un calendario sin días muestra la rejilla vacía, igual que la web (falta un estado vacío propio en ambas: seguimiento aparte). El JSON-LD del negocio es exclusivo de la web.

---

# Agenda sin disponibilidad: estado vacío en la web y la app

Fecha: 2026-11-20 · Rama `fix/agenda-sin-disponibilidad` (sobre el slice 4).

**Problema:** cuando `GET /providers/{id}/calendar` devuelve 0 días (proveedor sin disponibilidad configurada), la web y la app mostraban una rejilla vacía, «Elige un día libre» y un botón «Solicitar esta fecha» siempre deshabilitado: un callejón sin salida que no explicaba nada. En dev, `multicenter-59388c` está así.

**Ahora, en las dos superficies con la misma regla (`agendaEmptiness` en query-hooks):**
- 0 días → `unpublished`: «{proveedor} todavía no publicó sus días para {mes}», con el porqué y dos salidas: **Pedir cotización** (a `/p/{slug}/cotizar`) y **Ver el mes siguiente**. No se muestra la rejilla vacía ni el botón de solicitar.
- Días publicados pero ninguno libre → `noneFree`: «No quedan días libres en {mes}». La rejilla queda (cada día dice por qué), con las mismas salidas.
- Con al menos un día libre, nada cambia.
- El aviso es `role="status"` con su encabezado; textos nuevos `agenda.empty.*` en es-BO y en-US.

**Hallazgo corregido de paso (app):** a 360 px, la fila «Mes anterior · mes · Mes siguiente» no cabía y «Mes siguiente» quedaba cortado (el `ScrollView` recortaba, así que la medida de desborde del documento no lo veía). Ahora el mes va en su propia línea y los botones pueden pasar a dos líneas. El script vivo mide además que el botón quede entero dentro de la pantalla.

| ID | Requisito | Estado | Comando / artefacto | Resultado |
|---|---|---|---|---|
| AGV-01 | Mes sin días: explica, sin rejilla ni botón muerto, `role=status` | PASS (web y app) | `scripts/live/agenda-empty.mjs` · [agenda-empty-results.json](agenda-empty-results.json) | precondición de la API: 0 días en 2026-11 |
| AGV-02 | «Pedir cotización» lleva a `/p/{slug}/cotizar` | PASS (web y app) | live | |
| AGV-03 | «Ver el mes siguiente» pide el mes siguiente y muestra la rejilla si hay días | TESTED | `quote-agenda.test.tsx`, `partner-mirror.test.tsx` | dev no tiene días en ningún mes: no observado en vivo |
| AGV-04 | Ningún día libre → aviso con la rejilla visible | TESTED | ídem | |
| AGV-05 | Con días libres, sin aviso y con el botón de solicitar | TESTED | ídem | |
| AGV-06 | 360/1280 × claro/oscuro, axe | PASS | live | 8/8 sin desborde (incluido el botón «Mes siguiente» entero), 0 critical/serious, 0 errores |

Web en vivo: `next dev` de seo-web en :3320 con `RSVP_API_URL` = gateway de dev (lectura del servidor) y `NEXT_PUBLIC_API_URL` = proxy local :8320 (el navegador lee el calendario; el CORS de dev no admite localhost, el proxy sí para orígenes localhost). App: export web servido por el mismo proxy.

```
yarn turbo run test typecheck lint --continue → ver PR
  apps/seo-web quote-agenda 14 (3 nuevas) · apps/universal partner-mirror 15 (3 nuevas) · query-hooks directory 6 (1 nueva)
node scripts/live/agenda-empty.mjs SLUG=multicenter-59388c WEB=http://localhost:3320 → 10/10 PASS, exit 0
```

Límites: iOS/Android no probados; «mes siguiente con días» solo en pruebas (dev no tiene ningún proveedor con disponibilidad).
# Nativo: iOS y Android (invitación, regalos, directorio y micrositio)

Fecha: 2026-11-20 · Rama `fix/espejo-nativo` (base `chore/deploy-contabo-coolify` @ `b2c2a95`).

**Cómo se probó:** Expo Go **SDK 54**, el del proyecto: iOS 54.0.7 en un simulador dedicado («Espejo QA SDK54», iPhone 17 · iOS 26.5) y Android 54.0.8 en el emulador `Pixel_4`. Metro apuntaba al backend real de dev (`EXPO_PUBLIC_API_URL=https://rsvp-api.161.97.85.216.sslip.io`; en nativo no aplica CORS). Los recorridos son flujos de **Maestro 2.8** versionados en `apps/universal/e2e/maestro/`: `espejo-invitacion.yaml`, `espejo-regalos.yaml` y `espejo-directorio-micrositio.yaml`, con los sub-flujos `cold-start.yaml`, `open.yaml` y `dismiss-dev-menu.yaml`.

```
maestro test -e APP_ID=host.exp.Exponent -e BASE=exp://127.0.0.1:8081/-- [-e SLUG=… -e TOKEN=…] e2e/maestro/<flujo>.yaml   # iOS
maestro test -e APP_ID=host.exp.exponent -e BASE=exp://10.0.2.2:8081/--  [-e SLUG=… -e TOKEN=…] e2e/maestro/<flujo>.yaml   # Android
```

En Expo Go, el enlace es `exp://<host>:8081/--/<ruta>` y no `rsvp://<ruta>`: el esquema `rsvp` solo existe en un build propio (dev o tienda), que no se generó. Las rutas, la pantalla y el código que abren son los mismos.

## Bugs nativos encontrados y corregidos

1. **La app no arrancaba en iOS ni en Android** («Uncaught Error: Maximum call stack size exceeded» en `packages/ui/src/motion.native.ts`; [captura](nativo/antes-ios-crash-motion.png)). Causa raíz: `motion.native.ts` reexportaba desde `'./motion'`, y en nativo Metro resuelve `'./motion'` a `motion.native.ts` mismo, porque la extensión de plataforma gana. El módulo se importaba a sí mismo. Venía del rediseño (#12) y está en `dev`. La misma forma de error dejaba `undefined` los valores que `logo.native.tsx` (`LOGO_VIEWBOX`, `useLogoColors`) y `notice-mark.native.tsx` (`NOTICE_GLYPHS`) leían de su propio nombre base. **Corrección:** lo que comparten web y nativo pasa a archivos sin variante de plataforma (`motion-tokens.ts`, `logo-shared.ts`, `notice-glyphs.ts`), y los `.ts`/`.native.ts` lo reexportan desde ahí. **Guarda:** `packages/ui/src/platform-files.test.ts` recorre `packages/*` y `apps/universal/{src,app}` y falla si un archivo `.native`/`.ios`/`.android`/`.web` importa en tiempo de ejecución su propio nombre base (`import type` se permite, porque se borra al compilar). Se verificó en rojo con el código anterior y en verde con la corrección.
2. **La foto de portada salía angosta y alineada a la izquierda** (264 × 352 pt en un iPhone de 402 pt; [captura](nativo/antes-ios-portada-angosta.png)). Causa raíz: `width: 100%` + `aspectRatio` + `maxHeight`. En nativo, Yoga respeta el tope **reduciendo el ancho** para conservar la proporción; en la web, CSS conserva el ancho. **Corrección:** el contenedor mide su ancho y la altura se calcula (`coverPhotoHeight`: proporción propia, nunca más alta que 3:4, tope 352). La imagen cubre el contenedor. Después: 370 × 352 pt, a todo el ancho ([captura](nativo/ios-espejo-invitacion.png)). Prueba en `native.test.tsx`.

## Resultados por plataforma

| Recorrido | iOS (simulador, Expo Go 54) | Android (emulador, Expo Go 54) |
|---|---|---|
| Invitación `/c/sofia-y-victor-boda`: portada a todo el ancho, navegación de secciones → `/lugares`, «Cómo llegar» sale a mapas | **VERIFIED** · Safari en google.com/maps ([1](nativo/ios-espejo-invitacion.png), [2](nativo/ios-espejo-invitacion-lugares.png), [3](nativo/ios-espejo-invitacion-como-llegar.png)) | **VERIFIED** · abre la app Google Maps ([1](nativo/android-espejo-invitacion.png), [2](nativo/android-espejo-invitacion-lugares.png), [3](nativo/android-espejo-invitacion-como-llegar.png)) |
| Sección directa `/c/roxana-y-pedro/lugares`, con dos idiomas | **VERIFIED** | **VERIFIED** |
| Directorio `/proveedores/buscar`: resultados reales de dev, resultado → `/p/{slug}` | **VERIFIED** ([1](nativo/ios-espejo-directorio-resultados.png), [2](nativo/ios-espejo-micrositio.png)) | **VERIFIED** ([1](nativo/android-espejo-directorio-resultados.png)) |
| Micrositio: aviso antes del contacto, contacto sale por `/r/{listingId}`, catálogo, ficha con la entrega antes de cotizar | **VERIFIED** (la salida por `/r/` se observa; para el destino, ver bloqueo abajo) | **VERIFIED** ([ficha](nativo/android-espejo-micrositio-oferta.png)) |
| Regalos `/c/qa-espejo-movil/regalos/{token}`, la misma lista sin token y la ficha `/regalos/{id}` | **VERIFIED** · la lista carga con la credencial, abre igual sin el token en la dirección, ficha `/regalos/{id}` ([lista](nativo/ios-espejo-regalos-lista-items.png), [ficha](nativo/ios-espejo-regalos-detalle.png)) | **VERIFIED** · igual ([lista](nativo/android-espejo-regalos-lista-items.png), [ficha](nativo/android-espejo-regalos-detalle.png)) |

## Bloqueos externos y límites (no son PASS)

- **`/r/{listingId}` en `dev.done.arauzsoftware.com` responde «Esta página no existe»** ([captura](nativo/ios-espejo-micrositio-redirector.png)). La app arma el enlace al redirector con `EXPO_PUBLIC_SITE_URL`, pero ese dominio sirve la app Expo, y el redirector vive en seo-web. **BLOCKED-EXTERNAL (despliegue/configuración):** hay que servir `/r` en ese origen o apuntar `EXPO_PUBLIC_SITE_URL` al dominio de seo-web. Afecta a todos los enlaces de socio de la app (micrositio, regalos de aliado, proveedores del anfitrión), no solo al nativo.
- **Idioma de la interfaz en iOS (por confirmar):** con el sistema en español, la interfaz de la app salió en inglés. La app toma el idioma de `Intl` y Expo Go solo declara localización en inglés. Hay que confirmarlo en un build propio antes de tratarlo como bug de producción. La invitación no se ve afectada, porque sigue el idioma de la celebración.
- **Solo Expo Go (sin impacto en producción):** en Android, LogBox avisa «expo-notifications: Android Push notifications… removed from Expo Go in SDK 53» y tapa el borde inferior; los flujos centran los elementos antes de tocarlos. Expo Go también abre su menú de desarrollo en el primer arranque, y `dismiss-dev-menu.yaml` lo cierra.
- **Metro en este worktree** (dentro de `.claude/worktrees`) no detectó los cambios de archivos: hubo que reiniciarlo con `--clear` después de cada cambio. Las capturas válidas son posteriores a ese reinicio; la de la portada angosta se tomó a propósito con el código anterior.
- **Mundo de regalos:** la celebración QA `qa-espejo-movil` del entorno TEST, con su invitada QA (token pasado como `TOKEN` en la ejecución, fuera del repo). En iOS el título del regalo es un enlace cuyo nombre accesible es «Ver detalle de … / See details of …», así que el flujo lo busca dentro de ese nombre. Una corrida de Android falló porque el emulador no alcanzó Metro («Packager is not running at 10.0.2.2:8081», por la carga de la máquina); al repetirla pasó.
- **Android, ejecución final de invitación y directorio:** pasaron con el arranque en frío escrito dentro de cada flujo (`launchApp` con `stopApp`, más espera), que es exactamente la rama Android de `cold-start.yaml`. Después de mover esos pasos al sub-flujo no se repitieron en Android, para no cargar más la máquina; en iOS sí se repitieron con los archivos finales.
- **No probado en nativo:** universal links (`apple-app-site-association`/`assetlinks.json` no se sirven), build propio con esquema `rsvp://`, dispositivos físicos, lector de pantalla (VoiceOver/TalkBack), agenda y envío de cotización (escriben datos).

```
yarn turbo run test typecheck lint --continue → 66/66 · ui 262 (con platform-files) · celebration-theme 45 · universal 420 · seo-web 141
yarn lint:code → 0 · yarn harness:validate → 0
```
# Enlaces a proveedores: origen del redirector

Fecha: 2026-11-20 · Rama `fix/app-partner-redirector-origin`.

**Causa raíz:** `partnerRedirectUrl` armaba `/r/{listingId}` con `siteOrigin()`, el origen de los enlaces personales, que prioriza `EXPO_PUBLIC_RSVP_ORIGIN`. En TEST ese es `dev.done.arauzsoftware.com`, el dominio de la app Expo, que no tiene `/r` («Esta página no existe»). El redirector vive en el sitio público (`EXPO_PUBLIC_SITE_URL`).

**Solución:** `publicSiteOrigin()` en `src/platform/site-origin.ts` (lectura literal de `EXPO_PUBLIC_SITE_URL`, sin barra final; sin ella, el origen de RSVP). La usan `partnerRedirectUrl` (micrositio, invitación, regalos, panel de proveedores del anfitrión) y `publicUrl` de la vista previa. Documentado en `docker-compose.coolify.yml`, `deploy/Dockerfile.universal` y `docs/runbooks/releases.md`.

| Comprobación | Estado | Resultado |
|---|---|---|
| `test/site-origins.test.ts` con el código anterior | FAIL (esperado) | 2/3 fallan: el enlace iba a `dev.done…` |
| `test/site-origins.test.ts` con el código nuevo | PASS | 3/3 (dos dominios, un dominio, URL de partner rechazada) |
| Chrome real, `/p/multicenter-59388c`, export con `RSVP_ORIGIN`=dev.done y `SITE_URL`=rsvp-web | PASS | WhatsApp y sitio web piden `https://rsvp-web.161.97.85.216.sslip.io/r/5b383c88…?destination=…&surface=APP` → 302 ([redirector-origin-results.json](redirector-origin-results.json)) |
| Regalo de aliado en vivo | NO OBSERVADO | ninguna lista pública de dev tiene regalos de aliado; usa el mismo `partnerRedirectUrl` (cubierto por la prueba) |
| Panel de proveedores del anfitrión en vivo | NO OBSERVADO | requiere sesión de anfitrión; mismo `partnerRedirectUrl` |

Nota fuera de alcance: en dev, el destino `OFFICIAL_SITE` del listing `5b383c88…` redirige a la misma búsqueda de WhatsApp que `WHATSAPP`; es dato del proveedor en el backend, no del enlace.

**Para que dev quede bien:** la imagen `universal` de Coolify debe compilarse con `EXPO_PUBLIC_SITE_URL=https://rsvp-web.161.97.85.216.sslip.io` (variable buildtime) y redeplegarse.
# Nativo · el idioma del dispositivo (iOS y Android)

Fecha: 2026-11-21 · Rama `fix/app-idioma-dispositivo` (base `chore/deploy-contabo-coolify`).

**Causa raíz (confirmada en simulador):** `deviceLocale()` leía `Intl.DateTimeFormat().resolvedOptions().locale`. En iOS, Hermes devuelve el idioma en que arrancó el *bundle*, elegido entre las localizaciones que la app declara. Expo Go 54.0.7 no declara `CFBundleLocalizations` (solo trae `Base.lproj`, es decir inglés), y un build propio sin esa clave tampoco declararía español. Por eso un iPhone completamente en español abría la app en inglés. En Android, `Intl` sigue el idioma del sistema y no estaba afectado.

**Corrección:** los idiomas preferidos se leen del sistema con `getLocales()` de `expo-localization` (`src/platform/device-languages.ts`), en el orden que la persona eligió; `Intl` queda solo como último recurso. El orden de REQ-F06-05 no cambia: elección explícita > preferencia guardada > dispositivo. Además, `app.config.ts` declara los idiomas de la app (`expo-localization` con `supportedLocales: ["es", "en"]`), así que los builds propios llevan `CFBundleLocalizations` (iOS) y `locales_config` (Android), y Ajustes ofrece el idioma por app.

| Plataforma | Dispositivo | Código anterior | Con la corrección |
|---|---|---|---|
| iOS 26.5 · iPhone 17 (Expo Go 54.0.7, simulador borrado antes de cada corrida) | idioma `es-BO`, región `es_BO` | **inglés** ([captura](nativo/idioma-ios-antes-es-bo.png)) | **español** ([directorio](nativo/idioma-ios-despues-es-bo.png), [invitación bilingüe con «Español» marcado](nativo/idioma-ios-despues-invitacion.png)) |
| iOS 26.5 · iPhone 17 | idioma `es-BO`, región `es_US` | **inglés** ([captura](nativo/idioma-ios-antes-es-us.png)) | — |
| Android · Pixel 4 (Expo Go SDK 54) | sistema `es-US` | español ([captura](nativo/idioma-android-antes-es-us.png)): no afectado | **español** ([directorio](nativo/idioma-android-despues-es-us.png), [invitación](nativo/idioma-android-despues-invitacion.png)) |

En cada corrida se comprobó, descargando el bundle exacto que pide Expo Go (URL del manifiesto), que la función servida era la esperada (`Intl…` antes, `deviceLanguages()` después). Metro no detectaba ediciones en este worktree y servía bundles en caché, así que cada variante se midió reiniciando Metro con `--clear`.

```
apps/universal vitest test/device-locale.test.tsx → 8/8 (con el código anterior: 5 fallan, que es lo esperado)
apps/universal vitest (suite completa)             → 33 archivos, 428 pruebas
expo config --type introspect                      → ios.infoPlist.CFBundleLocalizations = [es, en]
```

**Qué cubre Expo Go y qué solo un build propio:** con Expo Go se verificó que `getLocales()` devuelve el idioma del usuario y que la app lo usa, en iOS y Android. Que el sistema muestre la app en Ajustes → Idioma por app, y que el bundle propio declare `es`/`en`, solo se puede observar en un build propio (EAS). Está configurado (introspección), pero no se observó en un dispositivo.

Para arrancar en nativo hizo falta aplicar localmente la corrección de #37 (`motion.native` se importaba a sí mismo). Esa corrección no forma parte de este PR.
# Portada: `/` sin sesión (web) — «Portada en la web, login en el celular»

Fecha: 2026-11-21 · Rama `feat/app-portada-web` (base `chore/deploy-contabo-coolify` @ `09d399c`). Decisión del dueño del 2026-11-21.

**Resultado observable:** en la app servida en el navegador, quien abre `/` sin sesión ve la misma portada que el sitio público: encabezado con Proveedores, Ingresar y Crear; la promesa con la invitación en el teléfono; los estilos; los tres pasos; invitados, regalos y proveedores; para quién es; tipos de celebración; preguntas; cierre. En iOS y Android, `/` sin sesión sigue abriendo el login. Con sesión, en cualquier plataforma, va al inicio de su rol.

El contenido de muestra y el orden (estilos, invitados y cifras, regalos, tipos, preguntas, pruebas, pasos, proveedores) viven en `@rsvp/i18n` (`landing-content.ts`) y los consumen la web (`apps/seo-web/components/landing.tsx`) y la app (`apps/universal/src/landing/landing-screen.tsx`).

| ID | Requisito | Estado | Comando / artefacto | Resultado |
|---|---|---|---|---|
| ESP-70 | Web sin sesión: `/` muestra la portada y no redirige | PASS | `scripts/live/landing-mirror.mjs` · [landing-results.json](landing-results.json) | 12/12 combinaciones se quedan en `/` |
| ESP-71 | Mismas secciones que el sitio | PASS | live | cada encabezado visible del sitio está en la app (0 faltantes), en es-BO y en-US |
| ESP-72 | Crear → `/registro`, Ingresar → `/login`, Proveedores → `/proveedores` | PASS | live + `test/landing.test.tsx` | |
| ESP-73 | iOS/Android sin sesión → login | TESTED | `test/landing.test.tsx` (`anonymous-home.tsx`) | no se corrió en simulador en este frente |
| ESP-74 | Con sesión → inicio del rol | TESTED | `test/landing.test.tsx` | HOST → `/celebraciones`, ADMIN → `/admin` |
| ESP-75 | Preguntas que se abren y anuncian su estado | TESTED | `test/landing.test.tsx` | `aria-expanded` |
| ESP-76 | 360/768/1280 × claro/oscuro × es-BO/en-US, axe | PASS | live | sin desborde, 0 critical/serious, 0 errores de consola |

Capturas lado a lado (app / sitio): `portada-app-{360,1280}-{light,dark}.png` y `portada-sitio-{360,1280}-{light,dark}.png`.

```
yarn turbo run test typecheck lint --continue → 66/66 (universal 440, seo-web 141, i18n 12)
yarn lint:code → 0 · yarn harness:validate → 0
node scripts/live/landing-mirror.mjs (Chrome real; app exportada contra dev en :8340; sitio https://rsvp-web.161.97.85.216.sslip.io) → 15/15, exit 0
```

Diferencias aceptadas con el sitio: el degradado del hero y las sombras del teléfono y las tarjetas no se replican; el JSON-LD (sitio y FAQ) es de la web indexable y no aplica a la app; el primer CTA lleva a `/registro` de la app (en el sitio lleva al login de la app). Movimiento: una sola entrada de la escena del hero con `Enter`, que respeta movimiento reducido. Ninguna línea base visual cubre `/` (`e2e/screens.ts`), así que no cambió ninguna.

# Paridad de rutas públicas web ↔ app y estados sin salida del invitado

Fecha: 2026-11-23 · Rama `fix/espejo-web-movil-paridad` (base `chore/deploy-contabo-coolify` @ `18db2c8`). Pedido de Pablo: «fíjate que en la web y mobile esté lo mismo».

**Resultado observable:** cuando el enlace del invitado no sirve (inválido, vencido, revocado, enlace legado `/rsvp/{token}`), cuando no hay conexión, cuando la celebración solo admite enlace personal, cuando el plazo cerró o cuando la lista de regalos se abre sin enlace, el sitio público (seo-web) dice **lo mismo y con el mismo dibujo** que la app. Antes la web decía «Este enlace no está disponible» con una brújula y la app «Este enlace ya no funciona» con el enlace roto ([antes web](rutas-rsvp-enlace-invalido-web-360-antes.png) · [antes app](rutas-rsvp-enlace-invalido-app-360-antes.png) · [después web](rutas-rsvp-enlace-invalido-web-360-despues.png)).

**Causa raíz:** el rediseño del recorrido del invitado en la app (modo Persuade) creó claves nuevas (`rsvp.invite.*`, `gifts.guest.*`) y dibujos nuevos (`linkExpired`, `noAccess`, `deadlineClosed`), y seo-web siguió con las claves antiguas y con solo tres dibujos copiados. Nada comprobaba que la web y la app dijeran lo mismo. Ahora:
- las vistas de estado de seo-web (`components/rsvp/rsvp-status.tsx`, el bloqueo de `components/gift/gift-experience.tsx`) usan las mismas claves de `@rsvp/i18n` que la app;
- seo-web tiene los dibujos `linkExpired`, `noAccess` y `deadlineClosed`, con el pastel de su grupo, y `notFound`/`offline` pasan al pastel de su grupo (gris), como en la app;
- cada dibujo de estado lleva `data-art` (el gancho que la app expone como `data-illustration`) y `tests/state-art-sync.test.tsx` falla si un trazo o un pastel deja de coincidir con `packages/ui/src/illustrations.ts`;
- `scripts/live/public-routes-mirror.mjs` recorre todas las rutas públicas en los dos lados y compara encabezados y dibujo; `scripts/live/guest-states-mirror.mjs` verifica los estados del invitado en 360/768/1280 × claro/oscuro × es-BO/en-US con axe.

| ID | Requisito | Estado | Comando / artefacto | Resultado |
|---|---|---|---|---|
| PAR-01 | Enlace inválido (`/c/{slug}/rsvp/{token}` y `/rsvp/{token}`): mismo título, cuerpo, acción y dibujo | PASS | `guest-states-mirror.mjs` · [guest-states-results.json](guest-states-results.json) | 120/120 PASS en toda la matriz (5 estados × 2 lados × 12 combinaciones) |
| PAR-02 | Sin conexión (gateway abortado en el navegador): mismo título y dibujo, con reintento | PASS | ídem + `tests/rsvp-page.test.tsx` | |
| PAR-03 | Solo con enlace personal: mismo título, cuerpo, contacto y dibujo | PASS | ídem | la app además muestra la portada de la invitación (ver M21) |
| PAR-04 | Plazo cerrado: mismo título, texto y dibujo | TESTED | `tests/rsvp-page.test.tsx` | TEST no tiene un enlace válido con plazo vencido: no observado en vivo |
| PAR-05 | Regalos sin enlace: mismo título, acción y dibujo; 401/403/404/429/5xx con los textos y dibujos de la app | PASS (sin enlace) · TESTED (resto) | ídem + `tests/gifts.test.tsx` | |
| PAR-06 | Directorio vacío: el título es un encabezado, como en la app | PASS | `public-routes-mirror.mjs` · [public-routes-results-despues-directorio-subset.json](public-routes-results-despues-directorio-subset.json) | |
| PAR-07 | Los dibujos de la web son copia exacta de los de la app | TESTED | `tests/state-art-sync.test.tsx` | 6 dibujos + un caso negativo |
| PAR-08 | 360/768/1280 × claro/oscuro × es-BO/en-US, axe, sin desborde, en web y app | PASS | `guest-states-mirror.mjs` | dibujo presente 1 vez, desborde 0, axe critical+serious 0, errores de consola 0 |
| PAR-09 | 404 general: mismas palabras que la app (`notFound.*` de `common`; se quitan las duplicadas `landing.notFound`) | PASS | `public-routes-mirror.mjs` · [public-routes-results-despues-404-subset.json](public-routes-results-despues-404-subset.json) | mismos encabezados en es-BO y en-US. La app solo muestra el dibujo en pantallas anchas (`AuthLayout`): diferencia de maquetación aceptada |

Capturas: `estado-{caso}-{web,app}-{360,1280}-{light,dark}.png` y `rutas-{ruta}-{web,app}-360-{antes,despues}.png`. Inventario completo antes: [public-routes-results-antes.json](public-routes-results-antes.json) y [public-routes-results-antes-resto.json](public-routes-results-antes-resto.json); después: [public-routes-results-despues.json](public-routes-results-despues.json) (16/34 iguales; las diferencias restantes están en la tabla del PR: portada del invitado y título de regalos → M21, `/catalogo` → L18, directorio y 404 solo semántica o maquetación, legales aún sin desplegar).

**Cómo se recorrió:** Chrome real (Playwright con `/Applications/Google Chrome.app`). La app: `https://dev.done.arauzsoftware.com` (TEST). La web con el cambio: `next dev` local detrás de un proxy del mismo origen en `:3199` que reenvía `/api/*` al gateway de TEST (el gateway no permite CORS desde `localhost`); es decir, código nuevo contra el backend real de TEST. «Antes» de la web: `https://rsvp-web.161.97.85.216.sslip.io`.

Re-ejecución de los scripts de espejo existentes contra TEST (2026-11-23): `invitation-mirror` (qa-espejo-movil) 21 PASS, exit 0; `directory-mirror` 34 PASS, exit 0; `landing-mirror` 16 PASS, exit 0; `partner-mirror` 8 PASS y luego espera la rejilla de la agenda, que no aparece porque `multicenter-59388c` no tiene disponibilidad (es el estado vacío AGV, ya documentado en ESP-56): el script es anterior a AGV y no se cambió aquí. No se sobrescribieron sus artefactos.

**Diferencias que quedan, registradas en el catálogo** (`bugs/catalogo` de RSVPBackend): M21, el resto del recorrido del invitado (formulario de respuesta, confirmación, portada de la invitación, lista de regalos) sigue con las claves antiguas en la web; L18, `/catalogo` de seo-web es público. Por diseño (A13): `/c/{slug}/regalos/{x}` en la web es el detalle de un regalo y en la app también acepta el token del enlace en la dirección.

**Límites:** no hay enlace de invitado válido en TEST para esta corrida, así que el formulario, el plazo cerrado y los bloqueos con credencial (401/403/404/429 de regalos) solo están `TESTED`. Privacidad y términos no existen todavía en TEST en ningún lado (llegan con fe-07, #61). No se probó en iOS ni Android: las pantallas de la app no cambiaron.

# M21 · El recorrido del invitado en la web pública es el de la app

Fecha: 2026-11-23 · Rama `fix/m21-invitado-web-paridad` (base `integracion/fe-07-web-e-higiene` @ `9945d65`, con #61, #62, #87, #88 y #89). Corrige: **M21** del catálogo.

**Resultado observable:** quien abre su enlace personal en el sitio público (`/c/{slug}/rsvp/{token}`) ve lo mismo que en la app: la invitación en la portada (título, «Te invitan…», fecha · lugar), «¿Nos acompañas?» con **Voy / No puedo**, el contador de acompañantes, la restricción y el mensaje plegados, el check dibujado («Listo, estás dentro.») o el agradecimiento con dibujo si no viene, y un toque a «Ver la lista de regalos». La lista se llama **«Regalos»**, con la celebración debajo, y la reserva se hace en la fila del regalo (no en un diálogo). La portada también está encima de «solo con enlace personal», del plazo cerrado y de los bloqueos de la lista de regalos.

**Causa raíz:** la app tenía su propio texto (`rsvp.invite.*`, `gifts.guest.*`) y su propia lógica de presentación (mensajes de error, cuenta atrás, contador, bloqueos de regalos, portada) dentro de `apps/universal`; seo-web conservaba su copia anterior. Ahora la lógica vive una sola vez en paquetes y las dos superficies la usan:
- `@rsvp/query-hooks`: `rsvpIssueKeys`, `rsvpFailureNotice`, `rsvpSubmitKey`, `nearCountdown`, `companionCount`/`stepCompanions`, y las reglas de regalos (`reserveFieldErrors`, `reserveFailureKind`, `reserveFailureMessage`, `giftListBlocker`, `isReserveRetryable`; antes en `apps/universal/src/guest/reserve-rules.ts`).
- `@rsvp/celebration-theme`: `guestCover` (la portada del invitado).
- `@rsvp/i18n`: se quitan las claves antiguas que ya nadie usa (`rsvp.form/guest/confirmed/success/errors/...`, `gifts.title/reserve/mine/...`); `tests/state-art-sync.test.tsx` cubre también los dibujos nuevos de la web (`welcomeGuest`, `giftReserved`, `noGifts`).

| ID | Requisito | Estado | Comando / artefacto | Resultado |
|---|---|---|---|---|
| M21-01 | Pendiente: portada + «¿Nos acompañas?» + «Voy / No puedo», igual en web y app | PASS (TEST real) | `guest-states-mirror.mjs` con `TOKEN_FILE` · [guest-states-results.json](guest-states-results.json) | 24/24 (2 lados × 360/768/1280 × claro/oscuro × es-BO/en-US), cover=1, axe crítico+serio 0, desborde 0, errores de consola 0 |
| M21-02 | Respuesta real desde la web («Voy» + 1 acompañante), doble clic = 1 POST con Idempotency-Key, check y enlace a regalos | PASS (TEST real) | ídem · [antes de enviar](recorrido-invitado-voy-web-360-light.png) · [después](recorrido-invitado-listo-web-360-light.png) | `posts=1 idempotencyKey=yes giftsCta=1` |
| M21-03 | Confirmado: «Tu asistencia está confirmada», resumen, «Ver la lista de regalos», «Cambiar mi respuesta» | PASS (TEST real) | ídem + [guest-states-results-m21-confirmado-reintento.json](guest-states-results-m21-confirmado-reintento.json) | 1.ª corrida 20/24, 2.ª 21/24: los fallos (distintos en cada corrida, en web y en app) son 429 de TEST por el límite del token de invitado (comprobado con curl: 200, 429, 429). Las 24 combinaciones pasaron en al menos una corrida |
| M21-04 | Regalos con enlace: «Regalos» + celebración, regla, filtros, grupos, «Reservar» en la fila | PASS (TEST real) | ídem | 24/24 |
| M21-05 | Solo con enlace personal: la portada encima del estado, en los dos lados | PASS (TEST real) | ídem | 24/24, cover=1 en web y app |
| M21-06 | Estados sin salida (enlace inválido, legado, sin conexión, regalos sin enlace) siguen iguales | PASS (TEST real) | ídem | 96/96 |
| M21-07 | Declinado con dibujo, plazo cerrado bajo la portada, 409 al enviar, 401 revocado, 429/503/422 que conservan el borrador, registro abierto y RESTRICTED, reserva en la fila, 409 «alguien se adelantó», 429/422 al reservar, nombre >120, filtros vacíos, lista vacía | TESTED | `tests/rsvp-page.test.tsx` (30), `tests/gifts.test.tsx` (32) contra el mock de contrato | no reproducibles en vivo sin tocar la configuración de la celebración compartida |
| M21-08 | Una sola lógica y un solo texto | TESTED | `packages/query-hooks/test/guest-wording.test.ts` (cada clave que devuelven las reglas existe en es-BO), `packages/celebration-theme/src/guest-cover.test.ts` | |

Total de la corrida completa: **189/193 PASS** (los 4 restantes son el 429 de M21-03). Capturas: `recorrido-{invitado-pendiente,invitado-confirmado,regalos}-{web,app}-{360,1280}-{light,dark}.png`, `…-360-light-en-US.png`, y `estado-*` regeneradas.

**Cómo se recorrió:** Chrome real (Playwright con `/Applications/Google Chrome.app`). App: `https://dev.done.arauzsoftware.com` (TEST, la referencia). Web con el cambio: `next build` + `next start` en `:3199` con `NEXT_PUBLIC_API_URL=http://localhost:8300/api`, y un proxy local en `:8300` que reenvía `/api/*` al gateway de TEST con `Origin: https://dev.done.arauzsoftware.com`. Enlace válido: invitado QA **«Invitado QA M21»** (`fbe05144-6d91-4242-905d-4f91db67576c`, 2 acompañantes permitidos) creado en `qa-espejo-movil` con el anfitrión de prueba; respondió «Voy» con 1 acompañante. El token solo vivió en un archivo temporal fuera del repo y nunca se imprimió.

**Límites:** la captura «listo» muestra la cabecera fija del sitio encima del título: es la captura de página completa después de que el foco movió la vista; se añadió `scroll-margin-top` a los títulos de la hoja, pero ese estado (primera respuesta) ya no se puede repetir con el mismo invitado, así que la corrección no se observó en vivo. No se probó en iOS ni Android: en la app solo cambió de dónde vienen las reglas (misma salida, 569 pruebas en verde) y se añadió el enlace a regalos en el plazo cerrado para un invitado confirmado, igual que en la web.

**Líneas base visuales de seo-web** (`npx playwright test e2e/screens.visual.spec.ts`, Chrome real, mock de contrato): se regeneraron a ojo solo las 9 que este cambio mueve a propósito (`rsvp-sin-enlace`, `rsvp-enlace-invalido` y `regalos-sin-credencial` en 360/768/1280). Después: 13 PASS, 8 FAIL en pantallas que este PR no toca (`celebracion-publica` 360/768 y `directorio*` 360/768, diferencias de alto de página del 1-9 %); no se regeneraron y no se comprobó si ya fallaban sobre la base.
