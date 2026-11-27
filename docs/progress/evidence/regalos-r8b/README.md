# R8b FE · Moderación del admin (`/admin/productos`)

- Fecha: 2026-11-27. Rama `feat/regalos-r8b-moderacion`, creada desde `origin/feat/regalos-r6a-leads` (FE #147, punta `fbc73c27`).
- Plan: `PLAN-REGALOS-PROVEEDORES.md` §5.13 (moderación), §5.14 (privacidad, PF-1), §8 fila R8; decisiones 17 y 18. BE: PR #169, `feat/regalos-r8b-moderacion` @ `07b3c855` (el recorrido en vivo de abajo corrió antes, contra `e2ea4cfb`).
- Contratos: `generate --ref 07b3c855b96e7824057c3e72111a4103a17579f4` con el generador oficial (provider-catalog **3.11.0**; gift-list 1.16.0, celebration 1.6.0 sin cambio). Ningún archivo generado se editó a mano; `check:generated` y `check:source` pasan.
- Nivel: **TESTED** (unitarias + recorrido en Chrome real contra el servicio real provider-catalog sobre PostgreSQL 16). **NO VERIFIED, NO DONE**: falta el recorrido con el gateway Docker (Kong) y TEST, y el recorrido real de la pantalla del proveedor.

## Qué se construyó (vertical slice: el admin oculta un producto y deja de recomendarse)

| Pieza | Dónde | Resultado observable |
|---|---|---|
| Hooks de moderación | `packages/query-hooks/src/admin/product-moderation.ts` (tipos del contrato generado) | `useProductModerationInbox` (cursor por `nextCursor`), `useHideListing`, `useShowListing`, `useSetListingFeatured`; tras cada decisión se invalida la bandeja (lista y contadores) y las lecturas `["providers"]`; la ocultación y el destacado son idempotentes por estado (el servicio contesta `replayed`) |
| Pantalla | `apps/universal/src/admin/products/products-screen.tsx`, ruta `app/(admin)/admin/productos.tsx`, pestaña «Productos» en el grupo Revisión | Pestañas Recientes / Ocultos con contadores del servidor; filtros `days`, `category`, `featured`, `completeness` y `providerId` (UUID validado); «Ver más» por cursor; Ocultar con confirmación y motivo obligatorio (3 a 500, una línea), Mostrar, interruptor `featured` (deshabilitado con explicación si está oculto); carga, vacío, error con reintento, 401/403/404/409/422 con texto propio |
| Motivo del ocultamiento al proveedor | Ya existía en #147: `product-editor-screen.tsx` muestra `portal.product.summary.hidden` con `ProductSheet.adminHiddenReason`; R8b FE **no lo duplica** | Verificado por API en vivo (L3) y por la prueba unitaria existente; ver «No verificado» |
| `ReasonDialog` | `apps/universal/src/admin/shared.tsx`: `minLength`, `multiline`, `busy` opcionales | El resto de usos no cambia |
| i18n | `packages/i18n/locales/{es-BO,en-US}/admin.ts`: `admin.nav.products`, `admin.products.*`, `admin.common.reasonTooShort`, códigos de error nuevos | Todo texto nuevo en los dos idiomas |

Fechas: el admin ve los instantes en su propia zona horaria (`useStamp`, igual que el resto de pantallas admin); la bandeja no pertenece a una celebración.

PF-1: la bandeja solo muestra lo que da el contrato (ids y texto de catálogo: título, proveedor, categoría, precio, estados, motivo). Una prueba verifica que la pantalla no muestra datos de invitados.

## Suites (2026-11-27, Node 22.23.5)

| Comando | Resultado |
|---|---|
| `corepack yarn workspace @rsvp/contracts generate --ref e2ea4cfb… ` (con `RSVP_BACKEND_REPO`) | 8 contratos, provider-catalog 3.11.0 |
| `corepack yarn workspace @rsvp/contracts check:generated` / `check:source` | OK / OK (contra el commit del BE) |
| `corepack yarn lint` | 19/19 tareas OK (eslint `--max-warnings 0` incluido) |
| `corepack yarn typecheck` | 19/19 tareas OK |
| `@rsvp/contracts` test | 6/6 |
| `@rsvp/api-client` test | 17/17 |
| `@rsvp/query-hooks` test | 185/185 (8 nuevas en `admin-product-moderation.test.tsx`) |
| `@rsvp/i18n` test | 15/15 |
| `@rsvp/universal` test (`vitest run`) | 800/800 (16 nuevas en `admin-products.test.tsx`; la prueba «sin texto escrito a mano» detectó una expresión en `shared.tsx` y se corrigió) |
| `corepack yarn workspace @rsvp/seo-web build` | OK |
| `corepack yarn harness:validate` | OK |
| gitleaks | **no corrido**: no está instalado y no hay descarga en el sandbox; revisión manual del diff sin secretos (los JWT del recorrido en vivo son de una llave desechable y no se guardan) |

## Recorrido en Chrome real contra el servicio real

`apps/universal/scripts/live/admin-productos.mjs` (resultado: `live-admin-productos.json`, capturas `live-*.png` a 1280/768/360).

- BE: la rama #169 (`e2ea4cfb`) construida y levantada con el arnés `be-harness.mjs` (servicio **provider-catalog real**, PostgreSQL 16 local en `/var/tmp`, migraciones de producción, rol no superusuario, JWKS propio). Docker no corre en el sandbox, así que **no pasó por Kong**.
- FE: la app Expo web en modo desarrollo con `EXPO_PUBLIC_API_URL` apuntando a `scripts/live/cors-proxy.mjs` (reenvía los bytes sin cambios y solo agrega CORS) y el JWT de ADMIN del servicio en `EXPO_PUBLIC_DEV_ACCESS_TOKEN`.
- Cada escritura se relee con HTTP directo, nunca solo desde la interfaz.

| Id | Qué se comprobó | Resultado |
|---|---|---|
| L1 | 3 productos publicados, contadores 3/0, sin datos personales, axe sin críticos ni serios | PASS |
| L2 | Motivo «ab» se rechaza en el diálogo y no sale ninguna escritura | PASS |
| L3 | Ocultar con motivo: `POST …/hide` 200; `GET /listings/{id}` y `GET /r/{id}` pasan a 404 (con control: otro producto visible responde 200); la bandeja HIDDEN cuenta 1 con el motivo; la ficha del dueño dice `HIDDEN_BY_ADMIN` con el motivo; `GET /listings` ya no lo lista | PASS |
| L4 | Pestaña Ocultos: motivo y fecha, interruptor deshabilitado; el servicio también rechaza destacar (409 `LISTING_HIDDEN`) | PASS |
| L5 | Destacar un producto visible: `PUT …/featured`, el filtro `featured=true` del servicio devuelve solo ese | PASS |
| L6 | El filtro «Sin destacar» llega al servicio y excluye el destacado | PASS |
| L7 | Mostrar: `GET /listings/{id}` 200, ficha COMPLETE, contador de ocultos 0, no vuelve a estar destacado | PASS |
| L8 | Red caída: estado de error con reintento que se recupera | PASS |
| L9 | Sin errores de página en la consola | PASS |

Reproducir: levantar PG y el arnés (ver cabecera de `be-harness.mjs`), `cors-proxy.mjs`, Expo web con las dos variables y luego `STATE=<json> CHROMIUM_PATH=… node apps/universal/scripts/live/admin-productos.mjs`. Un error propio del recorrido que se corrigió: las rutas públicas son `/listings/{id}` y `/r/{id}` sin prefijo `/providers`; con el prefijo equivocado el 404 «tras ocultar» era un falso positivo, por eso L3 ahora incluye el control de un producto visible.

## Impeccable / UI-UX Pro Max / accesibilidad

- Patrón del admin existente (`AdminScreen`, `QueryBoundary`, `ReasonDialog`, `SwitchRow`, `FilterSelect`): sin componentes nuevos ni cambios en `packages/ui`.
- Pestañas con `role=tablist/tab` y `aria-selected`, contadores en la etiqueta accesible; filtros con etiqueta; interruptor `role=switch` con fila de 56 px; botones de acción de altura táctil estándar; error del campo de motivo asociado al campo; `role=status` en la confirmación; el estado nunca depende solo del color (chip con texto).
- Movimiento: ninguno nuevo (se reutiliza lo del admin). `rsvp-motion-design`: N/A, sin animación propia.
- Capturas revisadas a 1280 y 360. axe (críticos y serios): 0 en bandeja, diálogo y Ocultos.

## Ronda de correcciones tras la revisión independiente (comentario 7212082016)

- B1: contratos regenerados con `generate --ref 07b3c855…` (cambian lock, spec de provider-catalog `31cc9ec2…`, `generated/index.ts` y `generated/provider-catalog.ts`; solo descripciones). `check:generated` y `check:source` OK contra `07b3c855`.
- B2: `completeness` solo viaja en RECENT (`toFilters` y `productModerationPath`); «Oculto» sale de las opciones de «Ficha»; «Limpiar» no se ofrece por un filtro que la vista no muestra. Pruebas: ruta HIDDEN con `completeness` (query-hooks) y pantalla (universal).
- M1: un «Ver más» fallido conserva las filas y muestra el aviso en línea con reintento de la página siguiente. M2: el diálogo de ocultar sigue abierto con `busy`, conserva el motivo y muestra el error dentro; se cierra solo en `onSuccess`.
- M3: `done.shown` (es-BO y en-US) dice que se restaura la publicación previa y que solo se muestra con ficha completa y proveedor verificado.
- Accesibilidad: `tabpanel` con `aria-controls`/`aria-labelledby`, tabindex itinerante, flechas/Home/End, botones por fila que nombran el producto. `cors-proxy.mjs` escucha en 127.0.0.1 y solo permite un Origin localhost explícito (`ALLOW_ORIGIN`, por defecto `http://localhost:8081`).
- Pruebas: universal 805/805, query-hooks 185/185, typecheck de universal, query-hooks, i18n y contracts en verde.
- **No repetido: recorrido en vivo L1 a L9 contra `07b3c855`** (sobre todo L7, Mostrar). El arnés necesita PostgreSQL 16, compilar el servicio y Chrome; Docker/Kong no corren en el sandbox y no se levantó el arnés en esta ronda. Queda cubierto por pruebas unitarias contra el contrato regenerado; falta el recorrido.
- gitleaks (`go install github.com/zricethezav/gitleaks/v8@latest`, v8.30.x): `gitleaks detect --log-opts="origin/chore/deploy-contabo-coolify..HEAD"` sobre los commits de esta rama: **no leaks found**. Un escaneo de todas las refs del clon marca 17 falsos positivos `generic-api-key` en commits de otras ramas y evidencia histórica (fixtures de pruebas), ajenos a este PR. Una segunda corrida independiente del revisor también dio «no leaks found» (exit 0).
- La prueba de M2 busca el texto concreto del error dentro del diálogo; comprobado que falla si se quita `error={...}` de `ReasonDialog`.

## No verificado y por qué

- Gateway Docker (Kong) y TEST: Docker no corre en el sandbox.
- Pantalla del proveedor en Chrome: el aviso con motivo ya vive en #147 (`product-editor-screen.tsx`) y tiene prueba unitaria; en vivo solo se verificó por API que la ficha del dueño trae `adminHiddenReason`. No se hizo un segundo recorrido con sesión de proveedor.
- La lista de ofertas del proveedor (`OfferRow`) muestra el chip «Oculto» pero no el motivo: `GET /providers/{id}/listings` no lo trae (`Listing.hiddenReason` es el enum de R1). El motivo se ve en la ficha. Si se quiere en la lista, el contrato tendría que agregarlo.
- Líneas base visuales (`e2e/__screenshots__`): no se agregó `/admin/productos` a `e2e/screens.ts` ni al mock visual porque el mock no conoce el endpoint nuevo y no hay baseline revisada; queda para quien la agregue.
- Plataformas nativas (iOS/Android): no ejecutadas.

## Decisiones pendientes para Pablo

0. Vista de «reportados» (plan §5.13: «los publicados en los últimos 7 días y los reportados»): el contrato 3.11.0 solo admite `view` RECENT y HIDDEN y no existe un mecanismo de reporte de productos, así que la pantalla no la tiene. ¿Existe hoy un mecanismo de reporte (de dónde saldría) o se difiere a otro carril? Requiere BE antes que FE.

1. Filtro por proveedor: hoy es un campo de UUID. ¿Se prefiere un buscador de proveedores por nombre? Requiere un endpoint de búsqueda ligero o reutilizar el de partners.
2. «Destacar» en productos del catálogo propio (`ownCatalog`, sin ficha): el contrato lo permite pedir y el servicio puede responder 422 `FEATURED_PRODUCT_ONLY`; la pantalla muestra el error. ¿Se oculta el interruptor para ellos?
3. Ventana «Recientes»: el contrato admite 1 a 30 días; la pantalla ofrece 7, 14 y 30. ¿Se quieren otros valores?
4. Aviso al proveedor: el motivo se ve en su ficha; el plan dice «avisa al proveedor». No hay correo ni push de R8b (el evento no lleva el motivo). ¿Se agrega en R7 o más adelante?
5. Orden de fusión: BE #169 declara 3.11.0 pero estaba construido sobre R6b (3.9.0); el FE se regeneró con `07b3c855`. Si cambia el SHA tras rebasar (R7 3.10.0), hay que repetir `generate --ref`.
