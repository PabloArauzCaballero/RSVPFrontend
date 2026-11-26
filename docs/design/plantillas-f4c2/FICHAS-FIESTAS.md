# Fichas de personalidad · grupo de fiestas (F4 c2)

> Siete plantillas como documentos de diseño v2. Los archivos viven en `packages/celebration-theme/src/design/documents/` y, con los mismos bytes, en `seeds/templates/design-v2/` del backend; `scripts/design-documents/fiestas.py` los genera y los comprueba. Cada plantilla conserva la `key`, el nombre, las etiquetas de evento, el orden de secciones y el id determinista de su semilla v1 (P20).

**Reglas comunes aplicadas:** papel, tinta y aire; el acento solo en piezas pequeñas (la piedra, el disco, la copa, el óxido de la etiqueta); sin degradados ni bandas saturadas; sin antetítulo en mayúsculas; sin píldora de cuenta atrás; sin amarillo (ningún acento, relleno ni línea entre 40° y 70° de matiz); sin caras; el botón «Ver regalos» lo pone el dock del renderizador y cada documento tiene además su bloque de regalos. Animación dentro del contrato 1.2.0 (`fade`, `rise`, `scale`, `draw`), una sola vez, sin bucles.

## 1. Festivo

**Concepto.** El vals de los quince: una tiara con su piedra en frambuesa, el nombre en serif y el vestido y el zapato como firma pequeña.

**Firma (una sola).** *La tiara que se traza*: la tiara se dibuja (`draw`), el nombre sube (`rise`) y el vestido y el zapato aparecen al final (`fade`).

**Pareja tipográfica (catálogo).** `lora` 500/600 (titulares) · `nunito` 400/600 (cuerpo).

**Etiquetas de evento.** baptism, birthday, quinceanera. **Variante de portada.** `classic`.

### Paleta

| Rol | Claro | Oscuro |
|---|---|---|
| `canvas` | `#FFF5FA` | `#1D0E16` |
| `surface` | `#FFFFFF` | `#2A1620` |
| `text` | `#2A1520` | `#FAE8F0` |
| `muted` | `#6A4A58` | `#D1B2C0` |
| `accent` | `#B3134F` | `#F59BBB` |
| `accentFill` | `#B3134F` | `#E57A9F` |
| `onAccent` | `#FFFFFF` | `#2B0A17` |
| `line` | `#9A8590` | `#8A6877` |

| Par | Mín. | Claro | Oscuro |
|---|---|---|---|
| text sobre canvas | 4.5:1 | **16.06** | **15.86** |
| muted sobre canvas | 4.5:1 | **7.21** | **9.62** |
| muted sobre surface | 4.5:1 | **7.68** | **8.78** |
| accent sobre canvas | 4.5:1 | **6.31** | **9.13** |
| accent sobre surface | 4.5:1 | **6.72** | **8.34** |
| onAccent sobre accentFill | 4.5:1 | **6.72** | **6.57** |
| line sobre canvas | 3.0:1 | **3.21** | **3.84** |
| accentFill sobre canvas | 3.0:1 | **6.31** | **6.76** |

Matiz del acento: claro 338°, oscuro 339° (fuera de la franja 40–70° del amarillo).

**Portada · móvil.** Tiara centrada arriba (2 de 4 columnas), el nombre centrado en 56 px, y debajo, en una fila, el vestido inclinado −6° y el zapato inclinado 6° en las esquinas.

**Portada · escritorio.** Nombre a la izquierda (7 columnas, 88 px, alineado a la izquierda) y, a la derecha, la tiara grande con el vestido y el zapato debajo.

**Ornamento.** Separador `flourish`; cada sección lleva su dibujo común centrado.

**Dibujos.** Tiara, vestido, zapatilla (portada); reloj, alfiler de mapa, cámara, percha, regalo, pregunta y sobre en las secciones. Construcción DOne: disco de piedra, sombra plana, figura rellena de tinta y una sola pieza de color, la del acento.

**Foto.** Con foto: arco (variante `classic`), como una ventana del salón. Sin foto: la tiara ocupa su lugar.

**Se diferencia por.** Es la única con tiara y composición centrada en móvil que pasa a nombre a la izquierda en escritorio; Rosa antiguo usa el sobre y el camafeo.

---

## 2. Fiesta lila

