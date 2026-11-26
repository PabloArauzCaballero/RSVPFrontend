# Correo de contacto del RSVP en móvil

Regresión del 23 de noviembre de 2026 sobre `dev` en `a3925298`.

Un correo largo podía ensanchar la columna de la tarjeta y quedar cortado por
el borde de la pantalla. La regla `overflow-wrap: anywhere` se aplica
únicamente al párrafo del correo en `HostContactLines`. CodeGraph y el código
confirman que la pantalla fuera de plazo y la de acceso restringido comparten
este componente web.

## Prueba del cambio

| Requisito | Resultado observado |
| --- | --- |
| REQ-F15-03 y REQ-F15-05 | En Chrome, el correo entró en dos líneas a 360 px y en una línea a 768 y 1280 px. El correo y el teléfono conservaron sus destinos. Se activó el enlace de correo con Enter, interceptando la apertura del cliente de correo en la prueba. |
| REQ-F15-04 | Con un token desconocido se vio el estado de enlace no disponible y el contacto quedó oculto. |

El recorrido usó un build de producción de Next.js y los servicios locales
de Celebration y Guest RSVP con almacenamiento en memoria. El consumidor de
Guest RSVP procesó los eventos de la celebración de prueba. Pasaron nueve
casos en Chrome. Se probaron `es-BO` y `en-US` en claro y oscuro. Axe reportó
cero violaciones críticas o serias en los ocho casos que mostraron contacto.
Al restaurar temporalmente el estilo anterior en el navegador, la misma
medición detectó que el correo sobresalía de la pantalla a 360 px.

- `yarn workspace @rsvp/seo-web test:coverage --maxWorkers=2 --minWorkers=1` salió con código 0 y 130 pruebas aprobadas.
- `playwright test e2e/rsvp-contact-layout.spec.ts` en `apps/seo-web` salió con código 0. La regresión usa la API de fixture y el build de Next.js.
- Lint, tipado de Seo Web, validación del harness, contratos generados y Gitleaks salieron con código 0.

Para revertir, revertir el PR en `dev`.
