# F25 · Microsite del partner con datos reales · 2026-11-05

Nivel: `TESTED` + Chrome real contra Provider Catalog real. **No DONE.**

REQ-F25-01/02/05 PASS (portada con nombre real del negocio, JSON-LD `LocalBusiness` con `areaServed` real, deslinde antes del contacto) · REQ-F25-03 PASS (`/p/{slug}/catalogo`) · REQ-F25-04 PASS (`/p/{slug}/catalogo/{id}` con responsable, cobertura, traslado Bs 50,00, plazo y condiciones reales) · REQ-F25-06 PASS (404 controlado). Capturas `B5`, `B6`, `B7`, `B14` en 360/768/1280.

Límites: sin dirección ni horarios reales (el servicio no los expone); el contacto usa el destino por defecto vía `/r/` porque la ficha pública no lista destinos; la galería y las traducciones del microsite no existen en el contrato. El deslinde no se midió "sin desplazar" en móvil.

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


## Cierre 2026-11-04 · axe
axe en 132 combinaciones pantalla x 360/768/1280 x claro/oscuro (web y Expo web, `axe-f22-f28.json`, script `apps/universal/scripts/axe-f22-f28.mjs`): **0 critical, 0 serious** tras corregir (antes 6 critical / 11 serious: `aria-required-children` en destinos, contraste del placeholder y etiquetas blancas en esquema oscuro). Quedan 126 hallazgos moderate/minor sin triar. Incluye el microsite `/p/{slug}` (web).
