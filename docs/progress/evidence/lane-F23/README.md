# F23 · continuación local de Miguel · 2026-11-08

Estado actual de esta copia: `TESTED` frontend, **no DONE**. Se adaptaron catálogo, externo con alternativas, estados/publicación, bandeja y privacidad, y descubrimiento de proveedores. Suite propia 55/55 × 3, regresión universal 409/409, Next 107/107, hooks 98/98; 28 capturas Chrome a 360/768/1280 con axe sin critical/serious; Hermes iOS/Android compila. El gateway actual no responde y `verify` sigue fallando en sincronización de ocho specs con backend; faltan integración real actual, runtime nativo, CI y revisión humana. Sin commits, PR ni push.

Ver [evidencia actual, REQs, comandos, alcance y responsables](local-2026-11-08.md). Las secciones siguientes se conservan como evidencia histórica; sus pruebas contra backend real no cubren los cambios de esta continuación.

---

# F23 · Gestión de regalos del anfitrión · 2026-11-05

Nivel: `TESTED` + Chrome real (app Expo web :8081, login por la pantalla real) contra backend real. **No DONE.**

| REQ | Resultado | Evidencia |
|---|---|---|
| REQ-F23-01 bandeja de reservas con quien lo pidió, aprobar/rechazar | PASS (aprobar deja COMMITTED; rechazar una ya resuelta -> 409 con aviso y refresco) | `C25-*.png` |
| REQ-F23-02 armar desde el catálogo (buscar y añadir) | PASS con el respaldo (el gateway no enruta `/listings`; la UI lo avisa) | `C27-*.png` |
| REQ-F23-03 externo con fricción | PASS: 409 `PARTNER_CATALOG_FIRST` -> pantalla de fricción -> "agregar de todos modos" -> PROPOSED. Las sugerencias llegaron vacías del backend | `C28-*.png` |
| REQ-F23-04 estado de cada regalo, aprobar propuesta | PASS | `C29-estado-regalos-*.png` |
| REQ-F23-05 descubrir proveedores desde el panel | ~~NO HECHO~~ (obsoleto: hecho el 2026-11-04 con `GET /providers`, ver la sección de cierre más abajo) | n/a |
| REQ-F23-06 visibilidad del solicitante configurable | ~~NO HECHO~~ (obsoleto: `gift-settings` + `requesterHidden` ya están, ver cierre). Texto original: el contrato no tenía ese ajuste; se muestra el nombre que el invitado dio | n/a |

Switch del modo externo y `partnerPriorityEnabled` en `/regalos/externo` (PUT settings con If-Match, verificado en el backend). 403/404 de un usuario ajeno: aviso sin datos (`C29-no-miembro-1280.png`). Pantallas añadidas al menú del anfitrión (`routes.ts`). Sin iOS/Android, sin axe medido.

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


## Cierre 2026-11-04 · REQ-F23-05/06 y aprobacion (backend real, Expo web :8081)

`TESTED` en Chrome, **no DONE**.

- **REQ-F23-05** descubrir proveedores: `/regalos/proveedores` usa `GET /providers` (provider-catalog 2.1.0, tarjeta ampliada: oferta, negocio, categoria/ciudad, precio, plazo, cobertura, traslado, direccion, horario, deslinde); filtros de categoria, ciudad y precio; paginacion; destinos por `/r/{listingId}?...&surface=APP` (observado); agregar como regalo CATALOGED (`F6`, `F7`, `F8`).
- **REQ-F23-06** `GET/PUT /gift-settings`: dos switches en Regalos (`F1`, `F4`); la version incrementa y se relee del backend. Con `showRequesterToHost=false` la bandeja muestra 'Nombre oculto por tu ajuste' (API: `requesterHidden=true`, sin nombre) (`F5-*`), y aprobar sigue funcionando.
- El anfitrion aprueba en la UI una reserva hecha sin cuenta -> COMMITTED en el backend (`F2`, `F3`).
- axe en 132 combinaciones pantalla x 360/768/1280 x claro/oscuro (web y Expo web, `axe-f22-f28.json`, script `apps/universal/scripts/axe-f22-f28.mjs`): **0 critical, 0 serious** tras corregir (antes 6 critical / 11 serious: `aria-required-children` en destinos, contraste del placeholder y etiquetas blancas en esquema oscuro). Quedan 126 hallazgos moderate/minor sin triar.
