# Reorganización de admin, invitado y acceso (2026-11-08)

Rama `feat/upgrade-ux-v2` (sin commit). Pedido del dueño: «la app está mal organizada para su gusto». Regla común: **una acción primaria arriba a la derecha de la cabecera (alineada con el título), lo secundario en un menú «⋯», filtros con más de 3 opciones como selector, y en móvil la acción primaria en barra fija inferior.** Las primitivas (`Screen actions/menu`, `OverflowMenu`, `FilterSelect`) las crea otro agente (`apps/universal/PRIMITIVAS-API.md`); aquí solo se consumen. Alcance: admin (verificación, catálogo, personas, operación) y flujo invitado/acceso. Anfitrión y proveedor no se tocan.

## 1. Auditoría (estado antes del cambio, leído del código)

Lecturas: `AGENTS.md`, `DESIGN.md`, `docs/design/upgrade-brief.md`, `docs/design/voz-y-copy.md`, y los `SKILL.md` íntegros de `impeccable` (+ `craft-floor.md`), `ui-ux-pro-max`, `ux-clarity-usability`, `visual-hierarchy-composition`, `frontend-forms-ux`, `ux-writing-microcopy`.

### Admin

| Pantalla | Qué hay hoy | Problema para el dueño |
|---|---|---|
| Verificación | Intro, filtro de 4 estados como chips (`ChoiceGroup`), filas con «Verificar» + botón «Otras acciones/Ocultar» que despliega en línea las acciones negativas | 4 opciones como chips (regla: selector). El despliegue en línea mueve la fila; el «⋯» es el patrón esperado |
| Moderación | Igual: 3 estados en chips, fila con «Aprobar» + despliegue «Rechazar» | El filtro de 3 sí es chips; el despliegue en línea sobra |
| Categorías / Geografía | Lista en `Section`, botón «Editar X» por fila, botón secundario «Nueva…» suelto entre lista y formulario, `StickyActions` con «Guardar» dentro de la tarjeta | Dos botones del mismo peso (Nueva / Guardar); el primario (Guardar) abajo, lejos del título |
| Tipos de evento / Plantillas | `ChoiceGroup` con una opción por elemento + «Nuevo» (crece sin límite) y formulario largo; en plantillas Guardar + Publicar + Archivar en fila | Selector disfrazado de chips que crece; tres botones en fila; Guardar no está donde se espera |
| Usuarios | Búsqueda + botón secundario «Buscar», filas con un botón «Dar rol X» por cada rol faltante | Un botón por rol por fila; paginación con 2 botones secundarios |
| Organizaciones | Búsqueda por id + «Buscar» primario dentro de una tarjeta | Aceptable; «Buscar» es la única acción |
| Métricas | `ChoiceGroup` de 2 + dos campos de fecha | Correcto (2 opciones: chips) |
| Resumen | Solo lectura | Sin acciones: correcto |
| Operación | «Reproducir proyección» en una `Section` con su título repetido, dos botones secundarios de Grafana/RabbitMQ | La acción primaria no está en la cabecera; los enlaces externos compiten con ella |

Datos repetidos: en Operación el título «Reproducir proyección» aparece en la sección y en el botón; en Resumen el subtítulo de plataforma repite «Plataforma · …».

### Invitado y acceso

| Pantalla | Qué hay hoy | Problema |
|---|---|---|
| Invitación → responder | Un solo camino. Botón de envío (`rsvp-submit`) al final del formulario, sin barra fija; el registro abierto sí usa `StickyActions` | En móvil con el formulario largo el botón queda fuera de la vista: la acción de responder no es inequívoca |
| Ya respondió | «Regalos» (primario) + «Cambiar mi respuesta» (secundario) + dos líneas de pista | Dos botones y dos pistas; «Cambiar mi respuesta» puede ser enlace |
| Regalos | Un «Reservar» por regalo, enlace «Volver a mi respuesta» | Es una lista con acción por fila: no hay acción primaria global (correcto) |
| Login / registro / recuperar | Un primario por pantalla; registro ya usa barra fija en compacto | Login y recuperar no la usan en móvil (formularios cortos; el botón siempre queda en vista) |
| Organizaciones (cuenta) | Dos formularios con botón primario cada uno (Crear, Añadir miembro) | Dos primarios en la misma pantalla; es pantalla de anfitrión/planner (fuera de alcance de cabecera de admin, pero está en «acceso») |

## 2. Decisiones por skill (qué salió de cada una)

