# A23 · Canales de contacto con el catálogo desplegado

Validación del 22 de noviembre de 2026 sobre la rama de despliegue del frontend en `b8dd152` y el backend de referencia en `72b5f44`.

## Reproducción

Kong devolvió `200` sin `destinationTypes` para el detalle público de cuatro ofertas de producto publicadas por un proveedor verificado. El directorio público devolvió `WHATSAPP` para los cuatro identificadores. En Next.js y Expo web, la línea base mostraba «Reservar» en esas ofertas y «Ver en la tienda» en un regalo externo.

El frontend ahora consulta el directorio por proveedor cuando falta el campo en un detalle público y publicado. Cruza el proveedor y la oferta antes de usar los canales. Si el detalle devuelve una lista explícita, esa lista es la fuente de los botones. `PRODUCT_PAGE` requiere confirmación en el detalle porque las versiones anteriores del redirector pueden rechazar el contexto de regalos para ese tipo de destino.

La consulta se comparte por proveedor. Con 50 ofertas por página, varias tarjetas del mismo proveedor comparten una consulta de perfil y una consulta por página. El fallo de esa consulta conserva los metadatos y permite reservar.

## Verificación

| Comando | Resultado |
| --- | --- |
| `git diff --check` y `git diff --binary \| gitleaks stdin --redact --no-banner` | Salida `0`. Diff revisado y cero secretos detectados. |
| `corepack yarn lint:code` y `corepack yarn harness:validate` | Salida `0`. |
| `corepack yarn workspace @rsvp/contracts check:generated` | Salida `0` con los ocho contratos del frontend. |
| `TURBO_TELEMETRY_DISABLED=1 DO_NOT_TRACK=1 corepack yarn turbo run lint typecheck test --concurrency=2` | Salida `0` en 66 tareas. El paquete de hooks pasó 98 pruebas. |
| `TURBO_TELEMETRY_DISABLED=1 DO_NOT_TRACK=1 corepack yarn test:coverage` | Salida `0` en 21 tareas. |
| `corepack yarn workspace @rsvp/seo-web build` | Salida `0` en la línea base y el candidato. Se usaron los archivos de fuente ya descargados. |
| `EXPO_PUBLIC_API_URL=http://localhost:8000 EXPO_PUBLIC_SITE_URL=http://localhost:3108 EXPO_NO_TELEMETRY=1 DO_NOT_TRACK=1 corepack yarn workspace @rsvp/universal build` | Salida `0` en la línea base y el candidato. |
| `A23_CHROME_PATH=<chrome-headless-shell> bash a23-rollout-run.sh` | Salida `0` en 24 combinaciones y 8 casos adicionales. |
| `REVERSAL=1 SMOKE=1 A23_CHROME_PATH=<chrome-headless-shell> bash a23-rollout-run.sh` | Salida `0`. La línea base devolvió `201` al reservar el mismo regalo después de probar el candidato en cada superficie. |

Playwright usó Chrome for Testing `151.0.7922.34`, ambas compilaciones, Gift List con PostgreSQL desechable y las respuestas públicas obtenidas por HTTPS de Kong. Un servidor local pasó las respuestas de catálogo y conectó las reservas con Gift List. La celebración y las credenciales de invitado eran de prueba. Se ejecutaron los tamaños 360, 768 y 1280 px con claro y oscuro, en `es-BO` y `en-US`, en la lista y el detalle. Axe completó 50 auditorías, incluidas dos de línea base, con cero infracciones serias o críticas. La revisión de enlaces comprobó el destino explícito y el contexto en `/r/{listingId}`. Las consultas públicas de catálogo se hicieron sin el encabezado de autorización del invitado.

Se reprodujo en los dos frontends una lista explícita sin canales, un detalle `404` y un directorio `503`. En esos seis casos se pudo reservar y Gift List devolvió `201`. También se simuló un sitio oficial como único destino en ambas superficies y se verificó su URL de salida. La prueba unitaria cubre paginación, reutilización de consultas y coincidencia de proveedor y oferta.

La comparación de archivos completos con `RSVP_BACKEND_SPECS` detectó las mismas tres diferencias existentes en la línea base y el candidato (`gift-list`, `guest-rsvp` y `provider-catalog`). Los contratos y sus archivos generados permanecen idénticos a la base. La comprobación de compatibilidad cubrió las respuestas desplegadas de las tres rutas públicas usadas por el cambio.

Las pruebas abarcan Next.js y Expo web. Las salidas a WhatsApp y tiendas se verificaron hasta la URL del redirector sin generar contactos ni registros de navegación en el entorno desplegado.

## Reversión

Para revertir, usa un PR de reversión y redespliega el frontend. El cambio solo lee rutas públicas y es compatible con ambos formatos del catálogo. Para observar el despliegue, comprueba el botón del catálogo y la reserva en el detalle de un regalo.

La reversión de prueba usó el mismo PostgreSQL y el mismo regalo en cada comparación. Los procesos de prueba se apagaron al terminar.
