# F27 · Redirección y atribución · 2026-11-05

Nivel: `TESTED` + Chrome real. **No DONE.** El redirector `/r/[listingId]` ya existía (otro agente); aquí se completó la prueba.

REQ-F27-06 PASS: `apps/seo-web/e2e/no-direct-partner-links.spec.ts` (Playwright, 14 pruebas verdes) y `scripts/e2e-live.mjs f27` escanean el DOM de 14 rutas públicas con datos reales (`no-direct-partner-links-scan.json`): 0 enlaces directos a partner (tel:, mailto:, wa.me, instagram, hosts declarados), 6 salidas por `/r/`. REQ-F27-02/03/04 PASS en vivo: 302 (nunca 301), `utm_campaign` y `correlationId` conservados en `wa.me`; 404 con página de error. REQ-F27-05: la superficie `GIFT_LIST` quedó registrada en el lead (visible en el portal). REQ-F27-01 (botones de contacto) cubierto por F25. No se creó `PartnerLink` en `ui-web` (los enlaces ya se construyen con `contactHref`/`partnerHref`).

Hallazgos del backend: ver [F22](../lane-F22/README.md#hallazgos-del-backend-real-kong-28000-que-condicionan-estos-carriles).

## Cómo se reprodujo

```
node apps/seo-web/scripts/live-world.mjs > world.json          # anfitrión, celebración publicada, proveedor con 3 ofertas, invitado
RSVP_CATALOG_URL=http://localhost:23005 NEXT_PUBLIC_API_URL=http://localhost:28000 RSVP_API_URL=http://localhost:28000 npx next dev -p 3000   # en apps/seo-web
WORLD=world.json CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node apps/seo-web/scripts/e2e-live.mjs      # F22 F26 F25 F27
EXPO_PUBLIC_API_URL=http://localhost:28000 npx expo export --platform web && servir en :8081   # CORS de Kong solo admite :3000 y :8081
WORLD=world.json CHROMIUM_PATH=... node apps/universal/scripts/e2e-live-f23-f28.mjs               # F23 F28
```
Resultados crudos: `docs/progress/evidence/live-run-*.json`.


## Cierre 2026-11-04 · PartnerLink
`PartnerLink` en `packages/ui-web` recibe un `listingId` (UUID), no una URL: un enlace directo es imposible por construccion (lanza si le pasas una URL). Siempre `/r/{listingId}`, `rel="sponsored nofollow noopener"` y deslinde visible enlazado con `aria-describedby`. Usado en la lista de regalos y en el microsite; en la app, `partnerRedirectUrl` aplica la misma regla. Tests en `packages/ui-web/src/index.test.tsx` (incl. axe). Clics reales por `/r/` observados en F21/F23/F28 (302). axe en 132 combinaciones pantalla x 360/768/1280 x claro/oscuro (web y Expo web, `axe-f22-f28.json`, script `apps/universal/scripts/axe-f22-f28.mjs`): **0 critical, 0 serious** tras corregir (antes 6 critical / 11 serious: `aria-required-children` en destinos, contraste del placeholder y etiquetas blancas en esquema oscuro). Quedan 126 hallazgos moderate/minor sin triar.
