# Reorganización de Inicio, Invitados y Avisos (2026-11-08)

Alcance: Inicio, Invitados (lista, agregar, importar, grupos, ficha, respuestas, acompañantes, ajustes de invitados) y Avisos (bandeja, preferencias, push). No se tocó Regalos, Mi invitación ni Ajustes. Queja del dueño: «está mal organizada para su gusto»; ejemplo: en «Quién viene», «Agregar invitado» arriba a la derecha, «Más opciones» como «⋯» y los filtros como selector.

Regla común aplicada (`DESIGN.md` §Reglas de pantalla + `docs/design/upgrade-brief.md` §2): una acción primaria arriba a la derecha de la cabecera (`actions` de `Screen`; en móvil, barra inferior `StickyActions`), las secundarias en `OverflowMenu` («⋯»), los filtros de más de 3 opciones en `FilterSelect`, un dato en un solo lugar, menos elementos visibles. Solo se ofrece lo que el backend soporta (las brechas siguen documentadas en `botones-crud-2026-11-06.md`: sin editar invitado, sin reenviar invitación, sin editar/borrar grupo, sin «marcar todos» masivo).

## Skills abiertas (SKILL.md íntegro) y decisión que salió de cada una

| Skill | Decisión |
|---|---|
| `impeccable` (+ `craft-floor`, `distill`) | Modo Operate: precisión y contención. Distill: quitar lo repetido (filas de hitos de Inicio, botón «Abrir» ×50 en la bandeja, «Activado/Desactivado» junto a cada interruptor, nota bajo el botón de catering), una acción primaria, divulgación progresiva. Piso de calidad: tarjetas no anidadas, sin eyebrow, sin glifos como iconos (el «⋯» ya viene del primitivo con nombre accesible). |
| `ui-ux-pro-max` (+ `pro-rules`) | Prioridad 1-2: objetivos de 44 px y nombres accesibles (la lista de la bandeja y la tarjeta de acompañantes son un único botón con nombre «Abrir: asunto» / «Abrir invitado»); Navegación: pocos controles visibles; Formularios: el grupo de 15 opciones pasa de fichas a `<select>` nativo. Lista de entrega revisada: 360 px, oscuro, `prefers-reduced-motion` (sin animación nueva). |
| `ux-clarity-usability` | Prueba de los 3 segundos: cada pantalla nombra su acción primaria en una frase y está en el mismo sitio. Prevención de errores: lo destructivo (revocar, eliminar) fuera de la vista y detrás del menú, con la confirmación de siempre. Consistencia: el mismo patrón en todas las pantallas. |
| `visual-hierarchy-composition` | Un solo punto focal por pantalla: el botón de la cabecera. Patrón F en listas: búsqueda y filtros en una fila sobre la lista; proximidad: «Ver quién viene» junto al título de la tarjeta de progreso. Énfasis con una palanca: la banda «siguiente paso» pierde el botón y queda como mensaje. |
| `frontend-forms-ux` | El grupo del alta y de la ficha es un selector con etiqueta visible; los formularios (agregar, importar) conservan su `StickyActions` (acción de envío al pie) y sus validaciones; sin cambiar lo escrito ante errores (matriz de límites sin tocar). |
| `ux-writing-microcopy` | Los botones nombran la acción (se conservan los nombres de la matriz). El menú se llama «Más opciones»; el texto del catering («no lleva nombres ni contactos») viaja en la confirmación en vez de quedar bajo un botón. «Horario de silencio» nombra lo que oculta su desplegable (antes «Más opciones»). Estado vacío de push: texto nuevo `guests.push.readyBody` para no repetir la introducción de la cabecera (es-BO y en-US). |

## Auditoría por pantalla (antes)

Capturas «antes» a 360 y 1280 px, datos de demostración (`seed/demo.mjs`, familia `ord`: 63 invitados, 15 grupos, 2 solicitudes, 50 avisos) en un directorio de trabajo fuera del repositorio.

