# R6b FE · reportes de leads, ctx del portal y vista previa con enlaces (FE #150)

Fuera de carril; sigue §5.9 y R6 del plan «Regalos solo de proveedores cargados» (D-10 #33 a #35) y la sección «Lo que falta para el portal» de FE #147. Contrato pinneado a BE `1151e6f1` (BE #166; provider-catalog 3.9.0). Fecha de la evidencia: 2026-11-27. Nivel: **TESTED** (jsdom, red simulada). No VERIFIED.

## Qué hay
- Portal `/portal/leads`: filtros mes, producto y botón; por clic producto, botón, fecha en la zona del proveedor, tipo de evento y ciudad (PF-1: nada de celebración ni invitado; `Lead.context` cerrado, A35).
- Portal `/portal/metricas`: reporte mensual por producto y botón (válidos, no válidos por motivo, cobrables).
- Admin `/admin/metricas`: reporte de leads para cobro con mes, proveedor y descarga CSV.
- seo-web `/r/{listingId}`: reenvía `eventType` y el `ctx` del portal (I-6); ya no envía `sessionId` (M34).
- Vista previa de la ficha (`/portal/productos/{id}?paso=resumen`): los botones abren el destino real con el ctx `PREVIEW` (M-2). El ctx se pide a `POST /providers/{id}/lead-context`, se renueva desde su `expiresAt` (3 min antes, al volver a primer plano y al pulsar) y nunca va en un `href`, en el DOM, en una clave de consulta ni en un enlace copiable. Sin ctx los botones quedan apagados.

## No hay (y por qué)
- **`PROVIDER_OWNER` sin llamador:** ninguna pantalla del portal abre hoy un `/r/` a una oferta propia fuera de la vista previa. El hook y `portalRedirectUrl` lo soportan y están probados.
- Playwright con Chrome real contra el BE real: pendiente (no se levantó el stack de BE #166). iOS y Android no probados. 360/768/1280, claro/oscuro, axe y comparación visual: pendientes (las capturas de macOS no se regeneran en Linux).

## Comandos y resultados (sobre la punta de la rama)
| Comando | Resultado |
|---|---|
| `corepack yarn typecheck` | exit 0, 19/19 |
| `corepack yarn lint` | exit 0, 19/19 |
| `corepack yarn workspace @rsvp/contracts check:generated` | exit 0, 8 contratos en `1151e6f14597` |
| api-client / ui-web / query-hooks / seo-web `test` | exit 0: 19 / 22 / 191 / 225 |
| universal `test` | exit 0: 808 y 817 pruebas (dos proyectos de vitest). Una primera corrida simultánea con el build de seo-web salió con exit 1 sin que yo viera el motivo; la repetición a solas pasó |
| `corepack yarn workspace @rsvp/seo-web build` | exit 0 |
| `gitleaks git --log-opts="origin/chore/deploy-contabo-coolify..HEAD"` v8.28.0 | 44 commits escaneados, no leaks found |

Pruebas nuevas de esta ronda: `apps/universal/test/portal-preview-links.test.tsx` (9) y `packages/query-hooks/test/lead-report.test.tsx` (+3, renovación desde `expiresAt`).

## Reversión
Revertir el PR (o desplegar la imagen anterior de FE). Los contratos vuelven con `generate --ref d3b4b50e311933f987d25af80da2f2a284b14820`.
