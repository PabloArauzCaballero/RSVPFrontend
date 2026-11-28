# Fichas de personalidad · grupo de bodas (F4 c1)

> Ocho plantillas como documentos de diseño v2. Los archivos viven en `packages/celebration-theme/src/design/documents/` y, con los mismos bytes, en `seeds/templates/design-v2/` del backend; `scripts/design-documents/bodas.py` los genera y los comprueba. Cada plantilla conserva la `key` y el id determinista de su semilla v1 (P20).

**Reglas comunes aplicadas:** papel, tinta y aire; el acento solo en piezas pequeñas (sello, cifra, botón, un cuadrado); sin degradados ni bandas saturadas; sin antetítulo en mayúsculas; sin amarillo (ningún acento entre 40° y 70° de matiz); sin caras; el botón «Ver regalos» lo pone el dock del renderizador y cada documento tiene además su bloque de regalos. Animación dentro del contrato 1.2.0 (`fade`, `rise`, `scale`, `draw`, `envelope`), una sola vez, sin bucles.

## 1. Jardín botánico

**Concepto.** Una hoja de herbario: la etiqueta del ejemplar, un ramo prensado y hojas en las esquinas.

**Firma (una sola).** *Las hojas que se prensan*: las dos esquinas de laurel se trazan (`draw`) y el ramo aparece (`scale`); la etiqueta con los nombres llega al final.

**Pareja tipográfica (catálogo).** `eb-garamond` 500/600 (titulares) · `dm-sans` 400/500/600 (cuerpo).

**Etiquetas de evento.** anniversary, baptism, wedding. **Variante de portada.** `classic` (foto en arco dentro de la etiqueta de línea fina).

### Paleta

| Rol | Claro | Oscuro |
|---|---|---|
| `canvas` | `#F4F7F0` | `#0F1712` |
| `surface` | `#FFFFFF` | `#17221A` |
| `text` | `#1D2A20` | `#E7EEE5` |
| `muted` | `#51604F` | `#A8B9A6` |
| `accent` | `#2E5E3F` | `#92C79F` |
| `accentFill` | `#2E5E3F` | `#7DBA8D` |
| `onAccent` | `#FFFFFF` | `#0D1A11` |
| `line` | `#7F9283` | `#5C7262` |

| Par | Mín. | Claro | Oscuro |
|---|---|---|---|
| text sobre canvas | 4.5:1 | **13.82** | **15.42** |
| muted sobre canvas | 4.5:1 | **6.19** | **8.82** |
| muted sobre surface | 4.5:1 | **6.70** | **7.93** |
| accent sobre canvas | 4.5:1 | **6.96** | **9.46** |
| accent sobre surface | 4.5:1 | **7.53** | **8.51** |
| onAccent sobre accentFill | 4.5:1 | **7.53** | **7.91** |
| line sobre canvas | 3.0:1 | **3.06** | **3.51** |
| accentFill sobre canvas | 3.0:1 | **6.96** | **8.06** |

Matiz del acento: claro 141°, oscuro 135° (fuera de la franja 40–70° del amarillo).

**Portada · móvil.** Esquina · ramo · esquina girada 90° en una fila; debajo, la etiqueta centrada con filete de 1 px y relleno de 24/16.

**Portada · escritorio.** Etiqueta a la izquierda (7 columnas, texto alineado a la izquierda) y, a la derecha, el ramo girado −4° entre las dos esquinas.

**Ornamento.** Esquina de laurel (`laurel-esquina`) como marca de cada sección; secciones en bandas de papel/superficie alternas.

**Dibujos.** Ramo (portada); reloj, alfiler de mapa, cámara, percha, regalo, pregunta, auto y sobre en cada sección. Construcción DOne: disco de piedra, sombra plana, figura rellena de tinta y una sola pieza de color, la del acento.

**Foto.** Con foto: arco dentro de la etiqueta. Sin foto: el ramo ocupa la portada con las esquinas.

