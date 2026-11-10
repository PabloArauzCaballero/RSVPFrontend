# Revisión y correcciones F17/F18 · Miguel · 2026-11-09

Estado: **TESTED local**, no REGRESSION_VERIFIED ni DONE. Alcance: F17/F18 y sus pruebas, textos y evidencia. Sin cambios de backend, contratos, dependencias, otros carriles, commit, push o PR. Se conservaron las correcciones anteriores de F15/F16. Las fechas de los logs pueden estar en UTC; esta revisión se identifica con la fecha local America/La_Paz.

## Errores reproducidos y corregidos

| Carril | Causa y efecto antes | Corrección | Prueba |
|---|---|---|---|
| F17-02/05 | Una página vacía prematura o el límite de paginación permitían descargar un CSV incompleto. El catering tampoco rechazaba un cursor repetido. | Solo devolver el archivo tras completar la lectura; lanzar error recuperable ante paginación incompleta o cíclica. La pantalla conserva su mensaje localizado de fallo. | report-completeness.test.ts: cuatro negativos y un éxito con páginas cortas y acentos. |
| F17-02 | Al cambiar de celebración, keepPreviousData podía mostrar temporalmente invitados de la celebración anterior. | Remontar ReportBody con la identidad de la celebración; no reutilizar filas, filtros ni estado local entre celebraciones. | host-review-state.test.tsx: celebración B precargada, lista B demorada; nunca aparece el invitado privado de A. |
| F17-01 | El plazo dependía de que otro dato provocara un render; podía quedar abierto visualmente después del cierre. | Reloj local cada 30 segundos y limpieza al desmontar. Menos de 24 horas se comunica como menos de un día, no necesariamente hoy, en ambos idiomas. Los conteos siguen viniendo del backend. | deadline-before.json falla y deadline-after.json pasa con datos de resumen idénticos. |
| F18-06 | La clave del formulario dependía del horario guardado. Un refresco remoto desmontaba el formulario y borraba lo escrito. | Separar el borrador del dato persistido; conservarlo durante refrescos y fallos; limpiarlo tras guardar/restaurar con éxito. | host-review-state.test.tsx: borrador 23/07, servidor actualizado a 21/06; se conserva 23/07 y se guarda correctamente. |
| F18-03/04 | El rollback completo de un toggle fallido podía reemplazar preferencias más recientes del servidor. | Comparar la revisión de caché con la del cambio optimista. Restaurar el snapshot solo si no llegó una actualización posterior; preservar la lectura más nueva. | notification-concurrency.test.tsx: cambio remoto de SMS y horario durante fallo de EMAIL; también cubre EMAIL remoto igual al valor optimista. |

La reproducción previa queda en hooks-before.log, screens-before-confirmed.log y deadline-before.json. screens-before.log contiene además una primera aserción prematura del test; se ajustó para esperar el dato remoto y se volvió a reproducir antes de corregir producto. Hay **10 casos nuevos**: 5 CSV, 2 concurrencia y 3 pantallas.

También se corrigió el guion del navegador F18: no debe confundir el contador optimista en cero con un guardado ya terminado. Ahora espera todas las respuestas POST /read exitosas y verifica el estado del servidor antes de recargar. La pantalla ya muestra su estado de guardado. El fallo anterior queda en f18-browser-before.json y browser-F18.log; no se añadió una pausa ni se debilitó la aserción de persistencia.

## Verificación actual

