# Cierre de invitados y regalos

Fecha: 2026-11-18T11:18:56.141Z. Nivel: VERIFIED del recorrido requerido en QA local; candidato para revisión humana. No se hizo merge, aprobación propia ni despliegue en Coolify.

## Identidad del candidato

| Repositorio | SHA inicial efectivo | SHA final del código |
|---|---|---|
| RSVPBackend | eed1137a38673aea7daecf47837637928d1fdc92 | 12308a4c9ed55d359724fa5bd3edb64e228db2b9 |
| RSVPFrontend | d1aef5aae064726776e252b152da6a1ddaab6353 | 665ca50044912678edbd2266a0a9927dd8f97157 |

Rama de trabajo en ambos: `fix/guest-rsvp-gifts-coolify`. Destino: `chore/deploy-contabo-coolify`. Los commits documentales posteriores se identifican en PUBLICACION.json y en la entrega final; los SHAs anteriores sellan el código probado.

Backend tiene dos pasos: fundamento compatible `abb082fec87579d0836ec547d76be37f004aac61` y activación `12308a4c9ed55d359724fa5bd3edb64e228db2b9`. Esto permite revertir la activación conservando lectores, barreras y datos nuevos.

Se conservaron los checkouts diarios con cambios locales y se trabajó en worktrees completos aislados. Fetch confirmó backend base `90b5ae1151cdace4bf59a080d9ef17a7efad0633`. Frontend base avanzó desde `669547884aabaf6cf625ce91a0fccb44676312e9` a `dc00f164b8e357852dc3f02a5a0c10db5d739aa1`. Se verificó sin conflictos el árbol combinado `bf33a86022e1f9fbe2ce32d6173106ef3255e55c` mediante merge-tree y una superposición temporal, sin merge ni reescritura de ramas. Build, lint, pruebas, typecheck, contratos y el segundo recorrido de Chrome se ejecutaron sobre ese árbol; después se restauró la rama de trabajo.

## Defecto y solución

La reproducción inicial guardó CONFIRMED → DECLINED en Guest/outbox, mientras Gift conservaba PENDING_REVIEW y el regalo ocupado: evidencia/defecto-inicial.json. Gift no consumía las transiciones de asistencia y el compose solo activaba su HTTP. El cambio de confirmado a declinado llega como guest.rsvp.changed.v1, por lo que escuchar únicamente declined no bastaba.

Gift ahora consume confirmed, declined y changed firmados, verifica productor/audiencia/actor/tenant y deduplica persistentemente. La transacción única guarda inbox, proyección versionada, cancelación, disponibilidad y outbox gift.reservation.cancelled.v1. CANCELLED/RSVP_DECLINED tiene metadatos separados; conserva resolved_at, actor y procedencia de aprobación. Las reservas nuevas guardan la versión RSVP verificada por Guest. La barrera SQL por celebración/invitado cubre reservar, decidir, cancelar y anonimizar; nunca consulta tablas ajenas.

Un rechazo antiguo no invalida una reserva nueva tras reconfirmar. Se conserva la procedencia histórica desconocida de forma explícita. Idempotency-Key devuelve la operación original, incluso cancelada. Ambas superficies HTTP verifican la credencial opaca y rechazan nuevas reservas del invitado declinado. La UI distingue CANCELLED y conserva nombre/mensaje al recuperar un 403.

El proceso gift-workers real tiene readiness, cierre y reconexión acotados; ACK sucede después del commit. Sobres inválidos van a parking sin persistir datos personales del cuerpo. El relay Guest firma y declara los bindings durables antes de publicar. replay-rsvp pagina de 100 en 100 usando IDs textuales, vuelve a firmar y conserva el historial de publicación: regresión de 101 eventos pasada.

OpenAPI Gift 1.9.0; Guest mantiene 1.11.0; AsyncAPI 1.10.0, 70 eventos. Ocho contratos y generados comprobados; el spec Gift vendorizado es idéntico al backend. Los perfiles DevCompat congelados permanecen intactos; perfiles actuales ampliados. Se resolvieron operationIds duplicados únicamente en operaciones no congeladas. El volumen del generado frontend corresponde a adoptar el contrato Gift completo, no a código escrito a mano.

## Resultados observados