**Se diferencia por.** Es la única con etiqueta enmarcada y hojas trazadas; Marfil es una ventana sin marco sobre papel liso.

---

## 2. Rosa antiguo

**Concepto.** Una carta lacrada: el sobre se abre, la carta de papel lleva los nombres y el lacre cierra la portada.

**Firma (una sola).** *El sobre que se abre*: el sobre sube (`envelope`), la carta aparece (`rise`) y el sello se estampa al final (`scale`).

**Pareja tipográfica (catálogo).** `crimson-pro` 500/600 (titulares) · `nunito-sans` 400/600 (cuerpo).

**Etiquetas de evento.** anniversary, quinceanera, wedding. **Variante de portada.** `festive` (la foto es un camafeo circular con sombra plana).

### Paleta

| Rol | Claro | Oscuro |
|---|---|---|
| `canvas` | `#FAF1EE` | `#1A1012` |
| `surface` | `#FFFBFA` | `#26181B` |
| `text` | `#2D1D21` | `#F4E6E8` |
| `muted` | `#6B5257` | `#C9B0B5` |
| `accent` | `#8F3550` | `#EBA3B5` |
| `accentFill` | `#8F3550` | `#D98A9F` |
| `onAccent` | `#FFFFFF` | `#2A0E16` |
| `line` | `#978286` | `#84696F` |

| Par | Mín. | Claro | Oscuro |
|---|---|---|---|
| text sobre canvas | 4.5:1 | **14.42** | **15.38** |
| muted sobre canvas | 4.5:1 | **6.36** | **9.20** |
| muted sobre surface | 4.5:1 | **6.88** | **8.43** |
| accent sobre canvas | 4.5:1 | **6.76** | **9.26** |
| accent sobre surface | 4.5:1 | **7.32** | **8.49** |
| onAccent sobre accentFill | 4.5:1 | **7.52** | **6.89** |
| line sobre canvas | 3.0:1 | **3.23** | **3.76** |
| accentFill sobre canvas | 3.0:1 | **6.76** | **7.18** |

Matiz del acento: claro 342°, oscuro 345° (fuera de la franja 40–70° del amarillo).

**Portada · móvil.** Sobre centrado · carta (superficie, filete, texto a la izquierda) · sello de lacre en el acento, redondo, con las iniciales en `onAccent`.

**Portada · escritorio.** Sobre inclinado −6° a la izquierda, carta de 7 columnas en el centro y la rosa a la derecha; el sello debajo, a la derecha de la carta.

**Ornamento.** Ninguno aparte del filete de la carta; el acento vive solo en el sello, la rosa y los botones.

**Dibujos.** Sobre y rosa (portada); reloj, alfiler, cámara, percha, regalo, pregunta, auto y sobre en cada sección. Construcción DOne: disco de piedra, sombra plana, figura rellena de tinta y una sola pieza de color, la del acento.

**Foto.** Con foto: camafeo circular dentro de la carta. Sin foto: la carta lleva solo los nombres.

**Se diferencia por.** La carta sobre el papel y el sello relleno son lo único con una pieza de color grande y redonda.

---

## 3. Editorial

**Concepto.** Una revista: portada a doble página, foto protagonista y los nombres como titular.

**Firma (una sola).** *La página que se da vuelta*: el filete se traza (`draw`) y el titular sube (`rise`).

**Pareja tipográfica (catálogo).** `playfair-display` 600/700 (titulares) · `newsreader` 400/500/600 (cuerpo).

**Etiquetas de evento.** quinceanera, wedding. **Variante de portada.** `editorial` (foto 4:5; desde 900 px la foto ocupa la página izquierda y el titular la derecha).

### Paleta

