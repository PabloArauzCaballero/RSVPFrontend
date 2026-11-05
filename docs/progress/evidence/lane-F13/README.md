## REQ-F13-01 y REQ-F13-05 · 2026-11-05

- **F13-01**: tests de guardado de idiomas/idioma principal/zona/moneda en `host-requirements.test.tsx`: un único PATCH con `If-Match` de la versión cargada y cuerpo `{supportedLocales, defaultLocale, timeZone, currency}`; el idioma principal se mantiene soportado; ante error de API se muestra el aviso y se conservan las elecciones. `settings-screen.tsx` no se tocó.
- **F13-05**: la ficha dice "solo anfitrión y planner" y `gate.tsx` dejaba pasar a ADMIN y a anónimos. **Corregido**: `canUseHostWorkspace(claims)` acepta HOST y PLANNER; una identidad con sesión y sin roles sigue siendo anfitrión (como la API); ADMIN solo, GUEST, PROVIDER y anónimo reciben "acceso denegado" y no se hace ninguna petición. Se actualizaron las 3 llamadas (`gate.tsx`, `celebrations.tsx`, `onboarding.tsx`). Tests: política y pantallas C17/C18 con ADMIN, anónimo y GUEST.
Decisión a confirmar: un ADMIN que también tenga rol HOST sí entra.