- **impeccable** (Operate: «scanability, consistency outrank expression»; `craft-floor`: prohibido modal para tareas que no lo necesitan, tarjetas anidadas, eyebrow): el despliegue en línea «Otras acciones/Ocultar» se sustituye por un menú «⋯» (no modal, no mueve la fila); el selector reemplaza chips que crecen; se quita el título repetido de la sección de Operación; no se añade ningún elemento decorativo.
- **ui-ux-pro-max** (prioridad 2 touch: 44 px, prioridad 5 layout, prioridad 8 formularios y feedback, prioridad 9 navegación): destinos táctiles de 44 px en el «⋯» y el selector; la acción primaria fija abajo en móvil con `env(safe-area-inset-bottom)`; sin duplicar la acción (solo un botón visible a la vez por ancho).
- **ux-clarity-usability** (§1 una tarea primaria por pantalla evidente en 3 s; §2 divulgación progresiva; §5 prevención): el primario único en la cabecera; lo avanzado/negativo detrás de «⋯» (rechazar, suspender, archivar, enlaces a Grafana); confirmación con motivo se conserva para lo destructivo.
- **visual-hierarchy-composition** (un punto focal; patrón F/Z; para destacar sube una palanca): el botón primario arriba a la derecha es el único elemento de color de la cabecera; el «⋯» es neutro; el título mantiene la escala.
- **frontend-forms-ux** (§1 no deshabilitar el botón de entrada, §3 no perder lo escrito, §4 sin doble envío, el motivo de un bloqueo va fuera): «Guardar» sigue sin deshabilitarse por validación; el estado `busy` y `useSingleMutation` se mantienen; los errores siguen junto al campo.
- **ux-writing-microcopy** (§2 el botón nombra la acción; §6 el diálogo nombra objeto y consecuencia): el trigger «⋯» se llama «Otras acciones» (mismo nombre accesible que ya usan las pruebas en vivo); «Nuevo…» y «Guardar» nombran su acción; sin textos nuevos con jerga.

## 3. Cambios aplicados

**Mecanismo compartido (admin).** `AdminScreen` acepta `actions`/`menu` (las props de `Screen`) y expone `useHeaderSlot({ primary, items })` (`apps/universal/src/admin/admin-screen.tsx`): un formulario profundo entrega su acción primaria y sus ítems «⋯» a la cabecera sin subir su estado. Los manejadores se leen por ref, así que la cabecera solo se actualiza cuando cambia lo que se muestra. Ancho >= 768: `[⋯][primaria]` arriba a la derecha, alineados con el título. Menor: «⋯» arriba a la derecha y la primaria en barra fija inferior (la pone `Screen`).

| Pantalla | Antes | Ahora |
|---|---|---|
| Verificación | Filtro de 4 en chips; «Otras acciones/Ocultar» desplegaba en línea | Filtro de 4 como selector (`FilterSelect`); acción de la fila + «⋯» con «Rechazar a X» / «Suspender a X» |
| Moderación | Chips (3: se mantienen); despliegue en línea; botón «Abrir» suelto | «Aprobar» + «⋯» con «Abrir…» y «Rechazar…» (un elemento menos por fila) |
| Categorías, Geografía | «Nueva…» suelto + «Guardar» dentro de la tarjeta | «Guardar» arriba a la derecha (barra fija en móvil); «Nueva…» en «⋯» solo al editar una existente |
| Tipos de evento | Chips que crecen con cada tipo | Selector; «Guardar tipo de evento» en la cabecera |
| Plantillas | Chips que crecen, 5 diseños en chips, Guardar + Publicar + Archivar en fila | Selector de plantilla y de diseño; «Guardar» en la cabecera; «Publicar» y «Archivar» (destructivo) en «⋯» |
| Usuarios | Hasta 3 botones «Dar rol X» por fila | Un «⋯» por fila con los roles que faltan (los que ya tiene ya salen en su línea de texto) |
| Operación | Sección con el título repetido + botón + 2 enlaces | «Reconstruir la proyección pública» como acción primaria de la cabecera; Grafana y RabbitMQ en «⋯»; se quita la sección que repetía el título |
| Resumen, Métricas, Organizaciones (admin) | — | Sin cambio (sin acción de cabecera: solo lectura, 2 opciones en chips, o búsqueda con una sola acción) |
| Invitado: responder | Botón al final del formulario | `StickyActions`: «Confirmar que voy» fijo abajo (también «Cancelar» al editar); se quita la pista «Puedes cambiarla hasta…» porque la línea de fecha límite ya lo dice |
| Invitado: ya respondió | Regalos + «Cambiar mi respuesta» + 2 pistas | Se quita la pista repetida; el resto queda (primario Regalos, secundario Cambiar) |
| Organizaciones (cuenta) | Dos botones primarios en la pantalla | «Añadir miembro» pasa a secundario: un solo primario (Crear) |
| Login, recuperar | — | Sin cambio: se probó la barra fija y quedaba una franja blanca flotando en un formulario corto; se revirtió (el botón siempre está a la vista) |

