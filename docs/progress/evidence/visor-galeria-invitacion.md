# Carrusel y visor de fotos de la invitación

Validación del 27 de noviembre de 2026 sobre `chore/deploy-contabo-coolify` en `6a2b8a7f`.

La galería compartida enlazaba directamente al archivo. Se comprobó ese comportamiento en el HTML de la invitación publicada con dos fotos. La galería ahora muestra una foto por vez y avanza mediante deslizamiento táctil, botones o flechas cuando la miniatura tiene el foco. Al pulsar Ampliar foto se abre el visor dentro de la invitación. Cerrar o Escape devuelve el foco a la miniatura. Con una foto se puede ampliar sin controles de recorrido. La sección permanece oculta cuando faltan fotos.

El deslizamiento usa el desplazamiento nativo del navegador y las fotos conservan sus variantes responsivas, carga diferida y espacio reservado. Los botones cambian de foto al instante y las diapositivas avanzan por iniciativa del invitado. Se actualizaron ocho snapshots de los cuatro diseños tradicionales para reflejar el HTML del carrusel, en claro y oscuro.

| Verificación | Resultado |
| --- | --- |
| `yarn workspace @rsvp/celebration-theme test` | 3014 pruebas, salida 0 |
| `yarn workspace @rsvp/i18n test` | 16 pruebas, salida 0 |
| `yarn workspace @rsvp/seo-web test` | 210 pruebas, salida 0 |
| `yarn workspace @rsvp/seo-web build` con la API de fixtures | Build de producción, salida 0 |
| `apps/seo-web/e2e/gallery-dialog.spec.ts` con Playwright y Chrome | Dos pruebas, salida 0. Recorrido del carrusel y visor con foco y URL conservados. Sin fotos, la invitación omite la galería y su ruta específica devuelve 404 |
| `apps/seo-web/e2e/plantillas-v2.spec.ts` con `--grep "photo that fails to load"` | 12 pruebas del tratamiento de imágenes fallidas, salida 0 |
| Playwright con Chrome y la API de fixtures | 12 combinaciones de 360, 768 y 1280 px, claro y oscuro, es-BO y en-US. Salida 0. Deslizamiento, controles en una fila, teclado, visor, foco, URL y axe |
| Playwright con Chrome sobre el build local conectado al gateway desplegado | 12 combinaciones, salida 0. La invitación de prueba devolvió dos fotos reales. Pasaron los tres tamaños y ambas preferencias de tema al solicitar español e inglés, con la interfaz en español por el idioma publicado. Se comprobó la descarga de las fotos, deslizamiento en 360 px, botones, teclado, visor, cierre y retorno del foco. Las imágenes del gateway se entregaron a Chrome a través del cliente HTTP de la prueba por una limitación de red del navegador en este entorno. Axe no encontró violaciones serias ni críticas en el carrusel o el visor |

Pasaron `corepack yarn lint:code`, el typecheck del área, `node scripts/validate-harness.mjs`, los checks de archivos generados y el escaneo de secretos del diff. El gateway sirve la invitación de prueba en español aun cuando se solicita `en-US`. Para acreditar la interfaz en inglés con el backend real queda pendiente una invitación de pruebas cuyo gateway devuelva `locale=en-US`.

Para revertir el visor, se revierte el commit de frontend. El cambio usa los campos de medios que ya entrega la API.
