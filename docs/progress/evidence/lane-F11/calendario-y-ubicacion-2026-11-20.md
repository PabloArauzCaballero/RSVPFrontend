# Calendario y ubicación de la invitación

Fecha de validación: 20 de noviembre de 2026. Base frontend `a146d386d503bdab4ce9b1b2a73547878423379a`. Servicio Celebraciones `90b5ae1151cdace4bf59a080d9ef17a7efad0633`.

| Alcance | Comportamiento comprobado | Evidencia |
|---|---|---|
| REQ-F11-01 · alta | Seleccionar un día, completar la hora y pegar un enlace opcional crea la celebración. | Chromium y API real de Celebraciones con PostgreSQL 17.6 local. POST 201 y lectura posterior de la fecha, hora y enlace. |
| REQ-F11-02 · editor | Abrir el calendario, navegar con el teclado, volver al campo al cerrar y escoger un día. Buscar desde Ubicación, seleccionar el resultado y guardar su punto. El botón Buscar se alinea con el campo y cabe en pantalla. En móvil, el primer resultado queda a la vista por encima de Guardar. | 12 combinaciones en Chromium, 360/768/1280 px, claro/oscuro y es-BO/en-US. PATCH 200 y GET real posterior comprueban el día local y la URL persistidos. Axe sin incidencias serias o críticas en el calendario, la lista de resultados y el mapa. |
| REQ-F11-06 · conflicto | Un guardado con versión obsoleta conserva la protección existente. | PATCH con un `If-Match` obsoleto devolvió 409 en la prueba aislada. |

## Comprobaciones de frontend

| Comando | Salida |
|---|---|
| `corepack yarn install --immutable` | 0, advertencias de dependencias peer preexistentes |
| `corepack yarn lint:code` | 0 |
| `corepack yarn harness:validate` | 0 |
| `corepack yarn workspace @rsvp/contracts check:generated` | 0, ocho contratos vendorizados |
| `corepack yarn turbo run typecheck --filter=@rsvp/universal... --concurrency=2` | 0, once tareas |
| `corepack yarn turbo run test --filter=@rsvp/universal... --concurrency=2` | 0, 374 pruebas de la app y suites de sus dependencias |
| `corepack yarn turbo run test:coverage --filter=@rsvp/universal... --concurrency=2` | 0, cobertura de líneas de la app 90.59 % |
| `corepack yarn workspace @rsvp/universal build` | 0, exportación web de Expo |

## Alcance de la prueba y reversión

El código del servicio de Celebraciones se verificó contra los blobs del commit indicado. Se ejercitaron las rutas reales de creación y guardado con un JWT de prueba, migraciones existentes y una base desechable. Se simularon las respuestas de OpenStreetMap y las dependencias ajenas al guardado. El alcance visual fue Expo web en Linux. La revisión de las referencias macOS y la ejecución en dispositivos iOS/Android quedan pendientes.

La primera corrida de GitHub falló en `guests.test.tsx` al esperar una fila de invitado. Esa prueba pasó con la suite local. La revisión de distribución vuelve a disparar los checks del PR.

El selector web trabaja en `YYYY-MM-DD` y el formulario combina el día con la hora local de la celebración. Elegir un lugar utiliza `venueName` y `venueMapUrl`, los mismos campos que lee la versión anterior. Para revertir la entrega, revierte el commit de frontend y despliega la revisión resultante. El esquema y el contrato de Celebraciones son los actuales.
