# F8 · L4 (Provider): la agenda sigue el cursor de reservas — evidencia 2026-11-21

Rama `fix/f8-l4-reservas-paginadas`, base `chore/deploy-contabo-coolify` (`312808f`). Backend: RSVPBackend
`fix/f8-l4-reservas-paginadas` (Provider Catalog OpenAPI 2.8.0).

## Cambio

- `providerService.bookings(providerId, status?, cursor?, limit = 50)` y `myBookings(cursor?, limit = 50)` piden una página y
  devuelven `BookingPage { items, nextCursor? }`.
- `useProviderBookings` pasa a `useInfiniteQuery`: la página siguiente se pide con el `nextCursor` del servidor.
- Agenda del portal: «Ver más fechas» mientras haya `nextCursor`; si falla la página siguiente, las reservas ya mostradas
  se quedan y aparece «Reintentar». Con páginas pendientes, el encabezado dice «Al menos N fechas por confirmar» (PF-2).
- Compatible con un catálogo anterior (sin `nextCursor`): una sola página y sin botón.

## Ejecutado

| Comando | Resultado |
|---|---|
| `yarn workspace @rsvp/{query-hooks,i18n,universal} typecheck` | exit 0 |
| `eslint --max-warnings 0` sobre los archivos cambiados | exit 0 |
| `yarn workspace @rsvp/query-hooks test` | 95/95 |
| `yarn workspace @rsvp/i18n test` | 12/12 |
| `yarn workspace @rsvp/universal test` | 459/459 (36 archivos) |
| `yarn workspace @rsvp/contracts test` | 4/4 |
| `yarn harness:validate` | exit 0 |
| `gitleaks dir` sobre los archivos cambiados | no leaks found |
| Pruebas nuevas de la agenda contra el código anterior (`git stash`) | 2 fallan, 1 pasa (la de compatibilidad) |

## Pendiente

- Playwright con Chrome real contra el backend real: no hay stack Docker en este frente.
- La copia de contratos (`packages/contracts`) sigue en Provider 2.4.0: se regenera con el mecanismo de FE #49
  (`generate --ref <sha>`) cuando el backend 2.8.0 se fusione. Los tipos del cliente (`BookingPage`) son los de
  `query-hooks`.
