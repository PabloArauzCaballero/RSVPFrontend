# L16: la sombra de contacto de las ilustraciones en tema oscuro

- **Fecha:** 2026-11-23.
- **Bug:** L16 del catálogo (`docs/bugs/CATALOGO.md`, rama `bugs/catalogo` de RSVPBackend).
- **Rama:** `fix/l16-sombra-ilustracion-oscuro`, desde `origin/chore/deploy-contabo-coolify` (`18db2c8`).

## Causa raíz

La sombra de contacto de cada escena se pintaba con el color de la página en oscuro:
`illustrationColors('onDark')` devolvía `shadow: colors.dark.canvas` (#0A0A0B) en `packages/ui`, y seo-web
copiaba la misma excepción con `[data-theme='dark'] .art__shadow { fill: var(--canvas) }` y su `@media`.
La elipse de la sombra (y = 94–104) se superpone al borde inferior del disco (círculo r = 46 centrado en
y = 56, borde en y = 102). Cuando la ilustración está sobre la página, el tramo de la sombra que cae fuera
del disco desaparece (sombra igual al fondo, contraste 1:1) y el tramo que cae sobre el disco «muerde»
su borde inferior con el color de la página: el dibujo parece cortado en plano. Dentro de una tarjeta
(`surface` #111113) el defecto no se notaba porque la sombra sí difería un poco del fondo.

## Solución

Ninguna excepción por tema. El papel de cada pieza neutra de la escena vive en un solo sitio,
`illustrationTokens` en `@rsvp/design-tokens` (`ground: primaryMuted`, `shadow: border`,
`stone: fieldBorder`), y se resuelve en la paleta activa:

- App (`packages/ui/src/illustrations.ts`): `shadow: scheme[illustrationTokens.shadow]`.
- seo-web (`apps/seo-web/app/globals.css`): `.art__shadow { fill: var(--border) }` sin anulación oscura. Una
  prueba de `tokens-pipeline.test.ts` exige que `.art__ground`, `.art__shadow` y `.art__stone` usen
  exactamente la variable de `illustrationTokens` y que ninguna esté dentro de un selector de tema.

En claro no cambia nada (ya era `border`, #E8E8EA). En oscuro la sombra pasa a `border` (#25252A): un paso
más clara que los fondos casi negros, como el resto de la profundidad en oscuro (`shadow` en
`spacing.ts`: en oscuro se separa con un tono más claro). No hay colores nuevos ni amarillo nuevo.

| Contraste de la sombra (WCAG) | Claro (sin cambios) | Oscuro antes | Oscuro después |
|---|---|---|---|
| sobre `canvas` (página) | 1,22 | **1,00** | 1,30 |
| sobre `surface` (tarjeta) | 1,22 | 1,05 | 1,24 |
| sobre `surfaceMuted` (tarjeta del anfitrión en la portada) | 1,14 | 1,11 | 1,17 |
| sobre el disco (`primaryMuted`) | 1,07 | 1,20 | 1,08 |

`contrast.test.ts` fija en ambos temas: sombra ≥ 1,1 sobre cada fondo posible y ≥ 1,05 sobre el disco
(los márgenes que ya tenía el tema claro).

## Capturas (Chrome real, local)

`capturar.mjs` (copiar a `apps/universal/` para que resuelva `@playwright/test`) abre cada pantalla en
Chrome real (`/Applications/Google Chrome.app`), claro y oscuro (`colorScheme` del sistema), 1280 y 390 px,
es-BO, y guarda la página, un recorte de la ilustración (`zoom-*`) y los colores calculados del fondo, el
disco y la sombra (`medidas-antes.json`, `medidas-despues.json`).

- App web: `expo start --web` en :8391 contra el mock de contrato `scripts/visual-mock.ts` (:28390). El
  directorio vacío se fuerza vaciando las respuestas de lista con `page.route`, porque el mock no filtra.
- seo-web: `next dev` en :3191 contra `scripts/fixture-api.mjs` (:28191).
- «antes»: el mismo árbol con los cambios guardados en `git stash` (servidores reiniciados).

Medidas en oscuro (de los JSON):

| Pantalla | Fondo | Disco | Sombra antes | Sombra después |
|---|---|---|---|---|
| app `/login` 1280 | rgb(10,10,11) | rgb(31,31,35) | rgb(10,10,11) | rgb(37,37,42) |
| app 404 1280 | rgb(10,10,11) | rgb(31,31,35) | rgb(10,10,11) | rgb(37,37,42) |
| app directorio vacío 1280 y 390 | rgb(10,10,11) | rgb(31,31,35) | rgb(10,10,11) | rgb(37,37,42) |
| seo-web 404 1280 y 390 | rgb(10,10,11) | rgb(31,31,35) | rgb(10,10,11) | rgb(37,37,42) |
| seo-web 404 de celebración 1280 y 390 | rgb(10,10,11) | rgb(31,31,35) | rgb(10,10,11) | rgb(37,37,42) |

En claro, antes y después son idénticos en todas las pantallas (sombra rgb(232,232,234)).
A 390 px el ingreso y el 404 de la app no muestran ilustración (la columna editorial solo existe en
pantallas anchas), así que esas capturas no tienen recorte.

Revisado a ojo: en oscuro, antes el disco aparece recortado en plano por abajo; después se ve entero
con la sombra como una elipse discreta debajo. En claro no hay diferencia.

## Líneas base visuales

**No se actualizó ninguna línea base.**

- seo-web (`test:visual`, Chrome real, `next build` + `next start`): 34 pasan, 1 omitida (la del redirector,
  preexistente). Sus líneas base oscuras (`catalogo dark-*`) no contienen ilustraciones de escena.
- App (`--project=anon-dark --project=authed-dark`, Chrome real, mock de contrato): 24 pasan y 6 fallan
  (`auth-login-dark-1440`, `auth-registro-dark-1440`, `host-editor-general-dark-390/1440`,
  `guest-regalos-dark-390/1440`). **Los mismos 6 fallan con el código base** (cambios guardados en
  `git stash`, misma corrida): las diferencias son texto y maquetación que se movieron en otros PRs, no la
  sombra. Regenerarlas aquí metería cambios ajenos en este PR; la regeneración de las líneas base de la app
  está asignada a L13 después de FE #80 (ORDEN-DE-FUSION). Las de `auth-login`/`auth-registro` 1440 incluyen
  la ilustración y cambiarán también por L16 cuando se regeneren.

## No verificado

- App nativa (iOS/Android): `illustration.native.tsx` usa la misma `illustrationColors`, pero no se ejecutó
  en simulador ni dispositivo.
- TEST (Coolify): no se desplegó; la verificación es local.
- en-US: las capturas son es-BO; el cambio no toca texto.
