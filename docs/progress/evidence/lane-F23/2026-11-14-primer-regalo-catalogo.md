# F23 · Primer regalo del catálogo · 2026-11-14

El celebrador busca una oferta `PRODUCT` por nombre y la agrega desde «Del catálogo». En una celebración nueva se crea la lista y aparece un único regalo `AVAILABLE` con el precio publicado. Aplica a `REQ-F23-02` y al estado del ítem de `REQ-F23-04`.

## Cambio

- Base de frontend `a3925298acc311704206fb8b61cb029a7798fab2`. CodeGraph 1.6.2 confirmó las llamadas de los tres paneles a `useAddGift`. La consulta `CatalogPanel useAddGift addGiftWithList searchListings` se repitió sobre el árbol editado.
- `GET /listings` entrega `priceFrom` con importe en unidades menores y moneda. `providerService.searchListings` convierte esos campos al modelo de búsqueda que consume el selector. Antes enviaba cero al guardar una oferta compatible con el portal.
- `useAddGift` reutiliza la creación de lista ante el `404 GIFT_LIST_NOT_FOUND` y reenvía el alta una vez. Si la creación devuelve `409 GIFT_LIST_EXISTS`, usa la lista creada en paralelo. Conserva los errores de acceso y de disponibilidad del catálogo.

## Verificación

| Comprobación | Resultado |
| --- | --- |
| `corepack yarn workspace @rsvp/universal test test/gifts-portal.test.tsx` | Las dos regresiones fallaron sobre la base. Con el ajuste pasaron 39/39, incluida la negativa de producto no disponible. |
| `corepack yarn workspace @rsvp/query-hooks test` | 83/83. |
| `corepack yarn test`, `corepack yarn lint`, `corepack yarn typecheck` | 30/30 tareas de pruebas y 18/18 para cada comprobación estática. |
| `corepack yarn test:coverage` | 21/21 tareas de cobertura. |
| `corepack yarn workspace @rsvp/contracts check:generated` y `corepack yarn harness:validate` | Pasaron con los contratos versionados de frontend. |
| `EXPO_PUBLIC_API_URL=http://127.0.0.1:38801 EXPO_OFFLINE=1 corepack yarn workspace @rsvp/universal build` | Exportación web completada. |
| `corepack yarn verify` | El build de SEO falló al resolver `fonts.googleapis.com` para Geist y Geist Mono. |

Chromium con Playwright abrió Expo Web contra Gift List y PostgreSQL locales. Identity, Celebration y Provider Catalog entregaron datos de prueba por HTTP. En `es-BO`, se inspeccionaron las capturas a 360, 768 y 1280 px. A 360 px se agregó el primer regalo con teclado. Las respuestas de Provider Catalog representaron una oferta publicada de Bs 250 (25000 unidades menores, BOB).

| Recorrido | Resultado observado |
| --- | --- |
| Oferta del portal como primer regalo a 360 px | `404 GIFT_LIST_NOT_FOUND` → `201` al crear la lista → `201` al agregar. «Mi lista» mostró un solo regalo de Bs 250, `AVAILABLE`. |
| Oferta del portal con lista existente a 768 px | Un `201` de alta. «Mi lista» mostró el precio de Bs 250. |
| Producto de ficha completa con lista existente a 1280 px | Un `201` de alta. El precio persistido coincidió con la ficha. |
| Oferta retirada después de la búsqueda a 768 px | `422 CATALOG_PRODUCT_UNAVAILABLE`. El selector mostró el aviso y la celebración quedó sin lista. |

En TEST, la búsqueda pública de productos respondió `200` con `items: []`. Falta validar el despliegue con una ficha real publicada desde Provider Catalog. La prueba de navegador cubre Expo Web. [Consulta en TEST](https://rsvp-api.161.97.85.216.sslip.io/listings?type=PRODUCT&limit=10&locale=es-BO)
