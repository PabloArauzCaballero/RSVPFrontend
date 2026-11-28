# Producto agotado con reserva: evidencia

Fecha: 2026-11-28. Decisión del dueño (DECISIONES-2026-11-28 #1): la reserva se mantiene, se avisa al invitado y al anfitrión, se quitan los botones de compra.

## Qué dice el contrato real

`gift-list` 1.20.0 no distinguía este caso. Cuando un producto sale de las listas (agotado, versión agotada, despublicado, incompleto, oculto, proveedor suspendido) un regalo **ya reservado conserva su estado y su reserva** (D-3, `listing-availability.store.ts`): `status` sigue `PENDING_REVIEW`/`COMMITTED` y `availability` sigue `AVAILABLE`. Solo un regalo sin reserva pasa a `UNAVAILABLE`, y el invitado nunca recibe esos. Por eso el invitado veía «Ver en la tienda» y «Pedir por WhatsApp» y el anfitrión solo «Reservado»: el cable no traía la señal.

Cambio mínimo en backend (rama `feat/regalos-agotado-aviso-be`, sin migración, sin evento nuevo, solo lectura de la regla `gift_listing_block` que ya existía): `gift-list` **1.21.0** agrega a cada ítem de `listGiftItems` `productUnavailable` (boolean, invitado y anfitrión) y `productUnavailableReason` (solo MANAGE; `null` para el invitado, PF-1).

El frontend vendoriza 1.21.0 con `backend.lock.json` apuntando al commit de la rama del backend (**provisional** hasta que el PR del backend se fusione; entonces se vuelve a correr `generate --ref <sha fusionado>`). El lock también arrastra `celebration` 1.8.0 y `template-media` 1.9.1, que ya están en el backend oficial (mismo salto que hizo el PR #155).

## Qué cambia en el frontend

- `packages/query-hooks/src/gift/types.ts`: `productUnavailable`, `productUnavailableReason`, `isProductGone`.
- `guest-card.ts`: `productGone` en el estado de la tarjeta; con producto agotado no hay `canReserve` ni `showProviderButtons`; el invitado conserva su reserva y «Cancelar mi reserva».
- Invitado en la web pública (`apps/seo-web`) y en la app (`apps/universal`): aviso «Producto agotado»; no se muestra el recordatorio «¿Compraste?» de ese regalo.
- Anfitrión (`apps/universal`, web y app): aviso con el motivo junto al regalo reservado, que no pasa a «No disponibles».
- Textos `gifts.guest.soldOut.*` y `gifts.host.soldOut.*` en es-BO y en-US, con tuteo.

## Verificación

| Nivel | Qué | Resultado |
|---|---|---|
| TESTED | `yarn lint`, `yarn typecheck` | 0 errores |
| TESTED | vitest `query-hooks` (+6 pruebas de `guestGiftState`), `universal` (+9: anfitrión, invitado, axe, en-US), `seo-web` (+4) | verdes |
| VERIFIED (parcial) | Playwright, Chromium preinstalado, 360 y 1280 px, contra el **servicio de Gift real** (build `dist` del backend, PostgreSQL 16, RLS, migraciones aplicadas) detrás de una pasarela de prueba | 47/47 comprobaciones, `resultados.json` |

El recorrido (`harness.mjs`, `agotado.cjs`, `host-row.cjs` en esta carpeta): el anfitrión aprueba la reserva (`COMMITTED`); se muestra el estado normal con ambos botones; un evento real `provider.listing.availability-changed.v1` marca el producto agotado; se comprueba anfitrión (app web), invitado que reservó (app web y web pública Next), otro invitado, en-US, ausencia de scroll horizontal, axe sin violaciones y que la reserva sigue `COMMITTED` en el backend.

### Lo que NO se verificó

- Solo está real el servicio **Gift**. Celebration, Guest, Identity y Provider Catalog son el mock de contratos (`packages/testing`) y respuestas de la pasarela (`/listings/{id}`); no hay Docker, Kong ni RabbitMQ. No se probó el evento llegando por RabbitMQ: se aplicó con el mismo almacén que usa el consumidor.
- iOS y Android: no se ejecutaron. La app se vio como Expo web.
- Sin comparación visual contra línea base y sin modo oscuro.
- Los 8 archivos de integración del backend que dependen de `db.admin` o de RabbitMQ no corren con la base compartida; los que sí corren pasan (ver el PR del backend).
- Un invitado con unidades reservadas de un regalo **parcialmente** reservado cuyo producto se agota no lo ve en la lista (el regalo queda `UNAVAILABLE` y la lista del invitado lo oculta, M41): fuera de este alcance, se reporta.

## Reversión

`git revert` del PR del frontend; el backend es aditivo (campos nuevos, sin migración), por lo que el frontend anterior sigue funcionando con el backend nuevo y el frontend nuevo funciona con el backend anterior (sin aviso, igual que hoy).

## Capturas

`host-fila-*`, `invitado-app-*`, `invitado-web-*` (360 y 1280 px; «antes» = producto disponible, «después» = agotado).
