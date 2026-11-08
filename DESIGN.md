# Sistema de diseño de DOne (RSVP)

Rediseño minimalista (rama `feat/diseno-minimalista`). Tokens en `packages/design-tokens/src` (`yarn workspace @rsvp/design-tokens generate`). Este documento manda sobre el gusto de quien edite: si algo no está aquí, se decide y se agrega aquí en el mismo PR.

## Identidad (sistema minimalista, «papel de invitación»)

Brief y reglas: `docs/design/minimalista-brief.md`; fuente de criterio: skill `minimalist-ui` más Impeccable y UI/UX Pro Max. Donde choquen, mandan AGENTS.md (contraste AA, objetivos de 44 px, foco visible, movimiento reducido, i18n, modo oscuro).

- **Idea.** DOne organiza eventos; el diseño es el de una buena invitación impresa: papel cálido, tinta, mucho aire, un titular serif con carácter y nada que compita con el nombre del evento. El color solo significa algo (estado de una respuesta, error, aviso).
- **Lienzo y tinta.** `canvas` hueso cálido `#F7F6F3`, `surface` blanco, texto `#111111`, secundario `textMuted`. Oscuro compuesto en carbón cálido `#151514` (no invertido). Proporción: casi todo es neutro; el pastel ocupa una fracción pequeña.
- **Color.** Solo pasteles apagados de `tones` (rojo, azul, verde, amarillo, gris) para etiquetas, estados, avatares, fondos de icono y la forma de las ilustraciones; `danger`, `success` y `warning` solo como texto o aviso. Nunca bloques saturados, degradados, neón ni vidrio.
- **Tipografía.** Dos familias y una de metadatos: **Newsreader** 500 (titulares, tracking −0,02 a −0,03em, interlineado 1,1), **Geist** 400 a 600 (interfaz y cuerpo, interlineado ~1,6) y **Geist Mono** (códigos y metadatos). Pilas centralizadas en `packages/ui/src/fonts.ts` (`fonts.sans|display|mono`); web carga las caras de Google Fonts en `apps/universal/app/+html.tsx`, nativo usa la fuente de plataforma hasta empaquetarlas con `expo-font`. Prohibidos Inter, Roboto, Open Sans y el peso 800.
- **Formas.** Tarjetas con borde de 1 px (`border`), radio 8 a 12 y relleno generoso (24 a 40); botones de radio 6; etiquetas de estado en píldora pequeña en mayúsculas con interletrado 0,05em. Nada de píldoras en contenedores grandes ni botones principales. Sombras prácticamente ninguna: un borde separa; solo elevación ultradifusa (`shadow.md/lg`, < 0,06) en menús y diálogos.
- **Botones.** Primario: tinta con texto `onPrimary`, sin sombra, `scale(0.98)` al pulsar. Secundario: borde 1 px, sin relleno. Terciario: texto subrayado. Peligro: fondo pastel rojo con texto `danger`.
- **Logo.** Siempre `Logo` de `@rsvp/ui` (SVG real): marca y palabra en una sola tinta; `tone="auto"` sigue el esquema (tinta clara sobre oscuro).
- **Iconos.** Un solo set de trazo uniforme; ningún glifo de texto ni emoji como icono (el menú «Más opciones» dibuja tres puntos, el selector su flecha).
- **Ilustración.** Solo en estados vacíos y bienvenida: línea de tinta de 3,5 sobre fondo plano con UNA forma pastel desplazada (`Illustration`, 32 láminas). Cuando no aporte nada, texto y espacio.
- **Movimiento.** Casi invisible: entrada `translateY(12px)` más opacidad en ~500 ms con `cubic-bezier(0.16,1,0.3,1)`, cascada de 70 ms en listas, `scale(0.98)` al pulsar, hojas y menús en 240 ms. El cheque (tinta sobre verde pastel) es la única animación de celebración. Solo `transform` y `opacity`; con `prefers-reduced-motion` o Reduce Motion todo aparece en su estado final.
- **Mensaje de marca:** «Invitas hoy. Mañana sabes quién viene.»

## Superficies y modo

| Superficie | Modo | Marco |
|---|---|---|
| Ingreso, registro, recuperar | Persuade | `AuthLayout` sobre `canvas`: titular serif y columna de 720 a 960 px, sin paneles de color |
| Invitado (RSVP, regalos) | Persuade | `GuestFrame`: el nombre del evento como titular serif sobre papel |
| Anfitrión, admin, proveedor | Operate | `Screen` (`apps/universal/src/host/shell.tsx`): barra lateral clara (superficie) con ítems de texto y activo en `surfaceMuted` (ancho) o cabecera clara + barra inferior de 5 destinos (móvil); bajo el título, las pestañas de la sección (`role=tablist`). Anfitrión 6 destinos, proveedor 5, admin 4 (ver `docs/design/primitives.md`) |
| Sitio público (`apps/seo-web`) | Persuade | `site-chrome` + `landing`; estilos en `globals.css` |