| Pantalla | Qué estaba desorganizado y por qué |
|---|---|
| **Inicio** | (1) El botón del siguiente paso vivía dentro de la banda, a mitad de página: la acción primaria no estaba donde el ojo la espera. (2) «Cómo vas» repetía el mismo dato tres veces: tres filas de hitos («Invitación publicada», «Invitados en tu lista: 63», «Respuestas: 41 de 63») más la barra y la leyenda con los mismos números; «publicada» ya lo dice la banda. (3) «Ver quién viene» quedaba suelto bajo la leyenda, lejos de lo que explica. (4) Acciones dispersas: botón en la banda, enlace al fondo, «Actualizar» al fondo. |
| **Quién viene (lista)** | «Agregar invitado» arriba a la izquierda dentro del contenido, «Más opciones» como desplegable de texto que empujaba la lista hacia abajo con 3 botones, búsqueda, 4 fichas de filtro y un selector de grupo en filas separadas: 5 bloques de control antes de ver al primer invitado (la primera fila empezaba en y=580 px de 900). |
| **Respuestas** | «Exportar CSV» primario en medio del contenido y «Más opciones» desplegable para el catering; las 4 fichas de filtro repetidas; mensaje de solicitudes sin jerarquía. |
| **Acompañantes** | Por tarjeta: «Aprobar» + «Rechazar» + enlace «Abrir invitado», tres acciones de tres pesos distintos en cada fila. |
| **Ficha de invitado** | Acción primaria («Generar y copiar enlace») dentro de la tarjeta; grupo como 16 fichas; «Más opciones» desplegable con reemitir/revocar/eliminar; botón «Copiar enlace» y «Compartir» juntos. |
| **Agregar** | Grupo como columna de 16 fichas en un formulario corto. |
| **Importar / Grupos / Ajustes de invitados** | Sin acciones dispersas relevantes: un envío por pantalla con `StickyActions` y una nota de límites. Se dejan como estaban. |
| **Bandeja** | Fila de control con contador, «Marcar todos» (secundario), «Actualizar»; cada aviso con «Sin leer ·» delante del asunto, un botón «Abrir» enorme y «Marcar como leído» subrayado: con 50 avisos iguales, 100 acciones visibles. |
| **Preferencias** | Cada interruptor repetía su estado en texto («Activado/Desactivado»); «Configurar avisos en este dispositivo» enterrado como enlace dentro de la tarjeta de canales; el desplegable del horario se llamaba «Más opciones» sin decir qué ocultaba; hora de inicio y fin apiladas. |
| **Push** | La introducción de la cabecera y el cuerpo del estado vacío decían lo mismo; «Activar avisos push» dentro de la ilustración, enlace «Preferencias de avisos» suelto. |
| **Común** | La línea «Lucía Flores y Daniel Choque · Boda» se repite bajo el título de cada pantalla (la pinta `CelebrationScreen`, compartido con Regalos y otras). No se cambió: es una decisión de marco, ver «Pendiente». |

## Cambios

- `src/host/gate.tsx`: `CelebrationScreen` acepta `actions` y `menu` (nodo o función de lo cargado) y los pasa a `Screen`; solo se muestran con la celebración ya cargada.
- **Lista** (`guest-list-screen.tsx`): «Agregar invitado» (`add-guest`) arriba a la derecha; «⋯» («Más opciones», `guests-more`) con Importar CSV, Grupos y Ajustes de invitados; búsqueda + selector de respuesta (`status-filter`: Todos, Sin responder, Confirmó, No asistirá) + selector de grupo (`group-filter`, con recuento) en una sola fila.
- **Respuestas** (`report-screen.tsx`): «Exportar CSV» (`export-csv`) a la cabecera; «Exportar para el catering» en el menú (`report-more` / `export-catering`); la exportación se eleva a un hook compartido; filtro como selector.
- **Acompañantes** (`requests-screen.tsx`): el nombre es un único botón «Abrir invitado»; quedan «Aprobar» y «Rechazar».
- **Ficha** (`guest-detail-screen.tsx`): «Generar y copiar enlace» y luego «Copiar enlace» en la cabecera; «⋯» (`guest-more`) con Reemitir (solo con enlace), Revocar y Eliminar invitado; grupo en selector con recuento; un solo árbol (el marco no se remonta al cargar).
- **Agregar** (`guest-form-screen.tsx`): grupo en selector con etiqueta.
- **Inicio** (`summary-screen.tsx`): el botón del paso (`next-step-action`) a la cabecera; la banda solo explica; «Cómo vas» queda en una línea («41 de 63 ya respondieron») + barra + leyenda + plazo + frescura; «Ver quién viene» junto al título de la tarjeta; sin filas de hitos.
- **Bandeja** (`notifications-screen.tsx`): «Marcar todos como leídos» (`mark-all`) a la cabecera, «Actualizar» en «⋯»; cada fila es un único botón (`open-<id>`, nombre «Abrir: asunto») con punto de no leído, «Sin leer» en la línea de fecha y «Marcar como leído» (`read-<id>`) a un lado.
- **Preferencias** (`preferences-screen.tsx`): sin texto «Activado/Desactivado»; «Configurar avisos en este dispositivo» en el «⋯»; desplegable «Horario de silencio», horas en una fila.
- **Push** (`push/permissions-screen.tsx`): «Activar avisos push» (o «Abrir ajustes» si está bloqueado) en la cabecera; «Preferencias de avisos» en el «⋯»; cuerpo del estado sin repetir la introducción.