**Primitivas (propiedad de otro agente), dos correcciones necesarias** en `packages/ui/src/overflow-menu.tsx`: (1) `OverflowMenuItem.testID` (para conservar los `data-testid` de `reject-*`, `grant-*`); (2) defecto real visto en captura: en listas con filas animadas el menú quedaba tapado por el «⋯» de la fila siguiente y no se podía pulsar. En web el menú ahora se pinta en un portal sobre `<body>`, fijo bajo el botón, y se cierra al desplazar o redimensionar.

## 4. Pruebas y aserciones actualizadas (equivalentes, no debilitadas)

- `test/admin-modules.test.tsx`, `test/admin.test.tsx`, `test/provider-admin-buttons.test.tsx`: el botón «Rechazar a X» ahora es `menuitem` dentro de «Otras acciones»; los chips de estado/plantilla son `combobox` (`change`); «Publicar»/«Archivar» van por el menú; el rol se concede desde el menú de la fila. Mismas llamadas HTTP y mismos mensajes verificados. Pruebas nuevas: Operación (un solo `replay`, Grafana/RabbitMQ solo en el menú) y Verificación (selector, no chips; «Rechazar» tras el menú).
- `scripts/live/provider-admin-buttons.mjs`: helpers `pickStatus` (selector «Mostrar»), `pickOption` (selector de tipo de evento) y `openGrantMenu` (abre el «⋯» de la fila antes de `grant-*`). Ninguna aserción se quitó, ni `skip`/`only`.
- `auth-buttons.mjs`, `gifts-buttons.mjs` (incluye `rsvp-submit`), `celebration-buttons.mjs`: sin cambios; `celebration-buttons.mjs` es de anfitrión y no se tocó ni se ejecutó.

## 5. Resultados (código final, backend real por Kong :28000, Chrome real)


| Verificación | Resultado |
|---|---|
| `vitest` apps/universal | 25 archivos, 317 pruebas pasan (incluye 2 nuevas); `packages/ui` 230 pasan; `tsc --noEmit` limpio |
| Login y registro (`auth-buttons.mjs`) a 1280 / 768 / 360 | 53/53 en cada ancho |
| Admin (`provider-admin-buttons.mjs admin`) a 1280 / 768 / 360 | 36 PASS, 7 BLOCKED (brechas de backend ya documentadas), 0 FAIL en cada ancho (igual que la línea base) |
| Invitado + regalos (`gifts-buttons.mjs`) a 1280 / 768 / 360 | 52/52 en cada ancho (incluye `rsvp-submit` con la barra fija) |
| Barrido acceso (`responsive/auth.mjs`: 3 anchos × es/en × claro/oscuro) | 591 comprobaciones PASS, 0 FAIL; flujos 15/15 |
| Barrido admin (`responsive/provider-admin.mjs`) | 1619 comprobaciones, 1 FAIL: el flujo «conceder rol» pulsaba `grant-*` sin abrir el «⋯» (script actualizado con equivalente). Reejecutados los flujos a 360/768/1280: 27/27 |
| Barrido invitado/regalos (`responsive/gifts.mjs`) | 159/159 PASS (páginas, flujos en-US a 3 anchos) |
| Capturas revisadas a mano | admin claro es-BO y oscuro en-US a 1280 y 360 (verificación, moderación, categorías, tipos, operación, usuarios); invitado 360 claro es-BO y oscuro en-US; login 360 |

Límites honestos: `celebration-buttons.mjs` (anfitrión) no se ejecutó (no se tocó el anfitrión; solo se compartió `Screen`/`OverflowMenu`). El barrido admin completo no se repitió entero tras corregir el script del flujo de roles (solo los flujos). Lint de `apps/universal`: 2 errores preexistentes en `src/provider/microsite-screen.tsx` (variable y import sin uso, archivo de proveedor, ajeno a este cambio). No se regeneraron capturas base ni hubo commit. Categorías/Geografía conservan un botón «Editar X» por fila (no se pudo reducir sin cambiar el modelo de edición); Organizaciones de cuenta no usa el slot de cabecera porque comparte `Screen` del anfitrión con dos formularios (solo se dejó un primario).
