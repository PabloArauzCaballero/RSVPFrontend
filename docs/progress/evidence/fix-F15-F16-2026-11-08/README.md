# Correcciones F15/F16 · Miguel · 2026-11-08

Los tres fallos reproducidos en el reporte anterior están corregidos y cubiertos con regresiones permanentes. Estado: TESTED en frontend y recorrido web con API simulada. Todavía no REGRESSION_VERIFIED ni DONE; no se recomienda merge hasta cerrar los puntos externos indicados abajo. No se hizo commit, push, PR ni cambio en backend/contratos.

## Qué cambió y por qué

- F15: los campos de respuesta y alta pública quedan deshabilitados mientras el envío está pendiente. La respuesta corresponde exactamente al contenido visible; un fallo habilita de nuevo el borrador intacto. Un bloqueo sincrónico impide dos envíos simultáneos incluso antes del siguiente render. Se conserva la idempotencia existente.
- F16: un alta exitosa limpia solo la misma revisión de borrador que se envió. Si la persona siguió escribiendo, esos datos se conservan. El envío tiene bloqueo sincrónico y se vuelve a habilitar al resolver o fallar. El formulario queda aislado por celebración.
- F16: DetailBody se monta por celebración/invitado, de modo que su enlace, diálogo y grupo no se reutilizan al cambiar identidad. Una respuesta tardía del invitado A no puede pintar el enlace en la ficha B.
- Ocho regresiones nuevas en rsvp-submission.test.tsx y guest-state.test.tsx. Scripts de navegador F15 y sección F16 ampliados; el script compartido conserva el comportamiento de los demás carriles y solo añade una ruta configurable para evidencia.

Solo cuatro archivos fuente de producto cambiaron: rsvp-form.tsx, rsvp-experience.tsx, guest-form-screen.tsx y guest-detail-screen.tsx. Los otros 32 archivos de producto del inventario revisado conservan sus hashes. Dos archivos de tests nuevos y dos scripts de pruebas modificados. before/ conserva originales; changes.diff permite revisar las seis modificaciones existentes sin metadatos Git. changes-manifest.json identifica archivos y hashes finales. La ausencia de .git impide revisar el diff de una rama contra dev/main.

## Resultado observado

| Comprobación | Resultado | Artefacto |
|---|---|---|
| Reproducción antes del fix | F15 1 fallo; F16 2 fallos por aserciones de bloqueo/conservación/identidad | f15-before.log, f16-before.log |
| F15 dirigido | 28/28 PASS: 24 originales + 4 nuevos | f15-tests.json/log |
| Suite invitados compartida | 64/64 PASS: 18 originales F16 + 4 nuevos F16 y 42 regresiones vecinas existentes | f16-tests.json/log |
| Suites completas | seo-web 111/111; universal 413/413; query-hooks 98/98; forms 35/35. Total 657 PASS | *-full.json/log |
| Cobertura F15 | 90.38% líneas; 88.97% ramas | f15-coverage/coverage-summary.json |
| Cobertura cinco pantallas F16 | 97.58% líneas; 91.7% ramas | f16-coverage/coverage-summary.json |
| Build raíz | 18/18, salida 0; dos tareas ejecutadas y 16 desde caché | build.log |
| Typecheck raíz tras build | 18/18, salida 0; dos tareas ejecutadas y 16 desde caché | typecheck-after-build.log |
| ESLint y harness | Salida 0 | eslint-final.log, harness.log |
| Chrome for Testing 151.0.7922.34, F15 | PASS; cinco estados, teclado/foco, envío pendiente, conexión lenta/offline/reintento, privacidad y en-US; 360/768/1280 | f15-browser.log, web-F15/ |
| Chrome for Testing, F16 | PASS; 500 invitados paginados, alta y borrador posterior, CSV de 200 filas (198 válidas, 2 errores con línea/motivo), grupos y ficha/enlace; 360/768/1280 | f16-browser.log, web/lane-F16/local-web/ |
| Axe de esos recorridos | Sin violaciones críticas ni serias en las vistas analizadas | e2e-result.json de cada recorrido |
| Contratos actuales | Salida 1: ocho snapshots difieren en bytes del checkout backend | contracts.log, environment.json |

El código final pasó tres veces localmente por las pruebas dirigidas: ejecución dirigida, incluida en la suite completa y ejecución con cobertura. Esto NO equivale a tres corridas de CI. Los paquetes compartidos no se editaron; sus suites completas pasaron, pero no se afirma haber medido de nuevo toda la cobertura de packages/.

## Mapa REQ y alcance

| REQ | Capa frontend observada | Cierre del carril |
|---|---|---|
| F15-01 | PASS: confirmar/rechazar, datos y un solo envío activo | Integración real actual pendiente |
| F15-02 | PASS: confirmado, edición y cuenta atrás | Integración real actual pendiente |
| F15-03 | PASS: plazo cerrado y fecha en zona de celebración | Integración real actual pendiente |
| F15-04 | PASS: inválido/revocado sin filtrar celebración | Integración real actual pendiente |
| F15-05 | PASS: modo público/restringido y alta; error habilita campos conservados | Integración real actual pendiente |
| F15-06 | PASS: éxito lento sin edición destructiva, fallo/reintento y borrador | Integración real actual pendiente |
| F16-01 | PASS: búsqueda/filtros/paginación con 500 en mock | 500 contra servicio real pendiente |
| F16-02 | PASS: validación, alta, borrador posterior y recuperación | Integración real y nativo pendientes |
| F16-03 | PASS funcional: archivo 200 filas y reporte por fila | Servicio real y localización contractual del motivo pendientes |
| F16-04 | PASS de grupos; BLOCKED-EXTERNAL para mesas sin contrato | No se inventa API de mesas |
| F16-05 | PASS: enlace y ficha aislados; props reutilizadas, respuesta tardía y navegación Expo web A → lista → B | Backend real y nativo pendientes |
| F16-06 | PASS: enlace enmascarado y secreto completo ausente del DOM | Nativo pendiente |