## Matrices y pruebas

## Resultados (Chrome real, gateway real :28000, app exportada servida en :8600)

- **Pruebas de componente** (`apps/universal`, vitest): `guests.test.tsx` 45/45 (se actualizaron los que usaban fichas `radio` de filtro/grupo y el botón «Reemitir», y el de error de la bandeja, que ahora fuerza el 503 desde «⋯ > Actualizar»; se añadieron 8 de la reorganización). Suite completa de `apps/universal`: 304 pasan, 3 fallan en `gifts-portal.test.tsx` (portal de proveedor; ajenas a este alcance, no investigadas). `packages/ui` 230/230, `packages/i18n` 12/12. `tsc --noEmit` limpio.
- **Matriz `guests-buttons.mjs`** completa (100 comprobaciones) a 1280, 768 y 360 px: 95 PASS + 4 BRECHA documentadas (backend) + 1 FAIL a 1280 y 768 (el helper de descarga del catering no reabría el menú, que se cierra al elegir; corregido) y 1 FAIL a 360 en «agregar invitado: solo teléfono E.164», sección no modificada y que pasó al repetirla. Con el helper corregido y la versión final de la app se repitieron `form detail report` a 1280 y 360: 34 PASS + 2 BRECHA + 0 FAIL en ambos. **No** se repitió la matriz completa con la compilación final ni `form detail report` a 768.
- **Ajustes a la matriz** (equivalentes, ninguna debilitada, sin skip/only): menús «⋯» con `menuitem` (Importar CSV, Grupos, Reemitir, Configurar avisos, Preferencias de avisos, Actualizar de la bandeja); filtros y grupo por `selectOption` sobre `status-filter` / `guest-group`; «step-published» sustituido por el texto de la banda («no pueden abrirla ni responder / para poder publicarla»), rama que solo corre con un mundo en borrador; los nombres accesibles de los botones se conservaron.
- **Barrido responsive** `responsive/guests.mjs` (12 rutas × 360/768/1280 × es-BO/en-US × claro/oscuro, axe WCAG 2.1 A/AA, objetivos ≥ 44 px a 360, sin claves crudas, sin español en en-US, fondo según esquema): 1014 PASS, 0 FAIL.
- **Capturas** revisadas a ojo (360 y 1280, claro, es-BO) de Inicio, lista, respuestas, acompañantes, bandeja, push y ficha. Hallazgos corregidos: el selector de grupo de la lista saltaba de fila (se limita a 240 px) y el marco de la ficha se remontaba al cargar (un solo árbol). No se revisaron a ojo las capturas oscuras ni en inglés (las cubre el barrido automático) ni se regeneraron imágenes base.

## No probado / pendiente

- iOS/Android nativos (hoja modal del menú y del selector): no ejecutado.
- «Marcar como leído» sigue repetido por aviso (hay a la vez «Marcar todos como leídos» en la cabecera); agrupar avisos iguales exigiría decidir semántica de «leído» por grupo.
- La línea con el nombre de la celebración bajo cada título es de `CelebrationScreen`/marco compartido: conviene decidir su eliminación en conjunto con Regalos y Ajustes.
- Importar, Grupos y Ajustes de invitados no cambiaron de estructura.
