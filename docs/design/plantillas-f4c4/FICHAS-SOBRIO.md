# Fichas de personalidad · grupo sobrio (F4 c4)

> Siete plantillas como documentos de diseño v2. Los archivos viven en `packages/celebration-theme/src/design/documents/` y, con los mismos bytes, en `seeds/templates/design-v2/` del backend; `scripts/design-documents/sobrio.py` los genera y los comprueba (reutiliza el constructor de `bodas.py`). Cada plantilla conserva la `key` y el id determinista de su semilla v1 (P20).

**Reglas comunes aplicadas:** papel, tinta y aire; el acento solo en piezas pequeñas; sin degradados ni bandas saturadas; sin antetítulo en mayúsculas; sin píldora de cuenta atrás ni bloque de cuenta atrás; sin amarillo (ningún acento ni línea entre 40° y 70° de matiz); sin caras; el botón «Ver regalos» lo pone el dock del renderizador y cada documento tiene además su bloque de regalos (`giftsCta`, obligatorio) hacia `/c/{slug}/regalos`. Animación dentro del contrato 1.2.0 (`fade`, `rise`, `scale`, `draw`), una sola vez, sin bucles. El ornamento del documento solo admite `none`, `flourish` o `rule` en el contrato; los adornos de onda, banderines y filete son dibujos de la biblioteca.

## 1. Minimalista

**Concepto.** Papel y una línea: el titular es el único protagonista y la portada tiene un solo objeto, un filete que se traza.

**Firma (una sola).** Las líneas que se trazan: el filete se dibuja (`draw`) bajo el titular, que entra con `fade`.

**Pareja tipográfica (catálogo).** `spectral` 400/500 (titulares) · `geist` 400/500/600 (cuerpo)

**Etiquetas de evento.** anniversary, baptism, birthday, quinceanera, wedding. **Variante de portada.** `minimal` (la foto, si existe, va a ancho completo sobre el titular).

### Paleta

| Rol | Claro | Oscuro |
|---|---|---|
| `canvas` | `#FBFAF7` | `#121413` |
| `surface` | `#FFFFFF` | `#1A1D1B` |
| `text` | `#161616` | `#EDEDE8` |
| `muted` | `#5A5A56` | `#A9ABA5` |
| `accent` | `#2F5D50` | `#8FC4B0` |
| `accentFill` | `#2F5D50` | `#7DB7A2` |
| `onAccent` | `#FFFFFF` | `#0C1511` |
| `line` | `#898989` | `#6B716D` |

| Par | Mín. | Claro | Oscuro |
|---|---|---|---|
| text sobre canvas | 4.5:1 | **17.34** | **15.75** |
| muted sobre canvas | 4.5:1 | **6.64** | **7.98** |
| muted sobre surface | 4.5:1 | **6.93** | **7.33** |
| accent sobre canvas | 4.5:1 | **7.18** | **9.42** |
| accent sobre surface | 4.5:1 | **7.49** | **8.65** |
| onAccent sobre accentFill | 4.5:1 | **7.49** | **8.11** |
| line sobre canvas | 3.0:1 | **3.35** | **3.71** |
| accentFill sobre canvas | 3.0:1 | **7.18** | **8.08** |

Matiz del acento: claro 163°, oscuro 157° (fuera de la franja 40–70° del amarillo).

**Composición.** Móvil: titular a 72 px (fluido) y, debajo, el filete a 3 columnas. Escritorio: titular en 9 columnas y el filete a 4 columnas.

**Ornamento.** Ninguno (`ornament: none`): sin ornamento entre secciones, solo aire y títulos.

**Dibujos.** Un único dibujo en todo el documento: el filete de la portada. Sin dibujos en las secciones. Construcción DOne: disco de piedra, sombra plana, figura rellena de tinta y una sola pieza de color, la del acento.

**Foto.** Con foto: la foto a ancho completo sobre el titular. Sin foto: titular y línea.

**Se diferencia por.** Es la única sin un solo dibujo de sección y con un solo objeto en la portada; Otros eventos y Editorial llevan postal o filete con adorno.

---

## 2. Arena y terracota

**Concepto.** Cerámica: una taza sobre su plato, ondas de esmalte y una sans geométrica sobre arena cálida.

**Firma (una sola).** *La taza que asienta*: la onda se traza (`draw`), la taza aparece (`scale`) y la tarjeta con los nombres llega al final (`rise`).