- Gift: 200 unitarias y suite completa actual de cobertura de 230 casos, cero fallos/skips. Líneas globales 93.0%, dominio 99.3%, aplicación 95.3%; umbrales 80/90/90 conservados. Incluye 14 regresiones reales de cancelación/orden/carreras, erasure, forja, broker y crash antes del ACK.
- Guest: test:all de 113 casos pasado; después, 52 unitarias y las 3 regresiones de replay/recuperación pasadas. Notification: 75 casos de test:all pasados con PostgreSQL, RabbitMQ y Mailhog. Messaging: 9 casos pasados, incluida declaración tardía del archivo.
- Frontend: workspaces completos y cobertura pasados. Sobre la base destino actualizada: build completo, 66 tareas de lint/test/typecheck pasadas; Next 140, Universal 372, API client 15, y suites compartidas pertinentes. Se mantuvo el skip previo de auth; no se añadió ninguno. Los paquetes sin archivos de prueba se distinguen en los logs.
- Pact: cuatro providers pasaron 4/12/10/12 interacciones en la ejecución agregada; Guest fue comprobado por separado con 2 interacciones por Kong. El agregado coincidió con la caída controlada del broker y salió 1: no se etiqueta verde. La suite Pact pasó 12 pruebas, con 3 skips de publicación opcional a Pact Broker externo, no disponible/configurado.
- Gateway: configuración/rutas y rotación real Identity pasadas; el rerun de rotación pasó 4 pruebas sin skips.
- Chrome 157.0.8103.79 real: 12/12 variantes del candidato y 12/12 del árbol combinado, 360/768/1280, claro/oscuro, es-BO/en-US. Cada matriz tiene 48 capturas y 48 análisis axe sin violaciones. Incluye teclado Enter/Escape y restitución del foco, nombre, fotos presentes/rotas/ausentes, reserva HTTP 201, declinación con SQL CANCELLED, y recuperación real HTTP 403 manteniendo borrador. Sin interceptar rutas ni sustituir servicios.
- Límites adicionales: token desconocido/reemitido/vencido con reloj real de 60 s/otra celebración; denegación sin datos ni mutaciones. Dos transacciones bloqueadas simultáneamente en SQL por el mismo regalo: 201/409 y una fila. Aprobación manual conserva historia al cancelar. Catálogo detenido devuelve 503 y la reserva válida sigue pasando 201. Plazo cerrado impide editar con 409 pero permite regalos; Chrome lo comprobó en ambos idiomas. Token vencido no muestra nombre.

Las esperas de consistencia usan condiciones observables y límites. Se respetó el rate limit de Kong; no se elevó ni se falsificó la IP. Los intentos fallidos permanecen en resultados.jsonl con sus códigos reales y no se suman como PASS.

## Migración y reversión probadas

Se aplicó por Prisma migrate deploy la migración expansiva 20261117000100_rsvp_reservation_cancellation sobre la misma base QA con datos. Pasó de 10 a 11 migraciones. Las diez sumas anteriores y todas las filas previas de regalos, reservas y outbox se conservaron (hashes iguales antes/después). Lista completa:

- `20261021000100_initial` — `b2a479bb1fa29a8f1c181b2e441208ae114d3ca8a59bb0c1e28e508eff5f8650`
- `20261022000100_private_gift_outbox` — `145b8d044d660d74eeb89203de28e7aeafce3eca19b153c782a94d8fc3171fb8`
- `20261023000100_gift_relay_lease` — `0408a34dffaeaea70c1d9944b5c242f3d45c204f18c7e5c07eb4c8f239cf0957`
- `20261030000100_external_gift_publication` — `bbd1dabe45b0c5a1179be06497665441918c82cd137e184fb63e718c7c0dcc61`
- `20261031000100_manual_reservations` — `222c985d783824de509f63fecda96e1baababfdc558e5c05c9f9b469e32dd797`
- `20261101000100_durable_reservation_settings` — `0bf5e4333ca8745d3c75ddb5dc99e62758c73b07d23cf853395a457aaa2d6085`
- `20261102000007_cataloged_gift_items` — `69063d640de4a3eda05c9c48bd69dc22cf7a966af00c7fa5a3afbd4657a4f36b`
- `20261103000008_guest_erasure` — `67cc842fac681e7c94ef02d182674ecb5712c2e76ac903dd267cd63a260eee15`
- `20261105000100_gift_v2_compat` — `3cddeaedf70149938a33580847e2a623efc60371c9dbc00dca61d03cddb21d5b`
- `20261105000200_single_authority` — `0e53db90407ec0ff370f30736918620f00eda8c894631a1f371180cf0688660a`
- `20261117000100_rsvp_reservation_cancellation` — `5f82676ea976abd6c5c345b55fd1671d2bbbc8c648c3951569f755eb2b62a563`

Gift tiene política forward-only: no se ejecutó un down destructivo ni se retiraron CANCELLED/inbox/tombstones. La reversión probada construyó la imagen del fundamento abb082f con el Dockerfile productivo, pausó el worker y cambió solamente Gift HTTP a esa imagen. Guest guardó la declinación; el mensaje quedó durable, la reserva permaneció pendiente y nuevas reservas recibieron 403. Al restaurar código/worker se observó CANCELLED + AVAILABLE y exactamente un hecho de cancelación. Se volvió a ejecutar HTTP del fundamento y leyó CANCELLED por la API canónica. Las once migraciones y checksums quedaron idénticos; se restauró al final la imagen candidata. Logs: build-rollback-foundation, rollback-real-final y rollback-proof.json.

