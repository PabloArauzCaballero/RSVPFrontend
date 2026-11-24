# Decisiones (frontend)

## Eje B (Leo) · 2026-10-17

- **Un renderer, cinco layouts como datos.** `@rsvp/celebration-theme` traduce la fila del template (paleta, tipografías, estilo, orden de secciones) a variables CSS en web y a contexto en React Native. Los layouts son especificaciones (`src/layouts`), no componentes. Modo oscuro derivado: superficies oscuras neutras con el acento del template.
- **Secciones vacías no se renderizan**, y una sección que el template no ubica queda oculta, nunca borrada.
- **Ningún cálculo de zona horaria en el cliente.** La API devuelve `localTimes` y acepta hora de pared (`YYYY-MM-DDTHH:mm`) que interpreta en la zona de la celebración; las pantallas solo formatean con `Intl` y `timeZone`.
- **`@rsvp/i18n/server`**: entrada sin React para componentes de servidor de Next (react-i18next crea un contexto al cargarse y rompe en RSC). Los textos de Leo viven en `locales/*/{celebration,directory,host,admin}.ts`; un tipo obliga a que `en-US` tenga las mismas claves que `es-BO` y una prueba lo verifica.
- **Sin regla de lint para textos fijos (no existe en el repo): son pruebas** que escanean el JSX de las pantallas de Leo en seo-web y universal.
- **Metadatos en `<head>` para cualquier user agent** (`htmlLimitedBots: /.*/`). Next 15 transmite los metadatos de páginas dinámicas en el `<body>` a quien no reconoce como bot; WhatsApp y Lighthouse se quedaban sin tarjeta ni descripción.
- **Fotos públicas con URL estable** (`/media/public/assets/{id}/{variante}` → 302 a una URL firmada fresca). Las URLs firmadas vencen y no pueden vivir en HTML cacheado ni en tarjetas de Open Graph.
- **Admin bajo `/admin/...`** (`app/(admin)/admin/*`): `(admin)/templates.tsx` del plan chocaría con `/templates` del anfitrión, porque los grupos no forman parte de la URL.
- **Navegación de pantallas como callback** (`onNavigate`) y celebración en `?c=`: las pantallas no importan expo-router y se prueban con Testing Library sobre react-native-web.
- **Sesión web**: la producción mantiene el diseño de F05 (cookies httpOnly, sin token en JS). Mientras Identity no emita esas cookies, el desarrollo local inyecta un token con `EXPO_PUBLIC_DEV_ACCESS_TOKEN`, ignorado en builds de producción.
- **Metro y Next resuelven `./x.js` → `x.ts`** en los paquetes del workspace (estilo NodeNext); sin eso, ni el build web de Expo ni el de Next compilaban.
- **Directorio de proveedores sin datos inventados**: si el catálogo no responde, la página lo dice. Categorías y ciudades son la referencia del catálogo, con slugs en español para SEO.

## Rediseño visual · 2026-11-03
- Mundo visual: **aguayo boliviano**. Vino profundo `#3A0D2B` como región comprometida, magenta `#8C1D5A` primario, azafrán `#F2A900` acento, turquesa y bermellón de apoyo; lienzo rosa frío `#FBF8FB`, nunca crema.
- Tipografía web: Bricolage Grotesque (display) y Figtree (texto) vía `next/font`. Nativo conserva la fuente del sistema hasta empaquetarlas con `expo-font`.
- Corrección: la regla `no-literal-strings` sí existe en `config-eslint` (no habilitada).

## Eje A (Pablo) · plataforma frontend · 2026-11-03
- **Fuente única de tokens:** `packages/design-tokens/src/*.ts` genera `generated/tokens.json|css` y los presets; se eliminaron los hex duplicados.
- **Cliente tipado local** `packages/contracts` (openapi-typescript desde los 8 specs) mientras el paquete publicado no exista; romper el contrato rompe `tsc`.
- **`darkMode` por clase no se usa en el preset** (genera `@cssInterop` que NativeWind nativo no parsea).
- **Sesión web en memoria** hasta que Identity emita cookie httpOnly; recargar la página cierra la sesión.
- **Regla `no-literal-strings` habilitada**, con una lista temporal `LEGACY_LITERAL_FILES` (ui, ui-web, components/rsvp) fuera de la regla.
- **Lighthouse CI** usa `configPath` con `.lighthouserc.json` (el `budgetPath` anterior no aplicaba el umbral) y mide 4 rutas.

