# Revisión y corrección F17/F18 · 2026-11-09

Solo frontend de Miguel, F17/F18. Sin backend, contratos, commit, push o cambios de producto en otros carriles. Copias previas antes de editar. CodeGraph 1.6.2 consultado y contrastado con archivos.

| Corte | REQ | Comportamiento por verificar | Negativo/límite |
|---|---|---|---|
| Reporte/exportación | F17-02/05/06 | Exportar todas las páginas o informar fallo; mantener totales del servidor | Página vacía prematura, cursor repetido, límite de páginas |
| Aislamiento | F17-02/03 | Cambiar celebración no reutiliza filas, página, exportación ni decisiones anteriores | Nueva lectura lenta y respuesta tardía |
| Preferencias | F18-03/04/06 | Conservar horario escrito ante actualización remota; reflejar horario guardado | Cambio desde otro dispositivo durante borrador o fallo de un toggle |
| Lecturas optimistas | F18-01/05 | Persistir lectura, revertir lo no confirmado, mantener estado nuevo | Refetch durante mutación y fallo parcial |

Primero reproducir, luego corregir y cerrar pruebas por corte. Casos no reproducidos no se afirman como errores. Impeccable Operate/harden y UI/UX Pro Max: preservar datos y estados visibles, sin rediseño. Movimiento nuevo no aporta a estas correcciones. Verificación: suites del área y consumidores, tipos/build/lint, Chrome con capturas y axe. Mocks no acreditan servicios reales, dispositivos, CI ni revisión de otro eje.

Ampliación tras reproducción: F17-01, plazo con panel abierto y datos del servidor idénticos. La prueba deadline-before.json falla antes del reloj local; se corrige la actualización del plazo y se expresa menos de un día sin confundirlo con el día calendario. Los conteos siguen siendo del backend.