El reporte CSV presenta el reason enviado por el servidor. Las capturas con fixture muestran “Email is invalid” en una interfaz es-BO: no acredita localización completa de motivos arbitrarios. No se reemplazó ese detalle por un error genérico ni se inventaron códigos contractuales. Se requiere acordar motivos/códigos localizables con el servicio Guest/RSVP para cerrar ese gate.

## Inspección visual y límites

Inspeccionadas visual-f15-form.png, visual-f15-states.png, visual-f16-form.png, visual-f16-detail.png y visual-f16-fixed.png, compuestas de capturas reales. Formularios mantienen estructura y textos; RSVP pendiente conserva valores y muestra Enviando; error muestra recuperación. La ficha B presenta su propio nombre y no ofrece copiar el enlace de A. CSV informa líneas 41/151. Los screenshots de Expo capturan el viewport del ScrollView: algunos cortes pequeños no muestran todos los controles a la vez; no se atribuye aprobación humana o snapshot completo de toda la pantalla. El header fijo de Next puede aparecer a la altura del scroll en capturas fullPage tomadas tras interactuar. No se cambiaron estilos compartidos.

No se verificó lector de pantalla, iOS/Android, matriz completa claro/oscuro/en-US de F16, ni aprobación humana de capturas. Animación nueva: ninguna; estados pendientes y error usan affordances existentes. Impeccable Operate/harden + UI/UX Pro Max aplicados a concurrencia/conservación de datos, sin rediseño. CodeGraph 1.6.2 consultado antes y sincronizado después, contrastado con archivos actuales.

## Incidencias de ejecución resueltas

- Typecheck inicial coincidió con build regenerando .next/types; falló por archivos generados ausentes. La ejecución secuencial después del build pasó. No se modificó tsconfig.
- Instalación del navegador y primera compilación E2E de Next fallaron por cadena TLS local. Se usó NODE_USE_SYSTEM_CA=1, sin desactivar la validación TLS; ambas finalizaron bien.
- El primer check de navegación F16 comprobaba el DOM antes de esperar el destino. Se corrigió el test para esperar URL/nombre de B y comprobar la pantalla visible, respetando que Expo puede conservar pantallas previas en su stack. El caso de componente con props reutilizadas sigue exigiendo que desaparezca el enlace previo de todo el árbol montado. No se debilitaron pruebas de producto.

## Qué falta y quién lo atiende

1. Contratos entre repos: Guest/RSVP de frontend es 1.10.0, la copia backend es 1.8.0; también difieren otros dominios. Gateway tiene JSON semánticamente idéntico aunque difiere en bytes; no todas las diferencias tienen el mismo impacto. Hay que obtener/alinear la versión backend adecuada antes de integrar, sin regenerar ocho dominios a ciegas ni rebajar el frontend. El plan asigna backend 17–24 a Miguel: es coordinación entre repos, no evidencia de culpa de otro compañero.
2. Gateway actual :8000 y :28000: ECONNREFUSED. Docker sí tiene servicios de infraestructura, pero no el gateway/servicios de aplicación requeridos. Repetir F15/F16 contra entorno compatible real, incluidos errores, 200 CSV y 500 invitados. Los fixtures no prueban que el backend actual acepte estas peticiones.
3. Mesas F16 y códigos/localización del reporte CSV: completar/acordar el contrato y luego su consumo/verificación dentro de F16.
4. Miguel verifica nativo, accesibilidad manual, matriz visual y CI; otro eje realiza revisión independiente. No se puede atribuir aprobación de PR a esta misma sesión.
5. Recuperar checkout Git y rama objetivo para revisar integración. Ejecutar el gate final en Node soportado (rango >=22 <25; aquí 25.9.0) y gitleaks, que no está disponible. No se modificaron dependencias para ocultar avisos de versión Vitest/coverage.

## Comandos reproducibles (CMD)

Desde apps/seo-web: set "NODE_OPTIONS=--no-experimental-webstorage" y node ../../node_modules/vitest/vitest.mjs run tests/rsvp-page.test.tsx tests/rsvp-submission.test.tsx --minWorkers=1 --maxWorkers=2

Desde apps/universal: mismo NODE_OPTIONS y node ../../node_modules/vitest/vitest.mjs run test/guests.test.tsx test/guest-state.test.tsx --minWorkers=1 --maxWorkers=2

Desde raíz: node apps/seo-web/scripts/e2e-rsvp.mjs y node apps/universal/scripts/e2e-guests.mjs --f16. Definir CHROMIUM_PATH con chrome.exe; RSVP_EVIDENCE_DIR (F15) y RSVP_EVIDENCE_ROOT (F16) a carpetas absolutas nuevas para no reemplazar evidencia anterior. NODE_USE_SYSTEM_CA=1 fue necesario en este Windows. Los scripts construyen y sirven localmente las apps y su API simulada; no publican nada.

Reversión: restaurar únicamente los seis originales de before/ y retirar los dos archivos de pruebas añadidos si se descarta este cambio. No hay migraciones ni cambios de contrato; no se cambia ningún código de otro carril para aplicar estas correcciones.
