# Evidencia · F17 Resumen y bandejas RSVP · 2026-11-04

## Revisión y corrección local · 2026-11-09

Revisión actual de F17: correcciones de causa raíz y regresiones locales. Ver [reporte conjunto F17/F18](../review-fix-F17-F18-2026-11-09/README.md), que distingue pruebas actuales, mocks y bloqueos de integración. Estado TESTED local; no REGRESSION_VERIFIED ni DONE. Las corridas anteriores de este documento son históricas.

## Continuación local · 2026-11-06

| Corte | REQ | Resultado y caso negativo que se comprobarán |
|---|---|---|
| Confirmar → observar el resumen abierto | 01, 04, 06 | Mostrar los agregados de Guest/RSVP tras actualizar la proyección, incluso tras repetir el POST con la misma clave. Si falla la actualización, conservar la última lectura e indicar el fallo. |
| Abrir el reporte → consultar y descargar | 02, 05 | Mostrar dietas y mensajes, señalar una lectura incompleta y permitir reintentar. Comprobar el CSV con acentos, comillas y UTF-8 BOM en Chrome. |
| Resolver una solicitud → actualizar la bandeja | 03 | Aprobar o rechazar una vez y leer la bandeja de nuevo. Un conflicto refresca la lista y un error recuperable conserva la solicitud. |

CodeGraph 1.6.2 confirmó las rutas de F17 y sus hooks. Se mantienen `/inicio` (la raíz `/` tiene otra ruta), los componentes existentes y el contrato vendorizado Guest/RSVP 1.10.0. Con Impeccable y UI/UX Pro Max se priorizan mensajes visibles y controles estables durante la actualización. No se incorpora animación a estos flujos.

### Resultados locales

| REQ | Estado de la capa probada | Evidencia |
|---|---|---|
| REQ-F17-01 | PASS · Expo web con mock | Chrome abrió el resumen antes de confirmar desde la app del invitado. El total confirmado subió en uno sin pulsar Actualizar. La repetición con la misma clave dejó la respuesta en versión 1. |
| REQ-F17-02 | PASS · Expo web con mock | Reporte filtrable con acompañantes, dietas y mensajes. Una lectura fallida de las respuestas conserva el listado y ofrece reintento. El test de hooks leyó la dieta de la respuesta 1001. |
| REQ-F17-03 | PASS · Expo web con mock y MSW | Aprobación con Enter en Chrome. Pruebas de rechazo, bandeja vacía, concurrencia y 401/403/409/422 en la decisión. El 409 refresca la lista. |
| REQ-F17-04 | PASS · Expo web con mock | Hora de actualización en zona de la celebración, aviso de proyección pendiente y conservación de la última lectura al fallar un refresco con 503. |
| REQ-F17-05 | PASS · Descarga web y Excel local | Los archivos se descargaron en Chrome con UTF-8 BOM para el reporte general. Excel abrió en solo lectura con separador coma el CSV general de 9 columnas y el de catering de 5. Verificados «Teléfono» y «¡Felicidades a los dos!». El CSV de catering no incluye nombres ni correos. El test comprueba comillas, fórmulas neutralizadas y fecha de archivo en la zona de la celebración al cruzar medianoche UTC. |
| REQ-F17-06 | PASS · Expo web con mock | Los conteos visibles coinciden con `guest-summary`, incluido `openCompanionRequests`. El frontend vuelve a leer el agregado de la API. |

- `node apps/universal/scripts/e2e-guests.mjs --f17` con `CHROMIUM_PATH` apuntando a Chrome → exit 0. Build de Expo web, cuatro comprobaciones, capturas en 360/768/1280 px, nueve mediciones axe con cero hallazgos críticos o serios y verificación de desbordamiento horizontal. [Reporte](local-web/e2e-result.json), [CSV del salón](local-web/reporte-rsvp-ejemplo.csv) y [CSV del catering](local-web/catering-ejemplo.csv).
- Con `NODE_OPTIONS=--no-experimental-webstorage`, `vitest run` en universal → 201/201. `vitest run test/guests.test.tsx --coverage` acotado a C6, C24 y C26 → 44/44 y 97,75 % de líneas y sentencias. `vitest run --coverage` en query-hooks → 84/84 y 99,37 % de líneas y sentencias. `vitest run` en i18n → 12/12. Vitest avisa que el proveedor de cobertura tiene una versión distinta del runner.
- `tsc --noEmit --incremental false` en universal y query-hooks, ESLint dirigido y `node --check apps/universal/scripts/e2e-guests.mjs` → exit 0. Índice CodeGraph sincronizado.

