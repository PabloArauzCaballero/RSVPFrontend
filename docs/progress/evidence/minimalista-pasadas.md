# Pasadas de mejora del rediseño minimalista (rama `feat/diseno-minimalista`)

Cada pasada reaplica `minimalist-ui` y las skills de marketing/UX, mira capturas reales de la app (export propia, backend real por Kong :28000, Chrome real), elige los 3 peores defectos, los corrige y verifica. Capturas en el scratchpad de la sesión (fuera del repo).

## Pasada 0: integración (antes de la pasada 1)

- Cuatro carriles (base, anfitrión, proveedor/admin/invitado, sitio público) migrados en paralelo; integración y verificación por el orquestador.
- `turbo typecheck lint test --force`: dos errores reales corregidos (import sin usar en `packages/ui/src/identity.test.tsx`, que rompía la compuerta de `config-eslint`). Los 18 fallos de `apps/universal` y 2 de `packages/ui-web` en la corrida completa eran tiempos de espera: la máquina tenía carga 101 por procesos ajenos a este repositorio (simulador de iOS y Xcode de otro proyecto). Aislados y con menos trabajadores pasan: `apps/universal` 329/329, `ui-web` 15/15.
- Hallazgo del carril de acceso: la exportación de página única **ignora** `app/+html.tsx`, así que ninguna fuente de marca se había cargado nunca en la app (ni la anterior). Se corrigió con `src/platform/fonts.ts`.
- Umbral de la barra de acciones fija: bajo 960 px (la cabecera se desplaza con la página).

## Pasada 1

Capturas reales, 1280 y 390, claro y oscuro, anfitrión (Inicio, Invitados, Regalos, Publicar, Ajustes) y proveedor. En revisión: acceso, Invitados vacío, Mis celebraciones y Invitados móvil oscuro.

Hallazgos (los tres peores):
1. **Sin celebración elegida, Invitados es un callejón de «Elige una celebración» aunque la persona tenga una sola.** El identificador viaja en la ruta (`useHostRoute`), por lo que elegir automáticamente la única celebración es un cambio de enrutamiento, no de estilo. Pendiente de la pasada 2.
2. **Ilustración de estado vacío demasiado protagonista** frente al texto (sobre de 130 px con titular serif y botón). Candidata a bajar de tamaño.
3. **Pestañas de sección cortadas en móvil** («Acompañante…» con chevron). Funciona, pero el rótulo truncado resta limpieza.

Corregido en esta pasada: (2) la ilustración de los estados vacíos baja de 148 a 104 px (`EmptyState`). Pendiente: (1) y (3).
Verificación: `packages/ui` 229/229 y typecheck limpio; ver `Pasada 0`.

## Pasada 2

Corregido:
1. **Callejón «Elige una celebración» con una sola celebración** (hallazgo 1 de la pasada 1). `CelebrationScreen` (`host/gate.tsx`) consulta `useMyCelebrations` cuando no hay `?c=`; con exactamente una celebración navega directo a la pantalla pedida con su `?c=`, con esqueleto mientras carga. Con 0 o varias, sigue el estado «Elige una celebración». `useMyCelebrations` acepta `{ enabled }` (compatible hacia atrás). Prueba nueva en `test/host.test.tsx` (una celebración → navega; varias → pregunta) y aserción existente ajustada a asíncrona.
2. **Pestañas cortadas en móvil** (hallazgo 3): se mantiene por diseño. La fila de pestañas se desplaza y el chevron avisa de que hay más; cortar el rótulo es la señal. No se cambia.

Verificación: `apps/universal` y `packages/query-hooks` con `tsc` limpio; `host.test.tsx` 23/23. Suite completa de la app en la corrida final de la pasada.