| Comprobación | Resultado | Artefacto |
|---|---|---|
| Universal completo | 416/416, cero fallos | universal-full.json/log |
| Query-hooks completo | 105/105, cero fallos | hooks-full.json/log |
| SEO web, consumidor vecino | 111/111, cero fallos | seo-full.json/log |
| i18n completo | 12/12, cero fallos | i18n.json/log |
| Total de suites completas | **644/644**; no incluye de nuevo la corrida de cobertura | Archivos anteriores |
| Cobertura query-hooks | 99,42 % líneas/sentencias; 93,48 % ramas | coverage-hooks/coverage-summary.json |
| Cobertura cinco pantallas F17/F18 | 98,78 % líneas/sentencias; 90,55 % ramas; 63 pruebas | coverage-screens/coverage-summary.json; screens-coverage.log |
| TypeScript del monorepo | PASS, 18/18 tareas | typecheck.log |
| ESLint completo y sintaxis del guion | PASS | eslint-final.log; eslint-final-exit.txt |
| Harness e índice CodeGraph | PASS | harness.log; codegraph-sync-after.log |
| Build de producción | PASS, 18/18 tareas, exit 0 | build-retry.log; build-exit.txt |
| Chrome F17 | PASS con mock HTTP de contrato | web/lane-F17/local-web/e2e-result.json; browser-F17-retry.log |
| Chrome F18 | PASS con mock HTTP: lectura persistida, canal y borrador de horario | web/lane-F18/local-web/e2e-result.json; browser-F18-retry.log |
| Comparación de contratos | FAIL preexistente: ocho specs difieren, ninguno modificado | contracts-check.log |
| Gateway local | 8000 y 28000: ECONNREFUSED | gateway-probe.json |

Los tests completos incluyen fallos de red, permisos, 401/403/409/422, estados vacíos/carga, conflictos y lecturas optimistas parciales existentes. Las pruebas con MSW o mock prueban frontend; no prueban proyecciones ni supresión de entregas del servicio real.

### Comandos ejecutados

PowerShell, con NODE_OPTIONS=--no-experimental-webstorage. Desde cada workspace, el ejecutable Vitest fue ../../node_modules/.bin/vitest.cmd.

- apps/universal: vitest run --reporter=json --outputFile=../../docs/progress/evidence/review-fix-F17-F18-2026-11-09/universal-full.json
- packages/query-hooks: vitest run --coverage --reporter=json --outputFile=../../docs/progress/evidence/review-fix-F17-F18-2026-11-09/hooks-full.json --coverage.reportsDirectory=../../docs/progress/evidence/review-fix-F17-F18-2026-11-09/coverage-hooks
- apps/seo-web e i18n: vitest run --reporter=json, con los outputFile indicados en la tabla.
- Cobertura de pantallas: vitest run test/guests.test.tsx test/host-review-state.test.tsx --maxWorkers=2 --minWorkers=1 --coverage, con --coverage.include para summary-screen.tsx, report-screen.tsx, requests-screen.tsx, notifications-screen.tsx y preferences-screen.tsx bajo src/host/guests; reporteros text-summary/json-summary y destino coverage-screens en esta carpeta.
- Raíz: yarn typecheck; yarn build; node_modules/.bin/eslint.cmd . --max-warnings 0; node --check apps/universal/scripts/e2e-guests.mjs; node scripts/validate-harness.mjs; node_modules/.bin/codegraph.cmd sync; node packages/contracts/scripts/generate.mjs --check.
- Yarn 4.10.3 se invocó con node C:/Users/maria/AppData/Local/npm-cache/_npx/c5fc1eefaaff1c2d/node_modules/@yarnpkg/cli-dist/bin/yarn.js. NODE_USE_SYSTEM_CA=1 para build.
- Navegador: node apps/universal/scripts/e2e-guests.mjs --f17 y --f18, secuencialmente, con CHROMIUM_PATH=C:/Users/maria/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe y RSVP_EVIDENCE_ROOT apuntando a la subcarpeta web de esta revisión. El primer arranque de Chrome fue bloqueado por el aislamiento de Windows; se repitió fuera del aislamiento. La compilación inicial quedó interrumpida al reanudar el chat y se repitió en build-retry.log.

## REQs y alcance probado