| Rol | Claro | Oscuro |
|---|---|---|
| `canvas` | `#F3EEE7` | `#151210` |
| `surface` | `#FFFFFF` | `#201B18` |
| `text` | `#1C1815` | `#F1EBE4` |
| `muted` | `#5C524A` | `#B8ABA0` |
| `accent` | `#A3301F` | `#F28D78` |
| `accentFill` | `#A3301F` | `#E8745D` |
| `onAccent` | `#FFFFFF` | `#1F0B07` |
| `line` | `#8B8076` | `#7A6E64` |

| Par | Mín. | Claro | Oscuro |
|---|---|---|---|
| text sobre canvas | 4.5:1 | **15.28** | **15.76** |
| muted sobre canvas | 4.5:1 | **6.59** | **8.32** |
| muted sobre surface | 4.5:1 | **7.61** | **7.61** |
| accent sobre canvas | 4.5:1 | **6.07** | **7.87** |
| accent sobre surface | 4.5:1 | **7.00** | **7.19** |
| onAccent sobre accentFill | 4.5:1 | **7.00** | **6.39** |
| line sobre canvas | 3.0:1 | **3.34** | **3.77** |
| accentFill sobre canvas | 3.0:1 | **6.07** | **6.29** |

Matiz del acento: claro 8°, oscuro 10° (fuera de la franja 40–70° del amarillo).

**Portada · móvil.** Filete corto · foto a ancho completo · titular de 72 px · filete.

**Portada · escritorio.** Doble página: foto a la izquierda, titular de 120 px alineado abajo a la derecha, filetes de 4 columnas arriba y abajo.

**Ornamento.** Filete con un cuadrado de acento.

**Dibujos.** Filete (portada); reloj, alfiler, cámara, percha, regalo, pregunta, auto y sobre en cada sección. Construcción DOne: disco de piedra, sombra plana, figura rellena de tinta y una sola pieza de color, la del acento.

**Foto.** Con foto: protagonista. Sin foto: el titular lleva la página.

**Se diferencia por.** Es la única con foto a página completa y titular de 120 px; sin dibujo en la portada.

---

## 4. Editorial granate

**Concepto.** Un programa de teatro: telón de arcos, marco fino y el itinerario numerado por actos.

**Firma (una sola).** *El telón que se abre*: los arcos se trazan (`draw`), las copas suben y el programa aparece (`fade`).

**Pareja tipográfica (catálogo).** `fraunces` 500/600 (titulares) · `newsreader` 400/500/600 (cuerpo).

**Etiquetas de evento.** anniversary, wedding. **Variante de portada.** `corporate` (foto 4:3 centrada dentro del marco).

### Paleta

| Rol | Claro | Oscuro |
|---|---|---|
| `canvas` | `#F4EFEA` | `#170E10` |
| `surface` | `#FFFDFB` | `#22171A` |
| `text` | `#211719` | `#F3E7E9` |
| `muted` | `#5D5053` | `#C3AEB2` |
| `accent` | `#8A2638` | `#E69AA9` |
| `accentFill` | `#8A2638` | `#D4788A` |
| `onAccent` | `#FFFFFF` | `#2A0C14` |
| `line` | `#8E7E81` | `#836770` |

| Par | Mín. | Claro | Oscuro |
|---|---|---|---|
| text sobre canvas | 4.5:1 | **15.30** | **15.74** |
| muted sobre canvas | 4.5:1 | **6.71** | **9.05** |
| muted sobre surface | 4.5:1 | **7.56** | **8.31** |
| accent sobre canvas | 4.5:1 | **7.61** | **8.64** |
| accent sobre surface | 4.5:1 | **8.57** | **7.93** |
| onAccent sobre accentFill | 4.5:1 | **8.70** | **5.90** |
| line sobre canvas | 3.0:1 | **3.37** | **3.74** |
| accentFill sobre canvas | 3.0:1 | **7.61** | **6.19** |

Matiz del acento: claro 349°, oscuro 348° (fuera de la franja 40–70° del amarillo).

**Portada · móvil.** Telón · copas · programa enmarcado en el acento, centrado · telón de cierre.

