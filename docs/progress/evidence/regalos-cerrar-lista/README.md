# Cerrar y reabrir la lista de regalos (anfitrión): evidencia

Fecha: 2026-11-28. Backend: `putGiftListClosure` (gift-list 1.13.0, R8a) y `LIST_CLOSED` (1.15.0, BE #162). El contrato vendorizado en esta rama (1.20.0) ya los trae; no cambia el contrato ni el backend.

## Qué había y qué falta
La rama `origin/fix/regalos-lista-cerrada` solo trae el lado del **invitado** (aviso de lista cerrada, REG-01), que ya está integrado en la base. Faltaba el lado del **anfitrión**: no había botón, ni hook, ni estado visible. Se aprovechó la idea (el estado cerrado entra a `guestGiftState`, no se parcha pantalla por pantalla) y no se rebasó nada.

## Qué cambia
- `query-hooks/gift/closure-hooks.ts`: `useGiftListClosure` (PUT `/gifts/celebrations/{id}/gift-list/closure`, `{closed}`; idempotente, sin Idempotency-Key; relee la lista al terminar con éxito o error).
- `universal/host/gifts/closure-panel.tsx` en «Regalos > Mi lista» (web y app): estado «Abierta»/«Cerrada» visible, **confirmación antes de cerrar**, «Reabrir la lista» sin confirmación (se deshace al instante y no pierde nada), una sola petición ante doble toque, errores por `GiftErrorNotice`.
- i18n es-BO y en-US (`gifts.host.closure.*`, tuteo).
- Casos negativos con mensaje y sin cambiar el estado: 403 `HOST_REQUIRED`, 404 `GIFT_LIST_NOT_FOUND`, 409, 503 y sin conexión. El contrato del endpoint no define 409; se trata como genérico.
- Accesibilidad: región con nombre y encabezado, estado con texto además de color, diálogo modal propio del sistema, axe sin violaciones. Motion: N/A (sin animación nueva).

## Verificación
| Nivel | Qué | Resultado |
|---|---|---|
| TESTED | `yarn lint`, `lint:code`, `typecheck`, `build` | verdes |
| TESTED | vitest: `query-hooks` +5 (ruta, cuerpo, 403/404/503, sin conexión), `universal` +13 (abierta, confirmar, mantener, cerrar, reabrir, doble toque, lista vacía, sin lista, 403, 409, 404, 503/sin conexión, en-US, axe) | suites completas verdes (universal 1099+13, query-hooks, seo-web 302) |
| VERIFIED (parcial) | Playwright, Chromium preinstalado, 360 y 1280 px, contra el **servicio Gift real** (PostgreSQL 16, RLS, migraciones) | 38/38, `resultados.json` |

Recorrido real: sin token 401; un invitado con su credencial recibe **403 `HOST_REQUIRED`** y la lista sigue abierta; el anfitrión ve «Abierta», abre la confirmación, «Mantenerla abierta» no envía nada, 403 y 409 simulados en la red muestran su mensaje y no cambian el estado, cerrar de verdad deja `closed=true` en el backend con la reserva existente intacta (`COMMITTED`), un invitado recibe **409 `LIST_CLOSED`** al reservar y ve «La lista de regalos está cerrada» en la app y en la web pública, recargar conserva «Cerrada», reabrir deja `closed=false`, repetir el PUT da 200 (idempotente) y en-US funciona. Capturas `host-*`, `invitado-*` (360/1280).

### Lo que NO se verificó
- Solo Gift es real; Celebration/Guest/Identity son el mock de contratos; sin Docker, Kong ni RabbitMQ. Los 403 y 409 **en la interfaz** se simularon con `page.route`; el 401 y el 403 reales se probaron contra el backend por HTTP (la interfaz del host usa un token de desarrollo MANAGE, por lo que no se pudo entrar como lector).
- Un lector (READ) ve el botón y el backend lo rechaza con 403: la pantalla de «Regalos» ya es de anfitrión y organizador, y no recibe un rol de lectura distinto; el rechazo está cubierto, ocultar el botón no es la defensa (PF-3).
- iOS y Android no se ejecutaron (solo Expo web); sin línea base visual ni modo oscuro.
- M37 (cierre automático por fecha frente a reservas) sigue siendo decisión de Pablo; esto solo cubre el cierre manual.

## Reversión
`git revert` del PR. Sin migración ni cambio de contrato; el estado `closed` vive en el backend.

Archivos de la prueba: `harness.mjs` (Gift real + pasarela), `cerrar.cjs` (Playwright).
