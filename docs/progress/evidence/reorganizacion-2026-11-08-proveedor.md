# Reorganización del portal del proveedor (2026-11-08)

Alcance: `apps/universal/src/provider/*` (Resumen, Ofertas, Agenda, Clientes, Perfil y sus subpantallas, más el alta). No se tocó anfitrión, admin ni invitado. Sin commit, sin push y sin regenerar capturas base.

Motivo: el dueño dice que la app «está mal organizada para su gusto». Regla pedida: **una** acción primaria arriba a la derecha de la cabecera, alineada con el título; lo secundario en un menú «⋯»; filtros de más de 3 opciones como selector; en móvil la acción primaria en barra fija inferior.

Skills abiertas íntegras (`SKILL.md`) y qué decidió cada una:

| Skill | Decisión que salió de ella |
|---|---|
| `impeccable` (+ `craft-floor`, `distill`) | Modo Operate: precisión y contención. `distill`: quitar lo que no gana su sitio (barra de métricas repetida, ilustración dentro de un paso, tarjeta con el mismo título que la página, nota fija que repite la intro). `craft-floor`: nada de tarjeta dentro de tarjeta, nada de kicker, los controles nombran su acción. |
| `ui-ux-pro-max` | Prioridad 1-2: objetivos de 44 px, `aria-haspopup`/`menuitem` en el menú, sin acción que dependa solo del hover. Prioridad 5/9: acción primaria en barra inferior en móvil, sin scroll horizontal. Prioridad 8: error junto al campo, divulgación progresiva. |
| `ux-clarity-usability` | Prueba de los 3 segundos: cada pantalla nombra su acción primaria en una frase y esa acción vive siempre en el mismo sitio. Prevención de errores: período con presets en vez de escribir fechas ISO; lo destructivo (rechazar, cancelar, eliminar) sale de la vista y se confirma. Un botón apagado dice por qué. |
| `visual-hierarchy-composition` | Un solo punto focal por pantalla: el botón primario es el único elemento relleno. Proximidad: lo que va junto se agrupa con espacio, no con cajas. Densidad Operate: filas compactas, una línea de detalle en vez de cuatro. |
| `frontend-forms-ux` | El botón de guardar sube a la cabecera pero conserva estado de envío y bloqueo de doble envío; el error sigue junto al campo; lo escrito se conserva ante fallo (ya cubierto y verificado). Para elegir entre más de 3 opciones (categoría, tipo de documento, período) un selector, no una fila de radios. |
| `ux-writing-microcopy` + `docs/design/voz-y-copy.md` | Los botones nombran la acción («Crear oferta», «Guardar perfil», «Enviar a verificación»); el menú dice qué hay dentro («Más opciones»); sin «slug» ni «versión» como jerga; fechas legibles, no `2026-11-30`; es-BO con tuteo, en-US con «vendor». |

## 1. Auditoría pantalla por pantalla (antes)

Se midió sobre una exportación del código previo servida contra el backend real, con un proveedor verificado con 4 ofertas, 3 solicitudes de fecha y 14 leads, y capturas a 1280 y 360.

### Resumen (`/portal`)
| Hallazgo | Por qué desordena |
|---|---|
| El estado de la ficha aparece cuatro veces: chip, frase de la banda, tarjeta del hito («Tu ficha ya es pública») y el paso «Enviar a verificación». | Mismo dato en cuatro sitios. |
| Banda, tarjeta de hito y tres pasos antes de llegar a algo accionable: la primera pantalla ya baja del pliegue. | Mucho peso para decir «todo listo». |
| La acción primaria vive dentro de un paso («Crear mi primera oferta» o «Enviar a verificación»), a media página. | Cambia de sitio según el estado; no está arriba a la derecha. |
| «Últimos 30 días» repite cinco filas con barras que son las mismas de Clientes > Resultados. | Un dato en dos pantallas. |
| «Más opciones» esconde nombre, plan, zona, «Dirección pública: /p/slug» y «Cambiar el nombre». | Mezcla identidad con una acción; «slug» es jerga. |
| Ilustración grande dentro del paso «primera oferta». | Decoración que empuja la acción hacia abajo. |

