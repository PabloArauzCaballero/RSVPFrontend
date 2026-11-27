# Búsqueda y cierre del detalle de Partners

Validación del 27 de noviembre de 2026 sobre `chore/deploy-contabo-coolify` en `6a2b8a7f` (rama `fix/admin-partners-busqueda-cierre`, HEAD de código `88b1501a`).

El botón Buscar se alineaba con el campo completo, que incluye etiqueta y ayuda. Ahora ocupa la ranura lateral (`trailing`) del cuadro de texto en Partners y Solicitudes. Al cerrar el detalle, el parámetro `partner` se eliminaba lógicamente con `undefined`, pero el valor por defecto lo restablecía. La acción de cierre quita ese parámetro y conserva los filtros activos (`status`, `q`, etc.). Además, `EditorDialog` evita duplicar `role="dialog"` en web cuando `Modal` ya declara el diálogo accesible.

## Verificaciones y salidas observadas

| Verificación | Resultado |
| --- | --- |
| `corepack yarn install --immutable` | Dependencias verificadas sin cambios en el lockfile, salida `0` |
| `node scripts/validate-harness.mjs` | 28 carriles, 61 skills y recarga por prompt válidos, salida `0` |
| `corepack yarn workspace @rsvp/contracts check:generated` | 8 contratos verificados contra `PabloArauzCaballero/RSVPBackend@68c2b25b8e9c`, salida `0` |
| `corepack yarn lint:code` | Limpio, salida `0` |
| `corepack yarn workspace @rsvp/universal typecheck` | Limpio, salida `0` |
| `corepack yarn workspace @rsvp/universal test` | 61 archivos, 726 pruebas, salida `0`. La regresión abre el detalle desde la URL y comprueba cierre por botón, cierre por `Escape` y conservación de filtros |
| `corepack yarn workspace @rsvp/universal build --clear` con orígenes de `apps/universal/eas.json` y `docs/runbooks/releases.md` (`EXPO_PUBLIC_API_URL=/api` vía puente local al gateway real `https://rsvp-api.161.97.85.216.sslip.io`, `EXPO_PUBLIC_SITE_URL=https://rsvp-web.161.97.85.216.sslip.io`, `EXPO_PUBLIC_RSVP_ORIGIN=https://dev.done.arauzsoftware.com`) | Exportación web (`web-build`), salida `0` |
| Chrome con los archivos servidos por Contabo y respuestas de prueba locales (línea base) | Reproducido el fallo previo: el detalle seguía abierto tanto con **Cerrar** como con **Escape** |
| Playwright con Chrome sobre Expo web y respuestas de prueba | 12 combinaciones (`360`, `768` y `1280` px; claro y oscuro; `es-BO` y `en-US`), salida `0` |
| Playwright con Chrome `158.0.8127.88` sobre Expo web local conectado al gateway real de QA con sesión administrativa de pruebas | 12 combinaciones (`360`, `768` y `1280` px × claro y oscuro × `es-BO` y `en-US`, movimiento reducido), todas `APROBADO`, salida `0`. Login y refresh contra Identity HTTP `200`; listado real de `/providers/admin/partners` HTTP `200`. Alineación vertical de **Buscar/Search** y cuadro de texto en `0 px` de diferencia de centro tanto en **Partners** como en **Solicitudes**. Búsqueda con clic y con `Enter` verificada contra `/providers/admin/partners` y `/providers/admin/partner-requests`. Selección de filtro en URL, apertura del detalle real de un partner, cierre primero con **Cerrar/Close** y luego con **Escape**: en ambos casos desaparece `partner` de la URL y se conservan `status` y `q`. Auditoría `axe`: `0` violaciones en el diálogo de detalle en las 12 combinaciones; `0` violaciones en las vistas completas de Partners y Solicitudes en `360` y `768` px; a `1280` px aparece únicamente `1` aviso preexistente de impacto `moderate` (`region` en el contenedor general de escritorio), con `0` violaciones `serious` o `critical`. Sesión, credenciales y datos del partner se mantuvieron fuera del informe, capturas y Git |
| `gitleaks` sobre el diff de la rama | `0` hallazgos de secretos, salida `0` |

## Nivel alcanzado, límites y reversión

- **Nivel:** `VERIFIED` en Expo web (`@rsvp/universal` sobre Chrome real con sesión administrativa contra Identity y Provider Catalog reales en `es-BO` y `en-US`).
- **Fuera de alcance / no probado aquí:** binarios nativos iOS y Android (el panel administrativo se opera principalmente en web y los binarios nativos se compilan mediante EAS; `EditorDialog` conserva `role="dialog"` explícito fuera de web).
- **Reversión:** revertir los commits de esta rama en frontend. Los formularios conservan las llamadas y los parámetros de búsqueda existentes sin migraciones ni cambios de contrato.
