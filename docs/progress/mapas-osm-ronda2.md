# Mapas OSM, ronda 2 (FE)

Rama `feat/req-mapas-osm-fe`. Sin PR abierto. No se tocó FE #81 ni #169 (solo se leyó #169 con la API de GitHub).

## Requisito del usuario: ningún enlace de mapa pegado

- El anfitrión nunca escribe ni ve un enlace de mapa (ronda 1: alta, editor y sedes con búsqueda y pin; `venueMapUrl` solo se escribe como espejo OpenStreetMap para apps viejas).
- **Invitaciones antiguas sin pin:** `LocationView` muestra «Cómo llegar» que abre `https://www.openstreetmap.org/search?query=<dirección codificada>` (la dirección escrita; si no hay, el nombre del lugar), con la nota «Abre la búsqueda de esta dirección en OpenStreetMap; no es un punto confirmado.» Con pin: `https://www.openstreetmap.org/directions?route=;lat,lng`. Si el texto no tiene nada buscable (solo un enlace pegado, símbolos) no hay botón. Se limpian enlaces y correos pegados en la dirección antes de buscar. Código: `packages/celebration-theme/src/location.ts` (`osmSearchHref`, `placeSearchHref`), `map/location-view.tsx`.
- **Lo aprovechado de FE #169:** la función de búsqueda por dirección y su limpieza (`osmSearchUrl` de `packages/location/src/links.ts`) y sus casos de prueba, portados a `celebration-theme/src/location.ts` sin crear un tercer `packages/location` (ya existe el de #169 y el de #163, que chocarían). Lo demás de #169 (`stored.ts`, lectura de enlaces con `legacy-link-unverified`) queda para que lo decida el dueño; ver `mapas-osm-colision-169.md`. Mi rama lee enlaces antiguos con `pointOf` y los muestra «sin verificar».

## Qué entra en esta ronda

