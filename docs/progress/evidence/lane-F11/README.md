## REQ-F11-02 · pantallas lugares, itinerario, secciones · 2026-11-05

Prueba nueva: `apps/universal/test/host-requirements.test.tsx` (describe "REQ-F11-02"): C8 agregar/editar/guardar lugar; C10 itinerario en hora local de la celebración, reordenar y rechazar hora mal escrita antes de enviar; C11 código de vestimenta + FAQ + recomendación con código de partner.

**Bug encontrado y corregido** (`apps/universal/src/host/content-editor.tsx`): "Agregar lugar/pregunta/recomendación" no hacía nada, porque cada cambio compactaba la lista y descartaba al instante la fila vacía recién creada. Ahora las filas se conservan mientras se edita y se descartan las vacías al guardar (`REQUIRED_ROW_FIELD`). El test C8 falló antes del arreglo.

Resultado: `corepack yarn workspace @rsvp/universal test` 148 tests verdes (el 2026-11-05). Nivel TESTED (jsdom/react-native-web), no dispositivo.