| REQ | Estado de la capa comprobada | Evidencia / pendiente |
|---|---|---|
| F17-01 | PASS frontend | Agregados, solicitudes y plazo; reloj bajo prueba y confirmación idempotente en Chrome con mock. |
| F17-02 | PASS frontend | Reporte con dieta/mensaje, filtros y aislamiento al cambiar celebración. |
| F17-03 | PASS frontend | Aprobar/rechazar, vacío, error y conflicto; aprobación por teclado en Chrome. |
| F17-04 | PASS frontend | Frescura y zona de celebración, aviso de proyección pendiente y fallo de refresco. |
| F17-05 | PASS frontend web | CSV con acentos/BOM y catering sin datos personales; no se entrega archivo parcial. Excel no se volvió a ejecutar en esta revisión; la evidencia histórica no sustituye validar la entrega actual en destino. Compartir nativo pendiente. |
| F17-06 | PASS frontend | Conteos del read model; no se calculan desde páginas/listas locales. |
| F18-01 | PASS frontend | Abrir aviso tras persistir lectura; destino conocido, fallo recuperable. |
| F18-02 | BLOCKED-EXTERNAL | Expo web probado; falta ejecutar el centro nativo en iOS/Android. |
| F18-03 | PASS frontend | Canales/tipos, PATCH, relectura y rollback que conserva datos posteriores. |
| F18-04 | BLOCKED-EXTERNAL | Guardado y relectura probados con contrato; la supresión real de envío requiere Notification backend. |
| F18-05 | PASS frontend | Lectura individual/en lote optimista, persistencia y rollback parcial en tests; resultado Chrome de la tabla superior. |
| F18-06 | PASS frontend | Horario en zona de celebración, validación, fallo, restauración y conservación del borrador. |

## Interfaz, límites y cierre

Impeccable Operate/harden y UI/UX Pro Max aplicados a conservación del borrador, feedback de guardado/error y aislamiento de datos. Se mantiene la identidad existente. No se añade animación: estas correcciones no la necesitan. CodeGraph 1.6.2 consultado antes de editar y contrastado con archivos; consultas e impacto en codegraph-discovery.txt.

Se inspeccionaron muestras de capturas actuales: C6 a 360 px, C24 a 1280 px, C26 a 768 px, C31 a 360 px, preferencias en-US a 768 px y horario guardado a 1280 px. Chrome generó 11 capturas F17 y 10 F18, con 16 mediciones axe sin hallazgos críticos ni serios y controles de desbordamiento en 360/768/1280 px. El encabezado compartido ocupa bastante espacio en móvil; las capturas del viewport no prueban el contenido que queda debajo. No se rediseña la navegación compartida. No se afirma aprobación humana de todos los snapshots, tema oscuro, landscape, lector de pantalla, Dynamic Type ni runtime nativo.

La integración actual queda **BLOCKED-EXTERNAL**: frontend consume Guest/RSVP 1.10.0 y Notification 1.5.0; el checkout backend tiene 1.8.0 y 1.2.0 respectivamente. El gateway no responde. Se necesita un entorno coordinado de backend 21 para F17 y backend 23 para F18; Miguel conserva la prueba de integración de sus pantallas. No corresponde regenerar los contratos hacia versiones anteriores ni modificar servicios ajenos para ocultar el desajuste.

Pendientes del DoD: integración real actual, comprobación nativa, matriz visual/accesibilidad completa y aprobación, tres corridas de CI y revisión de otro eje. No se abrieron PR ni se ejecutó merge. No hay metadatos Git en esta copia frontend: no se inicializó ni reemplazó el checkout. El escaneo de secretos previo a PR sigue pendiente. Node 25.9.0 está fuera del rango >=22 <25 del repo y Vitest 3.1.2 avisa por coverage-v8 3.2.7; se documentan sin cambiar herramientas de otros carriles.

## Alcance y reversión

Producto: report-screen.tsx, summary-screen.tsx, preferences-screen.tsx, guest/csv.ts, notification/index.ts y solo el texto de plazo F17 en guests.ts de es-BO/en-US. Tres archivos nuevos de pruebas y cambios solo en el bloque F18 del guion compartido. requests-screen.tsx y notifications-screen.tsx se revisaron sin modificar.

changes.patch compara archivos existentes con before/. El manifiesto final identifica archivos y hashes. Antes de revertir, comparar el diff: restaurar únicamente estos cambios en la futura rama, conservando trabajo posterior y las correcciones anteriores de F15/F16. No hay migraciones, dependencias nuevas ni cambios contractuales.
