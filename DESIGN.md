# Sistema de diseño de DOne (RSVP)

Fuente: *DOne Brand Kit v3*. Tokens en `packages/design-tokens/src` (`yarn workspace @rsvp/design-tokens generate`). Este documento manda sobre el gusto de quien edite: si algo no está aquí, se decide y se agrega aquí en el mismo PR.

## Identidad

- Un azul (`azul #1F3BFF`), una noche (`noche #0A1033`), ámbar solo para "quizá" y avisos. Proporción: 45 % claro, 30 % noche, 20 % azul, 5 % ámbar.
- Una familia tipográfica: **Plus Jakarta Sans** (400 a 800). Web la carga de Google Fonts; nativo usa la del sistema hasta empaquetarla con `expo-font`.
- Logo siempre con `Logo` de `@rsvp/ui` (SVG real; no texto ni glifos). Sobre azul `tone="white"`, sobre noche `tone="onDark"`.
- Mensaje de marca: «Invitas hoy. Mañana sabes quién viene.»

## Superficies y modo

| Superficie | Modo | Marco |
|---|---|---|
| Ingreso, registro, recuperar | Persuade | `AuthLayout`: panel azul con el lema (ancho) o portada azul con la hoja sobre ella (móvil) |
| Invitado (RSVP, regalos) | Persuade | `GuestFrame`: portada azul con logo y la tarjeta subida sobre ella |
| Anfitrión, admin, proveedor | Operate | `Screen` (`apps/universal/src/host/shell.tsx`): menú lateral noche con pocos destinos (ancho) o barra superior + barra inferior + «Más» (móvil); bajo el título, las pestañas de la sección (`role=tablist`). Anfitrión 6 destinos, proveedor 5, admin 4 (ver `docs/design/primitives.md`) |
| Sitio público (`apps/seo-web`) | Persuade | `site-chrome` + `landing`; estilos en `globals.css` |

El área segura de iOS la aplica una sola vez `SafeFrame` en el layout raíz: ningún marco suma insets por su cuenta.

## Personalidad

Idea central: **el toque**. La marca es un cheque dentro de una D; el producto gira en torno a un gesto (invitar, tocar, confirmar). La personalidad es la de alguien que organiza la fiesta contigo: cálida, ágil, sin solemnidad, con el orgullo tranquilo de quien ya tiene todo resuelto. Detalle y planes en `docs/design/upgrade-brief.md`; API en `docs/design/primitives.md`.

- **Voz.** Tuteo boliviano neutro, nunca voseo ni jerga. Frases cortas, verbos de acción, una idea por línea. Habla de personas y momentos («Quién viene», «Tu invitación», «Regalos»), no de módulos. Los hitos se celebran con medida: una frase y un gesto. Los errores no culpan: dicen qué pasó y cómo seguir. Cada pantalla vacía responde qué es esto, por qué importa y cuál es el primer toque.
- **El toque (el cheque).** El cheque de la D se dibuja con trazo animado (`CheckMark`, `Celebrate`, `SuccessNote`, `Notice kind="success"`) al confirmar, publicar, guardar o responder. Es el único motivo de celebración y se repite en sellos de las ilustraciones.
- **Ilustración.** Set propio de línea (`Illustration`): trazo grueso y redondeado, azul sobre claro, noche sobre claro o cielo sobre noche, un bloque suave desplazado detrás y una chispa de ámbar como único acento. Solo en estados vacíos, bienvenida y errores amables. SVG inline; nunca emoji, glifos ni clip-art.
- **Forma.** Esquinas muy redondeadas de la D; la sábana que sube sobre la portada es el gesto de marca y se repite en tarjetas destacadas. Títulos en peso 800 con tracking cerrado (−0.5 a −1.0 px según tamaño).
- **Movimiento.** Entradas de 150 a 250 ms con salida suave; el cheque dura 250 a 450 ms (hoy 360 ms) y no se repite. Con `prefers-reduced-motion` o Reduce Motion nativo todo aparece sin animar. Sin bucles ni movimiento decorativo.
- **Navegación.** Pocos destinos (anfitrión 6, proveedor 5, admin 4) y, dentro de cada uno, pestañas de sección. Una acción primaria por pantalla; lo avanzado, detrás de «Más opciones».
- **Prohibido en la personalidad.** «¡Bienvenido a la plataforma!», «No se pudo completar la acción», «Error 500», «Sin datos», jerga técnica (slug, token, endpoint), signos de exclamación en errores, confeti permanente, mascotas, emoji o glifos como adorno, animación en bucle, ilustración en cada tarjeta. Siguen vigentes todas las prohibiciones de la sección siguiente.

## Modo oscuro

- **Compuesto, no invertido.** Escala de elevación por superficie: noche de marca `#0A1033` < canvas `#0E1540` < surface `#18215A` < surfaceMuted `#212C6E`; el azul acento pasa a cielo `#8FA6FF`; el ámbar sigue siendo solo «quizá» y avisos. Las regiones de marca (banda noche del menú, portada azul del invitado y del acceso) son iguales en ambos modos. En oscuro la elevación se marca con una superficie más clara, no con sombra.
- **Esquema:** sigue al sistema por defecto y se puede forzar Sistema · Claro · Oscuro (Ajustes → Configuración y menú). Se aplica antes del primer pintado en web (sin parpadeo) y se persiste con try/catch.
- **Contraste medido:** `packages/design-tokens/src/contrast.test.ts` comprueba 71 pares en claro y oscuro (texto 4.5:1, componentes 3:1, chips y avatares). Un color nuevo entra con su par probado.
- **Estilos:** nunca `colors.light` ni hex sueltos en pantallas: `useColors()` / `useStyles()` / `useThemedStyles()`. Las ilustraciones usan el tono semántico `auto`.
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
