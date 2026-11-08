# Rediseño minimalista del área de anfitrión (rama `feat/diseno-minimalista`)

Alcance: `apps/universal/src/host/**` (marco, navegación lateral e inferior, Inicio, Invitados, Regalos, Mi invitación, Avisos, Ajustes, publicar, alta, `ui.tsx`, `more-options.tsx`, `gate.tsx`) y `apps/universal/src/push/**`. Reglas: `docs/design/minimalista-brief.md` (manda) y la skill `minimalist-ui`. Estructura de `feat/reorganizacion-ux` intacta: acción primaria arriba a la derecha (barra fija bajo 960 px), `OverflowMenu`, `FilterSelect`, nombres accesibles y `testID`. No se hizo commit ni push, ni se regeneraron capturas base.

## Qué cambió (aspecto, no comportamiento)

| Pieza | Antes | Ahora |
|---|---|---|
| Barra lateral (>= 960 px) | Noche azul con patrón de tejido, ítem activo con barra lateral de color | Superficie clara, borde derecho de 1 px, ítems de texto, activo con fondo `surfaceMuted` y texto tinta, sin barra de color; logo `tone="auto"` |
| Cabecera móvil | Banda noche con título blanco y hoja redondeada que sube | Barra clara sobre `canvas` con filete de 1 px; el titular abre la página; sin bandas oscuras ni degradados |
| Titular de página | Plus Jakarta 800, blanco o negro | Serif `fonts.display` peso 500, tracking -0.03em, 44/48 en escritorio y 32/36 en móvil, sobre canvas con un filete bajo la cabecera |
| Pestañas de sección | Escritorio con subrayado de 3 px y móvil en píldoras blancas sobre noche | Un solo estilo: texto con subrayado de 2 px tinta; el aviso de desborde horizontal pasa de degradado a una tira plana con un chevrón dibujado (`tabs-fade-*` se conserva) |
| Barra inferior | Punto/pastilla de 4 px y etiquetas 700 | Filete de 2 px sobre el activo, etiquetas de 11 px 500/600; 5 destinos |
| Tarjetas, avisos, diálogos | Relleno 20, bordes 1.5 | Borde de 1 px, radio 12, relleno 24, `gap` 16; avisos con borde de 1 px |
| Botones | Relleno azul / secundario relleno suave | Primario tinta (viene de `@rsvp/ui` Button), secundario con borde 1 px sin relleno, radio 6 |
| Chips de elección y filtros | Píldora completa 1.5 px | Radio 8, borde 1 px; seleccionado = fondo `surfaceMuted` + borde tinta + marca dibujada (no solo color) |
| Resumen de Inicio | Banda noche con `BrandBand` y tejido, ilustración `firstReply` | Tarjeta plana de 1 px con titular serif de 30 px; la barra de respuestas pasa a 8 px con puntos de `chips[scheme]` (verde confirmado, rojo no asiste, gris sin responder, ámbar acompañantes); la palabra y el número siguen diciendo todo |
| Marcador de partes (Mi invitación) | Disco azul con cheque blanco, ámbar | Disco con fondo `tones.green.bg` y cheque verde; pendiente en `tones.yellow.fg`; barra de progreso de 4 px |
| Momento «publicada» y «invitación lista» | `MomentBackdrop` con anillos de luz | Tarjeta plana de 1 px con el cheque dibujado (única animación de celebración) |
| Ilustraciones | En consejos de regalos, importación, reserva aprobada, primera respuesta, publicada | Eliminadas; quedan solo en estados vacíos (`EmptyState`) y la bienvenida del alta (paso 1) |
| Títulos de fila | `subtitle` 800 | Nuevo `itemTitle` (sans 16/22, 600) para filas de invitados, regalos, avisos, grupos, dispositivos y solicitudes; el serif queda para titulares y secciones |
| Fuentes | Constante `fontFamily = Platform.select({ web: "'Plus Jakarta Sans'..." })` en `shell.tsx`, `ui.tsx`, `more-options.tsx`, `guests/parts.tsx` | `fonts.sans` / `fonts.display` / `fonts.mono` de `@rsvp/ui`; `"monospace"` literal sustituido por `fonts.mono` |
| Pesos y radios | 700 y 800; píldoras `radius.full` en chips grandes; radios 24 y 26 en esqueletos | Pesos 400/500/600; `radius.full` solo en la barra de progreso y en marcadores diminutos; esqueletos con radio 8 y 12 |
| Tokens eliminados | `brand.*`, `onNight` en `shell`, `summary-screen`, `editor-sections` | Sustituidos por `palette`, `tones` y `chips` |

## Qué decidió cada skill

