# Validación de fecha de celebración en Coolify

Fecha de verificación 2026-11-21. Alcance de regresión REQ-F11-01 y REQ-F11-02.

La base de frontend fue `d5bc2e3` de `chore/deploy-contabo-coolify`. El backend de la
misma rama ya incluía el arreglo del PR 30 en `4dc9d46`. Se sincronizó la
especificación de Celebration 1.2.1 y se regeneraron sus tipos.

El alta permitía avanzar con una fecha anterior o una hora ya alcanzada en la
zona de la celebración. El editor permitía guardar ese cambio y trataba el
rechazo como un error general. El alta y la edición validan ahora el instante
antes del envío, limitan el selector a días elegibles y asocian los dos errores
de fecha del contrato con el campo correspondiente. Una fecha histórica
guardada se conserva al editar otros campos.

## Verificación local

| Comprobación | Resultado observado |
| --- | --- |
| `yarn install --immutable` con Node 24.18.1 | Salida 0. |
| `yarn harness:validate` y `RSVP_BACKEND_SPECS=<spec-celebration-4dc9d46> yarn workspace @rsvp/contracts check:generated` | Salida 0 en ambos. Ocho contratos generados verificados y especificación de Celebration comparada con la del backend integrado. |
| `yarn lint:code`, `yarn turbo run lint --concurrency=4` y `yarn typecheck` | Salida 0 en los tres. 18 tareas de lint y 18 de tipado. |
| `yarn build --concurrency=3 --env-mode=loose --cache=local:rw` | Salida 0, 18 tareas. Builds de producción de Expo web y Seo Web. |
| `git diff --cached --check` y Gitleaks 8.24.2 sobre el diff preparado | Salida 0 en ambos. Cero hallazgos de secretos. |
| `vitest run test/celebration-event-date.test.tsx test/host-invitation.test.tsx test/host.test.tsx --maxWorkers=2 --minWorkers=1` en Universal | 52 aprobadas. Incluye el paso del tiempo, el cambio de zona, transiciones de horario de verano y mensajes en ambos idiomas. |
| `vitest run src/calendar-date-field.test.tsx src/date-field.native.test.tsx --maxWorkers=1 --minWorkers=1` en UI | 6 aprobadas. Incluye navegación por teclado y el límite de fecha del selector nativo. |
| Suite del servicio de Celebration con PostgreSQL temporal | 62 aprobadas. Dos pruebas exclusivas de RabbitMQ quedaron omitidas en esta corrida local. El PR del backend cubre RabbitMQ, Pact y el recorrido por Kong. |
| `node verify-coolify-browser.mjs` con Chrome, Expo web y PostgreSQL temporal | 15 casos aprobados a 360, 768 y 1280 px. es-BO en claro y en-US en oscuro. Se guardaron capturas del calendario, del alta y del editor en cada ancho. Axe reportó cero violaciones críticas o serias en las seis vistas de error analizadas. |

- Regresión REQ-F11-01 aprobada en Chrome. El calendario bloqueó los días
  vencidos y la hora actual se rechazó antes del POST. Un 422 real conservó
  el borrador y la corrección produjo un 201 con la fecha persistida.
- Regresión REQ-F11-02 aprobada en Chrome. Un PATCH 422 conservó la fecha en
  la base. Un PATCH 200 guardó la reprogramación válida. Editar el título de
  una celebración histórica omitió `eventDate` de la solicitud.

La integración del navegador usó HTTP directo al servicio temporal. Los
selectores nativos se probaron a nivel de componente. La verificación por
Kong consta en la [evidencia del backend](https://github.com/PabloArauzCaballero/RSVPBackend/blob/4dc9d46cf11a0a5b815fbac70882ec3ebc7652dd/docs/progress/evidence/celebration-event-date-coolify-2026-11-20.md).

El PR de frontend se puede revertir mediante un revert en la rama de Coolify.
El backend conserva la validación y el contrato sigue aceptando la forma
anterior del payload.
