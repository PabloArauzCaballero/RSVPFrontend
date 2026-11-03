# Auditoría frontend F15–F23, F25–F28 (solo lectura) — 2026-11-03
Repo: /Users/pablo/Documents/GitHub/RSVP/RSVPFrontend. Commit HEAD 5009905. Hay cambios sin commit solo en design-tokens/seo-web home/i18n (no tocan estos carriles).

## Pruebas reales ejecutadas (corepack yarn workspace ...)
- @rsvp/forms test: 1/1 OK (solo rsvp.test.ts). @rsvp/auth: 5/5 (deep-links.test.ts 4). @rsvp/query-hooks: 9/9. @rsvp/api-client: 6/6. @rsvp/ui-web: 3/3.
- @rsvp/seo-web: 19/19 OK (seo.test.tsx 17, 2 de frontera). `tsc --noEmit` OK.
- @rsvp/universal: 26/26 OK (admin 9, host 17). `tsc --noEmit` OK.
- Ningún test referencia REQ-F15..F28 (grep `REQ-F1[5-9]|REQ-F2[0-8]` = 0). No existe directorio e2e/ ni Playwright spec.

## Registro en docs/progress
- STATUS_LOG.md: solo una fila (F08–F14, F24). BLOCKERS.md y DECISIONS.md no mencionan F15–F28. evidence/ no tiene lane-F15..F28 (ni lane-F19 que la ficha exige). El commit c3a0599 (RSVP schema + wiring web) NO está registrado en ningún lado: hecho pero sin registrar.
- No hay nada "marcado hecho pero inexistente" para estos carriles en docs/progress (no se marcó nada). Lo único que afirma algo falso/ambiguo es el mensaje de commit c3a0599 "web RSVP status/form wiring": no hay wiring a ningún API.

## Inventario de código existente relevante
- apps/seo-web/app/c/[slug]/rsvp/[token]/page.tsx (5 líneas) y rsvp/page.tsx (2 líneas): páginas mínimas. Usa `celebrationFor(slug)` que está marcado @deprecated en lib/celebration.ts:36-45 (título derivado del slug, no carga la celebración).
- apps/seo-web/components/rsvp/rsvp-form.tsx (16 líneas): form React con radios, nº acompañantes, dieta, mensaje; borrador en sessionStorage; submit solo valida con Zod y muestra un aviso estático (rsvp-form.tsx:15) "lista para enviarse"; NO llama a API. Texto hardcodeado en español (sin i18n).
- apps/seo-web/components/rsvp/rsvp-status.tsx (6 líneas): 4 estados estáticos (invalid/closed/guest/confirmed) sin datos, sin cuenta atrás, sin props de contacto. Solo `invalid` se renderiza (rsvp/page.tsx:2, siempre invalid); nadie importa los demás estados.
- packages/forms/src/schemas/rsvp.ts (10 líneas) + rsvp.test.ts (1 test): esquema attendance/companions(0–10)/dietaryNotes(500)/message(1000). Sin campo de nombre/email para no registrado.
- packages/query-hooks/src/guest/index.ts: useRsvp (GET /guests/rsvp/{token}) y useRespondToRsvp (PATCH); gift/index.ts: useGiftItems, useReserveGift; notification/index.ts: solo useUpdateNotificationPreferences; provider/index.ts: useProviders, useCreateListing. Genéricos `<T>`, sin tipos de contrato, sin consumidores en ninguna pantalla (grep) y sin tests (invalidation.test.ts solo cubre invalidaciones). No hay hooks de lista de invitados, resumen, bandejas, notificaciones (lectura), regalos del anfitrión, cotización ni métricas.
- packages/auth/src/deep-links/index.ts:1-9 (magicLinkUrl/parseMagicLink) y verification.ts + rutas .well-known/apple-app-site-association y assetlinks.json en seo-web; probado en packages/auth/test/deep-links.test.ts (4 tests). Ojo: magicLinkUrl genera `/rsvp/{token}` y AASA anuncia `/rsvp/*`, pero la ruta web real es `/c/{slug}/rsvp/{token}` → discrepancia de contrato; además nadie consume parseMagicLink (grep) — no hay router en la app.
- apps/universal/app/(guest)/invitacion.tsx y (provider)/portal.tsx: 2 líneas, `<Surface title description>` = stub puro.
- Disuasión de links directos a partner: seo.test.tsx:74-83 (REQ-F10-06) verifica que la página pública solo enlaza `/r/listing-42` (DOM de la celebración); robots.ts bloquea `/r/` y `/c/*/rsvp` (seo.test.tsx:132). lib/providers.ts comenta que /p/{slug} y /r/ son de F25/F27. Pero NO existen /r/[listingId]/route.ts, /p/[slug], ni PartnerLink en ui-web.
- Ausentes por completo: expo-notifications / carpeta apps/universal/src/push, src/deep-links; app/(host)/{invitados,rsvp,bandeja,notificaciones,preferencias,regalos}; app/(guest)/rsvp,regalos; seo-web app/c/[slug]/regalos, app/p, app/r; components/gift, components/provider; packages/forms quote.ts; packages/ui-web partner-link.tsx; app/(provider)/{onboarding,microsite,servicios,...}; e2e/playwright.
- Pantallas (host) existentes son de F08–F14 (celebraciones, editor, onboarding, modos, publicar, configuracion con rsvpDeadline [F13-06], inicio): no son de estos carriles. `inicio.tsx` no es C6 con resumen RSVP (sin conteos).

