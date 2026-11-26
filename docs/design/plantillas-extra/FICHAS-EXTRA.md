# Fichas de personalidad · plantillas extra (decisión 6, 2026-11-25)

> Seis documentos v2: dos más para Otros (`other`), Despedida (`bachelor-party`) y Pedida (`engagement`). Los archivos viven en `packages/celebration-theme/src/design/documents/` y, con los mismos bytes, en `seeds/templates/design-v2/` del backend; `scripts/design-documents/extra.py` los genera. Cada uno conserva la `key` y el id determinista de su semilla v1 (031 a 036, P20: la migración omite la fila que el admin editó).

Reglas comunes: dibujos DOne/Cuotea (disco de piedra, sombra plana, tinta rellena y una sola pieza de color en el acento), sin amarillo ni caras, sin degradados, botón de regalos obligatorio (`giftsCta` y dock) hacia `/c/{slug}/regalos`, animación una sola vez y dentro del contrato. Las paletas y su contraste AA medido están en `docs/progress/evidence/plantillas-extra/contraste.md`.

## Otros · Rumbo

La bitácora: brújula grande y pin de mapa, recorrido primero.

- Tipos: `fraunces` (titulares) · `jost` (cuerpo). Variante: `minimal`. Dibujos: brujula, mapa-pin, filete.
- Claro: lienzo `#EDF4F6`, acento `#0B5F7A`. Oscuro propio: lienzo `#08141A`, acento `#6CC3DC`.

## Otros · Mesa larga

El banquete: los nombres sobre un mantel de papel y la mesa servida debajo; copas.

- Tipos: `libre-baskerville` (titulares) · `dm-sans` (cuerpo). Variante: `classic`. Dibujos: mesa-larga, copas, ramo.
- Claro: lienzo `#F8F4EA`, acento `#1F6B4A`. Oscuro propio: lienzo `#121510`, acento `#7FCBA2`.

## Despedida · Disco

La pista: bola de espejos, vinilo y popper, titular grueso, violeta eléctrico en una pieza.

- Tipos: `figtree` (titulares) · `mulish` (cuerpo). Variante: `festive`. Dibujos: bola-disco, vinilo, popper.
- Claro: lienzo `#FBF3FC`, acento `#8E1F8F`. Oscuro propio: lienzo `#150A1B`, acento `#E39AE5`.

## Despedida · Black tie

Gala en blanco y negro con pajarita y copa de vino; escarlata en una pieza. Variante de portada `corporate` (foto 4:3), ver límites.

- Tipos: `dm-serif-display` (titulares) · `jost` (cuerpo). Variante: `corporate`. Dibujos: pajarita, copa-vino, botella, filete (el sombrero de copa ya es de Despedida: PL-FE143-V5).
- Claro: lienzo `#F5F4F2`, acento `#B4262A`. Oscuro propio: lienzo `#09090B`, acento `#F08A8C`.

## Pedida · Solitario

Una sola piedra: solitario centrado, mucho aire, inscripción Marcellus y azul hielo.

- Tipos: `marcellus` (titulares) · `source-sans-3` (cuerpo). Variante: `classic`. Dibujos: solitario, botella.
- Claro: lienzo `#F2F6FA`, acento `#1D5E91` (matiz 206°, a 51° de Pedida de mano; antes 228°, a 27°). Oscuro propio: lienzo `#09111A`, acento `#86BDEB`.

## Pedida · Rosa y carta

La pregunta escrita a mano: rosa y sobre, cursiva Allura sobre una carta, solo en los titulos (32 px o mas): la fecha, el lugar, la cuenta atras, los horarios y los nombres de sede van en Mulish (PL-FE143-V1, `data-heading-face="script"`).

- Tipos: `allura` (titulares) · `mulish` (cuerpo). Variante: `festive`. Dibujos: rosa, sobre, filete.
- Claro: lienzo `#FCF3F5`, acento `#A82E58`. Oscuro propio: lienzo `#190B11`, acento `#F29BB6`.

## Límites y preguntas

- **Despedida y el esmeralda.** El esmeralda `#0F766E` (decisión aceptada) es el de la plantilla Despedida existente. Las dos nuevas usan violeta y escarlata para no repetir matiz dentro del mismo tipo de evento; si Pablo las quiere en esmeralda, es un cambio de paleta en `extra.py`.
- **Black tie usa la variante `corporate`** en lugar de `editorial`: la foto editorial (4:5, hasta 28 rem) empuja el texto de la portada bajo el dock a 360×800 aun sin dibujos (PL-130-M2). La capa `layout` de la semilla 034 es `corporate` por la misma razón.
- Las seis ponen los nombres antes que los dibujos en el teléfono (el h1 queda sobre el dock) y, en escritorio, Rumbo, Disco y Solitario tienen un dibujo héroe (`hero=` en `extra.py`, 64 filas o 44) que ancla la portada (PL-FE143-V4).
- **Foto y texto comparten eje** (PL-FE143-V2): cuando el documento centra el texto de portada, la foto en arco o círculo se centra con él (`data-align="center"` en la portada) y el aro del arco queda a 13 px de los nombres.
- **360×640 (visor con barra del navegador) no entra en la regla PL-130-M2**, que se define a 360×800 y 390×844 (Pablo: ¿entra?). Medido, h1 con foto contra el dock en 563: Rumbo 471, Mesa 562, Disco 486, Black tie 518, Solitario 525, Rosa 509 (los seis quedan sobre el dock); el texto completo (nombres, fecha, lugar) llega a 556 (Rumbo) y de 569 a 667 en las otras cinco, bajo el dock. La hermana `pedida-de-mano` ya falla igual (663).
