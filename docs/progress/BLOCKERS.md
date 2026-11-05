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
- **BLOQUEADO-EXTERNO:** `@rsvp/contracts` publicado (hoy `packages/contracts` generado en local con openapi-typescript); dominio y firma para universal/app links (F05-04); `EXPO_TOKEN`, projectId y cuentas para EAS/TestFlight/Update (F07-03…05); ~~cookie httpOnly de sesión web~~ **implementada 2026-11-03** y VERIFIED en web (Identity real + Kong real, 2026-11-03).
- **Depende de backend por construir:** los OpenAPI de guests, gifts, providers y notifications no declaran cuerpos ni respuestas; resolver un token de invitación necesita el servicio Guest.
- Sin ejecutar: simulador/dispositivo iOS y Android, `lhci` y workflows en GitHub Actions, cobertura ≥85 %.

## Actualización 2026-11-04 (F15–F21, eje Miguel)
- **Backend (pedidos concretos):** (1) resolver token → celebración sin slug para enlaces legados `/rsvp/{token}`; (2) notification: campo leído/no leído y "marcar leída", horario de silencio y preferencias por tipo de evento (F18-04/05/06); (3) exponer públicamente el modo `unregisteredRsvpMode` (hoy el formulario A13 solo descubre el 403 al enviar); (4) canal de contacto del anfitrión para "a quién escribir" (hoy solo nombres); (5) CORS de Kong: orígenes de producción y de los puertos locales de seo-web/universal (hoy solo `localhost:3000` y `:8081`); (6) límite de Kong 30/min por IP puede afectar redes compartidas.
- **BLOCKED-EXTERNAL:** push físico y recepción (F19/F20), verificación de universal/app links en iPhone y Android (dominio, appId, firma, builds EAS), capturas nativas.
- La prueba contra el backend real de guest-rsvp (Docker) no se ejecutó en esta pasada.
