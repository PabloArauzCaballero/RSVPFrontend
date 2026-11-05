# F28 · Portal del proveedor · 2026-11-05

Nivel: `TESTED` + Chrome real (app Expo web :8081, login real con rol PROVIDER) contra Provider Catalog real. **No DONE.**

| REQ | Resultado |
|---|---|
| REQ-F28-01 alta, estado de verificación | PASS: alta real -> Borrador -> oferta -> enviar -> "En verificación". La **carga de documentos no existe** en el servicio (nota en pantalla). Verificar exige ADMIN (fuera del portal) |
| REQ-F28-02 editor del microsite | **NO HECHO** (sin endpoint de contenido del microsite) |
| REQ-F28-03 servicios y productos | PASS: crear con entrega + publicar (productos y servicios en una sola pantalla) |
| REQ-F28-04 destinos y UTM, al menos uno | PASS (validación y PUT /lead-config real) |
| REQ-F28-05 condiciones de entrega | PASS, dentro del formulario de oferta (sin pantalla propia) |
| REQ-F28-06 métricas de leads | PASS parcial: clics, leads válidos reales; impresiones 0 porque nadie las registra; desglose por día/categoría/destino enviado como `groupBy` y listado en bruto |

Además: disponibilidad (PUT /availability), solicitudes de fecha (confirmar/rechazar/cancelar, 409 con aviso), leads y cotizaciones recibidas. Rutas bajo `/portal/*` (el guard solo cubre ese prefijo). Capturas `D*` en `lane-F28/`.

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

## Impresiones y CTR (2026-11-05)
Las métricas del portal (`metrics-screen.tsx`) ya muestran `totals.impressions` y `totals.ctr` (porcentaje) del servidor. Con el directorio F24 enviando impresiones por lote, el servidor devolvió `impressions: 2`, `clicks: 3`, `ctr: 1.5` para el proveedor del guion (ver `lane-F24/live-impresiones.json`). No se repitió la captura de la pantalla del portal con esos números.

## Contra el backend real, contratos regenerados (provider-catalog 2.1.0) · 2026-11-05
Código: `GET /providers/mine` (`useMyProviders`; `useProviderId` ya no depende del id guardado en el dispositivo, que solo elige entre varios), editor de perfil público (`/portal/perfil`, REQ-F28-02: descripciones es/en, redes https, WhatsApp, dirección, horario semanal; `PUT` completo con `If-Match`, 409 -> aviso y recarga) y documentos de verificación (`/portal/documentos`: registrar -> PUT a la URL prefirmada sin Bearer con las cabeceras devueltas -> completar; validación de tipo/tamaño antes de pedir nada; privados). Pruebas: vitest `portal-profile.test.ts`, hooks en `guest-contract.test.tsx`.
Guion Chrome contra Kong: `apps/universal/scripts/e2e-live-portal-profile.mjs` -> `live-portal-result.json`, capturas `live-*.png`.
- PASS: el portal encuentra al proveedor con `GET /providers/mine 200` sin id local; axe sin críticos/serios en resumen y editor; el editor valida (https), guarda (versión 0 -> 1 y siguientes, la API devuelve descripción, web y horario) y un `If-Match` obsoleto da 409 con el aviso.
- **BLOQUEADO por entorno (no es PASS):** subir un documento. El registro responde 201, pero la URL prefirmada apunta a `http://localhost:9000` y MinIO está publicado en `:29000` en este stack (el host forma parte de la firma; no se puede reescribir). La UI muestra el error reintentable (`documentos-error-subida-*.png`). El paso 3 (`complete`) y la lista "Recibido" no se observaron en vivo; sí están probados en hooks con un doble. Requiere que backend configure el endpoint público de MinIO.
- No probado: carga desde iOS/Android (el selector nativo solo toma fotos; PDF solo en web), pantallas de entrega/productos propias, axe del resto de F22-F28.


## Cierre 2026-11-04 · documentos, productos/entrega propios y CTR (backend real)

`TESTED` en Chrome, **no DONE**.

- **Documentos** (`/portal/documentos`): registrar (201) -> `PUT` a MinIO publico `localhost:29000` (200, URL firmada para ese host) -> completar -> 'Recibido', con PDF y PNG; el backend lista 2 documentos `UPLOADED` (`I1`, `I2-*`, `I3-*`). El selector nativo usa `expo-document-picker` (PDF e imagenes) en iOS/Android; **no ejecutado en dispositivo**.
- **Pantallas propias**: Productos `/portal/productos` (D6), Servicios `/portal/servicios` (D5) y Condiciones de entrega `/portal/entrega` (D8, solo lectura: el contrato no tiene PUT de una oferta, las condiciones se fijan al crear) (`H1`, `H2`, `H3`).
- **CTR coherente**: 4 `POST /providers/impressions` (202) antes de 3 clics 302 por `/r/`: totals `impressions 0 -> 12`, `clicks 1 -> 4`, `ctr 0.3333` (`D13-metricas-*`, `D12-leads-*`). Nota honesta: los clics se hicieron por HTTP sin agente de navegador, por lo que el backend los cuenta como `invalidLeads` (4), `validLeads` = 0.
- axe en 132 combinaciones pantalla x 360/768/1280 x claro/oscuro (web y Expo web, `axe-f22-f28.json`, script `apps/universal/scripts/axe-f22-f28.mjs`): **0 critical, 0 serious** tras corregir (antes 6 critical / 11 serious: `aria-required-children` en destinos, contraste del placeholder y etiquetas blancas en esquema oscuro). Quedan 126 hallazgos moderate/minor sin triar.