**Pareja tipográfica (catálogo).** `jost` 400/500 (titulares) · `dm-sans` 400/500/600 (cuerpo)

**Etiquetas de evento.** anniversary, baptism, birthday, wedding. **Variante de portada.** `classic` (foto en arco, como la boca de un cuenco).

### Paleta

| Rol | Claro | Oscuro |
|---|---|---|
| `canvas` | `#F6EEE3` | `#1C1511` |
| `surface` | `#FFFBF5` | `#261D17` |
| `text` | `#2A211B` | `#F3E8DC` |
| `muted` | `#66564A` | `#C7B4A3` |
| `accent` | `#A2431F` | `#E8996F` |
| `accentFill` | `#A2431F` | `#D98558` |
| `onAccent` | `#FFFFFF` | `#230E04` |
| `line` | `#957F6D` | `#8A7461` |

| Par | Mín. | Claro | Oscuro |
|---|---|---|---|
| text sobre canvas | 4.5:1 | **13.71** | **14.93** |
| muted sobre canvas | 4.5:1 | **6.10** | **9.00** |
| muted sobre surface | 4.5:1 | **6.80** | **8.25** |
| accent sobre canvas | 4.5:1 | **5.44** | **7.91** |
| accent sobre surface | 4.5:1 | **6.06** | **7.25** |
| onAccent sobre accentFill | 4.5:1 | **6.25** | **6.55** |
| line sobre canvas | 3.0:1 | **3.30** | **4.08** |
| accentFill sobre canvas | 3.0:1 | **5.44** | **6.39** |

Matiz del acento: claro 16°, oscuro 21° (fuera de la franja 40–70° del amarillo).

**Composición.** Móvil: onda, taza centrada y la tarjeta redondeada de 24 px. Escritorio: la taza a la izquierda (4 columnas), la tarjeta a la derecha (8) y la onda como base.

**Ornamento.** Onda (`onda`) como cabecera de cada sección.

**Dibujos.** Tazas (portada); onda; reloj, alfiler de mapa, cámara, percha, regalo, pregunta, auto y sobre en las secciones. Construcción DOne: disco de piedra, sombra plana, figura rellena de tinta y una sola pieza de color, la del acento.

**Foto.** Con foto: arco dentro de la tarjeta redondeada. Sin foto: taza y tarjeta.

**Se diferencia por.** Es la única con tarjeta de esquinas redondeadas de 24 px, taza y onda; Jardín botánico usa etiqueta recta con hojas.

---

## 3. Corporativo

**Concepto.** Credencial de evento: una grilla clara con los datos al frente, la credencial con su cordón y una sola línea azul.

**Firma (una sola).** *La credencial que se entrega*: la credencial sube (`rise`), la tarjeta aparece (`fade`) y el filete se traza al final (`draw`).

**Pareja tipográfica (catálogo).** `work-sans` 500/600 (titulares) · `work-sans` 400/500/600 (cuerpo)

**Etiquetas de evento.** corporate. **Variante de portada.** `corporate` (foto 4:3 sobre el titular).

### Paleta

| Rol | Claro | Oscuro |
|---|---|---|
| `canvas` | `#F5F7FA` | `#0C1219` |
| `surface` | `#FFFFFF` | `#141C26` |
| `text` | `#14202E` | `#E6ECF3` |
| `muted` | `#4B5A6B` | `#A5B3C3` |
| `accent` | `#1F5FAD` | `#7FB2EE` |
| `accentFill` | `#1F5FAD` | `#6AA3E6` |
| `onAccent` | `#FFFFFF` | `#07111D` |
| `line` | `#7D8B9B` | `#617386` |

| Par | Mín. | Claro | Oscuro |
|---|---|---|---|
| text sobre canvas | 4.5:1 | **15.34** | **15.82** |
| muted sobre canvas | 4.5:1 | **6.58** | **8.81** |
| muted sobre surface | 4.5:1 | **7.06** | **8.04** |
| accent sobre canvas | 4.5:1 | **5.93** | **8.52** |
| accent sobre surface | 4.5:1 | **6.37** | **7.77** |
| onAccent sobre accentFill | 4.5:1 | **6.37** | **7.22** |
| line sobre canvas | 3.0:1 | **3.24** | **3.86** |
| accentFill sobre canvas | 3.0:1 | **5.93** | **7.16** |