**Portada · escritorio.** Telón de 6 columnas, copas centradas, programa de 8 columnas y telón de cierre; todo en un solo eje.

**Ornamento.** Arcos (`arcos`) como telón y como marca de sección; el itinerario usa números romanos en el acento (`display: list`).

**Dibujos.** Copas (portada); reloj, alfiler, cámara, percha, regalo, pregunta, auto y sobre en cada sección. Construcción DOne: disco de piedra, sombra plana, figura rellena de tinta y una sola pieza de color, la del acento.

**Foto.** Con foto: 4:3 dentro del marco. Sin foto: el programa con los nombres.

**Se diferencia por.** Es la única con itinerario en actos romanos y telón; granate frente al rojo de Editorial.

---

## 5. Editorial oliva

**Concepto.** Una mesa de campo: la mesa larga dibujada y la foto montada sobre papel con márgenes amplios.

**Firma (una sola).** *La mesa que se pone*: la mesa sube (`rise`) y el cartón con la foto aparece (`fade`).

**Pareja tipográfica (catálogo).** `newsreader` 400/600 (titulares) · `figtree` 400/500/600 (cuerpo).

**Etiquetas de evento.** birthday, quinceanera, wedding. **Variante de portada.** `minimal` (foto a ancho del cartón).

### Paleta

| Rol | Claro | Oscuro |
|---|---|---|
| `canvas` | `#F4F4EA` | `#12150E` |
| `surface` | `#FFFFFF` | `#1B2015` |
| `text` | `#20241A` | `#E9EDDF` |
| `muted` | `#556047` | `#B0B99F` |
| `accent` | `#4A6A2A` | `#A9CC7B` |
| `accentFill` | `#4A6A2A` | `#9BBF6C` |
| `onAccent` | `#FFFFFF` | `#10170A` |
| `line` | `#7E8A6E` | `#6B775A` |

| Par | Mín. | Claro | Oscuro |
|---|---|---|---|
| text sobre canvas | 4.5:1 | **14.28** | **15.49** |
| muted sobre canvas | 4.5:1 | **6.02** | **9.03** |
| muted sobre surface | 4.5:1 | **6.67** | **8.14** |
| accent sobre canvas | 4.5:1 | **5.60** | **10.19** |
| accent sobre surface | 4.5:1 | **6.20** | **9.18** |
| onAccent sobre accentFill | 4.5:1 | **6.20** | **8.76** |
| line sobre canvas | 3.0:1 | **3.30** | **3.87** |
| accentFill sobre canvas | 3.0:1 | **5.60** | **8.83** |

Matiz del acento: claro 90°, oscuro 86° (fuera de la franja 40–70° del amarillo).

**Portada · móvil.** Mesa a ancho completo · cartón de superficie con filete, relleno de 24 y margen lateral de 16 · copa.

**Portada · escritorio.** Mesa de 7 columnas a la izquierda y cartón de 5 columnas a la derecha; la copa en la esquina inferior.

**Ornamento.** Ninguno: el aire y el cartón son el adorno. Dibujos solo en lugares, regalos y confirmar.

**Dibujos.** Mesa larga y copa de vino (portada); alfiler, regalo y sobre en sus secciones. Construcción DOne: disco de piedra, sombra plana, figura rellena de tinta y una sola pieza de color, la del acento.

**Foto.** Con foto: montada en el cartón con márgenes de 24 a 32 px. Sin foto: el cartón con los nombres.

**Se diferencia por.** Es la más aireada: sin dibujo en las secciones de lectura. Verde oliva frío (matiz 93°, fuera del amarillo).

---

## 6. Bodas de oro

**Concepto.** Cincuenta años: la cifra como medalla, centrada y simétrica.

**Firma (una sola).** *La medalla que se acuña*: la cifra escala (`scale`), el texto sube y la medalla cierra la portada.

**Pareja tipográfica (catálogo).** `cormorant-garamond` 500/600 (titulares) · `dm-sans` 400/500/600 (cuerpo).

