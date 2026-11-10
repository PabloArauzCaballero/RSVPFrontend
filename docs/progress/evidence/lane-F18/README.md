# Evidencia · F18 Notificaciones in-app y preferencias · 2026-11-04

## Revisión y corrección local · 2026-11-09

Revisión actual de F18: correcciones de causa raíz y regresiones locales. Ver [reporte conjunto F17/F18](../review-fix-F17-F18-2026-11-09/README.md), que distingue pruebas actuales, mocks y bloqueos de integración. Estado TESTED local; no REGRESSION_VERIFIED ni DONE. Las corridas anteriores de este documento son históricas.

## Continuación local · 2026-11-06

| Corte | REQ | Resultado observable y caso negativo |
|---|---|---|
| Recibir un aviso INBOX, abrir su destino y volver | 01, 02, 05 | Con Notification 1.5.0, la bandeja muestra el aviso y conserva `readAt` al recargar. Una lectura rechazada conserva el aviso sin leer, permite reintentar y no abre el destino. Verificar Expo web y separar la evidencia nativa. |
| Marcar los avisos de la lista | 05 | Cambio optimista. Si falla una petición del lote, conservar las lecturas ya confirmadas y reponer solo las pendientes. |
| Desactivar un canal o un tipo y volver a consultar | 03, 04 | PATCH y lectura nueva con el valor guardado. Si falla el guardado, revertir el cambio optimista. La entrega suprimida requiere el servicio real del carril 23. |
| Guardar o restaurar el horario de silencio | 06 | Mostrar la zona de la celebración, validar las horas y comprobar el horario devuelto. Si falla el guardado, conservar el borrador. |

CodeGraph 1.6.2 confirmó las rutas, los hooks compartidos y las pruebas consumidoras. Con Impeccable y UI/UX Pro Max se mantienen los controles existentes y se priorizan mensajes de error junto a la acción, estados accesibles y recuperación sin perder entradas. No se añade animación.

### Resultados locales

| REQ | Estado de la capa probada | Evidencia |
|---|---|---|
| REQ-F18-01 | PASS · Expo web con mock | Aviso INBOX con fecha en la zona de la celebración. Enter ejecuta `POST /read`, abre la bandeja de acompañantes tras el 200 y el aviso sigue leído al volver. Plantillas desconocidas conservan la opción de lectura sin destino. |
| REQ-F18-02 | BLOCKED-EXTERNAL · runtime nativo | C31 y F6 comparten la ruta y los controles React Native. El recorrido disponible fue Expo web. Faltan las comprobaciones en iOS y Android. |
| REQ-F18-03 | PASS · Expo web con mock y MSW | Switches de canales y tipos según el contrato. PATCH de Push desactivado y GET nuevo después de recargar. El fallo de red restaura el valor optimista y durante la escritura se bloquea una segunda edición. |
| REQ-F18-04 | BLOCKED-EXTERNAL · entrega real | Chrome con mock confirma persistencia. Para cerrar, repetir en el backend del carril 23, generar un aviso después de desactivar el canal y observar que el servicio suprima el envío por ese canal. |
| REQ-F18-05 | PASS · Expo web con mock y MSW | Lectura individual y de todos los avisos de la lista, con confirmación del servidor por ID. Si falla parte del lote, se conservan los `readAt` confirmados. El límite del contrato se explicita al alcanzar 50 avisos. |
| REQ-F18-06 | PASS · Expo web con mock | Zona visible `America/La_Paz`. Horas locales 23–07 guardadas y restablecimiento al horario del servicio. Un fallo conserva los valores escritos; el horario visible se actualiza con la respuesta del servidor. |

- `node apps/universal/scripts/e2e-guests.mjs --f18` con `CHROMIUM_PATH` apuntando a Chrome → exit 0. Exportación de Expo web, cuatro comprobaciones, diez capturas y siete mediciones axe sin hallazgos críticos o serios. Capturas es-BO a 360/768/1280 px y una en-US a 768 px. [Reporte](local-web/e2e-result.json).
- Con `NODE_OPTIONS=--no-experimental-webstorage`, `vitest run` → 217/217 en universal, 85/85 en query-hooks, 19/19 en forms y 12/12 en i18n. `vitest run test/guests.test.tsx --coverage` acotado a las dos pantallas → 60/60 y 100 % de líneas y sentencias. Cobertura de líneas y sentencias: query-hooks 99,39 %, forms 100 %. Vitest avisa de versiones distintas entre el runner y el proveedor de cobertura.
- MSW recorre los estados HTTP de Notification 1.5.0 para GET de avisos, GET/PATCH de preferencias y POST de leído, incluido el 200 de recuperación. El caso de red interrumpida mantiene el PATCH pendiente para comprobar el valor optimista antes de rechazarlo.
- TypeScript sin emitir en universal y query-hooks, ESLint dirigido y `node --check apps/universal/scripts/e2e-guests.mjs` → exit 0. CodeGraph sincronizado. La verificación agregada de Yarn queda pendiente (Corepack/Yarn no están disponibles localmente).

