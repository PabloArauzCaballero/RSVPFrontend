# Bloqueos (frontend)

- **Identity no emite cookies de sesión** ni un login funcional (F05). La app web de producción no puede autenticarse todavía; en local se usa `EXPO_PUBLIC_DEV_ACCESS_TOKEN`. Además, el JWT solo trae `sub`: sin `roles` ni `organizationIds`, las pantallas de planner y admin no se activan con tokens reales.
- **Provider Catalog (Fabio) no expone HTTP.** F24 renderiza las rutas, metadatos y JSON-LD, pero sin datos; el admin no puede listar categorías, geografía, moderación ni métricas (E5, E6, E8, E11). El contrato de búsqueda que espera el directorio está en `apps/seo-web/lib/providers.ts` (`GET /providers?category=&city=&verified=&maxPriceMinor=&availableOn=&page=&pageSize=`).
- **Identity sin API de usuarios ni organizaciones** (E9, E10).
- **Capturas en iOS y Android**: requieren las builds firmadas de EAS (F07, bloqueado por cuentas de Apple y Google).
- **Lighthouse en CI** (`.github/workflows` → `lighthouse`) necesita un despliegue público del sitio; localmente se mide con `apps/seo-web/scripts/audit.mjs`.

## Corrección 2026-11-03 (auditoría)
- Depende de backend aún no construido: HTTP de Provider Catalog, Gift List y Guest/RSVP (F15–F23, F25–F28).
- Identity ya emite `roles` y `organizationIds` y expone organizaciones; sigue sin cookies de sesión para la web (F05).

## Actualización 2026-11-03 (eje de Pablo)
- **BLOQUEADO-EXTERNO:** `@rsvp/contracts` publicado (hoy `packages/contracts` generado en local con openapi-typescript); dominio y firma para universal/app links (F05-04); `EXPO_TOKEN`, projectId y cuentas para EAS/TestFlight/Update (F07-03…05); cookie httpOnly de sesión web (Identity no la emite; en web la sesión vive en memoria).
- **Depende de backend por construir:** los OpenAPI de guests, gifts, providers y notifications no declaran cuerpos ni respuestas; resolver un token de invitación necesita el servicio Guest.
- Sin ejecutar: simulador/dispositivo iOS y Android, `lhci` y workflows en GitHub Actions, cobertura ≥85 %.
