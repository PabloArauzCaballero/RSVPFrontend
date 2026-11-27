# Búsqueda y cierre del detalle de Partners

Validación del 27 de noviembre de 2026 sobre `chore/deploy-contabo-coolify` en `6a2b8a7f`.

El botón Buscar se alineaba con el campo completo, que incluye etiqueta y ayuda. Ahora ocupa la ranura lateral del cuadro de texto en Partners y Solicitudes. Al cerrar el detalle, el parámetro `partner` se eliminaba lógicamente con `undefined`, pero el valor por defecto lo restablecía. La acción de cierre quita ese parámetro y conserva los filtros.

| Verificación | Resultado |
| --- | --- |
| `yarn workspace @rsvp/universal test` | 726 pruebas, salida 0. La regresión abre desde la URL y comprueba el botón, Escape y la conservación de filtros |
| `yarn workspace @rsvp/universal expo export --platform web --output-dir /tmp/gallery-expo-build --max-workers 1` | Exportación web, salida 0 |
| Chrome con los archivos servidos por Contabo y respuestas de prueba locales | El detalle seguía abierto tanto con Cerrar como con Escape |
| Playwright con Chrome sobre Expo web y respuestas de prueba | 12 combinaciones de 360, 768 y 1280 px, claro y oscuro, es-BO y en-US. Búsqueda por botón y Enter, alineación de los dos formularios, cierre por botón y Escape, filtros conservados y cero hallazgos serios o críticos de axe en el diálogo |

El lint y el typecheck del área, `node scripts/validate-harness.mjs` y los checks de archivos generados pasaron. La comprobación en Chrome con una sesión administrativa de pruebas conectada al backend real sigue pendiente.

Para revertir el cambio, se revierte el commit de frontend. Los formularios conservan las llamadas y los parámetros de búsqueda existentes.
