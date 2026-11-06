# Contrato de consumo: búsqueda de proveedores y redirector (mock documentado)

Estado: **contrato propuesto por el frontend, no publicado por backend.** `packages/contracts/specs/provider-catalog.openapi.json` solo declara `GET /` con el parámetro `coverage` (sin esquema de respuesta) y `GET /r/{listingId}?destination=`. El servicio `provider-catalog-service` no tiene capa HTTP todavía y a través de Kong (`:28000`) `/providers` y `/r/*` responden `503 name resolution failed` (verificado el 2026-11-05). Mientras tanto `apps/seo-web` consume lo siguiente y lo prueba con mocks (`tests/`) y con `apps/seo-web/scripts/fixture-api.mjs`.

## GET /providers (público, sin auth)

Query: `category` (código: VENUE, CATERING, …), `city` (slug de la ciudad, p. ej. la-paz; el nombre devuelve 422), `verified=true`, `maxPriceMinor`, `availableOn` (AAAA-MM-DD), `slug` (microsite, F25), `lat`, `lng`, `radiusKm` (cercanía, F24 REQ-04; si llegan, `city` se ignora y se ordena por distancia), `page`, `pageSize`.

Respuesta 200: `{ items: ProviderCard[], total, page, pageSize }`, solo proveedores `VERIFIED` con ficha publicada. Un proveedor sin verificar o suspendido no aparece (el microsite lo trata como 404 sin filtrar datos).

`ProviderCard`: `listingId` (uuid), `providerSlug`, `name`, `category`, `city`, `department`, `verified`, `summary?`, `priceFrom?{amountMinor,currency}`, `imageUrl?`, `destinations?[]` (destinos habilitados: WHATSAPP, PHONE, EMAIL, INSTAGRAM, OFFICIAL_SITE, LANDING, PRODUCT_PAGE), `coverage?[]`, `address?`, `hours?[]`.

## GET /r/{listingId} (redirector, vía Kong)

El frontend `GET /r/{listingId}` (seo-web) llama a `GET {gateway}/r/{listingId}?destination=…&surface=…` con `redirect: manual`, reenvía `X-Correlation-Id`, `User-Agent` y `Referer`, y espera `302` + `Location`. `destination` por defecto `OFFICIAL_SITE`. Contexto aceptado (RawLeadContext del servicio): `surface` (PUBLIC_SITE, SEARCH, CELEBRATION_SITE, GIFT_LIST, EMAIL, APP, QUOTE_FORM), `celebrationId`, `guestId`, `locale`, `country`, `city`. Los `utm_*` de la URL de entrada se conservan en la URL final si el backend no los fijó; `correlationId` se añade si falta.

Errores: `404` (listing o destino inexistente) → página «ya no está disponible»; `400/422` → «enlace no válido»; `5xx`, red caída o respuesta sin `Location` → página «no pudimos abrir el enlace» (503) con enlace de vuelta. Nunca 301.
