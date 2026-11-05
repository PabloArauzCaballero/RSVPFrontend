# F22 · Lista de regalos pública · 2026-11-05

Nivel: `TESTED` + verificado en Chrome real (360/768/1280) contra Kong/Gift List/Celebration reales. **No DONE.**

| REQ | Resultado | Evidencia |
|---|---|---|
| REQ-F22-01 filtros precio/origen/disponibilidad | PASS | `A14-catalogo-*.png`, `A14-filtrado-1280.png`; `tests/gifts.test.tsx` |
| REQ-F22-02 catalogados antes que externos | PASS, medido en el DOM renderizado y con datos reales (`CATALOGED > CATALOGED > CATALOGED > EXTERNAL`) | `live-run-f22.json`, test |
| REQ-F22-03 detalle con precio en su moneda y enlace por `/r/…?surface=GIFT_LIST` | PASS | `A15-detalle-1280.png` |
| REQ-F22-04 solicitar reserva sin cuenta | **PARCIAL**: formulario, Bearer del enlace e Idempotency-Key listos; el backend rechaza el token del enlace (401). Probado en vivo con JWT de colaborador VIEWER. Doble clic = 1 POST. | `A16-reservar-360.png`, `A14-token-de-enlace-rechazado-360.png` |
| REQ-F22-05 pendiente / confirmada según el modo | PASS (RESTRICTED -> PENDING_REVIEW, AUTO_ACCEPT -> COMMITTED) | `A17-pendiente-360.png`, `A18-confirmada-360.png` |
| REQ-F22-06 409 GIFT_NOT_AVAILABLE con alternativas | PASS en vivo (2 alternativas reales, lista refrescada) | `A19-ya-tomado-360/1280.png` |

SSR: la página renderiza en servidor cuando Gift List responde la lectura anónima; hoy responde 401, así que el servidor entrega el armazón y la lista se carga en el cliente con la credencial. Sin 403/422 observados en vivo (cubiertos con tests). No se midió axe en estas pantallas; no hay snapshots visuales aprobados por una persona.

## Hallazgos del backend real (Kong :28000) que condicionan estos carriles

| # | Hallazgo (observado con curl y en Chrome) | Efecto |
|---|---|---|
| 1 | Gift List exige un JWT de Identity de un **miembro de la celebración** (anónimo 401; token opaco de invitado 401; JWT de un usuario ajeno 404). Un VIEWER colaborador sí lista y reserva (201/409). | "Reservar sin cuenta con el token del enlace" **no funciona hoy**. La UI lo implementa (credencial del enlace como Bearer, fragmento `#t=`) y muestra el 401 con claridad; las reservas en vivo se probaron con el JWT de un colaborador VIEWER. Requiere cambio en Gift List. |
| 2 | `GET /listings` y `GET /listings/{id}` no están enrutados en Kong (404 sin CORS). | Buscador del anfitrión con respaldo a `GET /providers`; `providerId` del microsite se resuelve contra el servicio con `RSVP_CATALOG_URL=http://localhost:23005` (solo local). |
| 3 | `ProviderCard` no trae `providerId`, `destinations`, dirección ni horarios; `name` es el título de la oferta, no el negocio; `?slug=` se ignora. | El microsite pagina el directorio para hallar al partner, toma el nombre real de `GET /providers/{id}` y ofrece el destino por defecto vía `/r/`. |
| 4 | Verificar un proveedor exige ADMIN y Identity no concede ADMIN por HTTP (`role` de registro solo HOST/PLANNER/PROVIDER). | `live-world.mjs` marca `provider.status=VERIFIED` en `provider_db` local con `docker exec` (solo datos de prueba, ningún código de backend tocado). |
| 5 | Cotizaciones y solicitudes de fecha exigen sesión (401 anónimo). | La web pide iniciar sesión (enlace a la app) y conserva lo escrito; en pruebas se inyecta el JWT en `sessionStorage`. |
| 6 | `GET /providers/{id}` anónimo solo ve proveedores VERIFIED (404 el resto); con la sesión del dueño ve el borrador. No hay "mis proveedores". | El portal recuerda el id del proveedor por cuenta en el dispositivo y permite conectar uno existente por código. |
| 7 | `PARTNER_CATALOG_FIRST` llegó con `suggestions: []` aunque el catálogo tiene productos. | La UI muestra la fricción y "agregar de todos modos"; el listado de sugerencias solo se vio en tests. |
| 8 | Nadie llama `POST /providers/impressions`: impresiones = 0, CTR = 0 %. | Las métricas muestran clics y leads reales; las impresiones requieren que el directorio las registre (pendiente, archivo de F24). |
| 9 | `If-Match` de `PUT /settings` y `POST /publish` es la `version` de la celebración (no `settingsVersion`); los ajustes llegan a Gift List por evento (≈2 s). | Ya respetado en hooks y e2e (espera explícita). |

