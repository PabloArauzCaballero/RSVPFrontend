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

## Actualización 2026-11-05 (cierre de pendientes del frontend)
- **F28 · edición de condiciones de entrega de una oferta ya creada (BLOQUEADO por backend).** `provider-catalog.openapi.json` 2.2.0 no tiene `PUT`/`PATCH` de oferta (solo `POST /providers/{id}/listings` y `.../publish`). La pantalla `/portal/entrega` ya trae el formulario de edición (responsable, zonas, traslado, plazo, condiciones) escrito contra el contrato esperado `PUT /providers/{providerId}/listings/{listingId}/fulfillment` con un cuerpo `Fulfillment` (`packages/query-hooks/src/provider/api.ts`, `updateFulfillment`); mientras el servidor responda 404/405 la UI dice que no se guardó nada. **Pedido concreto a backend:** publicar esa ruta (o `PATCH /providers/{id}/listings/{listingId}` con `fulfillment`) con `If-Match`/versión y 422 `fulfillment` inválido. Probado solo contra cliente simulado (`gifts-portal.test.tsx`), NO contra el servidor real.
- **F14 admin: ya no bloquea.** Las rutas `/providers/admin/*` (provider-catalog 2.2.0) e `/identity/admin/*` (identity 1.1.0) están publicadas y se probaron en vivo con el ADMIN de bootstrap (ver `evidence/lane-F14/README.md`). El bloqueo de 2026-11-03/04 («sin API de usuarios ni organizaciones», E5-E11) queda obsoleto. Sigue pendiente el resumen de celebraciones (`/celebrations/admin/summary`, mencionado en el e2e del backend) que el frontend aún no consume.
- **Snapshots visuales en Linux:** no existen. Hay que generarlos con el workflow `visual-baselines` (modo `generate`), revisarlos a mano y commitearlos (ver `docs/runbooks/visual-baselines.md`). Los PNG de macOS no son válidos en CI. Además `catalogo.visual.spec.ts` fluctúa ~1 % de píxeles en 768 px claro / 360 px oscuro entre corridas (observado en 2 de 4 corridas; las otras pasan): causa no investigada.
- **Cobertura:** la puerta `yarn test:coverage` exige líneas/sentencias >= 85 % (funciones >= 80 % y ramas >= 75 % en los paquetes); apps/universal y apps/seo-web miden 92 % de líneas pero solo ~76-78 % de funciones (sin umbral de funciones en las apps). Los 85 % no cubren pantallas nativas iOS/Android.
- **Aviso por correo tras el alta pública:** la sincronización de destinatarios exige credencial de anfitrión; el formulario público ahora lo dice sin prometer un correo (`rsvp.unregistered.emailNotice`). Pedido a backend si se quiere prometerlo: que Notification derive el destinatario del evento de alta pública sin credencial del anfitrión.

## Deriva de contratos con el backend · 2026-11-20 (`@rsvp/contracts#test` en rojo)

`node scripts/generate.mjs --check` falla porque tres specs vendorizadas no coinciden con el backend de la rama de despliegue. **No se regeneran:** en dos casos el frontend va por delante de lo publicado y regenerar degradaría el contrato; en el tercero el backend cambió el contrato sin subir la versión. Comparación byte a byte (2026-11-20):

| Spec | Vendorizada (frontend) | Backend `chore/deploy-contabo-coolify` y `dev` | Backend PR #27 (`fix/guest-rsvp-gifts-coolify`, **abierto**) |
|---|---|---|---|
| gift-list | 1.9.0 | 1.8.0 | 1.9.0, idéntica a la vendorizada |
| guest-rsvp | 1.11.0 | 1.10.0 | 1.11.0, idéntica a la vendorizada |
| provider-catalog | 2.4.0, 44 rutas | 2.4.0, 70 rutas (`dev`: 2.3.0, 70) | 2.4.0, 70 rutas |

- **Causa 1 (gift-list, guest-rsvp):** el PR #27 del frontend (fusionado el 2026-11-18) adoptó el contrato del PR #27 del backend (cancelación de reservas por asistencia: `RsvpAwareGiftReservation`, `RsvpCancelledGiftReservation`, `GuestTokenResource`), que **sigue sin fusionarse** en `RSVPBackend`. Se resuelve fusionando el PR #27 del backend (aprobación humana; sus checks rojos son la facturación de Actions, ver memoria del equipo). Volver a 1.8.0/1.10.0 rompería lo ya fusionado en el frontend.
- **Causa 2 (provider-catalog):** el backend agregó 26 rutas y cambió contratos que el frontend consume **sin subir de 2.4.0**: `GET /providers` responde `CanonicalCompatProviderPage`, `Provider.name` y `Provider.slug` pasan a ser `string | null`, y `GET /r/{listingId}` se describe como «H05B minimal PRODUCT_PAGE redirect only» con nuevos 404/422/503. Pedido al backend: publicar la versión que corresponde (al menos 2.5.0; 3.0.0 si `name`/`slug` nulos son intencionales) con nota de compatibilidad. Recién entonces el frontend la adopta en un PR propio con revisión de consumidores (directorio, micrositio, portal y los contactos que pasan por `/r/` con `destination` distinto de `PRODUCT_PAGE`).
- **Mientras tanto:** la falla es esperada y se declara en la evidencia de cada PR; no se debilita la prueba ni se regenera contra una rama no publicada.