### Ofertas (`/portal/servicios`, `/productos`, `/entrega`)
| Hallazgo | Por qué desordena |
|---|---|
| «Nueva oferta» está a la derecha de un subtítulo («4 ofertas»), no en la cabecera; con la lista vacía hay otro botón idéntico dentro del estado vacío. | Dos sitios para la misma acción, ninguno en la cabecera. |
| Cada borrador lleva su propio botón relleno «Publicar». Con 3 borradores, 3 botones iguales. | Acción secundaria repetida por fila. |
| Cada fila repite cuatro líneas de entrega («Entrega a cargo de», «Cobertura», «Traslado», «Plazo») y la condición. | Cuatro líneas por oferta que se leen igual en todas. |
| Una nota fija («Las condiciones se fijan al crear la oferta…») debajo de la lista, y otra intro arriba. | Dos textos explicativos para una pantalla. |
| El formulario pide la categoría con 11 radios en fila. | Más de 3 opciones: debe ser selector. |
| El formulario trae su propia barra con «Crear oferta» y la cabecera sigue mostrando otra acción. | Dos primarias en pantalla. |

### Agenda (`/portal/agenda`)
| Hallazgo | Por qué desordena |
|---|---|
| Cada solicitud muestra «Confirmar» (azul) y «Rechazar» (rojo) rellenos; con N solicitudes hay N pares. | Muchos botones rellenos compiten; lo destructivo está tan a la vista como lo seguro. |
| La fecha se pinta cruda: `Fecha: 2026-11-30`. | Formato máquina para una persona. |
| «Guardar agenda» está al final de un formulario largo, dentro de una tarjeta; «Quitar» y «Bloquear día» son botones rellenos suaves por fila. | Acción primaria perdida al fondo; secundarias ruidosas. |
| Tarjeta con el título «Tu horario» dentro de la pantalla «Agenda». | Título repetido y caja innecesaria. |

### Clientes: Solicitudes (`/portal/leads`) y Resultados (`/portal/metricas`)
| Hallazgo | Por qué desordena |
|---|---|
| Solicitudes: dos listas apiladas («Cotizaciones que te pidieron» y «Toques en tus contactos»), cada una con su vacío, más «Mostrando X de Y». | Dos bloques y dos vacíos para filtrar por un solo atributo. |
| Resultados: hay que escribir dos fechas `AAAA-MM-DD` a mano y pulsar «Ver resultados», botón primario en medio de la pantalla. | Entrada libre donde cabe un selector. |
| «Agrupar por» como fila de 3 chips y los totales repetidos en Resumen. | Aceptable (3 opciones) pero el dato se repite. |

### Perfil: Perfil público, Documentos y Contacto (`/portal/perfil`, `/documentos`, `/destinos`)
| Hallazgo | Por qué desordena |
|---|---|
| Perfil: ilustración + estado de la ficha (otra vez el estado), línea «Versión N», tarjeta con el mismo título que la página y «Guardar perfil» dentro de la tarjeta. | Estado repetido, jerga («versión») y título duplicado. |
| Documentos: «Tipo de documento» con 5 radios, tarjeta «Subir documento» con un botón «Subir documento» igual que el título; cada fila trae «Ver» y «Eliminar» rellenos. | Selector pedido por la regla; destructivo visible en cada fila. |
| Contacto: «Guardar destinos» queda al pie, bajo «Más opciones». | Primaria al fondo. |

### Alta (`/portal/alta`)
«Crear mi ficha» (primaria) y «Conectar ficha» (secundaria) en dos bloques; la primaria debe ir en la cabecera y la conexión quedar como enlace secundario en su bloque.

## 2. Qué se cambió

Mecanismo común (`apps/universal/src/provider/frame.tsx`): `PortalScreen` recibe de cada pantalla, con `usePortalHeader(primary, menu)`, una única acción primaria y los ítems secundarios, y los pinta con las primitivas de `Screen` (`actions` y `menu`, API en `apps/universal/PRIMITIVAS-API.md`): ancho >= 768 arriba a la derecha alineado con el título; móvil, la primaria en `StickyActions` al pie y el «⋯» arriba. El hook compara solo datos planos (etiqueta, flags), así que un manejador nuevo en cada render no provoca bucles, y siempre se llama al último manejador.