## Cómo se reprodujo

```
node apps/seo-web/scripts/live-world.mjs > world.json          # anfitrión, celebración publicada, proveedor con 3 ofertas, invitado
RSVP_CATALOG_URL=http://localhost:23005 NEXT_PUBLIC_API_URL=http://localhost:28000 RSVP_API_URL=http://localhost:28000 npx next dev -p 3000   # en apps/seo-web
WORLD=world.json CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node apps/seo-web/scripts/e2e-live.mjs      # F22 F26 F25 F27
EXPO_PUBLIC_API_URL=http://localhost:28000 npx expo export --platform web && servir en :8081   # CORS de Kong solo admite :3000 y :8081
WORLD=world.json CHROMIUM_PATH=... node apps/universal/scripts/e2e-live-f23-f28.mjs               # F23 F28
```
Resultados crudos: `docs/progress/evidence/live-run-*.json`.


## Cierre 2026-11-04 · REQ-F22-04 reserva sin cuenta con la credencial del enlace (backend real)

Gift List 1.2.0 valida el token opaco contra Guest. `TESTED` en Chrome real, **no DONE**.

| Observado | Resultado |
|---|---|
| Lista publica en cliente con `#t=<token>` (el SSR anonimo no existe: el servidor solo renderiza el armazon; fragmento borrado de la URL) | Bearer = token opaco en todas las peticiones, 200 (`E1-*`) |
| Invitado A reserva con doble clic | 1 POST con Idempotency-Key, 201 COMMITTED (`E2`, `E3`) |
| Invitado B, mismo regalo ya tomado | 409 GIFT_NOT_AVAILABLE -> 'Alguien se adelanto' + alternativas (`E4-*`) |
| `reservedByName` | Solo aparece a invitados con `showRequesterToGuests=true` (`E5`); apagado, desaparece; la API tampoco lo envia |
| Token de otra celebracion | 404 sin datos en GET y POST; pantalla 'enlace de otra celebracion' (`E6`) |
| Token desconocido | 401 'Tu enlace vencio' (`E7`) |
| Modo RESTRICTED | 201 PENDING_REVIEW 'Solicitud enviada' (`E8`); el anfitrion aprueba en la app (ver F23) |

Cambios: `loadGiftPage` ya no lee la lista sin credencial; mensajes nuevos para 404 con credencial, 429 y `RESERVATION_LIMIT_REACHED`; `PartnerLink` (ui-web) en las tarjetas. Hallazgo: el enlace de partner de la lista ya no fuerza `destination=PRODUCT_PAGE` (404 si el listing no lo tiene habilitado); usa el destino por defecto del redirector (302 OFFICIAL_SITE).
Script: `apps/universal/scripts/e2e-live-closeout.mjs` -> `../live-run-closeout-all.json`. Tests: `apps/seo-web/tests/gifts.test.tsx` (15). axe en 132 combinaciones pantalla x 360/768/1280 x claro/oscuro (web y Expo web, `axe-f22-f28.json`, script `apps/universal/scripts/axe-f22-f28.mjs`): **0 critical, 0 serious** tras corregir (antes 6 critical / 11 serious: `aria-required-children` en destinos, contraste del placeholder y etiquetas blancas en esquema oscuro). Quedan 126 hallazgos moderate/minor sin triar.
