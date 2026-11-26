# F28 y F23 · Categorías y foto de productos · 2026-11-15

El proveedor crea una oferta de tipo Producto con su categoría y una URL HTTPS opcional. El celebrador ve la miniatura y el precio de la oferta publicada en «Del catálogo» y puede agregarla como el primer regalo de una celebración.

## Implementación

- El formulario consulta `GET /providers/categories` en el idioma actual. Una categoría con `listingType: null` aparece en los dos tipos de oferta. Con una respuesta anterior que omite ese campo, el selector de servicios usa las categorías recibidas y el de productos indica que faltan sus categorías.
- El precio y la URL de foto se envían en `priceFromMinor` e `imageUrl`. La foto admite un enlace HTTPS directo sin credenciales en la URL. El formulario valida el enlace y muestra el mensaje junto al campo.
- El selector del celebrador muestra la imagen si el resultado trae `imageUrl`. Si falla la carga de la foto, se puede seguir eligiendo la oferta por nombre y precio.
- La rama incluye `f829cbf`, que normaliza el precio de búsqueda y crea la lista al guardar el primer regalo catalogado. El contrato compatible del frontend incorpora los campos de Provider Catalog 2.4.0 y se regeneró desde ese contrato.

## Evidencia

| Alcance | Prueba | Resultado |
| --- | --- | --- |
| REQ-F28-03 | `test/gifts-portal.test.tsx` y `test/provider-reorganization.test.tsx` | El selector carga datos del servicio y cambia las opciones al elegir Producto. Una URL HTTP queda en el formulario. Una HTTPS se envía en el alta con la categoría elegida. |
| REQ-F28-03 y REQ-F23-02 | Playwright y Chromium sobre Expo Web, Provider Catalog, Gift List y PostgreSQL locales | Se creó y publicó una vajilla de Bs 250. La búsqueda devolvió cero fichas cuando estaba en borrador y devolvió la ficha con miniatura al publicarla. |
| REQ-F23-04 | «Mi lista» en el mismo recorrido | La celebración empezó sin lista y terminó con un solo regalo Disponible, de Bs 250. |
| Regresión frontend | `corepack yarn test`, `corepack yarn test:coverage`, `corepack yarn lint`, `corepack yarn typecheck`, `corepack yarn workspace @rsvp/contracts check:generated` | Pruebas 30/30 tareas, cobertura 21/21, lint y tipos 18/18. Contratos generados verificados. |
| Compilación | `corepack yarn workspace @rsvp/universal build` | Exportación de Expo Web completada. En `corepack yarn verify`, Next quedó bloqueado por la resolución DNS de Google Fonts. |

Se revisó el formulario a 360 y 1280 px y el catálogo a 768 px en modo oscuro. El recorrido usó usuarios y celebraciones de prueba y una imagen local servida al navegador. Quedan pendientes el despliegue en Coolify y la prueba con una ficha publicada en TEST.

## Candidato de Coolify

Base `chore/deploy-contabo-coolify` en `bcf40f17f776da8b726d01839acfc7c95307f445`. El diff se aplicó sobre esa rama y se instaló con `corepack yarn install --immutable`. `corepack yarn verify` terminó con salida 0. Compilación, lint y tipos completaron 18 tareas cada uno y la suite de pruebas completó 30. `corepack yarn test:coverage` completó 21 tareas. También pasaron `harness:validate` y `check:generated`.

Next compiló las 123 páginas con las fuentes WOFF2 de DOne guardadas localmente para esta prueba. El recorrido de Chromium se sirvió en el origen local del bundle de Expo `http://localhost:8000`.

En 360, 768 y 1280 px, claro y oscuro, y `es-BO` y `en-US`, se revisó que el formulario muestre la categoría y la URL de foto. En cada variante, el celebrador vio la miniatura y guardó la oferta de Bs 250 una sola vez como primer regalo. Los 24 análisis de axe devolvieron cero hallazgos graves o críticos. La prueba también obtuvo 404 para una celebración inaccesible y 201/409 al crear una lista en paralelo. Se conectaron Provider Catalog, Gift List y PostgreSQL locales, con Identity y Celebration de prueba por HTTP. Falta la verificación conjunta por Kong en Docker.

La migración y el servicio Provider Catalog preceden al despliegue del frontend. La reversión de frontend puede recuperar la imagen anterior de Coolify porque los campos nuevos son aditivos.
