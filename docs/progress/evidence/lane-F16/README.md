> Actualización 2026-11-08: fallos frontend del review corregidos; merge aún pendiente de integración y gates. Ver [corrección actual](fix-2026-11-08.md).

> **Revisión vigente 2026-11-08:** no listo para merge; pruebas existentes verdes y nuevos bordes fallando. Ver [hallazgos y gates pendientes](review-2026-11-08.md). Las corridas siguientes se conservan como evidencia histórica.

# Evidencia · F16 Gestión de invitados · 2026-11-04

## Continuación local de F16

| Corte | Requisitos | Resultado que se comprobará |
|---|---|---|
| Alta y lista | REQ-F16-01, 02 | Crear un invitado y encontrarlo por nombre. Comprobar búsqueda sin coincidencias, reintento y paginación con 500 invitados. |
| Importación | REQ-F16-03 | Elegir un CSV de 200 filas en Chrome. Distinguir las filas importadas de las rechazadas y evitar reenviar el mismo contenido después de un éxito parcial. |
| Grupos y enlaces | REQ-F16-04, 05, 06 | Verificar la asignación a grupos y el enlace enmascarado. El contrato local de Guest/RSVP 1.10.0 expone grupos familiares. La parte de mesas requiere un contrato del backend. |

CodeGraph 1.6.2 trazó las rutas de invitados hasta sus pantallas en Expo. Este corte conserva el diseño y las transiciones actuales. La prueba de 200 filas en el navegador usa un archivo sintético y el doble del contrato mientras Kong local no responde.

### Resultados locales · 2026-11-05

| Requisito | Resultado | Evidencia |
|---|---|---|
| REQ-F16-01 | PASS en Expo web contra el doble del contrato | Chrome paginó 500 invitados con 50 elementos en la segunda página. La suite de componentes comprobó filtro, búsqueda, vacío y reintento. |
| REQ-F16-02 | PASS en Expo web contra el doble del contrato | Chrome validó un formulario incompleto, guardó un invitado con teléfono E.164 y lo encontró desde el listado. |
| REQ-F16-03 | PASS en Expo web contra el doble del contrato | El selector cargó 200 filas, 198 quedaron registradas y las líneas 41 y 151 mostraron el campo y el motivo. El botón bloqueó el reenvío del mismo contenido. La suite comprobó la corrección de filas y la conservación del CSV ante 401, 403, 409 y 422 con MSW. |
| REQ-F16-04 | PASS local para grupos familiares. BLOCKED-EXTERNAL para mesas | La suite de componentes comprobó crear un grupo, asignar al dar de alta y mover un invitado. Chrome mostró el grupo. El OpenAPI local incluye `/groups` y falta el contrato de mesas. |
| REQ-F16-05, 06 | PASS en Expo web contra el doble del contrato | Chrome mostró el enlace enmascarado, verificó que el secreto completo no aparecía en el DOM y abrió la confirmación de revocación. La suite ejercitó copiar, compartir y revocar. |

- `node apps/universal/scripts/e2e-guests.mjs --f16` → exit 0. Exportación de Expo web y Chrome a 360, 768 y 1280 px. El [reporte](local-web/e2e-result.json) registra seis comprobaciones y diez mediciones de axe con cero violaciones críticas o serias. Las [capturas](local-web/) corresponden a esta corrida local.
- `vitest run test/guests.test.tsx --coverage` en `apps/universal` con cobertura acotada a las cinco pantallas de F16 → exit 0, 37/37 y 97,56 % de líneas y sentencias. `vitest run` en el mismo workspace → exit 0, 194/194. Node 25 usó `NODE_OPTIONS=--no-experimental-webstorage` para jsdom. Vitest emitió su aviso de versiones distintas entre el runner y el proveedor de cobertura.
- `tsc --noEmit` en `apps/universal`, ESLint dirigido a los archivos TypeScript modificados y `node --check apps/universal/scripts/e2e-guests.mjs` → exit 0.

Estado `TESTED` local. Para el cierre faltan repetir el archivo de 200 filas y la lista de 500 contra el servicio real, probar las acciones nativas, verificar navegación por teclado y accesibilidad en las superficies pendientes, aprobar las capturas como referencia, pasar tres corridas en CI y recibir revisión de otro eje. No se observó un gateway local en los puertos 8000 y 28000.