| Pantalla | Primaria (arriba a la derecha) | En «⋯» | Selector | Se quitó o fusionó |
|---|---|---|---|---|
| Resumen | «Crear mi primera oferta» o «Enviar a verificación» según el estado; ninguna si ya está verificada | «Cambiar el nombre» | n/a | Botones dentro de los pasos, ilustración del paso, las cinco filas de métricas (queda una línea «Últimos 30 días: N solicitudes válidas y M veces que te vieron» + «Ver resultados»), «Más opciones» con slug/plan/zona (plan y zona pasan a la banda), el slug (jerga). |
| Ofertas | «Nueva oferta» (se oculta con el formulario abierto, que trae su barra) | «Publicar» en cada borrador (apagado con el motivo visible si no tiene condiciones) | Categoría (11 opciones) con `FilterSelect` | Botón duplicado del estado vacío, subtítulo «N ofertas», cuatro líneas de entrega por oferta (una), aviso rojo duplicado de «sin condiciones», caja de la nota fija (queda una línea apagada). |
| Agenda | «Guardar agenda» | «Rechazar» (solicitud) y «Cancelar reserva» (confirmada) en cada fila | n/a (los 7 días son una selección múltiple, no un filtro) | «Rechazar» y «Cancelar» rellenos, barra de guardado al fondo del formulario, fecha cruda `2026-11-30` (ahora «lunes, 30 de noviembre de 2026»), «Quitar» relleno (texto). «Confirmar» pasa a secundario: ya no hay dos botones rellenos. |
| Solicitudes | ninguna (el backend solo expone lectura) | n/a | Filtro Todas / Cotizaciones / Toques (3 opciones: chips, como pide la regla) | Dos listas apiladas con dos vacíos y dos títulos: una lista filtrable. |
| Resultados | «Ver resultados», solo con período personalizado | n/a | Período: 7 / 30 / 90 días / Personalizado (`FilterSelect`) | Las dos fechas a mano por defecto: solo aparecen en «Personalizado»; el botón del medio. |
| Perfil público | «Guardar perfil» | n/a | n/a | Ilustración+estado de la ficha (repetía el Resumen), línea «Versión N», tarjeta con el mismo título que la página, barra de guardado. |
| Documentos | «Subir documento» | «Eliminar» en cada documento (queda «Ver» como acción visible) | Tipo de documento (5 opciones) con `FilterSelect` | Tarjeta con el título igual al botón. |
| Contacto | «Guardar destinos» | n/a | n/a (siete destinos = selección múltiple) | Barra de guardado al pie. |
| Alta | «Crear mi ficha» | n/a | n/a | «Conectar ficha» queda como acción secundaria de su bloque. |

Solo se ofrece lo que el backend soporta: no se agregó editar, archivar ni despublicar una oferta, ni marcar leads (siguen en las brechas de `botones-crud-2026-11-06.md`; la matriz las marca BLOCKED).

Causa raíz corregida por el camino: el formulario de «Cambiar el nombre» reiniciaba su campo en un efecto al abrirse, de modo que lo que se escribía justo al abrirlo podía pisarse (la matriz lo detectó al pasar de un botón a un menú). Ahora el formulario se monta solo mientras está abierto y arranca ya con el nombre actual.

## 3. Pruebas y cambios en aserciones

Cambios en aserciones (todos por fusión legítima, ninguno debilita; sin `skip`/`only`):
- «Rechazar», «Cancelar reserva», «Eliminar documento» y «Publicar» ya no son botones sueltos sino ítems del menú «⋯» (que no tiene `testID` por ítem): la matriz y las pruebas los buscan por rol `menuitem` y nombre accesible, dentro de la fila. `rename-open` pasa de botón dentro de «Más opciones» a ítem «Cambiar el nombre» del menú de la cabecera (`more-options` sigue siendo el `testID` del «⋯»).
- «LIMITE estado terminal» pasa de contar `cancel-`/`reject-` (testIDs que ya no existen, así que habría pasado en vacío) a comprobar que la fila de una reserva terminal no tiene botón «Más opciones».
- Un clic doble sobre «Publicar» ya no puede hacerse con `dblclick` (el ítem sale del DOM al primer clic): se despachan dos activaciones en el mismo fotograma sobre el ítem y se exige un solo POST. En vitest, lo mismo con `act`.
- Resultados: la matriz elige primero «Personalizado» para llegar a los campos de fecha; las comprobaciones de rango inválido, sin petición y red caída son las mismas.
- Un test de `gifts-portal` (`no declara condiciones`) se reemplaza por la comprobación equivalente de que la oferta sin condiciones se marca una sola vez con el motivo de bloqueo.
- `scripts/e2e-live-portal-profile.mjs` leía la línea «Versión N» que se quitó; ahora informa la versión que devuelve la API.
- La matriz hace `scrollIntoView` al centro antes de abrir un menú de fila (una persona hace lo mismo; en 360 px la barra inferior tapaba el menú de las filas finales).