**Concepto.** La pista de baile: un vinilo grande en lila profundo sobre papel claro y un titular en geometría ligera.

**Firma (una sola).** *El disco que cae en la pista*: el vinilo entra con `scale`, el nombre sube (`rise`) y la bola de espejos y el cañón de confeti llegan al final.

**Pareja tipográfica (catálogo).** `josefin-sans` 600/700 (titulares) · `nunito` 400/600 (cuerpo).

**Etiquetas de evento.** birthday, quinceanera. **Variante de portada.** `festive`.

### Paleta

| Rol | Claro | Oscuro |
|---|---|---|
| `canvas` | `#F8F4FF` | `#150F20` |
| `surface` | `#FFFFFF` | `#1F1730` |
| `text` | `#22152F` | `#EEE8FA` |
| `muted` | `#5E5070` | `#BDB2D2` |
| `accent` | `#6A3BBF` | `#C4A7F5` |
| `accentFill` | `#6A3BBF` | `#B08CEE` |
| `onAccent` | `#FFFFFF` | `#170B2A` |
| `line` | `#8C7FA3` | `#70628D` |

| Par | Mín. | Claro | Oscuro |
|---|---|---|---|
| text sobre canvas | 4.5:1 | **15.93** | **15.66** |
| muted sobre canvas | 4.5:1 | **6.78** | **9.33** |
| muted sobre surface | 4.5:1 | **7.35** | **8.55** |
| accent sobre canvas | 4.5:1 | **6.48** | **9.09** |
| accent sobre surface | 4.5:1 | **7.02** | **8.33** |
| onAccent sobre accentFill | 4.5:1 | **7.02** | **7.01** |
| line sobre canvas | 3.0:1 | **3.41** | **3.41** |
| accentFill sobre canvas | 3.0:1 | **6.48** | **6.99** |

Matiz del acento: claro 261°, oscuro 262° (fuera de la franja 40–70° del amarillo).

**Portada · móvil.** Vinilo a la izquierda (3 de 4 columnas) con la bola de espejos pequeña a su derecha; debajo, el nombre en 64 px alineado a la izquierda y el cañón de confeti inclinado 12°.

**Portada · escritorio.** Vinilo grande a la izquierda (5 columnas) y el nombre a su derecha en 96 px; bola y cañón en la columna del borde.

**Ornamento.** Sin ornamento: solo dibujos (el vinilo hace de ornamento); cada sección lleva su dibujo a la izquierda.

**Dibujos.** Vinilo, cañón de confeti, bola de espejos (portada); dibujos comunes en las secciones. Construcción DOne: disco de piedra, sombra plana, figura rellena de tinta y una sola pieza de color, la del acento.

**Foto.** Con foto: camafeo circular con sombra plana (variante `festive`): la foto es otro disco. Sin foto: el vinilo es la imagen.

**Se diferencia por.** El vinilo y la foto circular se leen como discos; Festivo es de papel y Fiesta temática es redondeada y centrada.

---

## 3. Cumpleaños adulto

**Concepto.** La cena larga: papel liso, un titular ligero y una sola copa en azul petróleo; casi nada más.

**Firma (una sola).** *La copa que se sirve*: el nombre aparece sin movimiento brusco (`fade`) y la copa llega después, sola.

**Pareja tipográfica (catálogo).** `spectral` 400/500 (titulares) · `karla` 400/500/600 (cuerpo).

**Etiquetas de evento.** adult-birthday, birthday. **Variante de portada.** `minimal`.

### Paleta

| Rol | Claro | Oscuro |
|---|---|---|
| `canvas` | `#F7F5F0` | `#0F1517` |
| `surface` | `#FFFFFF` | `#172023` |
| `text` | `#1C1B19` | `#E8EEEE` |
| `muted` | `#55534D` | `#AEBBBD` |
| `accent` | `#1D5C73` | `#7CC3DB` |
| `accentFill` | `#1D5C73` | `#5FB0CC` |
| `onAccent` | `#FFFFFF` | `#08171D` |
| `line` | `#868A8A` | `#65767A` |