Matiz del acento: claro 213°, oscuro 212° (fuera de la franja 40–70° del amarillo).

**Composición.** Móvil: credencial, tarjeta con filete fino de 44 px y línea. Escritorio: tarjeta de 8 columnas a la izquierda y credencial de 3 a la derecha, con la línea bajo la tarjeta.

**Ornamento.** Regla (`rule`) fina; secciones en papel liso.

**Dibujos.** Credencial (portada); reloj, alfiler de mapa, regalo y sobre en las secciones de agenda, lugares, regalos y confirmación. Construcción DOne: disco de piedra, sombra plana, figura rellena de tinta y una sola pieza de color, la del acento.

**Foto.** Con foto: 4:3 dentro de la tarjeta. Sin foto: la credencial ocupa el lugar.

**Se diferencia por.** Es la única con credencial y tarjeta con filete; Corporativo grafito pone el titular a ancho completo y la agenda numerada.

---

## 4. Corporativo grafito

**Concepto.** Informe anual: el titular manda, la agenda va primero y numerada y el verde azulado solo marca una pieza pequeña sobre grafito.

**Firma (una sola).** *La regla que abre el informe*: el filete se traza (`draw`) a todo el ancho, el titular sube (`rise`) y la libreta aparece al final (`fade`).

**Pareja tipográfica (catálogo).** `manrope` 600/700 (titulares) · `karla` 400/500/600 (cuerpo)

**Etiquetas de evento.** corporate. **Variante de portada.** `corporate`.

### Paleta

| Rol | Claro | Oscuro |
|---|---|---|
| `canvas` | `#F4F5F6` | `#0F1113` |
| `surface` | `#FFFFFF` | `#181B1E` |
| `text` | `#17191C` | `#E8EAEC` |
| `muted` | `#52585E` | `#A8AEB4` |
| `accent` | `#0B6E6A` | `#5FC4BE` |
| `accentFill` | `#0B6E6A` | `#4DB5AE` |
| `onAccent` | `#FFFFFF` | `#05191A` |
| `line` | `#80878D` | `#687077` |

| Par | Mín. | Claro | Oscuro |
|---|---|---|---|
| text sobre canvas | 4.5:1 | **16.14** | **15.69** |
| muted sobre canvas | 4.5:1 | **6.60** | **8.45** |
| muted sobre surface | 4.5:1 | **7.20** | **7.72** |
| accent sobre canvas | 4.5:1 | **5.57** | **9.12** |
| accent sobre surface | 4.5:1 | **6.08** | **8.34** |
| onAccent sobre accentFill | 4.5:1 | **6.08** | **7.36** |
| line sobre canvas | 3.0:1 | **3.34** | **3.76** |
| accentFill sobre canvas | 3.0:1 | **5.57** | **7.69** |

Matiz del acento: claro 178°, oscuro 176° (fuera de la franja 40–70° del amarillo).

**Composición.** Móvil: regla, titular a 68 px (fluido) en negrita y libreta a la derecha. Escritorio: regla a 12 columnas, titular a ancho completo y libreta en la esquina inferior.

**Ornamento.** Regla (`rule`); secciones en bandas alternas de papel y superficie; la agenda con actos numerados en romano (`display: list`).

**Dibujos.** Libreta (portada) y el filete; sin dibujos en las secciones: datos, no adorno. Construcción DOne: disco de piedra, sombra plana, figura rellena de tinta y una sola pieza de color, la del acento.

**Foto.** Con foto: 4:3 bajo la regla. Sin foto: titular y libreta.

**Se diferencia por.** Es la única con la agenda primero y numerada y el titular a todo el ancho.

---

## 5. Inauguración

**Concepto.** Tijera y cinta: la cinta cruza la portada y la tijera la corta; el naranja quemado marca la apertura.

**Firma (una sola).** *El corte de la cinta*: la tijera aparece (`scale`), la cinta se traza (`draw`) y el titular llega (`rise`).

**Pareja tipográfica (catálogo).** `manrope` 600/700 (titulares) · `source-sans-3` 400/500/600 (cuerpo)

**Etiquetas de evento.** opening. **Variante de portada.** `classic` (foto en arco como una puerta que se abre).

### Paleta