| ID | Qué |
|---|---|
| Req. 2 | «Cómo llegar» con búsqueda de OSM para invitaciones sin pin (web SEO, bloque `map` y app por WebView, que reutiliza la misma página) |
| V3 | Pantalla del partner en la app (`apps/universal/src/partner/partner-screens.tsx`): `PlaceView` (nativo con WebView a `/mapa/incrustado?mode=view`, web con iframe del mismo origen), «Ver mapa» solo al pedirlo, «Cómo llegar» (pin o búsqueda), «Copiar dirección» |
| Mapa nativo | `/mapa/incrustado` acepta `mode=view` (pin sobre el lugar, sin mensajes de vuelta) además de `pick`; el WebView solo carga la página del propio sitio. Probado con el stub de WebView, **no** en iOS/Android |
| F9 (parcial) | V6 y V9: la cobertura y la ciudad del evento muestran el nombre (`zoneName`) en seo-web, app y portal; detalle KYP del admin muestra el nombre de la ciudad. **Pendiente:** V7/V8 (directorio y cotización con todas las ciudades de `/providers/geo`, hoy lista fija de 9) |
| F11 (parcial) | `www.google.com` ya no está en `frame-src`/`FRAME_HOSTS` (ronda 1). Quedan: quitar la escritura dual `venueMapUrl` (cuando no queden apps viejas) y regenerar capturas e2e de seo-web (no se pudo) |
| Aviso de publicación | En «Publicar» (borrador): aviso no bloqueante. Con punto: dice que quien tenga el enlace ve el punto exacto y sugiere solo zona si es una casa (D7). Sin punto: dice qué verá el invitado (nombre, dirección y búsqueda en OSM) y ofrece «Marcar el lugar» |
| Texto legal | Sección «Mapas y búsqueda de lugares» en la política de privacidad (es-BO y en-US), borrador como el resto (pendiente de revisión legal): OSM recibe IP al pedir el mapa, la búsqueda pasa por nuestro servidor a Nominatim, caché por huella, punto exacto visible con el enlace |
| Criterio BE/FE de enlaces antiguos | Un solo criterio: `@lat,lng` y `ll` de Google se leen como punto «sin verificar» tanto en el FE (`pointOf`/`resolveLocation`) como en el backfill BE (que los copia como `legacy-link`) |
| Contratos | `packages/contracts` fijado a BE `3269c57c`: celebration 1.9.0, provider-catalog 3.13.0, template-media 1.10.0 (ver tabla en la rama BE `docs/progress/mapas-osm-ronda2.md`; FE #159-#167 no definen versiones de contrato propias, solo siguen las de los PR de BE) |
| Proveedores y admin | Ronda 1: pin y mapa en perfil/micrositio del partner y pin en `/admin/geografia`. Ronda 2: V3 y nombres de ciudad. D6 (pin KYP) y D8 (recogida con dirección) siguen sin hacerse por ser decisiones del dueño |

## Comandos reales y resultados (2026-11-28)

Node 22.23.5, `COREPACK_NPM_REGISTRY=https://registry.npmjs.org corepack yarn` (Yarn 4.10.3), `yarn install --immutable`.

| Comando | Resultado |
|---|---|
| `yarn typecheck` (turbo, 19 tareas) | OK |
| `yarn lint` (eslint raíz con `--max-warnings 0` + turbo, 19 tareas) | OK |
| `yarn turbo run test` (33 tareas) | OK. celebration-theme 3043, universal 869 (68 archivos), seo-web 227, query-hooks 210, ui 333, i18n 18, contracts 6, etc. Una prueba de seo-web asertaba la cobertura en slug crudo (`la-paz, el-alto`); ahora espera `La Paz, el-alto` (el-alto no está entre las 9 ciudades fijas, pendiente V7/V8) |
| `yarn build` (turbo, incluye `next build` de seo-web y `expo export` web de universal) | OK, 19 tareas |
| `yarn workspace @rsvp/contracts check:generated` y `test` | OK; los specs coinciden con BE 601a10bb |
| Pruebas nuevas | `celebration-theme/src/location.test.ts`, `map/location-view.test.tsx` (búsqueda sin pin), `map/picker-bridge.test.ts` (modo view), `apps/universal/test/place-view.test.tsx` (web y nativo, 6 casos) |

## NO probado

- iOS y Android: el WebView nativo (selector y vista de lugar) solo se ejercitó con el stub de `react-native-webview` en jsdom. Falta correrlo en un dispositivo/emulador (foco, VoiceOver/TalkBack, `originWhitelist`, que el iframe de OSM no se necesita porque el mapa es la página propia).
- Playwright con Chrome real contra el backend real (ver recorridos abajo), Docker, Kong, Nominatim y teselas reales (la red de la sesión no llega a openstreetmap.org: curl devuelve 000), gitleaks (no instalado; diffs revisados a mano, sin secretos ni datos personales).
- No se regeneraron capturas e2e de seo-web.

## Arranque para quien haga los recorridos

1. Backend: en `/home/user/wt/be-mapas-osm`, `COREPACK_NPM_REGISTRY=https://registry.npmjs.org corepack yarn install --immutable` y `yarn turbo run build --filter=@rsvp/celebration-site-service... --filter=@rsvp/provider-catalog-service...`. PostgreSQL 16 ya inicializado en `/home/user/pg-mapas` (puerto 5441, rol `postgres` sin contraseña en loopback; arrancar con `runuser -u postgres -- /usr/lib/postgresql/16/bin/pg_ctl -D /home/user/pg-mapas -o "-p 5441 -c listen_addresses=127.0.0.1 -c unix_socket_directories=/tmp -c timezone=UTC" -l /home/user/pg-mapas/log.txt start`). Servicios con su base propia y rol no superusuario; para provider-catalog: `PROVIDER_DATABASE_URL`, `PROVIDER_IDENTITY_JWKS_URL`, y para la búsqueda `GEOCODING_ENABLED=true`, `GEOCODER_USER_AGENT="DOne/1.0 (+https://example.test; roles@example.test)"`, `GEOCODER_URL` apuntando a un Nominatim falso local (hay uno en `apps/provider-catalog-service/test/integration/map-geo-search.test.mjs`) porque la red real está bloqueada.
2. Frontend: `corepack yarn install --immutable` (hecho) y `yarn workspace @rsvp/seo-web dev` y `yarn workspace @rsvp/universal web`. Variables: `EXPO_PUBLIC_*` apuntando al backend local; `MAP_TILE_URL` (backend) a un servidor de teselas local si la red de teselas está bloqueada.
3. Sin Docker no hay gateway: usar los servicios directos y el proxy de desarrollo existente de `apps/universal/scripts/live/`.

## Recorridos a ejecutar (Chromium)

1. **Invitación antigua sin pin:** celebración con `venueName` y `venues[].address` pero sin `locations` ni `venueMapUrl`. En `/c/{slug}/lugares`: hay «Cómo llegar» que abre `openstreetmap.org/search?query=...` con la dirección codificada, nota «no es un punto confirmado», «Copiar dirección»; no hay ningún enlace a Google/Waze/Apple (inspeccionar `href`).
2. **Invitación antigua con enlace de Google con coordenadas:** muestra «sin verificar» y «Cómo llegar» a `directions`; un enlace corto (`maps.app.goo.gl`) cae al caso 1, nunca se sigue ni se muestra.
3. **Con pin:** «Ver mapa» no pide nada a OSM hasta tocarlo; al tocarlo carga teselas con atribución; mapa caído muestra el aviso y el enlace «Abrir en OpenStreetMap».
4. **Anfitrión:** alta y editor sin campo de enlace; buscar (solo al pulsar, teclear no llama al servidor), elegir resultado, mover el pin, «Listo»; cambiar el nombre del lugar avisa «Revisa el punto»; sede secundaria con su pin; agenda con lugar y `venueKey` preservado al guardar otra sección.
5. **Publicar:** aviso con y sin punto, «Marcar el lugar» navega al editor; publicar no se bloquea.
6. **Partner `/p/{slug}`** (seo-web) y pantalla del partner en la app (web): dirección, mapa al tocar, «Cómo llegar», nombres de ciudad en cobertura y cotización.
7. **Admin `/admin/geografia`:** pin con coordenadas numéricas como alternativa accesible.
8. **Privacidad:** `/privacidad` incluye «Mapas y búsqueda de lugares».
9. **Negativos:** 429/503 del buscador (mensajes `searchBusy`/`searchOff`), sin conexión, `mode=view` de `/mapa/incrustado` sin pin central, WebView nativo rechaza otras URLs (en dispositivo).
10. **Móvil (iOS/Android):** selector nativo de ubicación y `PlaceView` del partner; VoiceOver/TalkBack.
11. **Backfill (BE):** simulacro del CLI en TEST y comparar contra el conteo de invitaciones con `venueMapUrl`.

## Correcciones tras el recorrido con backend real

1. **Horario del partner.** El contrato `BusinessHours` es un objeto `{ weekly: [{ weekdays, opens, closes }], note? }`; `partner.hours` se trataba como lista de textos y `partner.hours.map` reventaba. Ahora `hoursLines` (`packages/query-hooks/src/provider/partner.ts`) convierte el objeto en líneas («Lun, Mar 09:00-18:00», la nota al final), acepta aún una lista de textos, ignora filas mal formadas y nunca lanza. `DirectoryCard.hours` se tipa con el tipo generado del contrato. Prueba `packages/query-hooks/test/partner-hours.test.ts`: fixture tipada con el contrato generado y comprobación de que el spec vendorizado define `BusinessHours` como objeto con `weekly`.
2. **«Ver mapa» del partner en la app web en blanco.** `/mapa/incrustado` heredaba `X-Frame-Options: DENY` y `frame-ancestors 'none'`. Ahora es la segunda y última página enmarcable (junto a `/vista-previa`): sin `X-Frame-Options` (no admite dos orígenes) y con `Content-Security-Policy: frame-ancestors 'self' <NEXT_PUBLIC_APP_URL>`, `noindex`. El resto de rutas sigue en `DENY` y `frame-ancestors 'none'`. La página es solo un mapa con un pin, sin formularios ni acciones, así que no abre clickjacking útil. **`NEXT_PUBLIC_APP_URL` debe valer el origen de la app en el build de seo-web** (cabeceras calculadas al construir). Prueba en `apps/seo-web/tests/security-headers.test.ts` (la regla global excluye exactamente las dos rutas; `/mapa`, `/mapa/incrustado/x`, etc. siguen en DENY).
   - Verificado con `next start` (build de producción) y curl: `/mapa/incrustado` responde `Content-Security-Policy: frame-ancestors 'self' http://localhost:8100` y sin `X-Frame-Options`; `/` y `/privacidad` siguen con `X-Frame-Options: DENY` y `frame-ancestors 'none'`. No había stack de recorridos encendido (el contenedor se reinició), así que **no** se repitió en Chromium real el iframe de «Ver mapa».
