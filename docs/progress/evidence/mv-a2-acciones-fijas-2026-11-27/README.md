# MV-A2 / MV-D1 · acción fija abajo en el teléfono

Fecha: 2026-11-27. Base: `chore/deploy-contabo-coolify` @ dea93c4.

## Qué cambia
- `packages/ui`: `ActionDock` (nativo: caja que pinta la barra bajo el scroll y sube con el teclado; web: transparente) y `StickyActions` que, bajo un dock en nativo, publica su barra en lugar de dibujarla en el flujo.
- Contenedores de scroll envueltos: `Screen` móvil (`host/shell.tsx`), `AuthLayout`, `GuestFrame`.
- `provider/parts.tsx`: se elimina su `StickyActions` propio (en nativo seguía en el flujo); `services-screen` usa el compartido.

## Verificado (salida real, Linux)
- `packages/ui`: `npx vitest run` → 21 archivos, 341 pruebas verdes (incluye `action-dock.native.test.tsx`, 7 pruebas: prioridad, republicación, retirada, barra fuera del contenedor de scroll, elevación y descenso por teclado).
- `apps/universal`: `yarn test` → 61 archivos, 726 pruebas verdes.
- `yarn lint` (eslint --max-warnings 0 + turbo) y `yarn typecheck`: salida 0.
- Web (Chrome real, 390x844, claro y oscuro, contra el contrato mock): la barra sigue visible y dentro del viewport en reposo y con el scroll al fondo en `/onboarding/1` (top 727, bottom 796, `position: sticky`), `/invitados/nuevo`, `/registro` y `/c/ana-y-luis/rsvp/{token}`. Capturas en esta carpeta. Sin cambio de comportamiento web: el código web no usa el dock.

## NO verificado
- iPhone/Android reales o simuladores: no hay en este entorno. La barra docked, el safe area, el ascenso con el teclado (iOS `keyboardWillChangeFrame`, Android `keyboardDidShow`) y el scroll del campo enfocado no se han visto en un dispositivo.
