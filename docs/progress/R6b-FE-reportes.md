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
- Del recorrido con Chrome real (sección «Evidencia») no se recorrió la vista previa con enlaces ni la renovación del ctx: solo hay pruebas de pantalla con red simulada. iOS y Android no probados. 360/768/1280, claro/oscuro, axe y comparación visual: pendientes (las capturas de macOS no se regeneran en Linux).

## Comandos y resultados (sobre la punta de la rama)
| Comando | Resultado |
|---|---|
| `corepack yarn typecheck` | exit 0, 19/19 |
| `corepack yarn lint` | exit 0, 19/19 |
| `corepack yarn workspace @rsvp/contracts check:generated` | exit 0, 8 contratos en `1151e6f14597` |
| api-client / ui-web / query-hooks / seo-web `test` (sobre la punta `624c42f9`) | exit 0: 19 / 22 / 192 / 227 |
| universal `test` | exit 0: 809 pruebas, 64 archivos (sobre `624c42f9`). Una primera corrida simultánea con el build de seo-web salió con exit 1 sin que yo viera el motivo; la repetición a solas pasó |
| `corepack yarn workspace @rsvp/seo-web build` | exit 0 |
| `gitleaks git --log-opts="origin/chore/deploy-contabo-coolify..HEAD"` v8.28.0 | no leaks found, con `.gitleaksignore` (2 huellas exactas de `6c57caa1`, fixtures falsos corregidos en `76c572c4`; sin él: 2 `generic-api-key`) |

Pruebas nuevas de esta ronda: `apps/universal/test/portal-preview-links.test.tsx` (9) y `packages/query-hooks/test/lead-report.test.tsx` (+3, renovación desde `expiresAt`).

## Reversión
Revertir el PR (o desplegar la imagen anterior de FE). Los contratos vuelven con `generate --ref d3b4b50e311933f987d25af80da2f2a284b14820`.

## Regla para quien use el `ctx` del portal

Sigue el patrón de R6a: el `ctx` no va en el `href`, se añade al navegar y se renueva al volver el foco. Es un bearer de 15 min: nunca en un enlace que se copie o comparta, ni en una clave de consulta.

## Evidencia (BE real, Chrome real)

Ver `docs/progress/evidence/r6b/`: capturas del recorrido, el CSV descargado y los scripts de siembra y recorrido. Entorno: Postgres, RabbitMQ y Redis en Docker; Kong 3.9.1 en Docker con el `kong.yml` del BE; Identity (jar compilado con gradle) y provider-catalog (build local) en el host; Expo web real contra `http://localhost:8000`. Sin `kong-jwt-sync` ni MinIO ni gift-list.

## No verificado

- `HOST_OR_PLANNER` (necesita el `ctx` firmado por gift-list; no se levantó gift-list): solo está cubierto por pruebas unitarias.
- Clics hechos con `curl` al gateway (`/r/{listingId}`), no a través del sitio seo-web.