Para activar en el futuro: preparar secreto HMAC independiente, preservar hostname del nodo Rabbit existente, drenar colas clásicas raíz sin purgarlas, preparar vhost rsvp, aplicar migración, desplegar lector/barreras y frontend compatibles, coordinar productores firmados y activar worker; reconciliar historia desde replay-rsvp del dueño. Ver RUNBOOK.md o docs/runbooks/guest-rsvp-gift-cancellation.md. No se ejecutó este cambio en el servidor compartido.

El reinicio real descubrió resources_missing al importar un stream durante recuperación. Se corrigió declarando el archivo acotado a 7 días/64 MiB después de abrir AMQP. La prueba final conservó nodo/volumen, recuperó el outbox y observó readiness 200, RestartCount 0 y cero errores de importación. No se borraron volúmenes. La inversión completa de vhost en un servidor compartido queda como procedimiento operativo, no como una prueba ejecutada allí.

## Diagnóstico de fixtures, operación y límites

Se eliminó el fallback local DROP DATABASE: un Docker fallido ya no puede apuntar a gift_db/provider_db del usuario. La fixture usa solo PostgreSQL desechable con aislamiento comprobado. El fallo de cierre se debía a sesiones todavía vivas al terminar el cliente: se observa su drenaje propio en pg_stat_activity con límite de 2 s y se falla si quedan conexiones; no se usa DROP FORCE ni se silencian excepciones. La cobertura completa posterior terminó 0. El broker de prueba conserva puerto estable al reiniciar.

H01B1 histórico sigue BLOCKED: su compose no existe ni en el SHA inicial. Su comando salió 1 y no se afirma que pasó; se dispone de las 230 pruebas actuales reales. El build global previo no encontraba JDK21 en la configuración; luego se localizó en C:/Program Files/Java/jdk-21 y build/lint Identity pasaron. La repetición global pasó 36/38 tareas y quedó BLOCKED en Template Media sin cambios: Python3.10 no puede escribir el pycache en la ruta larga de este checkout; un intento con junction también falló porque el launcher resuelve el directorio físico. Ese intérprete no tiene Django/Ruff instalados. La compilación/lint de los 13 workspaces Node afectados y dependencias sí pasó, e Identity se ejercitó además en su contenedor real. No se modifica el servicio Python ajeno a esta entrega para ocultar el bloqueo del build global. iOS/Android, capacidad 10x y publicación a Pact Broker no fueron verificadas. No se desactivaron controles, hooks ni umbrales.

Privacidad pendiente preexistente: bootstrap/HTML Next y tres hrefs globales contienen el token de la ruta personal. Se comprobó y se registra como FAIL fuera del cambio solicitado; no se guardó HTML sensible ni se afirma que el documento completo está libre de token. Las capturas no incluyen barra del navegador. Los nuevos botones de entrega/recuperación no añaden token a href. Solo se usaron identidades y contactos sintéticos QA.

Observar readiness, rechazos seguros, edad/fallos del outbox, parking/redelivery, profundidad de colas y bloqueo SQL. El límite transaccional es 5 s; la carga por invitado se serializa y las búsquedas usan índices por tenant. Esto no constituye un benchmark 10x. La retención del archivo no sustituye backups.

Tras el bloqueo de Docker Desktop se recuperó el motor y se apagaron 19 contenedores anteriores. Se reutilizó un único stack de nueve servicios; Provider se inició solo para fotos/catálogo. Durante builds se apagó el stack y Gift ejecuta suites en serie. Al cierre se detuvieron los contenedores QA conservando todos los volúmenes. Evidencia: docker-resource-reduction.json y docker-final-stopped.json.

## Comandos y auditoría

Cada comando tiene UTC, carpeta y código real en evidencia/resultados.jsonl. Selección de gates finales (los nombres son también sus archivos .log):