- **`minimalist-ui` (y el brief).** Lienzo hueso `#F7F6F3` con tarjetas blancas de borde 1 px; titulares serif 500 con tracking negativo; botón primario tinta de radio 6 sin sombra; etiquetas de estado en píldora pequeña en mayúsculas con pasteles; sin degradados (se retiró el `EdgeFade` con `linear-gradient`); sin sombras; macroespacio (columna de 960 px, `spacing[12]` bajo el titular de escritorio, `gap` de 32 entre bloques de escritorio); ilustración solo en estados vacíos y bienvenida; sin peso 800.
- **`impeccable`.** Es un rediseño (la identidad anterior es evidencia y antirreferencia, no se pule): se sustituyó el mundo visual entero en lugar de ajustar la noche azul. Modo Operate: la marca vive en el detalle (titular serif, tinta, filetes) y manda la escaneabilidad; una sola acción primaria por vista; se miraron las capturas renderizadas a 360, 768 y 1280 en claro y oscuro y se corrigieron las que salían mal en una sola pasada: etiqueta «Sistema» truncada en el selector de tema (padding), etiqueta «Mi invitación» truncada en la barra inferior (11 px y sin relleno), título de fila en serif de 22 px que pesaba más que la página (`itemTitle`), sangría de 4 y 12 px en acciones de texto y «Más opciones» frente al texto que las precede.
- **`ui-ux-pro-max`.** Accesibilidad crítica y táctil: se conservan los 44 px de mínimo, el foco visible (`ring` con el color tinta), el orden de teclado y las flechas/Home/End de las pestañas; el chip seleccionado lleva marca dibujada además del borde; los estados de las respuestas llevan siempre la palabra; la barra inferior mantiene cinco destinos; los cuerpos a 16 px con interlineado 26; sin emojis ni iconos de texto.
- **`visual-hierarchy-composition`.** Un solo punto focal por pantalla: el titular serif y, a su derecha, el único botón tinta. Se subió una sola palanca por énfasis: escala para el titular, color (tinta) para la acción, aire para separar secciones. La tarjeta «siguiente paso» de Inicio es la segunda en la jerarquía y su título no compite con el h1. Proximidad: más aire entre bloques que dentro de ellos (`gap` 32 entre bloques, 16 dentro de la tarjeta). Patrón F en las listas.
- **`typography-systems`.** Dos familias (Newsreader para titulares, Geist para interfaz); escala 11/12/14/16/22/30/34/44; cuerpo a 16 px con interlineado 1.6; titulares con interlineado 1.1 y tracking negativo; números tabulares en las leyendas del resumen; mayúsculas con tracking solo en etiquetas cortas; medida de línea acotada (`maxWidth` 520-560 px en textos largos); `fonts.mono` para códigos.
- **`frontend-beautiful-ui`.** Radios anidados (tarjeta 12, campo y botón 6-8, chip 8); bordes de 1 px de baja intensidad; profundidad con borde y no con sombra, tanto en claro como en oscuro (superficies más claras que el fondo); estados vacíos con explicación y acción; alineación óptica del chevrón y de la marca del chip; se revisó la lista anti-slop (sin degradados, sin emojis, sin sombras grandes iguales, sin centrado universal).
- **`ux-clarity-usability`.** La estructura de la reorganización se mantiene: una acción primaria por pantalla (arriba a la derecha o barra fija), lo secundario en «⋯», filtros con `FilterSelect`. Un chip pulsable parece pulsable (borde de `fieldBorder` de 3:1) y tiene estado seleccionado visible; el aviso de desborde de pestañas indica dónde hay más. Las confirmaciones siguen usando la palabra (no solo color).
- **`frontend-responsive-layout`.** Mobile-first dentro del marco: base estrecha y marco de escritorio desde 960 px (el corte se conserva); columna de contenido a 960 px; barra fija con área segura; sin scroll horizontal; el barrido responsive mide 360/768/1280, es/en, claro/oscuro. A 768 px se mantiene el marco móvil con barra fija (corte documentado en la reorganización).
- **`ui-quality-review`.** Rúbrica aplicada sobre capturas reales (ver puntuación abajo) y catálogo anti-slop pasado entero. Hallazgos corregidos: ver «Hallazgos de la revisión visual».
- **`rsvp-accessible-states`.** Estados enumerados y comprobados: carga (esqueletos con radios nuevos), vacío, error recuperable, sin permiso, sin conexión, parcial; el color nunca es el único medio (palabra + punto en los estados, marca dibujada en los chips elegidos); contraste medido por axe en el barrido; movimiento: la única animación de celebración es el cheque, y la entrada de pantalla respeta `prefers-reduced-motion` desde `@rsvp/ui`.

## Prueba y resultados

