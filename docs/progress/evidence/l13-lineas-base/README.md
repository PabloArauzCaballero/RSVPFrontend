# L13 — líneas base visuales de la app desfasadas (2026-11-21)

`playwright test` en `origin/chore/deploy-contabo-coolify` (macOS, Chrome real): **56 failed / 133 passed** sin ningún cambio. Revisé cada pantalla comparando base, actual y diferencia (16 pantallas, 56 capturas).

## Clasificación

| Pantalla (capturas) | Diferencia | Tipo |
|---|---|---|
| auth-login (5), auth-registro (5) | La pantalla mostraba «We couldn't restore your session» en lugar del formulario | **Fallo del entorno de prueba**, corregido aquí |
| portal-agenda (3) | La línea base congeló la clave sin traducir `PORTAL.AGENDA.STATUS.PENDING`, sin el botón Confirmar | **Fixture fuera de contrato**, corregido aquí |
| guest-regalos (5) | Filtros nuevos (precio, origen, «solo disponibles») y «Volver a la celebración» | Intencional (PRs ya fusionados) |
| host-editor-general (5) | Fecha y hora con el selector propio («Elegir fecha») | Intencional |
| admin-metricas (3) | Campos de fecha nativos y texto de ayuda nuevo | Intencional |
| guest-rsvp (3), host-regalos-catalogo (3), portal-* (servicios, productos, perfil, métricas, leads, entrega, documentos, destinos: 24) | Todo el contenido baja 1-2 px; el texto y los colores son iguales | Desplazamiento global, sin cambio visible |

Ninguna regresión del producto: el login desplegado en TEST muestra el formulario (`/api/identity/auth/refresh` responde 401 sin cookie).

## Causas corregidas en este PR

1. `packages/testing/src/contract-server.ts`: el preflight CORS del mock no permitía `X-Session-Transport`, que Kong sí permite (`RSVPBackend infra/kong/kong.yml:221`). La recuperación de sesión de la web (commit 52af3eb) falla con `net::ERR_FAILED` y la app muestra «No pudimos restaurar tu sesión». La lista ahora es `ALLOWED_HEADERS`, igual a la de Kong.
2. `apps/universal/scripts/visual-fixtures.ts`: el mock respondía 404 a `POST /identity/auth/refresh`. Ahora responde 401 (Problem Details), como Identity sin cookie.
3. El mismo archivo enviaba una reserva con `status: "PENDING"`, que no existe en `BookingStatus` del contrato (`REQUESTED | CONFIRMED | REJECTED | CANCELLED | EXPIRED`). Ahora envía `REQUESTED`.

Prueba nueva `apps/universal/test/visual-mock.test.ts`: los headers del cliente de Identity pasan el CORS del mock, `refresh` sin cookie da 401 y las reservas del fixture usan estados del contrato.

Tras los arreglos: **51 failed / 5 passed** de las 56. Las 5 que pasan son las de login y registro (oscuro y 1440 px).

## Por qué no se regeneran todavía

Por pedido de rsvp-1e (integración): los PRs de integración FE #74 a #80 cambian pantallas (ErrorBoundary, `lang` y tema en el HTML, carga diferida, regalos, cotizaciones, invitaciones, íconos). Regenerar ahora obligaría a hacerlo otra vez. **Pendiente:** después de fusionar #80, correr `playwright test --update-snapshots` sobre la rama oficial y revisar a ojo solo las pantallas de la tabla.

| Comando | Resultado |
|---|---|
| `@rsvp/universal test` | 459 passed |
| `yarn lint:code`, `yarn typecheck`, `harness:validate` | exit 0, exit 0, válido |
| `playwright test -g <las 56>` antes / después | 56 failed / 51 failed, 5 passed |
