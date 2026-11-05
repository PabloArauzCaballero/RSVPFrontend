# Evidencia F14 · módulos admin E1 y E5–E11 (corte 2026-11-05: backend real)

## Contra el BACKEND REAL (2026-11-05) · vigente

Guion: `apps/universal/scripts/f14-live.mjs` (Chrome real; export de Expo web servido en :8081 con `EXPO_PUBLIC_API_URL=http://localhost:28000`; Kong :28000; login por la pantalla real con el ADMIN de bootstrap `IDENTITY_BOOTSTRAP_ADMIN_EMAIL`; credenciales por variables de entorno, no se guardan). Contratos: provider-catalog 2.2.0 e identity 1.1.0 (regenerados con `yarn workspace @rsvp/contracts generate`). Resultado: `live-result.json`; capturas `real-*.png`.

Observado: las 8 pantallas (E1 resumen, E5 categorías, E6 geografía, E7 verificación, E8 moderación, E9 usuarios, E10 organizaciones, E11 métricas) cargan sin estado de error ni «acceso denegado» a 1280/768/360 px; 9 llamadas admin distintas, todas 2xx. **E1 (nuevo):** el panel muestra `GET /providers/admin/summary` (proveedores por estado, ofertas publicadas, leads válidos/descartados/30 días, cotizaciones, reservas confirmadas) y `GET /identity/admin/summary` (cuentas, por rol, organizaciones), cada tarjeta falla por separado; los números de la pantalla coinciden con la API. **E7:** el guion registra un proveedor propio, lo envía a verificación, lo verifica desde la UI (`POST /providers/{id}/verify` 200) y la API lo devuelve `VERIFIED`. **E9:** la búsqueda por correo encuentra la cuenta recién registrada. **REQ-F14-06:** una sesión PROVIDER no ve datos en `/admin/verificacion`. axe (wcag2a/aa, 2.1, best-practice) a 1280 y 360: 0 violaciones en las 8 pantallas.

No probado contra el backend real: escrituras de categorías/geografía/moderación y rechazo/suspensión con motivo (cubiertas por `admin-modules.test.tsx` con cliente simulado y por el e2e del propio backend, no por este guion); moderación y organizaciones devolvieron listas vacías en este stack, así que su UI con datos solo se vio con datos de ejemplo; resumen de celebraciones; teclado/lector de pantalla; iOS/Android. Consola: 3 respuestas 401 en `/login` (la comprobación de sesión previa al inicio de sesión), sin otros errores.

Las capturas `*-datos-*.png` y `*-backend-real-1280.png` de abajo son de la corrida anterior (2026-11-04): las primeras usan **datos de ejemplo** y las segundas muestran el error de entonces porque las rutas no existían; **no** representan el backend actual.

---


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