**Etiquetas de evento.** golden-wedding. **Variante de portada.** `classic` (foto en arco bajo la cifra).

### Paleta

| Rol | Claro | Oscuro |
|---|---|---|
| `canvas` | `#FBF5EC` | `#1A120C` |
| `surface` | `#FFFEFA` | `#251A12` |
| `text` | `#2A1F17` | `#F4E8DB` |
| `muted` | `#66584B` | `#C4B09C` |
| `accent` | `#8A4A1E` | `#E3A87A` |
| `accentFill` | `#8A4A1E` | `#D08A5A` |
| `onAccent` | `#FFFFFF` | `#1F0F05` |
| `line` | `#9B8573` | `#7F6753` |

| Par | Mín. | Claro | Oscuro |
|---|---|---|---|
| text sobre canvas | 4.5:1 | **14.83** | **15.33** |
| muted sobre canvas | 4.5:1 | **6.33** | **8.84** |
| muted sobre surface | 4.5:1 | **6.79** | **8.13** |
| accent sobre canvas | 4.5:1 | **6.29** | **8.94** |
| accent sobre surface | 4.5:1 | **6.76** | **8.22** |
| onAccent sobre accentFill | 4.5:1 | **6.82** | **6.61** |
| line sobre canvas | 3.0:1 | **3.23** | **3.49** |
| accentFill sobre canvas | 3.0:1 | **6.29** | **6.57** |

Matiz del acento: claro 24°, oscuro 26° (fuera de la franja 40–70° del amarillo).

**Portada · móvil.** Cifra 50 a ancho completo · filete · nombres centrados · medalla.

**Portada · escritorio.** Eje central: cifra de 4 columnas, filete, nombres de 8 columnas y medalla.

**Ornamento.** Filete bajo la cifra; la cifra y la medalla llevan el cobre como única pieza de color.

**Dibujos.** Cifra 50 y medalla (portada); reloj, alfiler, cámara, percha, medalla en regalos, pregunta y sobre. Construcción DOne: disco de piedra, sombra plana, figura rellena de tinta y una sola pieza de color, la del acento.

**Foto.** Con foto: arco bajo la cifra. Sin foto: la cifra es la protagonista.

**Se diferencia por.** La cifra grande centrada; cobre oscuro sin amarillo (matiz 25°).

---

## 7. Bodas de plata

**Concepto.** Veinticinco años: el laurel y la cifra en azul acero, con la composición asimétrica.

**Firma (una sola).** *El laurel que se traza*: el laurel se dibuja (`draw`) y la cifra escala.

**Pareja tipográfica (catálogo).** `cormorant` 500/600 (titulares) · `source-sans-3` 400/500/600 (cuerpo).

**Etiquetas de evento.** silver-wedding. **Variante de portada.** `editorial` (foto 4:5; desde 900 px, foto a la izquierda y texto a la derecha dentro de sus 7 columnas).

### Paleta

| Rol | Claro | Oscuro |
|---|---|---|
| `canvas` | `#F3F6F9` | `#0E141B` |
| `surface` | `#FFFFFF` | `#161E27` |
| `text` | `#17202A` | `#E6ECF2` |
| `muted` | `#4C5967` | `#A9B6C4` |
| `accent` | `#35567A` | `#9EC0E6` |
| `accentFill` | `#35567A` | `#86AEDB` |
| `onAccent` | `#FFFFFF` | `#0B1520` |
| `line` | `#8190A0` | `#627386` |

| Par | Mín. | Claro | Oscuro |
|---|---|---|---|
| text sobre canvas | 4.5:1 | **15.17** | **15.55** |
| muted sobre canvas | 4.5:1 | **6.60** | **8.97** |
| muted sobre surface | 4.5:1 | **7.16** | **8.15** |
| accent sobre canvas | 4.5:1 | **7.01** | **9.82** |
| accent sobre surface | 4.5:1 | **7.60** | **8.92** |
| onAccent sobre accentFill | 4.5:1 | **7.60** | **7.96** |
| line sobre canvas | 3.0:1 | **3.01** | **3.80** |
| accentFill sobre canvas | 3.0:1 | **7.01** | **8.01** |