| Par | Mín. | Claro | Oscuro |
|---|---|---|---|
| text sobre canvas | 4.5:1 | **15.80** | **15.70** |
| muted sobre canvas | 4.5:1 | **7.06** | **9.34** |
| muted sobre surface | 4.5:1 | **7.69** | **8.40** |
| accent sobre canvas | 4.5:1 | **6.81** | **9.37** |
| accent sobre surface | 4.5:1 | **7.42** | **8.43** |
| onAccent sobre accentFill | 4.5:1 | **7.42** | **7.45** |
| line sobre canvas | 3.0:1 | **3.20** | **3.88** |
| accentFill sobre canvas | 3.0:1 | **6.81** | **7.52** |

Matiz del acento: claro 196°, oscuro 195° (fuera de la franja 40–70° del amarillo).

**Portada · móvil.** El nombre a la izquierda en 56 px con la copa pequeña a la derecha, un filete debajo; mucho aire.

**Portada · escritorio.** Nombre en 88 px a la izquierda (7 columnas) y, a la derecha, una copa alta y la porción de pastel pequeña.

**Ornamento.** Separador `rule` (una línea); solo las secciones de lugar, regalos y confirmación llevan dibujo.

**Dibujos.** Copa de vino, porción de pastel (portada); mapa, regalo y sobre en tres secciones. Construcción DOne: disco de piedra, sombra plana, figura rellena de tinta y una sola pieza de color, la del acento.

**Foto.** Con foto: imagen ancha sin recorte decorativo (variante `minimal`). Sin foto: el titular y la copa bastan.

**Se diferencia por.** Es la más sobria del grupo: sin enmarcado, sin rotaciones y con una sola pieza de color.

---

## 4. Fiesta temática

**Concepto.** Disfraz y pista: la bola de espejos cuelga sobre un titular redondo en azul real; la foto es la entrada de cine.

**Firma (una sola).** *La bola que se enciende*: la bola se traza (`draw`), el nombre crece (`scale`) y el antifaz y el cañón se asientan al final.

**Pareja tipográfica (catálogo).** `fredoka` 500/600 (titulares) · `karla` 400/600 (cuerpo).

**Etiquetas de evento.** themed-party. **Variante de portada.** `corporate`.

### Paleta

| Rol | Claro | Oscuro |
|---|---|---|
| `canvas` | `#F5F7FF` | `#0E1124` |
| `surface` | `#FFFFFF` | `#171B33` |
| `text` | `#161A33` | `#E9ECFA` |
| `muted` | `#505673` | `#AEB5D6` |
| `accent` | `#2F4FBF` | `#9DB2FF` |
| `accentFill` | `#2F4FBF` | `#8299F5` |
| `onAccent` | `#FFFFFF` | `#0A1030` |
| `line` | `#8087A8` | `#5F678F` |

| Par | Mín. | Claro | Oscuro |
|---|---|---|---|
| text sobre canvas | 4.5:1 | **15.96** | **15.87** |
| muted sobre canvas | 4.5:1 | **6.72** | **9.23** |
| muted sobre surface | 4.5:1 | **7.19** | **8.36** |
| accent sobre canvas | 4.5:1 | **6.56** | **9.11** |
| accent sobre surface | 4.5:1 | **7.02** | **8.26** |
| onAccent sobre accentFill | 4.5:1 | **7.02** | **6.93** |
| line sobre canvas | 3.0:1 | **3.30** | **3.40** |
| accentFill sobre canvas | 3.0:1 | **6.56** | **6.96** |

Matiz del acento: claro 227°, oscuro 227° (fuera de la franja 40–70° del amarillo).

**Portada · móvil.** Bola de espejos centrada arriba, el nombre centrado en 64 px y, debajo, el antifaz inclinado −10° y el cañón inclinado 10° en las esquinas.

**Portada · escritorio.** Cañón a la izquierda, el nombre centrado en 104 px (8 columnas) y la bola grande a la derecha; el antifaz bajo el cañón.

**Ornamento.** Separador `flourish`; esquinas redondeadas amplias (8/16/24) y cada sección con su dibujo a la derecha.

**Dibujos.** Bola de espejos, antifaz, cañón de confeti (portada). Construcción DOne: disco de piedra, sombra plana, figura rellena de tinta y una sola pieza de color, la del acento.

**Foto.** Con foto: rectángulo 4:3 con esquinas redondeadas, como una entrada (variante `corporate`). Sin foto: la bola ocupa su lugar.

**Se diferencia por.** Es la única con el titular centrado y gigante en escritorio y las esquinas más redondeadas.

---

