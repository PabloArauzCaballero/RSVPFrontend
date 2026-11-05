# F26 · Cotización y agenda · 2026-11-05

Nivel: `TESTED` + Chrome real contra Provider Catalog real. **No DONE.**

REQ-F26-01 PASS (carrito con items, fecha, invitados, presupuesto en unidades menores y fulfillment visible) · REQ-F26-02 PASS parcial (confirmación con número y deslinde; **la copia por correo no se verificó**, el texto no la promete) · REQ-F26-03 PASS (calendario mensual en la zona del proveedor) · REQ-F26-04 PASS (201) · REQ-F26-05 PASS (422 fecha bloqueada y 409 sin cupo con mensajes distintos, ambos provocados en vivo) · REQ-F26-06 PASS (el lead aparece como `FORM` en el portal). Sin sesión: 401 y pantalla de inicio de sesión (el backend exige cuenta). Capturas `B8`..`B11` en `lane-F26/`.

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


## Cierre 2026-11-04 · cotizacion sin cuenta (backend real, modo `open` local)

`TESTED` en Chrome, **no DONE**. Provider Catalog acepta cotizaciones anonimas segun `PROVIDER_ANON_QUOTES`.

- Formulario sin sesion: nota 'no necesitas una cuenta', **honeypot `website`** fuera de pantalla y del orden de tabulacion (si se llena: 422 `QUOTE_REJECTED`, mensaje propio), captcha opcional con `NEXT_PUBLIC_QUOTE_CAPTCHA_SITE_KEY` (Cloudflare Turnstile; el token viaja como `captchaToken`; solo cubierto por codigo/test: el stack local esta en `open`, **no probado contra un verificador real**). Sin Authorization en la peticion: 201 'Solicitud enviada' (`J1`, `J2`).
- 429 `QUOTE_LIMIT_REACHED` al 4.o envio con el mismo correo (201,201,201,429) (`J4`); 429 por direccion con `Retry-After` (3596 s observado; la direccion ya habia agotado su cupo por corridas previas) (`J5`); 403 `CAPTCHA_FAILED` y 401 `ANONYMOUS_QUOTES_DISABLED` cubiertos por test, no observados en vivo.
- Pedir fecha sigue requiriendo cuenta: 401 -> 'Inicia sesion para solicitar una fecha' (`J6`).
- Tests: `apps/seo-web/tests/quote-agenda.test.tsx` (11). axe en 132 combinaciones pantalla x 360/768/1280 x claro/oscuro (web y Expo web, `axe-f22-f28.json`, script `apps/universal/scripts/axe-f22-f28.mjs`): **0 critical, 0 serious** tras corregir (antes 6 critical / 11 serious: `aria-required-children` en destinos, contraste del placeholder y etiquetas blancas en esquema oscuro). Quedan 126 hallazgos moderate/minor sin triar.