Entorno: backend real (Kong :28000, servicios locales, datos demo de `docs/runbooks/datos-demo.md`), app exportada propia (puerto 8400/8500), Chrome real. Mundos nuevos creados con `apps/seo-web/scripts/live-world.mjs`.

| Prueba | Resultado |
|---|---|
| `tsc --noEmit` en `src/host` y `src/push` | Sin errores (los errores restantes del paquete son de `auth`, `guest`, `provider` y `platform`, fuera de alcance) |
| Pruebas de componentes (`host*`, `guests*`, `gifts-portal`, `navigation`, `error-states`, `celebration-limits`, `push`, `theme`) | Todas en verde (173 + `host-minimalist`) |
| `host.test.tsx` | Una aserción cambiada por una equivalente: el fondo `moment-confirmed` ya no existe; ahora se exige la región `role=status` con el cheque y que no haya `data-illustration^="moment-"` |
| `host-minimalist.test.ts` (nuevo) | Vigila `host/` y `push/`: sin fuente antigua, sin peso 800, sin tokens `brand`/`onNight`, sin primitivas eliminadas, sin degradados, sin hex crudos. Encontró un degradado real en el aviso de desborde de pestañas |
| `guests-buttons.mjs` 360 | 95 PASS, 4 BRECHA, 1 FAIL («read-<id> error de red»: «no more unread notifications», carrera de datos: los avisos sembrados llegan de forma asíncrona y el aserto anterior los consumió) |
| `guests-buttons.mjs` 768 | 96 PASS, 4 BRECHA, 0 FAIL |
| `guests-buttons.mjs` 1280 | 95 PASS, 4 BRECHA, 1 FAIL («mark-all 429/503»: el botón queda deshabilitado si no quedan avisos sin leer; mismo origen de datos que el anterior, el aserto pasa en la corrida aislada) |
| `gifts-buttons.mjs` 768 | 52/52 |
| `celebration-buttons.mjs` 360 / 768 / 1280 | 48/48 en los tres |
| `gifts-buttons.mjs` 1280 y 360 | Con un FAIL solo a 1280 (estado `/Disponible/`: la píldora se dibuja en mayúsculas y `innerText` lo refleja; aserto cambiado a `/Disponible/i`). A 360 no se repitió la lectura final tras ese cambio: **no verificado con la compilación final** |
| Barridos responsive 360 / 768 / 1280 × es/en × claro/oscuro | Primera pasada: `guests` con 7 FAIL, `celebration` 18, `gifts` 4, todos «el fondo efectivo sigue el esquema» a 360 oscuro: la sonda contaba como superficie clara el botón primario de ancho completo (en oscuro el primario es claro por diseño). La sonda `responsive/scheme.mjs` ya excluye controles (`button`, `[role=button]`) y se repitió a 360 oscuro: `celebration` 196/0 FAIL, `gifts` 29/29, `guests` sin FAIL. Las otras combinaciones (axe, 44 px, claves i18n, scroll horizontal) pasaron en la primera pasada; no se repitieron completas tras el último cambio |
| Rendimiento del campo CSV | El FAIL «más de 1 MiB» (`fill` > 15 s) era real: el kerning de Geist sobre un tramo sin cortes de 200 000 caracteres tardaba 6,9 s (195 ms en Arial). Causa raíz: se añadió `mono` a `Field` y el CSV usa `fonts.mono` (282 ms). Tras eso la sección pasó a 360 y 768 |

Entorno: el servicio de regalos (:3004) cayó dos veces por un heartbeat de RabbitMQ; se reinició con `ensure-backend.sh` y se repitieron las ejecuciones afectadas.

## Hallazgos de la revisión visual (rúbrica 0 a 2)
Jerarquía 2, alineación 2, espaciado 2, consistencia con el sistema 2, contraste 2 (axe sin serious/critical), densidad 2, estados 2 (la gestión de plantillas muestra el error por el servicio de plantillas no levantado; no se pudo ver la galería con datos), pulido 1. Total 15/16, aprobada con nits.
- Nit: avatares con pastel rojo en filas de invitados (de `@rsvp/ui`) se confunden con el estado «no asistirá»; sugerir a Base evitar el rojo en avatares.
- Nit: `AvatarMark` de la lista de celebraciones tiene esquinas planas a la izquierda y redondeadas a la derecha.
- Nit: bajo 960 px (incluye 768) la barra fija de acción queda blanca sobre el lienzo hueso.

## No probado
- Nativo (iOS/Android): no se ejecutó.
- Galería de plantillas con datos (servicio de plantillas no disponible) y fotos.
- Matriz `gifts-buttons` completa a 360 y 1280 con la compilación final.
- Barrido responsive completo tras la última corrección del campo CSV.