| Evidencia | Comando exacto | Exit |
|---|---|---|
| `gift-unit-final-serial` | `cd apps/gift-list-service && node --test --test-concurrency=1 test/*.test.mjs` | 0 |
| `gift-coverage-measured` | `bash gift-coverage.sh` | 0 |
| `guest-tests-final-2` | `corepack yarn workspace @rsvp/guest-rsvp-service test:all` | 0 |
| `guest-replay-regression-4` | `RELAY_IT_PORT=5689 node --test --test-concurrency=1 apps/guest-rsvp-service/test/integration/relay-recovery.test.mjs` | 0 |
| `notification-regression-final-2` | `corepack yarn workspace @rsvp/notification-service test:all` | 0 |
| `frontend-tests-final` | `VITEST_MAX_THREADS=1 VITEST_MIN_THREADS=1 VITEST_MAX_FORKS=1 VITEST_MIN_FORKS=1 corepack yarn turbo run test --concurrency=1 --env-mode=loose && corepack yarn typecheck && corepack yarn harness:validate && corepack yarn workspace @rsvp/contracts check:generated` | 0 |
| `frontend-coverage-final` | `VITEST_MAX_THREADS=1 VITEST_MIN_THREADS=1 VITEST_MAX_FORKS=1 VITEST_MIN_FORKS=1 corepack yarn turbo run test:coverage --concurrency=1 --env-mode=loose` | 0 |
| `frontend-prospective-gates` | `NEXT_PUBLIC_API_URL=http://localhost:8010 NEXT_PUBLIC_SITE_URL=http://localhost:8091 corepack yarn turbo run build --concurrency=1 && corepack yarn turbo run lint test typecheck --concurrency=1 && corepack yarn lint:code && corepack yarn harness:validate && corepack yarn workspace @rsvp/contracts check:generated` | 0 |
| `final-static-backend` | `corepack yarn turbo run build lint --filter=@rsvp/gift-list-service... --filter=@rsvp/guest-rsvp-service... --filter=@rsvp/contracts-openapi --filter=@rsvp/contracts-asyncapi && corepack yarn contracts:validate && corepack yarn harness:validate` | 0 |
| `final-static-frontend` | `corepack yarn lint && corepack yarn typecheck && corepack yarn harness:validate && corepack yarn workspace @rsvp/contracts check:generated` | 0 |
| `identity-static-jdk21` | `bash ../identity-static.sh` | 0 |
| `gateway-route-regression-final` | `node --test --test-concurrency=1 e2e/gateway/validate-config.mjs e2e/gateway/kong-live.mjs e2e/gateway/rotation-live.mjs` | 0 |
| `gateway-real-identity-rotation` | `IDENTITY_URL=http://localhost:8010/identity node --test e2e/gateway/rotation-live.mjs` | 0 |
| `pact-provider-guest-through-kong` | `PACT_REQUIRE_PROVIDERS=1 GUEST_RSVP_URL=http://localhost:8010 GUEST_RSVP_HEALTH_URL=http://localhost:8010/guests/health node scripts/pact-verify.mjs contracts/pacts/rsvp-frontend-guest-rsvp-service.json` | 0 |
| `pact-regression-final` | `PACT_REQUIRE_PROVIDERS=1 GUEST_RSVP_URL=http://localhost:8010 GUEST_RSVP_HEALTH_URL=http://localhost:8010/guests/health corepack yarn pact:test` | 0 |
| `codegraph-final-backend` | `corepack yarn codegraph sync && corepack yarn codegraph status` | 0 |
| `codegraph-final-frontend` | `corepack yarn codegraph sync && corepack yarn codegraph status` | 0 |
| `history-secrets-backend` | `bash ../scan-history-backend.sh` | 0 |
| `history-secrets-frontend` | `bash ../scan-history-frontend.sh` | 0 |

El ZIP contiene matrices, salidas saneadas, capturas, axe, hashes antes/después, pruebas de recuperación/reversión, herramientas de reproducción y MANIFEST.sha256. Excluye private/, .env, credenciales, tokens, node_modules, builds y datos personales reales. SECRET_SCAN.json registra la comprobación contra valores privados; gitleaks escanea commits y la entrega. Los scripts requieren un entorno QA privado propio, que no se adjunta.

Los fallos corregidos se conservan: desalineación de fixture/contrato y generados, IDs textuales del replay, fixture de cierre/conexión, arranque del stream y credenciales/configuración QA, y preparación de Chrome. El primer intento adicional venció esperando la lista; el recorrido posterior parte del enlace personal. En el primer recorrido del árbol combinado falló 1280 oscuro es-BO: Celebration devolvió 404 en GET /celebrations/public/:slug a las 11:09:05.160Z, apenas 455 ms después del publish 200. Su lector usa la proyección pública asíncrona. Se corrigió la preparación para esperar esa proyección con condición observable, límite de 15 s y sin sleeps ni cambiar los plazos/aserciones de la UI. La matriz posterior registra publicProjectionReadyMs y respuestas HTTP; el intento anterior conserva exit 1. Evidencia: diagnose-published-readiness.log, chrome-prospective-final.log y chrome-prospective-verified/. La primera reversión esperaba status en el nivel incorrecto del resultado canónico; se corrigió el verificador a reservation.status y la repetición completa salió 0. El intento de arrancar otro Next devolvió EADDRINUSE; se identificó el proceso existente y después se reinició solo el servidor QA propio. Ninguno de esos procesos con salida no cero se presenta como PASS.