El área segura de iOS la aplica una sola vez `SafeFrame` en el layout raíz: ningún marco suma insets por su cuenta.

## Personalidad

La marca es un cheque dentro de una D; el producto gira en torno a un gesto (invitar, tocar, confirmar). La personalidad es la de alguien que organiza la fiesta contigo: cálida, ágil, sin solemnidad. Voz en `docs/design/voz-y-copy.md`; API en `docs/design/primitives.md`.

- **Voz.** Tuteo boliviano neutro, nunca voseo ni jerga. Frases cortas, verbos de acción, una idea por línea. Habla de personas y momentos («Quién viene», «Tu invitación», «Regalos»), no de módulos. Los hitos se celebran con medida: una frase y un gesto. Los errores no culpan: dicen qué pasó y cómo seguir. Cada pantalla vacía responde qué es esto, por qué importa y cuál es el primer toque.
- **El toque (el cheque).** `CheckMark`, `Celebrate`, `SuccessNote` y `Notice kind="success"` dibujan el cheque al confirmar, publicar, guardar o responder. Es el único motivo de celebración.
- **Navegación.** Pocos destinos (anfitrión 6, proveedor 5, admin 4) y, dentro de cada uno, pestañas de sección. Una acción primaria por pantalla (arriba a la derecha; barra fija en móvil bajo 960 px); lo avanzado, detrás de «Más opciones» (`OverflowMenu`).
- **Prohibido en la personalidad.** «¡Bienvenido a la plataforma!», «No se pudo completar la acción», «Error 500», «Sin datos», jerga técnica (slug, token, endpoint), signos de exclamación en errores, confeti permanente, mascotas, emoji o glifos como adorno, animación en bucle, ilustración en cada tarjeta, clichés de IA («Seamless», «Elevate») y «Lorem ipsum».

## Modo oscuro

- **Compuesto, no invertido.** Escala de elevación por superficie en carbón cálido: canvas `#151514` < surface `#1E1E1C` < surfaceMuted `#272725`; texto `#EDECE8`; la acción primaria es tinta clara con texto oscuro; los pasteles pasan a su versión oscura de `tones.dark`. En oscuro la elevación se marca con una superficie más clara, no con sombra.
- **Esquema:** sigue al sistema por defecto y se puede forzar Sistema · Claro · Oscuro (Ajustes → Configuración y menú). Se aplica antes del primer pintado en web (sin parpadeo) y se persiste con try/catch.
- **Contraste medido:** `packages/design-tokens/src/contrast.test.ts` comprueba los pares en claro y oscuro (texto 4.5:1, componentes 3:1, tonos, chips y avatares); `packages/ui/src/minimalist.test.tsx` repite los que componen las primitivas. Un color nuevo entra con su par probado.
- **Estilos:** nunca `colors.light` ni hex sueltos en pantallas: `useColors()` / `useStyles()` / `useThemedStyles()`. Las ilustraciones y el logo usan el tono `auto`; el pastel sale de `useTones()`.
- **Excepción:** la vista previa del dispositivo y la invitación del invitado siguen el tema de la celebración del anfitrión; no se oscurecen.

## Reglas de pantalla (Operate)

- Un título por pantalla (el de `Screen`), con a lo sumo una frase cálida debajo (`intro`). Nada de etiqueta o *eyebrow* encima del título, ni repetir el título en la primera tarjeta. Un solo botón primario por pantalla.
- Cambiar de sección dentro de un destino se hace con las pestañas del marco, no con botones o chips propios.
- Formularios: `Section` (máx. 720 px), `Field`, `ChoiceGroup`. Botón primario a todo el ancho en móvil y al ancho del contenido desde 640 px.
- Estado de respuesta: `Chip` (punto + palabra). Personas: `Avatar`. Nunca color solo.
- Progreso/recuento: barra apilada con leyenda (patrón `progress` del kit). No usar tarjetas «número grande + etiqueta».
- Contornos de campos: `fieldBorder` (3:1). `border` es solo para divisores.

## Prohibido (también lo vigila `impeccable`)

Eyebrows sobre títulos; tarjetas iguales de icono+título+texto como estructura; tarjetas anidadas; `border-left` de color mayor a 1 px; texto con degradado; glifos Unicode o emoji como iconos; sombras duras sin desenfoque; modal para tareas que no lo necesitan.

## Cómo se verifica

1. `yarn workspace @rsvp/universal test:visual` recorre **todas** las rutas de `apps/universal/e2e/screens.ts` a 390, 768 y 1440 px contra el servidor de contrato. Al agregar una pantalla, agrégala a esa lista.
2. `yarn workspace @rsvp/seo-web test:visual` para el sitio público.
3. Las imágenes base son salida de máquina hasta que una persona las revise en el PR (`docs/runbooks/visual-baselines.md`).
