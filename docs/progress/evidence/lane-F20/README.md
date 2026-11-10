# F20 · Acciones de reservas desde push

## Alcance local · 2026-11-07

Responsable: Miguel. Trabajo exclusivamente local; sin commit, push ni cambios de backend.

### Cortes definidos antes de implementar

| Corte | REQs | Entrada y resultado observable | Negativo y prueba | Dependencia |
|---|---|---|---|---|
| 1 · Revisar y decidir una reserva concreta | 01, 03, 04, 06 | `/bandeja/{reservationId}?c={celebrationId}` obtiene la reserva autorizada; aprobar/rechazar refleja el estado confirmado por servidor | Sesión expirada conserva destino de login; 403, ausencia, 409 y red fallida no muestran éxito falso. Componentes + transporte MSW | Gift List 1.3.0, endpoints existentes de listado/decisión |
| 2 · Ejecutor independiente de la pantalla | 01, 02, 04, 06 | Una referencia explícita a reserva ejecuta la decisión una vez, valida estado actual e invalida caché | Doble ejecución, decisión opuesta simultánea, carrera y fallo de sincronización. Driver falso | La referencia debe proceder de un contrato autorizado; no inferirla del texto |
| 3 · Conexión nativa y app cerrada | 01, 02, 03, 05, 06 | Botones del sistema, destino exacto, confirmación y sincronización en iOS/Android físicos | Sesión vencida y carrera en ambos sistemas; Maestro + capturas | BLOQUEADO: contrato de correlación aviso/reserva, soporte nativo y binarios/credenciales/dispositivos |

## Descubrimiento y fronteras