**Estado: TESTED local.** Integración de esta revisión `BLOCKED-EXTERNAL`: Kong rechazó conexiones en 8000 y 28000. `node packages/contracts/scripts/generate.mjs --check` → exit 1 por desajuste preexistente entre las copias locales (Guest/RSVP vendorizado 1.10.0 frente a 1.8.0 en el backend local). Repetir el recorrido del RSVP y la actualización de la proyección con el backend compatible del carril 21. La corrida histórica de abajo corresponde a código anterior. Pendientes para cierre: iOS/Android y comportamiento de compartir CSV nativo, aprobación de snapshots, revisión de otro eje y tres corridas en CI.
Comandos (2026-11-04): `corepack yarn turbo run typecheck test lint` → 66/66 tareas OK; `corepack yarn eslint . --max-warnings 0` → exit 0. Navegador: `CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ...` (ver cada guion).

## Contra el BACKEND REAL (2026-11-05)
Guion: `apps/seo-web/scripts/e2e-live-rsvp.mjs` (Chrome real; web Next `next start` :3000 y app Expo web exportada :8200 contra Kong `http://localhost:28000`; anfitrión real vía `POST /identity/auth/register`, celebración publicada con `unregisteredRsvpMode=AUTO_ACCEPT`, invitados e enlaces únicos reales). Resultado: `live-result.json`; capturas `live-*.png`. Contratos: guest-rsvp 1.10.0, notification 1.4.0.

Observado: resumen de la UI = `guest-summary` de la API (tras la proyección eventual); bandeja de acompañantes muestra la solicitud real y aprobar en la UI la saca de la bandeja y sube `approvedCompanions`; reporte lista respuestas y el CSV de catering descarga sin nombres ni correos. (El endpoint de bandeja lista solo solicitudes abiertas; la aprobación se verifica por salida de la bandeja y `approvedCompanions`.)

El resto de este documento (más abajo) describe la corrida anterior **contra mock de contrato**; los REQ que arriba no figuran como observados en vivo siguen con esa evidencia (mock) y no deben leerse como probados contra servicios reales.
- Pruebas: `@rsvp/universal` (150), `@rsvp/query-hooks` (43). Navegador: `e2e-guests.mjs`. Artefactos: `reporte-rsvp-ejemplo.csv`, `catering-ejemplo.csv` (descargados desde el navegador).

## Límite de la evidencia de la corrida con mock (histórico; la corrida contra el backend real está arriba)
Esta sección describe SOLO la primera corrida (2026-11-04). Desde 2026-11-05 la sección «Contra el BACKEND REAL» cubre lo observado en vivo, y lo que allí no figura sigue sin probarse contra servicios reales. La corrida con mock se ejecutó contra `packages/testing/src/contract-mock.ts`: un doble **escrito desde el OpenAPI** (guest-rsvp 1.9.0, notification vigente) y las reglas observables de `http-server.ts`. Acredita la capa frontend frente a respuestas con forma de contrato; **no** acredita que los servicios reales respondan así (en esa corrida no se levantó el backend; eso ya no vale para lo listado arriba). No hay iOS ni Android ni dispositivo. Estado del carril: `TESTED` en web/Expo web; **no `DONE`**.

| REQ | Estado | Prueba | Capturas |
|---|---|---|---|
| REQ-F17-01 portada C6 (`/inicio`; `(host)/index.tsx` chocaría con `/`) | PASS (mock) | confirmados, sin responder, acompañantes, días a la fecha límite, solicitudes abiertas (`openCompanionRequests`) | C6-resumen-* |
| REQ-F17-02 reporte | PASS (mock) | lista filtrable con dieta y mensaje | C24-reporte-* |
| REQ-F17-03 bandeja | PASS (mock) | aprobar/rechazar de un toque; 409 refresca la lista | C26-bandeja-*, C26-aprobada-1280 |
| REQ-F17-04 frescura | PASS (mock) | "Actualizado…" + aviso de atraso/`stale` desde `freshness` | C6-resumen-* |
| REQ-F17-05 CSV | PASS | RFC 4180 + neutralización de `= + - @ \t \r`; archivo de catering desde `catering-report` (sin nombres ni contactos) | *.csv |
| REQ-F17-06 sin recalcular | PASS | las cifras son las del read model; prueba que no hay POST/recuento | C6-resumen-* |

Nota: "confirmar → ver conteo sin duplicados" probado con repetición idempotente en el mock; la proyección asíncrona real no se midió.
