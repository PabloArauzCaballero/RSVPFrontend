# Revisión de F15 y F16 · Miguel · 2026-11-08

**Decisión: no recomendar merge ni entrega como carriles terminados.** Esta revisión conserva la implementación: no corrige los hallazgos, no publica y no afirma una revisión del diff contra main/dev. La copia no contiene metadatos Git.

## Hallazgos reproducidos

1. **P2 · F15: se pierden cambios escritos durante un envío lento.** AnswerForm permite editar AnswerFields mientras save.isPending; al responder la petición anterior se ejecutan clearDraft(scope) y onSaved(next) sin comprobar si el borrador cambió. Reproducción: enviar Mensaje original, retener la respuesta, escribir Cambio pendiente escrito durante el envío y liberar la respuesta. El backend simulado recibe solo el original y el texto nuevo desaparece tanto de la pantalla como de sessionStorage. Referencias: apps/seo-web/components/rsvp/rsvp-experience.tsx:151–154 y :170–177. Corregir bloqueando campos durante el envío o conservando explícitamente una revisión posterior del borrador; añadir regresión permanente.

2. **P2 · F16: el alta borra el siguiente borrador al completar una petición anterior.** Los campos siguen editables mientras register.isPending; onSuccess reinicia incondicionalmente el formulario. Reproducción: guardar Primera invitada, retener la petición, escribir Borrador del siguiente invitado y liberar. Solo la primera se registra y el nombre actual queda vacío. Referencia: apps/universal/src/host/guests/guest-form-screen.tsx:32–42. Es una corrección del frontend de Miguel; no requiere que otro eje suba código.

3. **P2 · F16: el componente de detalle conserva la credencial del invitado anterior al cambiar sus props sin remontar.** Se precarga el detalle de B, se emite el enlace de A y se cambia guestId a B manteniendo los proveedores y el componente. El encabezado pasa a B, pero Copiar enlace sigue copiando el token de A. LinkSection conserva issued/confirm/message y DetailBody no tiene una key por identidad. Referencias: apps/universal/src/host/guests/guest-detail-screen.tsx:29–41 y :129. Prueba de componente, no un recorrido demostrado del router: la navegación real puede remontar la ficha; falta verificar esa frontera antes de atribuir el caso a todos los recorridos de producción. Aislar el estado por celebración/invitado y cubrir la reutilización con una regresión permanente.

Los tres probes terminan en exit 1 por aserciones de conservación/identidad, no por errores de importación. El fixture del alta se ajustó a la etiqueta existente Invitado agregado. antes del resultado definitivo. Fuentes exactas guardadas como __review_f15_20261108.test.tsx.txt y __review_f16_20261108.test.tsx.txt; resultados f15-probe.json/log y f16-probe.json/log. Los archivos temporales se retiraron de las suites después de la revisión; no se borró ni debilitó ninguna prueba existente.

## Comprobaciones actuales

| Comando / superficie | Resultado observado | Artefacto |
|---|---|---|
| Vitest F15: tests/rsvp-page.test.tsx, MSW y API client real | 24/24 PASS; cobertura RSVP 90.22 % líneas/sentencias, 87.70 % ramas | f15-tests.json/log, f15-coverage/coverage-summary.json |
| Vitest universal: test/guests.test.tsx | 60/60 PASS: 18 F16, 18 F17, 23 F18 y 1 F19. Las cinco pantallas F16: 97.56 % líneas/sentencias, 91.35 % ramas | f16-tests.json/log, f16-coverage/coverage-summary.json |
| Probes nuevos de borde | F15 1/1 FAIL y F16 2/2 FAIL, con observaciones explícitas de lo perdido/copiado | f15-probe.json/log, f16-probe.json/log |
| Typecheck raíz con Yarn local en caché | exit 0; 18/18 tareas, todas desde caché Turbo | typecheck.log |
| ESLint raíz con max-warnings 0 | exit 0 | eslint.log |
| node scripts/validate-harness.mjs | exit 0 | harness-check.log |
| node scripts/generate.mjs --check, desde packages/contracts | exit 1: ocho specs difieren del checkout backend | contracts-check.log |
| TCP 127.0.0.1:8000 y :28000, fuera del aislamiento | ECONNREFUSED en ambos | environment.json |
| Hashes de las rutas/componentes y paquetes inspeccionados | 36 archivos fuente sin cambios | source-hashes.json |

Las suites existentes no cubrían los tres casos anteriores: sus resultados verdes no acreditan ausencia de errores. Las pruebas de componente acreditan su capa; no se ejecutó aquí un recorrido Chrome nuevo, ni build completo, gitleaks, CI, lector de pantalla ni runtime iOS/Android. Node v25.9.0 sigue fuera del rango declarado >=22 <25 y conserva el aviso previo de versiones distintas entre Vitest y cobertura; no se cambian dependencias.