- CodeGraph 1.6.2: consulta `Trace push response handling to host gift reservation decision API, detail route and authentication refresh. Impact of adding background push actions.`; confirmó `useHostReservations`, `useDecideReservation`, rutas y `SignedInPush`. La consulta fue amplia; se contrastaron los archivos actuales.
- `packages/contracts/specs/notification.openapi.json` **1.5.0**, schema `Notification`: no contiene `reservationId`, referencia de acción ni destino verificable; `eventId` es un ID de evento, no un ID de reserva. No se convierte uno en otro.
- `packages/contracts/specs/gift-list.openapi.json` **1.3.0**: GET de reservas y POST `approve`/`reject` disponibles. Las decisiones usan autorización del anfitrión y pueden responder 409; no hay contrato de idempotencia para esos POST.
- `expo-notifications` declarado `~0.32.16`, instalado desde el lockfile **0.32.17**: `src/registerTaskAsync.ts` indica que el callback de acciones en segundo plano/cierre es solo Android. `expo-task-manager` no está instalado. No basta con un listener React para acreditar ejecución con el proceso cerrado en iOS. Referencia: [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/#registertaskasynctaskname); para este código prevalece la fuente de la versión instalada.
- Se conserva F19: no se agregan campos inventados al payload, no se cambia su listener ni se conecta una aprobación a una reserva adivinada. Las categorías son una API preparada y probada; su activación global queda pendiente del contrato y el driver nativo.

## Interfaz y movimiento

Se preservan las primitivas y tokens del panel (Impeccable, modo Operate). UI/UX Pro Max: `action feedback error recovery --domain ux`: recuperación explícita y errores anunciados. Estados: carga, vacío/no disponible, pendiente, resuelto, error recuperable, prohibido y sesión vencida. Sin animación adicional: la confirmación textual y los estados de botones comunican el resultado y funcionan con movimiento reducido.

## Verificación

**Estado: TESTED en el corte frontend local; integración nativa bloqueada. No es `REGRESSION_VERIFIED` ni `DONE` del carril completo.**

| REQ | Estado del requisito completo | Evidencia y límite |
|---|---|---|
| REQ-F20-01 | BLOCKED-EXTERNAL | Categorías y adaptador probados con driver falso; aprobar/rechazar funciona en el detalle. Faltan correlación publicada y activación nativa real. |
| REQ-F20-02 | BLOCKED-EXTERNAL | El ejecutor no navega y desacopla confirmación/sincronización del resultado persistido; no existe todavía un driver conectado que muestre confirmación del sistema en ambos SO. |
| REQ-F20-03 | BLOCKED-EXTERNAL | El adaptador solo abre el destino devuelto por un resolver autorizado; ignora URLs del payload. Ruta y recuperación del login probadas en Chrome; el backend aún no proporciona ese resolver. |
| REQ-F20-04 | PASS | Capa frontend: prelectura de resuelto, 409 con relectura, dos ejecutores concurrentes y mensaje claro. MSW y Chrome. Esto no acredita atomicidad del servicio real. |
| REQ-F20-05 | BLOCKED-EXTERNAL | Sin binarios, credenciales ni dispositivos; falta implementar/conectar el driver nativo pertinente, especialmente iOS. No se sustituye con un listener JS ni se afirma funcionamiento con el proceso cerrado. |
| REQ-F20-06 | BLOCKED-EXTERNAL | Cachés de regalos/avisos invalidadas; consulta de detalle fuerza lectura al montar y sincroniza al volver a primer plano. Probado localmente; pendiente el recorrido originado por un push real con la app cerrada. |

### Pruebas observadas · 2026-11-07

Desde `apps/universal`, con `NODE_OPTIONS=--no-experimental-webstorage`:

```powershell
..\..\node_modules\.bin\vitest.cmd run test/push-actions.test.ts test/push-request.test.tsx test/push-handlers.test.ts test/auth.test.tsx
..\..\node_modules\.bin\vitest.cmd run
..\..\node_modules\.bin\tsc.cmd --noEmit --incremental false
```

- Suite F20 + regresiones de auth/F19: **80/80**, tres ejecuciones consecutivas, salida 0: [corrida 1](unit-run-1.json), [corrida 2](unit-run-2.json), [corrida 3](unit-run-3.json). Son ejecuciones locales, no CI. Los dos archivos propios de F20 contienen 43 tests.
- Regresión universal: **287/287**, salida 0; typecheck sin errores.
- `packages/query-hooks`: **89/89**, salida 0; typecheck sin errores. Cuatro casos nuevos cubren lectura al reabrir incluso con caché fresca, ausencia, pertenencia a celebración y autorización.
- `packages/i18n`: **12/12**, salida 0; typecheck sin errores; es-BO/en-US completos.
- MSW **2.15.0**, rango ya usado por testing `^2.7.3`: añadido como dependencia de desarrollo de universal. Se generó el lockfile con Yarn 4.10.3, sin actualizar los rangos de otros paquetes.
- Transporte real del cliente contra MSW: éxito, renovación de access token, 401, 403, 404, 409, 422, 429, 503 y pérdida de la respuesta después de guardar. No se reenvía una decisión a ciegas tras una respuesta perdida.
- [Cobertura del código nuevo de la app](coverage/index.html): **99.41 %** líneas/sentencias, **91.26 %** ramas; pantalla **98.59 %** líneas. Alcance: `actions.ts`, `categories.ts`, `request-screen.tsx`, no toda la app.
- [Cobertura completa query-hooks](query-hooks-coverage/coverage-summary.json): **99.4 %** líneas/sentencias; hook nuevo **100 %** líneas, **87.5 %** ramas. El runner advirtió el desajuste preexistente Vitest 3.1.2 / coverage-v8 3.2.7; produjo resultados y superó los umbrales sin modificar esa configuración compartida.
- ESLint de los TS/TSX cambiados y `node --check apps/universal/scripts/e2e-push-actions.mjs`: salida 0.
- Gate general ejecutado con Yarn **4.10.3**: `yarn verify` (CLI local, `NODE_OPTIONS="--no-experimental-webstorage --use-system-ca"`). **Build y lint generales pasaron**; se detuvo en `@rsvp/contracts:test`, salida 1, porque los ocho specs vendorizados difieren de `RSVPBackend` (`celebration`, `gateway`, `gift-list`, `guest-rsvp`, `identity`, `notification`, `provider-catalog`, `template-media`). El typecheck general posterior no se alcanzó; sí pasaron los typechecks dirigidos de las tres superficies modificadas. No se regeneraron contratos ni se ocultó el fallo. Un primer intento sin propagar la CA al proceso de Next falló al descargar la fuente de Google; el intento con CA del sistema superó esa compilación conservando TLS verificado.
- Runtime local: Node **25.9.0**; el repositorio declara `>=22 <25`. La ejecución en el Node admitido de CI continúa pendiente, sin modificar engines ni umbrales.
- El test compartido `packages/config-eslint/test/no-literal-strings.test.js` dejó `src/__lint_fixture__/bad.tsx`: usa `rm` para limpiar, que no funcionó en esta ejecución Windows. Se comprobó contenido/origen y se retiró únicamente ese artefacto temporal con PowerShell; typechecks y lint dirigidos finales volvieron a pasar, salida 0. No se cambió el test de otro carril. CodeGraph sincronizado al terminar.

### Navegador y recuperación de sesión

Desde la raíz:

```powershell
$env:CHROMIUM_PATH = Join-Path $env:LOCALAPPDATA 'Google/Chrome/Application/chrome.exe'
node apps/universal/scripts/e2e-push-actions.mjs
```

Chrome real + exportación Expo web + respuestas locales con forma contractual: salida 0, [reporte](local-web/result.json). Once capturas y once análisis axe sin violaciones críticas ni serias; sin desborde horizontal. Pendiente/aprobado en **360/768/1280**, vacío, error 503, carrera 409, rechazo en inglés y sesión expirada. Activado movimiento reducido y timezone del navegador `Asia/Tokyo`: la fecha se mantiene en `America/La_Paz`. Capturas inspeccionadas por tamaño y estados representativos. Estas capturas no son snapshots de CI aprobados por otro eje ni evidencia iOS/Android.

El recorrido encontró y reprodujo la pérdida del `?c=` al desmontar la navegación durante un 401. Integración mínima de F20: el layout host reconoce únicamente `/bandeja/[id]`, toma la celebración de los parámetros globales y entrega al guard un destino explícito que sobrevive a esa transición. Los demás usos del guard conservan su comportamiento. Chrome verificó `/login?returnTo=…` con la reserva y celebración correctas; iniciar sesión no reproduce una decisión automáticamente.

### Bloqueos reproducibles y siguiente integración

- TCP `127.0.0.1:8000` y `:28000`: **ECONNREFUSED**. No se ejecutaron decisiones contra servicios reales.
- `EXPO_PUBLIC_EAS_PROJECT_ID`, `EXPO_IOS_BUNDLE_IDENTIFIER`, `EXPO_ANDROID_PACKAGE`: no definidos en el proceso. `adb`, `maestro`, `eas`: no disponibles en PATH. Sin iPhone/Android físicos accesibles.
- El backend 24 debe publicar/versionar cómo un aviso autorizado se relaciona con su celebración y reserva; el contrato actual no lo permite. La interfaz `GiftPushActionDriver.resolveTarget` es una dependencia obligatoria, **no** un endpoint supuesto ni un resolver ficticio en producción. No se deduce la reserva de `eventId`, título, texto o URLs recibidas.
- Después de acordar ese contrato, aún hay trabajo propio de F20: conectar el resolver al adaptador, activar categorías, implementar/registrar la ejecución nativa y la confirmación del sistema, y probar primer plano/segundo plano/cierre en ambos SO. La ausencia de este código integrado no se presenta como un requisito cumplido.
- [Maestro](../../../../apps/universal/.maestro/f20-request.yaml): YAML analizado, no ejecutado. Requiere `APP_ID`, `CELEBRATION_ID`, una `RESERVATION_ID` pendiente y credenciales QA. Cubre detalle/login/decisión; no cubre pulsar la notificación del sistema.
- Pendientes: integración real versionada, pruebas de notificación nativa y carrera en dispositivos, tres ejecuciones en CI, revisión por otro eje y regresión completa de plataformas antes de `DONE`.

### Límite de archivos

Archivos nuevos de F20 en `src/push`, ruta `bandeja/[id]`, hook de detalle, traducciones propias, tests, script visual, Maestro y evidencia. Puntos compartidos indispensables: export del hook, registro i18n, dependencia MSW/lockfile y opción de retorno del guard/layout host exclusiva de esta ruta. Sin cambios de backend, del listener F19, de F22 ni de la bandeja F23 existente.