| Rol | Claro | Oscuro |
|---|---|---|
| `canvas` | `#F8F6F3` | `#17120F` |
| `surface` | `#FFFFFF` | `#211A15` |
| `text` | `#1E1A17` | `#F3EBE4` |
| `muted` | `#5C5249` | `#C4B6A9` |
| `accent` | `#B03F00` | `#F0A07A` |
| `accentFill` | `#B03F00` | `#E88A5C` |
| `onAccent` | `#FFFFFF` | `#230D03` |
| `line` | `#8E8378` | `#887A6E` |

| Par | Mín. | Claro | Oscuro |
|---|---|---|---|
| text sobre canvas | 4.5:1 | **16.02** | **15.77** |
| muted sobre canvas | 4.5:1 | **7.06** | **9.39** |
| muted sobre surface | 4.5:1 | **7.61** | **8.67** |
| accent sobre canvas | 4.5:1 | **5.47** | **8.86** |
| accent sobre surface | 4.5:1 | **5.90** | **8.19** |
| onAccent sobre accentFill | 4.5:1 | **5.90** | **7.27** |
| line sobre canvas | 3.0:1 | **3.43** | **4.47** |
| accentFill sobre canvas | 3.0:1 | **5.47** | **7.28** |

Matiz del acento: claro 21°, oscuro 19° (fuera de la franja 40–70° del amarillo).

**Composición.** Móvil: tijera, cinta y titular centrado a 48 px. Escritorio: cinta a todo el ancho, titular a la izquierda (7 columnas), tijera a la derecha y la llave entre ambos.

**Ornamento.** Regla (`rule`); cabeceras con dibujos solo en lugares, regalos y confirmación.

**Dibujos.** Tijera con cinta, llave (portada); alfiler de mapa, regalo y sobre en las secciones. Construcción DOne: disco de piedra, sombra plana, figura rellena de tinta y una sola pieza de color, la del acento.

**Foto.** Con foto: arco como puerta. Sin foto: tijera y cinta ocupan la portada.

**Se diferencia por.** Es la única con la cinta que cruza la portada y la tijera en el acento.

---

## 6. Fiesta patronal

**Concepto.** Entrada de fraternidad: banderines en lo alto, la máscara de morenada al centro y un magenta profundo en una sola pieza de cada dibujo.

**Firma (una sola).** *La entrada que llega*: los banderines se trazan (`draw`), la máscara sube (`rise`) y la tarjeta con el nombre aparece (`fade`).

**Pareja tipográfica (catálogo).** `playfair-display` 600/700 (titulares) · `figtree` 400/500/600 (cuerpo)

**Etiquetas de evento.** patronal-feast. **Variante de portada.** `festive` (foto circular con sombra plana).

### Paleta

| Rol | Claro | Oscuro |
|---|---|---|
| `canvas` | `#FFF7EC` | `#1B0F17` |
| `surface` | `#FFFFFF` | `#261822` |
| `text` | `#2B1622` | `#F8E9F0` |
| `muted` | `#634854` | `#CDB1C0` |
| `accent` | `#8E2D6B` | `#E79ACB` |
| `accentFill` | `#8E2D6B` | `#D681B7` |
| `onAccent` | `#FFFFFF` | `#2A0A1F` |
| `line` | `#957C8A` | `#917182` |

| Par | Mín. | Claro | Oscuro |
|---|---|---|---|
| text sobre canvas | 4.5:1 | **15.93** | **15.88** |
| muted sobre canvas | 4.5:1 | **7.65** | **9.44** |
| muted sobre surface | 4.5:1 | **8.12** | **8.61** |
| accent sobre canvas | 4.5:1 | **7.22** | **8.77** |
| accent sobre surface | 4.5:1 | **7.67** | **7.99** |
| onAccent sobre accentFill | 4.5:1 | **7.67** | **6.61** |
| line sobre canvas | 3.0:1 | **3.58** | **4.34** |
| accentFill sobre canvas | 3.0:1 | **7.22** | **6.82** |

Matiz del acento: claro 322°, oscuro 322° (fuera de la franja 40–70° del amarillo).

**Composición.** Móvil: banderines, máscara y tarjeta de 48 px. Escritorio: banderines a todo el ancho, tarjeta de 7 columnas, máscara de 3 y bombo de 2.

**Ornamento.** Banderines (`banderin`) como cabecera de cada sección; son figuras rellenas de tinta con un solo banderín en el acento.

