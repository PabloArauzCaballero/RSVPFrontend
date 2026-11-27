# Lista de Partners en Personas

Validación del 27 de noviembre de 2026 sobre Expo web. La rama parte de `chore/deploy-contabo-coolify` en `d6d4aef8`.

La tabla exigía un ancho mínimo por columna. La lista distribuye los once campos en dos niveles adaptables y usa el total filtrado del servidor para paginar. Conserva los filtros en la URL y el menú de acciones del panel. Identity recibe los IDs únicos de los dueños de la página en una consulta.

## Pruebas

| Comando | Resultado |
| --- | --- |
| `yarn lint:code` | Salida 0 |
| `yarn exec turbo run typecheck --filter=@rsvp/universal --filter=@rsvp/query-hooks --filter=@rsvp/i18n --filter=@rsvp/design-tokens` | 13 tareas correctas |
| `yarn workspace @rsvp/universal test` | 729 pruebas en 61 archivos |
| `yarn workspace @rsvp/query-hooks test` | 157 pruebas en 15 archivos |
| `yarn exec turbo run test --filter=@rsvp/i18n --filter=@rsvp/design-tokens` | 107 pruebas |
| `yarn workspace @rsvp/universal build` con `EXPO_PUBLIC_API_URL=/api` | Export web completo |
| `yarn workspace @rsvp/contracts check:generated`, `check:source` y `yarn harness:validate` | Salida 0. El chequeo de contratos verifica la referencia vendorizada de la base |

## Integración local

El recorrido `node verify-partners.mjs` terminó con salida 0 en Playwright, Chromium y servicios reales de Docker. El catálogo y la autenticación se probaron por Kong contra PostgreSQL con datos sintéticos. El contrato de Provider Catalog es 3.4.0. [Backend a57a30f](https://github.com/PabloArauzCaballero/RSVPBackend/commit/a57a30fbd34b9015765bf59bdd0fc7960ff5c5ae)

- 124 de 128 registros coincidieron con la búsqueda y el estado. Se verificaron los ocho valores de `sort` en la primera y última página de cada tamaño, y la transición de página en la interfaz.
- Los cambios de orden, tamaño, filtro y búsqueda volvieron a la primera página. El último rango parcial, los controles de extremos y el estado sin coincidencias se verificaron en el navegador.
- Identity recibió un lote de IDs únicos y se verificó el correo mostrado. La suite de pantalla también cubrió el estado vacío y el reintento ante un 503.
- Kong devolvió 401 sin sesión, 403 para un anfitrión y 422 para un orden fuera del contrato.

## Interfaz

- Chromium verificó el ancho de la lista y sus contenedores en 360, 768, 1280 y 1440 px, en claro y oscuro, con `es-BO` y `en-US`. Los datos incluyeron nombre, slug y correo largos.
- El menú de la primera y última fila abrió completo vía portal. Se comprobó el foco inicial, la navegación por flechas y el retorno al botón con Escape.
- axe WCAG AA registró cero violaciones en listado y paginación en ambos temas.
- La comparación con el build de Coolify verificó texto, valores y medidas de sidebar, título, acción principal, pestañas, buscador y filtros. La tabla base requirió desplazamiento horizontal en el listado a 1440 px.
- Las capturas locales incluyen `partners-base-cabecera-1440.png`, `partners-cabecera-1440.png`, `partners-paginacion-1440.png`, `partners-dark-1440.png` y el reflujo claro en 360, 768 y 1280 px.

## Publicación

Desplegar primero el backend con el contrato 3.4.0 en Coolify y comprobar HTTP 200 con `GET /providers/admin/partners?sort=-name` en una sesión ADMIN. Después se puede integrar la rama de frontend. Para revertir la interfaz, revertir el commit del PR de frontend.
