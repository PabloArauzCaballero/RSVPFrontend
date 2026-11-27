# R6b FE · Reportes de leads (portal y admin), CSV, ctx en `/r` y `lead-context`

Corrige: A35 (el proveedor no ve celebración ni invitado), M34 (`sessionId`). Rama `feat/regalos-r6b-reportes` sobre `feat/regalos-r6a-leads` (FE #147), contra BE #166 (`1151e6f`, provider-catalog 3.9.0).

## Qué cambia

- Portal: `/portal/leads` con filtros de mes, producto y botón; `/portal/metricas` con el reporte mensual. Admin: `/admin/metricas` con el reporte para cobro y la descarga del CSV.
- `/r/{listingId}` (seo-web) reenvía `eventType` solo si cumple `^[A-Z][A-Z0-9_]{1,59}$` y no envía `sessionId`.
- `useLeadContext` (`packages/query-hooks/src/provider/lead-report.ts`) pide el `ctx` del portal (`PROVIDER_OWNER`, `PREVIEW`). Los enlaces de la vista previa del portal que lo usan los agregó la rama de M-2 (`cbeb279`).

## Regla para quien use el `ctx` del portal

Sigue el patrón de R6a: el `ctx` no va en el `href`, se añade al navegar y se renueva al volver el foco. Es un bearer de 15 min: nunca en un enlace que se copie o comparta, ni en una clave de consulta.

## Evidencia (BE real, Chrome real)

Ver `docs/progress/evidence/r6b/`: capturas del recorrido, el CSV descargado y los scripts de siembra y recorrido. Entorno: Postgres, RabbitMQ y Redis en Docker; Kong 3.9.1 en Docker con el `kong.yml` del BE; Identity (jar compilado con gradle) y provider-catalog (build local) en el host; Expo web real contra `http://localhost:8000`. Sin `kong-jwt-sync` ni MinIO ni gift-list.

## No verificado

- `HOST_OR_PLANNER` (necesita el `ctx` firmado por gift-list; no se levantó gift-list): solo está cubierto por pruebas unitarias.
- Clics hechos con `curl` al gateway (`/r/{listingId}`), no a través del sitio seo-web.