Matiz del acento: claro 211°, oscuro 212° (fuera de la franja 40–70° del amarillo).

**Portada · móvil.** Cifra 25 a la izquierda · laurel · nombres alineados a la izquierda en 48 px.

**Portada · escritorio.** Nombres de 72 px a la izquierda y la cifra a la derecha; el laurel centrado debajo.

**Ornamento.** Laurel como dibujo; las marcas de sección van a la derecha (columna 4).

**Dibujos.** Cifra 25 y laurel (portada); reloj, alfiler, cámara, percha, regalo, pregunta y sobre. Construcción DOne: disco de piedra, sombra plana, figura rellena de tinta y una sola pieza de color, la del acento.

**Foto.** Con foto: 4:5 bajo el laurel, alineada a la izquierda con el texto. Sin foto: la cifra y los nombres.

**Se diferencia por.** Es la asimétrica del grupo; Oro es simétrica y cálida, Plata es fría y alineada a la izquierda.

---

## 8. Pedida de mano

**Concepto.** Una pregunta con respuesta: la caja del anillo se abre en la portada.

**Firma (una sola).** *La caja que se abre*: la caja entra con `envelope` y la rosa y el solitario aparecen después (`fade`).

**Pareja tipográfica (catálogo).** `gilda-display` 400 (titulares) · `nunito-sans` 400/600 (cuerpo).

**Etiquetas de evento.** engagement. **Variante de portada.** `minimal` (foto a ancho completo).

### Paleta

| Rol | Claro | Oscuro |
|---|---|---|
| `canvas` | `#F7F4FA` | `#14111C` |
| `surface` | `#FFFFFF` | `#1E1928` |
| `text` | `#241C2E` | `#EDE8F5` |
| `muted` | `#5E5470` | `#B7AECA` |
| `accent` | `#5B4B8A` | `#B9ABE6` |
| `accentFill` | `#5B4B8A` | `#A394DB` |
| `onAccent` | `#FFFFFF` | `#130E22` |
| `line` | `#8C82A0` | `#71678C` |

| Par | Mín. | Claro | Oscuro |
|---|---|---|---|
| text sobre canvas | 4.5:1 | **15.05** | **15.50** |
| muted sobre canvas | 4.5:1 | **6.47** | **8.81** |
| muted sobre surface | 4.5:1 | **7.05** | **8.10** |
| accent sobre canvas | 4.5:1 | **6.84** | **8.90** |
| accent sobre surface | 4.5:1 | **7.45** | **8.19** |
| onAccent sobre accentFill | 4.5:1 | **7.45** | **7.02** |
| line sobre canvas | 3.0:1 | **3.31** | **3.57** |
| accentFill sobre canvas | 3.0:1 | **6.84** | **6.94** |

Matiz del acento: claro 255°, oscuro 254° (fuera de la franja 40–70° del amarillo).

**Portada · móvil.** Caja del anillo grande · texto íntimo a la izquierda en 48 px · rosa pequeña.

**Portada · escritorio.** Caja de 6 columnas a la izquierda, texto de 4 columnas a la derecha, rosa y solitario en la columna 12.

**Ornamento.** Sin ornamento: un solo objeto grande y dos piezas pequeñas.

**Dibujos.** Caja de anillo, rosa y solitario (portada); regalo y sobre en sus secciones. Construcción DOne: disco de piedra, sombra plana, figura rellena de tinta y una sola pieza de color, la del acento.

**Foto.** Con foto: a ancho del texto bajo la caja. Sin foto: la caja ocupa la portada.

**Se diferencia por.** Un único objeto protagonista; violeta frío y Gilda Display.

---