Pruebas nuevas: `apps/universal/test/provider-reorganization.test.tsx` (8): una sola primaria por pantalla y no repetida, Publicar fuera de la fila, categoría y tipo de documento como selector, período como selector con fechas solo en «Personalizado», filtro de solicitudes, sin slug ni métricas repetidas en el Resumen.

## 4. Resultados de la verificación (lo que se ejecutó)

Entorno: backend real detrás de Kong (:28000), app exportada con `EXPO_PUBLIC_API_URL=http://localhost:28000` y servida en :8700, Chrome real. Capturas mirando a ojo (antes y después, 1280 y 360, claro/oscuro, es/en) en una carpeta temporal de la sesión; no se versionan y no se tocó ninguna captura base.

| Verificación | Resultado |
|---|---|
| `tsc --noEmit` (apps/universal) | limpio |
| `vitest` apps/universal completo | 25 archivos, 315 pruebas, todas en verde (incluye las 8 nuevas) |
| `vitest` packages/i18n (paridad es/en) | 3 archivos, 12 pruebas en verde |
| Matriz live del proveedor `provider-admin-buttons.mjs portal` a 1280 | 62 PASS, 4 BLOCKED (las brechas de backend ya conocidas: editar/archivar oferta, marcar lead, subida y borrado con almacenamiento no configurado), 0 errores de página |
| Ídem a 768 | 62 PASS, 4 BLOCKED |
| Ídem a 360 | 62 PASS, 4 BLOCKED. La primera corrida dio 1 FAIL (el menú de una fila final quedaba bajo la barra inferior para el selector de Playwright); se corrigió el ayudante de la matriz y la segunda corrida quedó limpia |
| Barrido responsivo `responsive/provider-admin.mjs` (360/768/1280 × es-BO/en-US × claro/oscuro: carga sin errores, sin scroll horizontal, sin claves i18n crudas, sin español en en-US, axe A+AA sin serious/critical, objetivos táctiles de 44 px a 360, el tema sigue al esquema) | 1619 comprobaciones, 1 FAIL. El FAIL es el flujo «admin: grant role» (pantalla de usuarios del admin, fuera de alcance y en manos de otro agente). Las 11 rutas del portal y los tres flujos del portal (crear oferta, publicar, renombrar) pasaron en todas las combinaciones |

Límites honestos:
- La matriz a 1280 y 768 se corrió antes del último ajuste del ayudante `openMenu` (el `scrollIntoView`); a 360 se corrió después. No se repitió 1280/768.
- Sin lector de pantalla ni prueba con teclado a mano: axe y el rol/nombre accesible de los ítems no sustituyen esa revisión.
- No se probó en dispositivo nativo (iOS/Android): el «⋯» nativo es una hoja modal de las primitivas y solo está cubierto por sus propias pruebas.
- Pendiente de la primitiva `OverflowMenu` (no es mía): el menú siempre se abre hacia abajo; en móvil, con la barra inferior fija, el de una fila muy cercana al final de la lista puede quedar parcialmente tapado hasta que la persona hace scroll. Conviene que abra hacia arriba cerca del borde inferior, y que `OverflowMenuItem` acepte `testID`.
- La regla «una primaria arriba a la derecha, secundarias en ⋯, más de 3 opciones en selector» aún no está escrita en `DESIGN.md`: la API vive en `apps/universal/PRIMITIVAS-API.md` (borrador de la otra tarea).