## Estado por REQ (todos contra código; "IMPL+PROBADO" = 0 en todo el rango)
### F15 RSVP público (0/6 IMPL+PROBADO)
- F15-01 PARCIAL (stub UI, sin envío): rsvp-form.tsx:1-16, [token]/page.tsx:5. El esquema sí está probado (rsvp.test.ts:5-8) pero el formulario no llama a la API ni tiene test.
- F15-02 PARCIAL mínimo: rsvp-status.tsx:5 texto estático "confirmada"; sin cuenta atrás, sin datos, no enrutado.
- F15-03 PARCIAL mínimo: rsvp-status.tsx:3 solo si se pasa `deadline`; no enrutado, sin "a quién escribir" real (texto genérico), sin 409.
- F15-04 PARCIAL: rsvp-status.tsx:2 + rsvp/page.tsx:2 (la única pantalla alcanzable en /c/{slug}/rsvp, genérica; no revela datos). El token inválido en [token] nunca se detecta (no se consulta la API).
- F15-05 PARCIAL mínimo: rsvp-status.tsx:4 stub; sin formulario de no registrado ni lectura del modo.
- F15-06 PARCIAL: borrador en sessionStorage (rsvp-form.tsx:9-10) conserva lo escrito, pero no hay envío que pueda fallar; sin prueba. Además sessionStorage no sobrevive cierre de pestaña.
### F16 Gestión de invitados (0/6): todo NO EXISTE (sin rutas invitados/*). Solo hay hook-esqueleto inexistente para lista. F16-06 NO EXISTE. Dependencia Backend (F19 backend) no verificada.
### F17 Resumen y bandejas (0/6): F17-01 NO EXISTE (inicio.tsx es de F13, sin resumen RSVP); F17-02..06 NO EXISTE.
### F18 Notificaciones in-app (0/6): F18-03 PARCIAL mínimo (solo useUpdateNotificationPreferences, query-hooks/notification/index.ts:6, sin pantalla ni test); resto NO EXISTE.
### F19 Push (0/6): todo NO EXISTE (sin expo-notifications, src/push, permisos-push.tsx, evidence/lane-F19). F19-05 y pruebas en dispositivo además BLOQUEADO-EXTERNO (builds EAS/Apple/Google, BLOCKERS.md:6).
### F20 Acciones desde push (0/6): NO EXISTE; F20-02/05 BLOQUEADO-EXTERNO (dispositivos/EAS).
### F21 App del invitado (0/6)
- F21-01 PARCIAL: parseMagicLink (auth/deep-links/index.ts:3-9, 4 tests) pero sin enrutador/pantalla F1.
- F21-02 PARCIAL: AASA + assetlinks emitidos (seo-web .well-known, probado en deep-links.test.ts:7-10); la verificación en iPhone/Android BLOQUEADO-EXTERNO (identificadores de app no configurados, EAS). Discrepancia /rsvp/* vs /c/{slug}/rsvp/*.
- F21-03 PARCIAL mínimo (la página web existe como stub). F21-04 PARCIAL mínimo: (guest)/invitacion.tsx stub de 2 líneas. F21-05 NO EXISTE. F21-06 PARCIAL: hooks usan `auth:false` (guest/index.ts) y el token es la credencial, sin prueba.
### F22 Lista de regalos pública (0/6): NO EXISTE ninguna página /c/[slug]/regalos ni reserve-dialog. Solo useGiftItems/useReserveGift (gift/index.ts) sin consumidores/pruebas → F22-01/04 PARCIAL mínimo (solo capa hook, no pantalla); F22-02/03/05/06 NO EXISTE.
### F23 Regalos anfitrión (0/6): NO EXISTE (sin rutas regalos/*, bandeja/regalos). F23-05: lib/providers.ts + directorio (F24) existe pero no en el panel.
### F25 Microsite partner (0/6): NO EXISTE (sin app/p). Solo existe el enlace desde el directorio (providerHref → /p/{slug}, provider-directory.tsx:52) que hoy da 404. JSON-LD de directorio es F24, no LocalBusiness del microsite. BLOQUEADO-EXTERNO por datos: Provider Catalog sin HTTP (BLOCKERS.md:4).
### F26 Cotización y agenda (0/6): NO EXISTE (sin cotizar/agenda/quote-cart/quote.ts). BLOQUEADO-EXTERNO por backend.
### F27 Redirección y atribución (0/6)
- F27-06 PARCIAL: test del DOM solo de la página pública (seo.test.tsx:74-83, REQ-F10-06), no escanea "todas las pantallas" ni hay e2e/playwright/no-direct-partner-links.spec.ts.
- F27-01/02/03/04/05 NO EXISTE (sin app/r/[listingId]/route.ts; solo robots.ts bloquea /r/ y el renderer ya enlaza /r/listing-42 → hoy 404). F27-03 sin test 302.
### F28 Portal proveedor (0/6): NO EXISTE; (provider)/portal.tsx es stub de 2 líneas. BLOQUEADO-EXTERNO por Provider Catalog/Identity (BLOCKERS.md:3-4).

## Porcentajes (IMPLEMENTADO+PROBADO / 6)
F15 0/6 · F16 0/6 · F17 0/6 · F18 0/6 · F19 0/6 · F20 0/6 · F21 0/6 · F22 0/6 · F23 0/6 · F25 0/6 · F26 0/6 · F27 0/6 · F28 0/6 → 0%. Avance parcial real (REQs con algo de código, ponderado bajo): F15 ~25% (esquema+formulario sin API), F21 ~15% (parser+AASA), resto <=5%.

## Discrepancias principales
1. c3a0599 "web RSVP status/form wiring" no conecta nada: el submit no hace request (rsvp-form.tsx:15), `useRsvp/useRespondToRsvp` existen pero nadie los usa, y el estado confirmado/cerrado/guest no es alcanzable; no está en STATUS_LOG ni evidence.
2. rsvp/[token]/page.tsx usa `celebrationFor` (deprecated, título inventado desde el slug) y nunca valida el token → no existen los 5 estados reales de F15.
3. Contrato de magic link incoherente: magicLinkUrl/AASA usan `/rsvp/{token}` y la web sirve `/c/{slug}/rsvp/{token}`; parseMagicLink sin consumidor y sin router (F21).
4. El renderer/test F10 ya apuntan a `/r/{listingId}` y el directorio a `/p/{slug}`, pero ni /r ni /p existen (404); F27-03/06 sin test ni e2e (no existe carpeta e2e/).
5. Hooks de query-hooks (gift, guest, notification, provider) sin consumidores, sin tipos de contrato y sin tests propios; stubs (guest)/invitacion.tsx y (provider)/portal.tsx de 2 líneas dan falsa apariencia de pantalla. Los textos de RSVP están hardcodeados fuera de i18n.