**Dibujos.** Máscara de morenada, bombo y banderines (portada); reloj, alfiler de mapa, cámara, percha, regalo, pregunta, auto y sobre en las secciones. Construcción DOne: disco de piedra, sombra plana, figura rellena de tinta y una sola pieza de color, la del acento.

**Foto.** Con foto: círculo con sombra plana en la tarjeta. Sin foto: la máscara ocupa la portada.

**Se diferencia por.** Es la única con banderines y máscara; Piñata usa globos y piñata infantiles.

---

## 7. Otros eventos

**Concepto.** Una postal en blanco para cualquier celebración: nombres centrados, una serif de lectura y un índigo apagado.

**Firma (una sola).** *La postal que llega*: el filete se traza (`draw`), los nombres aparecen (`fade`) y la postal sube (`rise`).

**Pareja tipográfica (catálogo).** `newsreader` 400/600 (titulares) · `figtree` 400/500/600 (cuerpo)

**Etiquetas de evento.** other. **Variante de portada.** `editorial` (foto a ancho completo; doble página desde 900 px).

### Paleta

| Rol | Claro | Oscuro |
|---|---|---|
| `canvas` | `#F9F9F7` | `#111216` |
| `surface` | `#FFFFFF` | `#1A1C21` |
| `text` | `#1B1C1E` | `#E9EAEE` |
| `muted` | `#55575C` | `#AEB1BA` |
| `accent` | `#4F5D95` | `#A9B5EE` |
| `accentFill` | `#4F5D95` | `#97A5E6` |
| `onAccent` | `#FFFFFF` | `#0C1030` |
| `line` | `#8A8C93` | `#6E727C` |

| Par | Mín. | Claro | Oscuro |
|---|---|---|---|
| text sobre canvas | 4.5:1 | **16.18** | **15.57** |
| muted sobre canvas | 4.5:1 | **6.86** | **8.73** |
| muted sobre surface | 4.5:1 | **7.23** | **7.95** |
| accent sobre canvas | 4.5:1 | **5.98** | **9.39** |
| accent sobre surface | 4.5:1 | **6.30** | **8.55** |
| onAccent sobre accentFill | 4.5:1 | **6.30** | **7.81** |
| line sobre canvas | 3.0:1 | **3.19** | **3.89** |
| accentFill sobre canvas | 3.0:1 | **5.98** | **7.88** |

Matiz del acento: claro 228°, oscuro 230° (fuera de la franja 40–70° del amarillo).

**Composición.** Móvil: postal, nombres centrados a 52 px y filete. Escritorio: filete, nombres a 96 px en 8 columnas y la postal bajo ellos.

**Ornamento.** Regla (`rule`); secciones en papel liso con una postal solo en regalos y confirmación.

**Dibujos.** Postal (portada) y filete; sobre y regalo en las secciones de confirmación y regalos. Construcción DOne: disco de piedra, sombra plana, figura rellena de tinta y una sola pieza de color, la del acento.

**Foto.** Con foto: doble página desde 900 px. Sin foto: los nombres y la postal.

**Se diferencia por.** Es la única con postal y composición centrada y neutra; Minimalista no lleva dibujos de sección.

---

## Aproximaciones dentro del contrato (preguntas para Pablo)

1. **Cuencos de cerámica.** La biblioteca de dibujos no tiene cuencos: Arena y terracota usa tazas y la onda. Un cuenco y un jarrón exigirían ampliar el catálogo de dibujos (pregunta 13 ya abierta).
2. **Tamaño y alineación de la portada.** El tamaño del titular es uno solo por elemento (el del lienzo móvil; el del escritorio no se lee) y las variantes `corporate` y `classic` centran la portada, de modo que el titular grande y alineado a la izquierda de Minimalista y de Corporativo grafito es una aproximación. Un tamaño y una alineación por lienzo lo resolverían.
3. **Ornamento del documento.** El esquema solo admite `none`, `flourish` y `rule`; los demás adornos (onda, banderines, filete) entran como dibujos de cabecera.
4. **Minimalista sin recomendaciones, Corporativo sin galería.** Cada plantilla conserva la lista de secciones de su semilla v1 (Minimalista no incluye recomendaciones ni código de vestimenta; Corporativo y Grafito no incluyen galería). ¿Se añaden?
5. **Fotos sobre texto.** Ningún documento pone texto sobre la foto; la foto va siempre en su propio bloque.
