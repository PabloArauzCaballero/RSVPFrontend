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
| Anfitrión, admin, proveedor | Operate | `Screen` (`apps/universal/src/host/shell.tsx`): menú lateral noche con secciones (ancho) o barra superior + pestañas inferiores + «Más» (móvil) |
| Sitio público (`apps/seo-web`) | Persuade | `site-chrome` + `landing`; estilos en `globals.css` |

El área segura de iOS la aplica una sola vez `SafeFrame` en el layout raíz: ningún marco suma insets por su cuenta.

## Reglas de pantalla (Operate)

- Un título por pantalla (el de `Screen`). Nada de etiqueta o *eyebrow* encima del título, ni repetir el título en la primera tarjeta.
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