## 5. Fin de año

**Concepto.** Las doce uvas: capitales clásicas sobre un azul noche, las uvas que se trazan antes de la medianoche y dos copas como brindis.

**Firma (una sola).** *La cuenta de las uvas*: el filete deco se traza, el nombre sube y las uvas se trazan (`draw`) antes de que las copas aparezcan.

**Pareja tipográfica (catálogo).** `cinzel` 500/600 (titulares) · `jost` 400/500 (cuerpo).

**Etiquetas de evento.** new-year. **Variante de portada.** `editorial`.

### Paleta

| Rol | Claro | Oscuro |
|---|---|---|
| `canvas` | `#F3F5F9` | `#0A0F1D` |
| `surface` | `#FFFFFF` | `#121A2D` |
| `text` | `#121826` | `#E8ECF6` |
| `muted` | `#4C5568` | `#A9B3C9` |
| `accent` | `#1F3A6B` | `#93B0F0` |
| `accentFill` | `#1F3A6B` | `#7C9CE6` |
| `onAccent` | `#FFFFFF` | `#0A1228` |
| `line` | `#7F8BA3` | `#6370A0` |

| Par | Mín. | Claro | Oscuro |
|---|---|---|---|
| text sobre canvas | 4.5:1 | **16.24** | **16.16** |
| muted sobre canvas | 4.5:1 | **6.86** | **9.08** |
| muted sobre surface | 4.5:1 | **7.48** | **8.24** |
| accent sobre canvas | 4.5:1 | **10.26** | **8.83** |
| accent sobre surface | 4.5:1 | **11.20** | **8.01** |
| onAccent sobre accentFill | 4.5:1 | **11.20** | **6.86** |
| line sobre canvas | 3.0:1 | **3.14** | **3.96** |
| accentFill sobre canvas | 3.0:1 | **10.26** | **7.06** |

Matiz del acento: claro 219°, oscuro 221° (fuera de la franja 40–70° del amarillo).

**Portada · móvil.** Filete deco arriba, el nombre centrado en 56 px y, debajo, las uvas a la izquierda y las copas a la derecha.

**Portada · escritorio.** Las uvas a la izquierda, el nombre centrado en 96 px entre ambas columnas y las copas a la derecha, con un filete deco debajo.

**Ornamento.** Separador `deco` como marca de cada sección y secciones en bandas alternas.

**Dibujos.** Uvas, copas (portada) y el ornamento deco en cada sección. Construcción DOne: disco de piedra, sombra plana, figura rellena de tinta y una sola pieza de color, la del acento.

**Foto.** Con foto: retrato 4:5 y, desde 900 px, doble página con la foto a la izquierda (variante `editorial`). Sin foto: uvas y copas flanquean el nombre.

**Se diferencia por.** Es la única con tres columnas simétricas en escritorio y capitales clásicas (Cinzel). Sin píldora de cuenta atrás.

---

## 6. Despedida de soltero/a

**Concepto.** La noche antes: un antifaz grande y torcido, el brindis en verde esmeralda y un titular de trazo firme.

**Firma (una sola).** *El antifaz que se pone*: el nombre sube (`rise`), el antifaz entra con `scale` y el cóctel y el sombrero de copa llegan al final.

**Pareja tipográfica (catálogo).** `manrope` 600/700 (titulares) · `mulish` 400/600 (cuerpo).

**Etiquetas de evento.** bachelor-party. **Variante de portada.** `festive`.

### Paleta

| Rol | Claro | Oscuro |
|---|---|---|
| `canvas` | `#F1FAF8` | `#0C1716` |
| `surface` | `#FFFFFF` | `#142423` |
| `text` | `#10242A` | `#E4F2F0` |
| `muted` | `#46605F` | `#A8C2BF` |
| `accent` | `#0F766E` | `#6FD0C4` |
| `accentFill` | `#0F766E` | `#4DBBAE` |
| `onAccent` | `#FFFFFF` | `#06201D` |
| `line` | `#6F8E8B` | `#557370` |

