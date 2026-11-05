## Geo real, test de página, Lighthouse · 2026-11-05

| REQ | Cambio | Prueba / artefacto | Resultado |
|---|---|---|---|
| REQ-F24-04 geo | `/proveedores/buscar` acepta `lat`, `lng`, `radio` (km, 5-200, por defecto 25); si son válidos se pide `GET /providers?lat&lng&radiusKm` y se ignora la ciudad; si no, cae a ciudad. `SearchForm` añade radio, campos ocultos y `NearMeButton` (geolocalización del navegador solo tras el clic; si se deniega, aviso y la ciudad sigue activa). Coordenadas redondeadas a 2 decimales (~1 km) | `apps/seo-web/tests/search-page.test.tsx` renderiza la PÁGINA real con el gateway simulado en `fetch`: parámetros enviados, formulario, paginación que conserva la posición, estados vacío/no disponible, fallback a ciudad con coordenadas inválidas | PASS (vitest) |
| Geo en navegador real | `audit.mjs` con permiso concedido y denegado | `B4-geolocalizacion-concedida-fixture-360.png`, `B4-geolocalizacion-denegada-fixture-360.png`, `lane-F08/audit-fixture.json` y `audit-live.json` (checks) | Concedido: URL con `lat=-16.49&lng=-68.12`, aviso y 2 resultados (fixture). Denegado: mensaje y ciudad conservada. En live la URL se genera pero hay 0 resultados (503 del catálogo) |
| REQ-F24-06 | Lighthouse tras el rediseño, 3+ rutas | `lighthouse-B1-directorio*.json`, `B2`, `B3`, `B4-buscar*`, `B5-microsite-fixture.json` | SEO 100 en B1-B3 (live y fixture); perf 99-100; a11y 98-100. B4 es `noindex` (SEO 63-66 a propósito). Medición local, no CI |

Límites: el backend no sirve `/providers` (503 por Kong), así que el listado real sigue **BLOCKED-EXTERNAL**; la geo y los listados llenos se probaron contra el contrato documentado en `docs/contracts/provider-search.md` (mock `fixture-api.mjs`). Que el backend entienda `lat/lng/radiusKm` no está verificado.

## Impresiones y CTR contra el backend real (2026-11-05)
`apps/seo-web/components/impression-tracker.tsx` + `lib/impressions.ts`: el directorio (`/proveedores/buscar`, categorías) observa cada tarjeta con `IntersectionObserver` (50 % visible 250 ms), deduplica por vista de página, agrupa (máx. 50 ids) y envía `POST /providers/impressions` con `{listingIds, surface:"SEARCH"}` (sin PII, sin cookies ni Authorization; fallos silenciosos). Vitest `tests/impressions.test.ts` (2). Guion: `apps/seo-web/scripts/e2e-live-impressions.mjs` -> `live-impresiones.json`, captura `live-impresiones-directorio-1280.png`.
Observado en Chrome contra Kong: 2 POST con 202; 15 ids distintos; la métrica del proveedor pasó de `impressions 1` a `2` (+1 por su listado visible), `clicks` por `/r/{listingId}` 302 contados, `ctr` calculado por el servidor (clics/impresiones, 4 decimales). Corrección hallada: `surface` debe ser uno de `PUBLIC_SITE|SEARCH|CELEBRATION_SITE|GIFT_LIST|EMAIL|APP|QUOTE_FORM` (con "directory" el servicio responde 422). El CTR supera 1 en esta prueba porque los clics de los guiones se dieron sin impresión previa; no es un dato de producción.


## Cierre 2026-11-04 · axe
axe en 132 combinaciones pantalla x 360/768/1280 x claro/oscuro (web y Expo web, `axe-f22-f28.json`, script `apps/universal/scripts/axe-f22-f28.mjs`): **0 critical, 0 serious** tras corregir (antes 6 critical / 11 serious: `aria-required-children` en destinos, contraste del placeholder y etiquetas blancas en esquema oscuro). Quedan 126 hallazgos moderate/minor sin triar. Incluye `/proveedores/buscar?categoria=catering` (web).