**Estado: TESTED local.** Kong rechazó conexiones en 8000 y 28000 y `node packages/contracts/scripts/generate.mjs --check` devolvió exit 1 por la diferencia preexistente entre contratos vendorizados y backend local, incluido Notification. La corrida histórica de abajo corresponde a código anterior. Para el cierre quedan la recepción y supresión de entrega con el servicio compatible del carril 23, los recorridos nativos, la aprobación de capturas, las tres corridas en CI y la revisión de otro eje.
Comandos (2026-11-04): `corepack yarn turbo run typecheck test lint` → 66/66 tareas OK; `corepack yarn eslint . --max-warnings 0` → exit 0. Navegador: `CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ...` (ver cada guion).

## Contra el BACKEND REAL (2026-11-05)
Guion: `apps/seo-web/scripts/e2e-live-rsvp.mjs` (Chrome real; web Next `next start` :3000 y app Expo web exportada :8200 contra Kong `http://localhost:28000`; anfitrión real vía `POST /identity/auth/register`, celebración publicada con `unregisteredRsvpMode=AUTO_ACCEPT`, invitados e enlaces únicos reales). Resultado: `live-result.json`; capturas `live-*.png`. Contratos: guest-rsvp 1.10.0, notification 1.4.0.

Observado en vivo: canales (PATCH, lectura de vuelta), horario de silencio 23-7 validado/guardado/restaurado a `DEFAULT`, tipos de evento (`companionRequested` silenciado). **NO observado en vivo: la bandeja con avisos del anfitrión y `readAt`/marcar leída**: en este stack el servicio de Notification no generó ningún aviso para el anfitrión en 45 s (ni tras `PUT recipients`; sin trazas de consumo de eventos en su log), así que la UI mostró el estado vacío. El flujo de leído por servidor (`POST .../read`, sin 'leído por dispositivo') está probado solo contra el mock de contrato 1.4.0 (vitest) y hooks (query-hooks).

El resto de este documento (más abajo) describe la corrida anterior **contra mock de contrato**; los REQ que arriba no figuran como observados en vivo siguen con esa evidencia (mock) y no deben leerse como probados contra servicios reales.

## Límite de la evidencia de la corrida con mock (histórico; la corrida contra el backend real está arriba)
Esta sección describe SOLO la primera corrida (2026-11-04). Desde 2026-11-05 la sección «Contra el BACKEND REAL» cubre lo observado en vivo, y lo que allí no figura sigue sin probarse contra servicios reales. La corrida con mock se ejecutó contra `packages/testing/src/contract-mock.ts`: un doble **escrito desde el OpenAPI** (guest-rsvp 1.9.0, notification vigente) y las reglas observables de `http-server.ts`. Acredita la capa frontend frente a respuestas con forma de contrato; **no** acredita que los servicios reales respondan así (en esa corrida no se levantó el backend; eso ya no vale para lo listado arriba). No hay iOS ni Android ni dispositivo. Estado del carril: `TESTED` en web/Expo web; **no `DONE`**.

| REQ | Estado | Prueba | Capturas |
|---|---|---|---|
| REQ-F18-01 centro | PASS (mock) | no leídos primero, abrir lleva al destino (solo para plantillas conocidas; sin acción inventada) | C31-notificaciones-* |
| REQ-F18-02 centro nativo | PARCIAL | mismo componente RN en web; iOS/Android no ejecutados | — |
| REQ-F18-03 preferencias por canal | PASS (mock) | email, WhatsApp, SMS, push: PATCH `/notifications/celebrations/{id}/preferences` | preferencias-*, preferencias-guardada-1280 |
| REQ-F18-04 se respetan de verdad | BLOCKED-EXTERNAL | solo se prueba que se guardan y releen; que el backend las respete al enviar requiere el servicio real | — |
| REQ-F18-05 leída / todas | PASS con límite | actualización optimista; el contrato **no tiene** campo leído: se guarda por dispositivo (SecureStore/localStorage) | C31-todo-leido-360 |
| REQ-F18-06 horario de silencio | BLOCKED-EXTERNAL | el contrato no lo expone; la pantalla lo dice en vez de simularlo | preferencias-* |