| Par | Mín. | Claro | Oscuro |
|---|---|---|---|
| text sobre canvas | 4.5:1 | **15.12** | **15.88** |
| muted sobre canvas | 4.5:1 | **6.38** | **9.68** |
| muted sobre surface | 4.5:1 | **6.78** | **8.52** |
| accent sobre canvas | 4.5:1 | **5.15** | **10.00** |
| accent sobre surface | 4.5:1 | **5.47** | **8.80** |
| onAccent sobre accentFill | 4.5:1 | **5.47** | **7.33** |
| line sobre canvas | 3.0:1 | **3.34** | **3.54** |
| accentFill sobre canvas | 3.0:1 | **5.15** | **7.86** |

Matiz del acento: claro 175°, oscuro 173° (fuera de la franja 40–70° del amarillo).

**Portada · móvil.** El nombre a la izquierda en 64 px (3 columnas) con el sombrero de copa inclinado 14° a la derecha; debajo, el antifaz inclinado −8° y el cóctel.

**Portada · escritorio.** Nombre a la izquierda en 88 px (6 columnas) y el antifaz inclinado −8° a la derecha (5 columnas); cóctel y sombrero en el borde.

**Ornamento.** Sin ornamento; dibujos de lugar, horario, regalo y confirmación a la izquierda.

**Dibujos.** Antifaz, cóctel, sombrero de copa (portada); reloj, mapa, regalo y sobre en secciones. Construcción DOne: disco de piedra, sombra plana, figura rellena de tinta y una sola pieza de color, la del acento.

**Foto.** Con foto: camafeo circular con sombra plana (variante `festive`). Sin foto: el antifaz ocupa la portada.

**Se diferencia por.** Es la única con composición asimétrica a la izquierda y objetos inclinados en ambos tamaños.

---

## 7. Reencuentro

**Concepto.** El anuario y el casete: la tapa del libro con el titular en serif grueso, un casete inclinado y el óxido solo en la etiqueta.

**Firma (una sola).** *El anuario que se abre*: el anuario sube (`rise`), el marco aparece (`fade`), el nombre llega en su marco y el casete cierra la portada.

**Pareja tipográfica (catálogo).** `young-serif` 400 (titulares) · `work-sans` 400/500/600 (cuerpo).

**Etiquetas de evento.** reunion. **Variante de portada.** `corporate`.

### Paleta

| Rol | Claro | Oscuro |
|---|---|---|
| `canvas` | `#F6F1EA` | `#17110E` |
| `surface` | `#FFFFFF` | `#231A15` |
| `text` | `#211A16` | `#F2EAE2` |
| `muted` | `#5F544B` | `#BFB2A6` |
| `accent` | `#9A3412` | `#F0A583` |
| `accentFill` | `#9A3412` | `#E58A63` |
| `onAccent` | `#FFFFFF` | `#2A0F05` |
| `line` | `#8F8378` | `#7A6A5D` |

| Par | Mín. | Claro | Oscuro |
|---|---|---|---|
| text sobre canvas | 4.5:1 | **15.27** | **15.71** |
| muted sobre canvas | 4.5:1 | **6.54** | **9.02** |
| muted sobre surface | 4.5:1 | **7.35** | **8.24** |
| accent sobre canvas | 4.5:1 | **6.50** | **9.27** |
| accent sobre surface | 4.5:1 | **7.31** | **8.47** |
| onAccent sobre accentFill | 4.5:1 | **7.31** | **6.97** |
| line sobre canvas | 3.0:1 | **3.29** | **3.60** |
| accentFill sobre canvas | 3.0:1 | **6.50** | **7.26** |

Matiz del acento: claro 15°, oscuro 19° (fuera de la franja 40–70° del amarillo).

**Portada · móvil.** Anuario y marco de foto lado a lado, el nombre en un marco de línea fina a la izquierda en 56 px y, debajo, el casete inclinado −4°.

**Portada · escritorio.** Anuario inclinado −3° a la izquierda, el nombre en su marco al centro (72 px) y el casete inclinado 4° a la derecha.

**Ornamento.** Separador `rule`; secciones en tarjetas de superficie con el dibujo a la derecha.

**Dibujos.** Anuario, casete, marco con paisaje (portada). Construcción DOne: disco de piedra, sombra plana, figura rellena de tinta y una sola pieza de color, la del acento.

**Foto.** Con foto: rectángulo 4:3, como la foto del anuario (variante `corporate`). Sin foto: el marco dibujado hace de foto.

**Se diferencia por.** Es la única con el nombre enmarcado como tapa de libro y la única del grupo con recomendaciones de proveedores en su semilla.

