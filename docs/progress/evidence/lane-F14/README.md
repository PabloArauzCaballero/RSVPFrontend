# Evidencia F14 · módulos admin E5–E11 (corte 2026-11-04)

Se reemplazaron los 6 placeholders (`PendingModuleScreen`) por pantallas reales: categorías (E5), geografía (E6), verificación con cola (E7), moderación (E8), usuarios (E9), organizaciones (E10) y métricas de leads (E11). Cada una tiene estados de carga, vacío, error (401/403/404/409/422/5xx con reintentar) y acceso denegado.

## Qué es real y qué no

- **Los endpoints admin de estas pantallas NO existen todavía en el backend.** Comprobado con `curl` contra Kong `localhost:28000` el 2026-11-04: `/providers/*` responde 503 (provider-catalog no está levantado ni publica rutas admin), `/identity/admin/users` responde 404, `/identity/organizations` solo acepta POST y `/identity/organizations/{id}` (GET, publicado) existe.
- El contrato esperado está documentado en `packages/query-hooks/src/admin/index.ts` (comentarios `EXPECTED`). Lo único ya publicado que se usa: `POST /providers/{id}/verify` y `GET /identity/organizations/{id}`.
- Por eso las capturas `*-backend-real-1280.png` muestran el estado de error contra el gateway vivo (sin interceptar nada), y las `*-datos-*.png` muestran la pantalla con **datos de ejemplo** servidos por rutas de Playwright que simulan el contrato esperado. No son datos del backend.
- La sesión es un token de desarrollo sin firma con rol ADMIN (`EXPO_PUBLIC_DEV_ACCESS_TOKEN`); no hay login real.

## Capturas

`E5-categorias`, `E6-geografia`, `E7-verificacion`, `E8-moderacion`, `E9-usuarios`, `E10-organizaciones`, `E11-metricas`: `-datos-{1280,768,360}.png` y `-backend-real-1280.png`. Además `E7-verificacion-rechazar-sin-motivo-1280`, `...-con-motivo-1280`, `E7-verificacion-vacio-1280`, `E7-verificacion-403-1280`. Solo web (Chrome, `apps/universal/scripts/f14-capture.mjs`); iOS y Android no se ejecutaron.

axe (wcag2a + wcag2aa) a 1280 px, con datos de ejemplo: 0 violaciones en las 7 pantallas (la ejecución la imprime el script). Navegación por teclado y lector de pantalla: no verificados manualmente.

## Pruebas

`apps/universal/test/admin-modules.test.tsx` (21 casos con cliente simulado, es decir, prueban la capa UI/hooks, no el backend): REQ-F14-06 (HOST/GUEST ven denegado y no sale ninguna petición), REQ-F14-03 (verificar, rechazar y suspender con motivo obligatorio, 409, 403, 5xx, vacío, carga), REQ-F14-04 (aprobar/rechazar con motivo), REQ-F14-05 (agrupación y rango, rango inválido sin petición), REQ-F14-01 (categorías, geografía, usuarios, organizaciones). El test de texto sin i18n cubre `src/admin`.

## Pendiente

Sin movimiento nuevo (decisión: no hay animación; el diálogo usa el fade existente). Faltan: E1, backend real de los 5 contratos, snapshots aprobados, E2E contra backend, revisión por otro eje, pruebas de teclado.