## Mapa de requisitos

| REQ | Evidencia de esta revisión / límite | Estado para cierre |
|---|---|---|
| F15-01 | Confirmar/rechazar, acompañantes, dieta y mensaje pasan; borde de edición durante envío pierde datos | FAIL en borde del formulario |
| F15-02 | Confirmado, edición y cuenta atrás pasan en componente | PASS de capa; integración actual pendiente |
| F15-03 | Cierre y 409 con fecha localizada en zona de celebración pasan | PASS de capa; integración actual pendiente |
| F15-04 | Inválido/revocado/slug desconocido y no revelar datos pasan | PASS de capa; integración actual pendiente |
| F15-05 | Modo público consultado, consentimiento, alta y cambio a RESTRICTED pasan | PASS de capa; integración actual pendiente |
| F15-06 | Fallo de transporte y reintento conservan entradas; éxito lento con edición concurrente las pierde | FAIL en borde de conexión lenta |
| F16-01 | Lista, filtro, búsqueda, paginación y 500 invitados en fixture pasan | PASS de capa; 500 reales pendiente |
| F16-02 | Validación y alta pasan; edición durante guardado pierde el borrador posterior | FAIL en borde del formulario |
| F16-03 | Reporte por fila y conservación del CSV ante errores pasan; 200 filas en Chrome solo tienen evidencia histórica simulada | PASS de capa; 200 contra servicio real pendiente |
| F16-04 | Grupos familiares pasan; guest-rsvp 1.10.0 publica groups, no mesas/seating | BLOCKED-EXTERNAL para contrato de mesas |
| F16-05 | Emitir/copiar/compartir/revocar pasan en el caso inicial; cambiar identidad sin remontaje conserva enlace anterior | FAIL de componente; recorrido real del router pendiente |
| F16-06 | Enmascarado y ausencia del secreto completo en DOM pasan | PASS de capa; plataformas nativas pendientes |

Los PASS de capa no son PASS de integración ni equivalen a DONE. La evidencia histórica del 2026-11-05 contiene pruebas reales de algunos recorridos; F16 usó allí 2 importados y 1 error, no 200 filas. No se acredita el estado actual con esa corrida antigua.

## Gates y responsables

- **Miguel frontend:** corregir los dos borrados de borrador y aislar el estado de la ficha de invitado; conservar los probes como regresiones permanentes al implementar. Validar el recorrido real del router del tercer caso.
- **Contratos:** no regenerar automáticamente ocho dominios para arreglar este review. Coordinar las versiones; Guest/RSVP 1.10.0 es el contrato local consumido. El plan frontend asigna backend 17–24 a Miguel: la ausencia de mesas es una frontera entre repos, no una prueba de que otro compañero tenga pendiente subir algo.
- **Miguel + entorno backend:** repetir la integración real de F15 y F16, incluida importación de 200 filas, lista de 500, permisos, grupos/enlaces y errores. Gateway no disponible ahora.
- **Entrega:** completar runtime nativo y accesibilidad aplicable a F16, capturas aprobadas, tres corridas CI y revisión de otro eje. Pablo/F07 aporta la infraestructura/build cuando haga falta; Miguel conserva la verificación de sus pantallas.
- **Git:** falta el checkout con metadatos y la rama objetivo para revisar diff, compatibilidad e integración con dev/main. No se inicializa ni clona para aparentar un estado de merge.

La puerta local rsvp-pr-gate exige “Verificación estática limpia” y “Prueba de regresión en entorno real, no solo en CI”. Con contratos fallando y sin entorno real actual no se recomienda abrir el PR de integración; subir una rama de respaldo no equivale a aprobar estos carriles. La decisión de esta revisión es TESTED con hallazgos y bloqueos, sin REGRESSION_VERIFIED ni DONE.

## Reproducción de los probes

Las copias .txt de esta carpeta conservan el código temporal exacto. Para repetirlo, copiarlas a apps/seo-web/tests/__review_f15_20261108.test.tsx y apps/universal/test/__review_f16_20261108.test.tsx respectivamente. Desde cada app, con NODE_OPTIONS=--no-experimental-webstorage:

- node ../../node_modules/vitest/vitest.mjs run tests/__review_f15_20261108.test.tsx --minWorkers=1 --maxWorkers=1
- node ../../node_modules/vitest/vitest.mjs run test/__review_f16_20261108.test.tsx --minWorkers=1 --maxWorkers=1

Ambos comandos deben salir 1 mientras los defectos sigan presentes. Retirar solo esas copias temporales al terminar. Para repetir las suites existentes, sustituir los paths por tests/rsvp-page.test.tsx o test/guests.test.tsx. No se aplica ningún fix como parte de esta revisión.
