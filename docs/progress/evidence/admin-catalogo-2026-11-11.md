# Catálogo del admin: lista ordenada y formulario solo al editar (2026-11-11)

## Qué se pidió

En `/admin/categorias` cada categoría era una línea de texto («Salones de eventos · VENUE · Activo») con un botón «Editar Salones de eventos» pegado al lado, y debajo quedaba siempre abierto un formulario vacío. Lo mismo en `/admin/geografia`.

## Qué cambia

- `apps/universal/src/admin/catalog.tsx`: Categorías y Geografía son una **lista** (nombre, una línea discreta con el código o «Ciudad · en Bolivia», estado como píldora, fila completa pulsable) con su conteo y un buscador cuando hay 7 o más entradas.
- El formulario ya no vive en la página: se abre en un **diálogo** al pulsar una fila o la acción principal de la cabecera («Nueva categoría» / «Nueva ubicación»), y se cierra al guardar dejando el aviso «Guardado.».
- El código de una entrada existente queda fijo (identifica el registro). En Geografía «Pertenece a» se **elige** entre los países y regiones existentes en vez de escribir su código; latitud y longitud van lado a lado; el país es de solo lectura con «Guardar» deshabilitado.
- Los nombres se piden como «Nombre en Español» / «Nombre en English» en vez de «Nombre (es-BO)».
- `admin-screen.tsx`: la acción principal de la cabecera admite icono (el «+» de crear).

## Verificación

- `yarn lint:code` (salida 0) y `yarn turbo run lint typecheck test` 66/66 el 2026-11-11.
- `apps/universal/test/admin-modules.test.tsx` 25/25: lista con fila por entrada, formulario ausente hasta pedirlo, validación, PUT, cierre al guardar, código fijo al editar, padre elegido de la lista, país de solo lectura.
- Playwright con Chrome real contra el **mock de contrato** (no el backend real): lista, diálogo de alta y diálogo de edición de ambas pantallas a 390 y 1440 px, claro y oscuro: 8/8 sin scroll horizontal ni hallazgos axe WCAG 2.2 AA critical/serious. Líneas base de `admin-categorias` y `admin-geografia` regeneradas (6/6) y miradas.

## No verificado

- **Backend real con sesión de administrador**: no hay credenciales de admin de prueba; queda desplegado en TEST para revisión del dueño.
- 768 px solo por línea base, no por axe. en-US solo por el mock (la suite visual corre en inglés); es-BO por las pruebas de componente.
- `scripts/live/provider-admin-buttons.mjs` (pasos de Categorías y Geografía) sigue escrito para el formulario en página y **no se actualizó**: fallará hasta adaptarlo al diálogo.
- Tipos de evento y Plantillas del admin no se tocaron.