## Rediseño con el DOne Brand Kit v3 · 2026-11-06
- **Marcos, no pantallas sueltas.** Las pantallas autenticadas pasan por un único `Screen` (`apps/universal/src/host/shell.tsx`): menú lateral noche con secciones (≥ 960 px) o barra superior + pestañas + «Más» (móvil). Invitado: `GuestFrame`; ingreso: `AuthLayout`. Cambiar el marco cambia todas las pantallas a la vez. Reglas y prohibiciones en `DESIGN.md`.
- **`Logo` es el SVG real** (`packages/ui/src/logo*.tsx`); nativo usa `react-native-svg`. Prohibido texto o glifos como logo o icono.
- **Tipografía nativa empaquetada** (`expo-font` + `@expo-google-fonts/plus-jakarta-sans`). React Native elige archivo por familia, no por `fontWeight`: `src/platform/fonts.native.ts` asigna la familia según el peso del estilo una sola vez, para que ninguna pantalla nombre una familia.
- **Token `fieldBorder`** (3:1, WCAG 1.4.11) para contornos de campos; `border` queda para divisores.
- **Causa raíz de campos sin estilo:** `Input` dejaba que un `style` recibido (p. ej. de `Field`) pisara todo su estilo base. Ahora lo combina.
- **Compuerta visual de la app Expo** (`apps/universal/e2e`, `yarn workspace @rsvp/universal test:visual`): 51 rutas × 390/768/1440 px contra el servidor de contrato (`scripts/visual-mock.ts` + `visual-fixtures.ts`). Antes no existía ninguna prueba visual de host, admin, portal ni invitado. Al agregar una pantalla, se agrega a `e2e/screens.ts`.
- **Área segura:** la aplica solo `SafeFrame` en la raíz (PR #7); el marco nuevo no suma insets.

## Botones, errores y CRUD por pantalla · 2026-11-06
- **Solo se ofrece lo que el backend soporta.** Cada botón de CRUD se contrastó con los contratos OpenAPI: si hay operación y faltaba el botón, se creó; si no hay operación (editar/borrar regalo, oferta, grupo, usuario…), no hay botón y queda como brecha de backend en `docs/progress/evidence/botones-crud-2026-11-06.md`. No se simula lo que el servidor no hace.
- **Un solo módulo contra el doble envío** (`apps/universal/src/platform/single-flight.ts`): `isPending` cambia un render tarde, así que un doble clic llega dos veces al manejador. Tres guardas con nombre propio: `useSingleFlight` (callback con `release`), `useSingleFlightGate` (`begin`/`end`) y `useSingleMutation` (envuelve una mutación). Se rechazó bloquear dentro de `ActionButton`: no puede saber si una pulsación inicia una escritura y rompía 19 pruebas de pantallas con pasos intermedios.
- **Errores por código, no por estado.** `errorMessage`/`ErrorNotice` distinguen 429 (con `Retry-After`), 5xx, red caída y los 409 por `problem.code` (`SLUG_TAKEN`, `CELEBRATION_ARCHIVED`, `INVALID_TRANSITION`…): un 409 ya no significa siempre «alguien guardó cambios».
- **Límites en cliente iguales o más estrictos que el servidor**, porque el backend acepta, por ejemplo, un título de 20 000 caracteres.
- **El refresh de sesión sigue corriendo en rutas de invitado**: con cookie httpOnly no se sabe si hay sesión, y omitirlo dejaría sin sesión a un anfitrión que abre un enlace de invitado. El 401 anónimo en consola es esperado.
- **Plurales:** el i18n no tiene plurales; los textos con contador se redactan sin depender del número («Acompañantes permitidos: N»).
- **seo-web negocia el idioma** (`middleware.ts`: `?lang=`, cookie `rsvp-lang`, `Accept-Language`, con `Vary`) en vez de duplicar rutas `/en`. Consecuencia: landing, directorio y fichas son dinámicas (sin caché estática); categoría y ciudad siguen estáticas. Reevaluar `/en/...` si el SEO por idioma lo pide.
- **Las referencias visuales de seo-web fijan `locale: es-BO`**: el idioma del producto es el español y la negociación por `Accept-Language` convertiría en inglés las capturas hechas con el navegador por defecto.
- **`SwitchRow` único** en `packages/ui` para ajustes de encendido/apagado: la fila completa es el objetivo táctil (56 px) y responde a Espacio y Enter; se descarta el `Switch` nativo (20 px).
- **Las matrices en vivo excluyen únicamente** los 502/503 de media, plantillas, dispositivos y entregas push, porque esos servicios no se despliegan en el mundo local; cualquier otro error cuenta como fallo.

## Personalidad, simplificación y datos de demostración · 2026-11-07
- **El cheque de la D es el único gesto de celebración** (`CheckMark`/`Celebrate`): se dibuja una vez por hito (confirmar, publicar, guardar, primer invitado) y respeta reduced-motion. Ninguna otra animación decorativa ni en bucle.
- **Un destino por sustantivo, no por pantalla:** el anfitrión pasa de 17 a 6 destinos, el proveedor a 5 y el admin a 4, con pestañas de sección. Las rutas no se mueven (enlaces compartidos) y varias pantallas comparten pestaña (p. ej. servicios, productos y entrega son una sola lista de ofertas).
- **Una acción primaria por pantalla;** lo demás, tras «Más opciones» o como enlace. La acción cambia con el siguiente paso real (Inicio, regalos con reservas por revisar, publicar con datos pendientes).
- **Solo se ofrece lo que el backend soporta.** Las fusiones no inventan operaciones; las brechas siguen documentadas.
- **Las referencias visuales usan un reloj fijo** (`e2e/clock.ts` + `now` del servidor de contrato): el plazo, la frescura y las cuentas atrás se calculan a partir de «ahora» y una captura que se mueve con el reloj real caduca.
- **en-US es americano** («organizing», «canceled», «catalog»).
- **Nueva claves de i18n por espacio, sin cambiar valores que usa seo-web** (`rsvp.invite.*`, `gifts.guest.*`): seo-web migra cuando quiera; la app Expo ya usa las nuevas.
- **seo-web sigue negociando idioma por `?lang=`/cookie/`Accept-Language`** (no `/en/`): `seo-audit` recomienda subdirectorios; se deja como decisión del dueño por tocar el middleware y enlaces ya compartidos.

## Modo oscuro, movimiento e identidad ampliada · 2026-11-08
- **El oscuro se compone, no se invierte:** escala de superficies noche < canvas < surface < surfaceMuted, acento cielo, ámbar solo «quizá» y avisos; contraste medido por pares en pruebas. Regiones de marca iguales en ambos modos.
- **Una sola fuente de tema:** `useColors()` / `useStyles()` / `useThemedStyles()`; sin `colors.light` ni hex sueltos en pantallas, sin exports estáticos. Las ilustraciones usan el tono semántico `auto`.
- **El movimiento pasa la puerta de frecuencia y propósito** (`docs/design/motion.md`): se anima lo que orienta (cambio de destino, pasos, listas, tocar, cargar), no lo que se usa decenas de veces al día (resaltado de pestaña) ni lo decorativo. Tokens en `packages/ui` (no en `design-tokens`: son comportamiento, no valores de marca).
- **Los esqueletos son `role=status` + `aria-busy`:** toda prueba que espere carga debe esperar también `[aria-busy=true]`.
- **Sin hápticos hasta tener dispositivo para verificarlos.**
- **Las referencias visuales oscuras se añaden como suites separadas** (`*.dark.visual.spec.ts`, 15 rutas) en vez de duplicar las 159 claras.

## Recursos y sesión de la imagen web · 2026-11-17

- **API del mismo origen en la imagen universal:** el JavaScript usa `/api` y nginx reenvía al gateway configurado en el build, con TLS verificado. Identity ya emite una cookie HttpOnly/Secure/SameSite=Strict; una API en otro sitio impedía restaurarla al recargar. Se descartan persistir tokens en localStorage o relajar SameSite. Se ajusta solo el Path de la cookie para el prefijo del proxy. Expo de desarrollo y apps nativas conservan su URL configurada. Hace falta un ingreso inicial después del despliegue; reversión mediante la imagen anterior.
- **La caché sigue el trabajo pendiente:** Media consulta cada 2 s mientras haya `PROCESSING`; invitados hace lo mismo cuando el contrato informa eventos pendientes. Las mutaciones invalidan las consultas relacionadas; no hay recarga de documento. Fallar una restauración de sesión por red/5xx muestra reintento; solo un rechazo 401 implica sesión anónima. Evidencia, alcance y controles pendientes: [session-refresh](evidence/session-refresh/README.md).

## Espejo web en la app · invitación pública · 2026-11-20

- **La invitación pública vive también en la app, en las mismas direcciones** (`/c/{slug}` y `/c/{slug}/{sección}` en `apps/universal/app/(guest)/c/[slug]/`). Hoy la imagen desplegada en `dev.done.arauzsoftware.com` es la app Expo y respondía «Esta página no existe» a esas rutas. Un enlace compartido significa lo mismo en el sitio, en la app y en el navegador del celular.
- **Un solo renderer nativo con acciones opcionales** (`NativeRendererActions` en `@rsvp/celebration-theme/native`: `openUrl`, `partnerUrl`, `openSection`). Con acciones es la invitación del invitado (navegación de secciones, «Cómo llegar», fotos a tamaño completo, recomendaciones por `/r/{listingId}`); sin acciones sigue siendo la vista previa quieta del anfitrión y del admin. Se descartó una segunda pantalla nativa propia de la app: duplicaría el orden de secciones, los layouts y la regla de contenido vacío que ya comparten web y nativo.
- **Misma lógica de lugares en ambos renderers** (`shownVenues` en `content.ts`), en lugar de copiarla.
- **Misma regla 404 que la web:** una ruta que no es sección no consulta nada; una sección que el template no ubica o sin contenido no es página; un slug desconocido o no publicado (404) se distingue de una caída del servidor (5xx, con reintento).
- **Idioma:** la invitación se pide con `Accept-Language` del idioma de la app y se ofrecen solo los idiomas de la celebración; los títulos de sección siguen el idioma de la invitación (como la web). El selector usa la tinta de la plantilla, no el esquema de la app (en oscuro escribía claro sobre claro: hallado por axe en vivo).
- **Partner desde la app:** `partnerRedirectUrl(listingId, { surface: "APP", celebrationId })`; un `listingId` que el redirector no acepta (no UUID) se muestra sin enlace en vez de romper el toque.
- **Regalos en la app como en la web:** `/c/{slug}/regalos` (A14) y `/c/{slug}/regalos/{id}` (A15). Un segmento UUID es un regalo y cualquier otro es la credencial del enlace personal, que la app ya aceptaba en esa dirección; así no se rompe ningún enlace emitido. La credencial se guarda por celebración para la sesión: `sessionStorage` en web con la misma clave que el sitio público, y memoria del proceso en nativo (nunca el llavero ni una query key). Un 401 la olvida. Los filtros y el orden usan una sola función (`arrangeGifts` en query-hooks) para la web y la app.
- **Directorio en la app con los datos de la web:** categorías, ciudades, `providerSearchPath`, paginación y el agrupador de impresiones viven en `@rsvp/query-hooks/provider/directory`; la web los reexporta. La app cuenta impresiones con `FlatList.onViewableItemsChanged` (50 % visible durante 250 ms), la misma regla que el `IntersectionObserver` de la web. «Cerca de mí» se ofrece solo donde la plataforma tiene geolocalización; no se agregó `expo-location` (dependencia nativa y permiso nuevo) para este espejo.
- **Etiqueta de categoría:** traducción propia, luego el nombre de `GET /providers/categories` en el idioma de la página, luego el código. Las categorías son datos que el admin extiende; una lista fija en i18n siempre irá por detrás.
- **Micrositio en la app con el modelo de la web:** `loadPartnerContext` (query-hooks) recorre las páginas del directorio para el slug, resuelve el proveedor (tarjeta o `GET /listings/{id}`) y su perfil público; no verificado o 404 es «no encontrado», un catálogo caído es «no disponible». Contactos con `surface=APP`. Cotizar y pedir fecha usan la sesión de la app (no la del visitante de la web) y un 401 lleva a `/login?returnTo=`. Sin captcha en la app: el servidor sigue decidiendo (403) y con sesión no aplica.
- **Portada de la app (2026-11-21, decisión del dueño):** en el navegador, `/` sin sesión muestra la misma portada que el sitio público; en iOS y Android abre el login, como cualquier app instalada; con sesión va al inicio del rol en todas. Se elige por plataforma con `src/landing/anonymous-home.tsx` / `.web.tsx` (ninguno importa al otro). La portada de la app es solo web y dibuja con SVG en línea, el patrón web de `packages/ui`. El contenido de muestra vive en `@rsvp/i18n` para que web y app muestren lo mismo.
- **Zonas de cobertura:** una vez por lugar como se ve (slug de ciudad = su nombre), sin distinguir mayúsculas ni espacios, en ambas superficies (`uniqueZones`).
- **Archivos de plataforma (2026-11-20):** un `x.native.ts`/`.ios`/`.android`/`.web` nunca importa en tiempo de ejecución `./x`, porque en Metro eso resuelve al propio archivo (la app nativa no arrancaba por `motion.native.ts`). Lo compartido vive en un archivo sin variante (`motion-tokens.ts`, `logo-shared.ts`, `notice-glyphs.ts`), y `packages/ui/src/platform-files.test.ts` lo exige en todo el monorepo.
- **Foto de portada nativa:** la altura se calcula a partir del ancho medido (`coverPhotoHeight`) en lugar de `aspectRatio` + `maxHeight`, porque Yoga reduce el ancho para respetar el tope y la foto quedaba angosta.
- **Verificación nativa con Maestro sobre Expo Go:** los flujos viven en `apps/universal/e2e/maestro/`, reciben la plataforma por `APP_ID`/`BASE` y el token de invitado solo como variable de ejecución. Con un build propio funcionan igual cambiando `APP_ID` y `BASE=rsvp:/`.
- **Dos orígenes en la app (2026-11-20):** `siteOrigin()` = origen de los enlaces personales de RSVP (`EXPO_PUBLIC_RSVP_ORIGIN`, sin cambios). `publicSiteOrigin()` = el sitio público (`EXPO_PUBLIC_SITE_URL`), donde viven `/r/{listingId}` y las páginas indexables; lo usan `partnerRedirectUrl` y el enlace «ver publicada» de la vista previa. Sin `SITE_URL` se usa el origen de RSVP, correcto solo con un dominio para ambos; con dos dominios la variable es obligatoria (runbook `releases.md`). Se descartó servir `/r` también en el dominio de la app: duplicaría el redirector y su atribución fuera del sitio que la mantiene.

## Idioma del dispositivo en la app nativa · 2026-11-21

- **El idioma de la persona se lee del sistema con `expo-localization` (`getLocales()`), no de `Intl`.** En iOS, `Intl…resolvedOptions().locale` refleja el idioma del bundle, limitado a las localizaciones que declara la app, y no la preferencia de la persona. `Intl` queda solo como último recurso si el módulo no responde. El orden de REQ-F06-05 se mantiene: elección explícita > preferencia guardada > dispositivo.
- **La app declara sus idiomas al sistema** (`expo-localization` con `supportedLocales: ["es", "en"]` en `app.config.ts`) para los builds propios: `CFBundleLocalizations` en iOS y `locales_config` en Android. Esta lista tiene que ir a la par de `supportedLocales` de `@rsvp/i18n`.

## Errores de render y telemetría del frontend (M11) · 2026-11-21

- **Cada layout de `apps/universal` exporta `ErrorBoundary`** (raíz y grupos `(admin)`, `(auth)`, `(guest)`, `(host)`, `(provider)`), con la misma pantalla (`src/platform/error-boundary.tsx`): texto i18n, «Reintentar» (el `retry` de Expo Router) e «Ir al inicio». No depende de ningún contexto de la app, porque el límite raíz se pinta fuera de `AppProviders`; el idioma sale del i18n activo, si existe, o de la preferencia guardada y del dispositivo (es-BO por defecto). En seo-web, `app/error.tsx` (ya existía) informa del error y `app/global-error.tsx` cubre el fallo del layout raíz con su propio `<html lang>`.
- **`@rsvp/telemetry` envía los errores como registros OTLP/HTTP** (`POST {endpoint}/v1/logs`), el mismo formato que `OtlpLogSink` del backend, para que lleguen a Loki por el mismo Collector. Variables: `EXPO_PUBLIC_OTLP_ENDPOINT` (app) y `NEXT_PUBLIC_OTLP_ENDPOINT` (seo-web). Sin la variable, la telemetría es `noOpTelemetry` y no sale nada.
- **Sin datos personales (PF-1):** mensaje y stack pasan por `redactText` (correos, teléfonos, JWT, UUID, tokens largos y la query de las URL), la ruta se envía como forma (`routeShape`: `/c/boda-ana/rsvp/x` → `/c/:/:/:`) y no se adjunta usuario, correo ni token. Tope de 20 informes por carga de página. Alternativa descartada: un SDK de terceros (Sentry), que añadiría un proveedor y un tratamiento de datos que D-1..D-8 no contemplan.

## División del bundle web por zonas (M13) · 2026-11-21

- **Las zonas `(host)`, `(admin)` y `(provider)` cargan sus pantallas con `lazyScreen(load…Screens, (zone) => zone.X)`** (`src/platform/lazy-screen.tsx`). Cada zona tiene un barril `src/<zona>/screens.ts` que solo se alcanza con `import()` desde `src/<zona>/load.ts`, así Metro emite un chunk por zona que se descarga al abrir su primera ruta. `test/lazy-zones.test.tsx` falla si una ruta de esas zonas importa su pantalla de forma estática o si alguien importa el barril.
- **Descartado `asyncRoutes` de Expo Router:** parte cada ruta, pero junta todo lo compartido en un `__common` que se carga al inicio (entry 1,13 MB + common 1,06 MB, casi igual que antes) y obliga a tocar `app.config.ts`.
- Un fallo de descarga del chunk llega al `ErrorBoundary` de la ruta y el reintento vuelve a pedirlo (no se reusa la promesa rechazada de `React.lazy`).

## Error log de nginx sin credencial del invitado (L20) · 2026-11-23

- **Las rutas de la API con credencial de invitado tienen su propia `location` sin error log de petición.** `/api/rsvp/…`, `/api/c/{slug}/rsvp/…` y `/api/c/{slug}/regalos/…` (las mismas que el `map` de A13 redacta en el access log) van a una `location` anidada en `/api/` con `error_log /dev/stderr emerg;`. nginx no escribe ninguna petición a ese nivel, así que un fallo del upstream (conexión, DNS, timeout, TLS) no deja la línea `request: "GET /api/rsvp/{token}"` en stderr; el access log sigue registrando el 502/504 con `/[guest-credential-path]`. El resto de `/api/` conserva su error log. Se descartó `crit`: un handshake TLS fallido con el upstream se registra en `crit` con la petición. Se descartó sacar la credencial de la ruta (cambio de contrato en Guest, mayor alcance).
- **El proxy de `/api/` vive en un snippet** (`deploy/nginx-api-proxy.conf` → `/etc/nginx/snippets/api-proxy.conf`), incluido por las dos `location` y renderizado por `render-nginx-spa.sh` con la misma URL, para no duplicar la configuración de L19 y B1.

## Prototipos de plantillas (PR #117, F4): decisiones pendientes de Pablo · 2026-11-24

- **Acento de Gala: vino o dorado.** El prototipo usa vino (`#7B2A3C` claro, `#E6A3B1` oscuro, matiz 347°) porque el dorado anterior (`#6E5200`, `#CDAE6C`, matiz 41–45°) es el tono del amarillo del sistema y la regla es «nunca amarillo». Decide Pablo; cambiarlo son dos tokens en `docs/design/prototipos-plantillas/_build/tokens.mjs`.
- **Nombre de la plantilla.** El prototipo se titula «Gala art déco»; la semilla `016` se llama «Gala dorada». Decide Pablo cuál se conserva.
- **Redacción de los avisos y de «Ver mi respuesta»** (plazo vencido, regalos vacío/cerrado, sin enlace personal): son propuestas, no copy aprobado.
- Hecho sin decisión de Pablo (verificable en el catálogo): las tres parejas tipográficas salen del catálogo curado de F1, así que no se amplía el catálogo.