Comandos (2026-11-04): `corepack yarn turbo run typecheck test lint` → 66/66 tareas OK; `corepack yarn eslint . --max-warnings 0` → exit 0. Navegador: `CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ...` (ver cada guion).

## Contra el BACKEND REAL (2026-11-05)
Guion: `apps/seo-web/scripts/e2e-live-rsvp.mjs` (Chrome real; web Next `next start` :3000 y app Expo web exportada :8200 contra Kong `http://localhost:28000`; anfitrión real vía `POST /identity/auth/register`, celebración publicada con `unregisteredRsvpMode=AUTO_ACCEPT`, invitados e enlaces únicos reales). Resultado: `live-result.json`; capturas `live-*.png`. Contratos: guest-rsvp 1.10.0, notification 1.4.0.

Observado: login del anfitrión por UI contra Identity; lista con búsqueda; alta por UI guarda el invitado y llama UNA vez `PUT /notifications/celebrations/{id}/recipients` (200); importación CSV (2 importados, 1 con error) y una sola llamada PUT; enlace único emitido y mostrado enmascarado, secreto fuera del DOM. Nota: la sincronización de destinatarios tras el alta pública NO aplica desde el navegador del invitado (el PUT exige credencial de anfitrión; Guest/RSVP la hace por su cuenta según el contrato).

El resto de este documento (más abajo) describe la corrida anterior **contra mock de contrato**; los REQ que arriba no figuran como observados en vivo siguen con esa evidencia (mock) y no deben leerse como probados contra servicios reales.
- Pruebas: `corepack yarn workspace @rsvp/universal test` (150; `test/guests.test.tsx`). Navegador: `node apps/universal/scripts/e2e-guests.mjs` (export web de Expo + Chrome, 360/768/1280, axe) → `e2e-result.json`.

## Límite de la evidencia de la corrida con mock (histórico; la corrida contra el backend real está arriba)
Esta sección describe SOLO la primera corrida (2026-11-04). Desde 2026-11-05 la sección «Contra el BACKEND REAL» cubre lo observado en vivo, y lo que allí no figura sigue sin probarse contra servicios reales. La corrida con mock se ejecutó contra `packages/testing/src/contract-mock.ts`: un doble **escrito desde el OpenAPI** (guest-rsvp 1.9.0, notification vigente) y las reglas observables de `http-server.ts`. Acredita la capa frontend frente a respuestas con forma de contrato; **no** acredita que los servicios reales respondan así (en esa corrida no se levantó el backend; eso ya no vale para lo listado arriba). No hay iOS ni Android ni dispositivo. Estado del carril: `TESTED` en web/Expo web; **no `DONE`**.

| REQ | Estado | Prueba | Capturas |
|---|---|---|---|
| REQ-F16-01 lista | PASS (mock) | `guest-list` del read model: búsqueda, filtro, 50 por página con 500 invitados (50 nodos), vacío, vacío filtrado, error+reintento, 403 | C19-lista-*, C19-busqueda-360, C19-vacio-filtrado-360 |
| REQ-F16-02 alta | PASS (mock) | validación al escribir/guardar; correo o teléfono E.164 (contrato 1.9.0) | C20-alta-*, C20-validacion-360, C20-guardado-360 |
| REQ-F16-03 CSV | PASS (mock) | informe con línea, campo y motivo por fila; cabecera inválida. Selector de archivo solo en web; en nativo se pega | C21-informe-por-fila-*, C21-importar-vacio-1280 |
| REQ-F16-04 grupos | PARCIAL | crear, listar con conteo, asignar al crear y mover desde la ficha (GET/POST groups, PATCH guest). **Sin mesas ni arrastrar**: el contrato no las tiene | C22-grupos-* |
| REQ-F16-05 detalle y enlace | PASS (mock) | emitir, reemitir y revocar con confirmación; copiar; compartir (Web Share, copia como respaldo) | C23-* |
| REQ-F16-06 enlace nunca completo | PASS | se muestra `abcd…wxyz`; el secreto completo no está en el DOM ni en caché ni storage | C23-enlace-enmascarado-* |

No cubierto: compartir en iOS/Android (la hoja nativa no se ejecutó), 500 invitados contra backend real.
