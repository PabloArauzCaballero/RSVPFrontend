# Fichas de personalidad · grupo infantil y de ritos (F4 c3)

> Cinco plantillas como documentos de diseño v2: Cielo de bautizo, Menta infantil, Baby shower, Primera comunión y Graduación. Los archivos viven en `packages/celebration-theme/src/design/documents/` y, con los mismos bytes, en `seeds/templates/design-v2/` del backend; `scripts/design-documents/infantil-ritos.py` los genera y los comprueba. Cada plantilla conserva la `key`, el nombre, los tipos de evento y las secciones de su semilla de F4 PR a, y el id determinista (`uuid5` de la `key`, P20).

**Reglas comunes aplicadas:** papel, tinta y aire; el acento solo en piezas pequeñas (el objeto dibujado, el botón, el filete); sin degradados ni bandas saturadas; sin antetítulo en mayúsculas ni píldora de cuenta atrás; sin amarillo (ningún acento ni línea entre 40° y 70° de matiz); sin caras; el botón «Ver regalos» lo pone el dock del renderizador y cada documento tiene además su bloque de regalos (`giftsCta`, obligatorio). Animación dentro del contrato 1.2.0 (`fade`, `rise`, `scale`, `draw`, `envelope`), una sola vez, sin bucles; con «reducir movimiento» todo aparece en su estado final.

## 1. Cielo de bautizo

**Concepto.** Nubes de papel y paloma: dos nubes de filete ondulado abren la portada, la paloma se traza en el acento y el título redondeado queda en una tarjeta de línea fina.

**Firma (una sola).** *La paloma que se traza*: las dos nubes se dibujan (`draw`), la paloma las sigue y el título sube al final (`rise`). Una sola vez.

**Pareja tipográfica (catálogo).** `nunito` 600/700 (titulares, redondeada serena) · `nunito-sans` 400/600 (cuerpo).

**Etiquetas de evento.** baptism. **Variante de portada.** `classic` (foto en arco: una ventana al cielo dentro de la tarjeta).

### Paleta

| Rol | Claro | Oscuro |
|---|---|---|
| `canvas` | `#F2F7FC` | `#0B1520` |
| `surface` | `#FFFFFF` | `#132130` |
| `text` | `#1B2733` | `#E6EEF7` |
| `muted` | `#4F6072` | `#A9BACB` |
| `accent` | `#2A6496` | `#9CC6EF` |
| `accentFill` | `#2A6496` | `#86B5E4` |
| `onAccent` | `#FFFFFF` | `#0A1626` |
| `line` | `#7790A8` | `#5F7790` |

| Par | Mín. | Claro | Oscuro |
|---|---|---|---|
| text sobre canvas | 4.5 | **14.07** | **15.70** |
| text sobre surface | 4.5 | **15.17** | **13.93** |
| muted sobre canvas | 4.5 | **6.00** | **9.26** |
| muted sobre surface | 4.5 | **6.46** | **8.21** |
| accent sobre canvas | 4.5 | **5.80** | **10.27** |
| accent sobre surface | 4.5 | **6.25** | **9.11** |
| onAccent sobre accentFill | 4.5 | **6.25** | **8.43** |
| line sobre canvas | 3.0 | **3.07** | **3.96** |
| line sobre surface | 3.0 | **3.31** | **3.52** |
| accentFill sobre canvas | 3.0 | **5.80** | **8.53** |

Matiz del acento: claro 208°, oscuro 210° (fuera de la franja 40–70° del amarillo). Medido con el mismo algoritmo WCAG del validador del BE y repetido en el DOM por Playwright.

**Portada · móvil.** Nube alta, nube baja desplazada una columna, la paloma centrada y debajo la tarjeta del título centrada con filete de 1 px; una tercera nube cierra la portada.

**Portada · escritorio.** Una nube en cada borde superior; título a la izquierda (7 columnas, alineado al inicio, tarjeta con filete) y la paloma girada −6° a la derecha, con la nube larga debajo.

**Ornamento.** `onda` (filete ondulado) como nube y como separador de cada sección; secciones en bandas de papel/superficie.

**Dibujos.** Paloma y nubes (portada); regalo en la sección de regalos, sobre en la de confirmar, y el resto de objetos comunes. Construcción DOne: disco de piedra, sombra plana, figura rellena de tinta y una sola pieza de color, la del acento.

**Foto.** Con foto: arco dentro de la tarjeta, bajo las nubes. Sin foto: la paloma ocupa el lugar.

**Se diferencia por.** Es la única con nubes de filete, tarjeta con título centrado en móvil y el azul cielo (208°); Primera comunión es violeta y Graduación azul marino.

---

## 2. Menta infantil

**Concepto.** Juguetes de madera sobre el piso: el tren cruza la portada, los globos suben a un lado y el título va en una tarjeta de esquinas muy redondas.

**Firma (una sola).** *El tren que llega*: el tren se traza (`draw`) y la tarjeta sube (`rise`); los globos se inflan al final (`scale`).

**Pareja tipográfica (catálogo).** `fredoka` 500/600 (titulares, redonda y gruesa como un juguete) · `mulish` 400/600 (cuerpo).

**Etiquetas de evento.** baptism, birthday. **Variante de portada.** `festive` (foto en disco con sombra plana: el ojo de buey del tren).

### Paleta

| Rol | Claro | Oscuro |
|---|---|---|
| `canvas` | `#F0FAF6` | `#08161A` |
| `surface` | `#FFFFFF` | `#0F2429` |
| `text` | `#142822` | `#E2F3EF` |
| `muted` | `#4A6158` | `#A1C1BA` |
| `accent` | `#0C7566` | `#7ED3C0` |
| `accentFill` | `#0C7566` | `#66C2AD` |
| `onAccent` | `#FFFFFF` | `#06201A` |
| `line` | `#6E8F85` | `#4F7771` |

| Par | Mín. | Claro | Oscuro |
|---|---|---|---|
| text sobre canvas | 4.5 | **14.53** | **16.05** |
| text sobre surface | 4.5 | **15.48** | **14.03** |
| muted sobre canvas | 4.5 | **6.27** | **9.52** |
| muted sobre surface | 4.5 | **6.68** | **8.32** |
| accent sobre canvas | 4.5 | **5.25** | **10.50** |
| accent sobre surface | 4.5 | **5.60** | **9.17** |
| onAccent sobre accentFill | 4.5 | **5.60** | **8.04** |
| line sobre canvas | 3.0 | **3.32** | **3.69** |
| line sobre surface | 3.0 | **3.54** | **3.23** |
| accentFill sobre canvas | 3.0 | **5.25** | **8.67** |

Matiz del acento: claro 171°, oscuro 167° (fuera de la franja 40–70° del amarillo). Medido con el mismo algoritmo WCAG del validador del BE y repetido en el DOM por Playwright.

**Portada · móvil.** Los globos arriba al centro, la tarjeta del título centrada con radio 28 y, debajo, el tren a todo el ancho.

**Portada · escritorio.** Tren a la izquierda (5 columnas), tarjeta del título en el centro (5 columnas, alineada al inicio) y los globos a la derecha.

**Ornamento.** Sin ornamento fijo (`none`): cada sección se encabeza con su objeto dibujado, a la izquierda; secciones en tarjetas.

**Dibujos.** Tren y globos (portada); el objeto de cada sección con la construcción DOne. Construcción DOne: disco de piedra, sombra plana, figura rellena de tinta y una sola pieza de color, la del acento.

**Foto.** Con foto: disco de 16 rem con sombra plana dentro de la tarjeta. Sin foto: la tarjeta y el tren bastan.

**Se diferencia por.** Es la única con tarjeta de esquinas muy redondas, el tren como protagonista y el verde menta oscuro (171°).

---

## 3. Baby shower

**Concepto.** Sonajero y cochecito: un ciruela claro que no es ni rosa ni azul, formas suaves y un cochecito que entra empujado por el borde de la portada.

**Firma (una sola).** *El cochecito que entra*: el título sube (`rise`), el sonajero se traza (`draw`) y el cochecito aparece (`rise`) al final.

**Pareja tipográfica (catálogo).** `quicksand` 600/700 (titulares, redonda y fina) · `nunito` 400/600 (cuerpo).

**Etiquetas de evento.** baby-shower. **Variante de portada.** `minimal` (foto rectangular sin marco, al ras del texto).

### Paleta

| Rol | Claro | Oscuro |
|---|---|---|
| `canvas` | `#FBF6F9` | `#190F16` |
| `surface` | `#FFFFFF` | `#25171F` |
| `text` | `#2A1B25` | `#F7E8F0` |
| `muted` | `#68525E` | `#CDB0C0` |
| `accent` | `#A3406F` | `#F0A1C3` |
| `accentFill` | `#A3406F` | `#E183AC` |
| `onAccent` | `#FFFFFF` | `#2C0B1B` |
| `line` | `#9A8190` | `#86667A` |

| Par | Mín. | Claro | Oscuro |
|---|---|---|---|
| text sobre canvas | 4.5 | **15.33** | **15.84** |
| text sobre surface | 4.5 | **16.38** | **14.54** |
| muted sobre canvas | 4.5 | **6.65** | **9.42** |
| muted sobre surface | 4.5 | **7.10** | **8.65** |
| accent sobre canvas | 4.5 | **5.58** | **9.45** |
| accent sobre surface | 4.5 | **5.97** | **8.67** |
| onAccent sobre accentFill | 4.5 | **5.97** | **6.87** |
| line sobre canvas | 3.0 | **3.32** | **3.74** |
| line sobre surface | 3.0 | **3.55** | **3.44** |
| accentFill sobre canvas | 3.0 | **5.58** | **7.17** |

Matiz del acento: claro 332°, oscuro 334° (fuera de la franja 40–70° del amarillo). Medido con el mismo algoritmo WCAG del validador del BE y repetido en el DOM por Playwright.

**Portada · móvil.** Título alineado al inicio sin caja; debajo, en una fila, el sonajero girado −8° y el cochecito en tres columnas.

**Portada · escritorio.** Título a la izquierda (6 columnas), el cochecito en el centro (4) y el sonajero girado −8° a la derecha.

**Ornamento.** `flourish` como separador; secciones en tarjetas, con el dibujo centrado sobre las secciones de itinerario, lugar, regalos y confirmar.

**Dibujos.** Sonajero y cochecito (portada); biberón disponible en la biblioteca del evento; reloj, mapa, regalo y sobre en sus secciones. Construcción DOne: disco de piedra, sombra plana, figura rellena de tinta y una sola pieza de color, la del acento.

**Foto.** Con foto: rectángulo a ras, el título debajo. Sin foto: sonajero y cochecito llenan la portada.

**Se diferencia por.** Es la única con título sin caja alineado al inicio y portada asimétrica de tres piezas; el ciruela (332°) no se parece a ninguna otra de la familia.

---

## 4. Primera comunión

**Concepto.** El recordatorio: la tarjeta que se guarda en el misal, con el cáliz al centro, la vela y la paloma a los lados y un violeta litúrgico sereno.

**Firma (una sola).** *El cáliz que se traza*: el filete y el cáliz se dibujan (`draw`) mientras el título sube (`rise`); la vela y la paloma aparecen después (`fade`).

**Pareja tipográfica (catálogo).** `cormorant-garamond` 500/600 (titulares, serif luminosa) · `nunito-sans` 400/600 (cuerpo).

**Etiquetas de evento.** first-communion. **Variante de portada.** `editorial` (foto vertical 4:5, como la imagen de un recordatorio; desde 900 px, foto a la izquierda y texto a la derecha).

### Paleta

| Rol | Claro | Oscuro |
|---|---|---|
| `canvas` | `#F6F5FB` | `#100E1B` |
| `surface` | `#FFFFFF` | `#19162A` |
| `text` | `#1E1B2E` | `#EDEAF8` |
| `muted` | `#58546E` | `#B7B1CF` |
| `accent` | `#5E4A9A` | `#BFB0F0` |
| `accentFill` | `#5E4A9A` | `#A998E4` |
| `onAccent` | `#FFFFFF` | `#150F2E` |
| `line` | `#8D88A6` | `#6A6488` |

| Par | Mín. | Claro | Oscuro |
|---|---|---|---|
| text sobre canvas | 4.5 | **15.48** | **16.10** |
| text sobre surface | 4.5 | **16.78** | **14.90** |
| muted sobre canvas | 4.5 | **6.66** | **9.27** |
| muted sobre surface | 4.5 | **7.22** | **8.58** |
| accent sobre canvas | 4.5 | **6.63** | **9.71** |
| accent sobre surface | 4.5 | **7.19** | **8.98** |
| onAccent sobre accentFill | 4.5 | **7.19** | **7.28** |
| line sobre canvas | 3.0 | **3.12** | **3.44** |
| line sobre surface | 3.0 | **3.38** | **3.19** |
| accentFill sobre canvas | 3.0 | **6.63** | **7.54** |

Matiz del acento: claro 255°, oscuro 254° (fuera de la franja 40–70° del amarillo). Medido con el mismo algoritmo WCAG del validador del BE y repetido en el DOM por Playwright.

**Portada · móvil.** Filete trazado, título grande alineado al inicio (60 px) y, en una fila, vela · cáliz · paloma; filete de cierre.

**Portada · escritorio.** Título de 64 px en siete columnas a la izquierda y, a la derecha, vela, cáliz y paloma en una fila; filete corto arriba y abajo.

**Ornamento.** `filete` como encabezado de cada sección; secciones sin caja (`plain`), mucho aire.

**Dibujos.** Cáliz, vela y paloma (portada); regalo, sobre, percha y el resto de objetos comunes en sus secciones. Construcción DOne: disco de piedra, sombra plana, figura rellena de tinta y una sola pieza de color, la del acento.

**Foto.** Con foto: retrato vertical a la izquierda en escritorio, a todo el ancho en móvil. Sin foto: el cáliz es el protagonista.

**Se diferencia por.** Es la única con título tipográfico grande en serif y trío de objetos en fila; el violeta (255°) la separa de Cielo (azul) y de Graduación (marino).

---

## 5. Graduación

**Concepto.** El acta de grado: el birrete y el diploma sobre una regla fina, el azul marino de ceremonia como única pieza de color y el programa del acto numerado.

**Firma (una sola).** *El birrete que se lanza*: la regla y el birrete se trazan (`draw`), el diploma sube (`rise`) y el título llega al final.

**Pareja tipográfica (catálogo).** `fraunces` 500/600 (titulares) · `figtree` 400/500/600 (cuerpo).

**Etiquetas de evento.** graduation. **Variante de portada.** `corporate` (foto 4:3 rectangular, sin arco: la foto del acto).

### Paleta

| Rol | Claro | Oscuro |
|---|---|---|
| `canvas` | `#F5F6FA` | `#0B0F1E` |
| `surface` | `#FFFFFF` | `#131A2E` |
| `text` | `#141826` | `#E8ECF8` |
| `muted` | `#4B5169` | `#AAB3D0` |
| `accent` | `#1E3A8A` | `#9DB4F2` |
| `accentFill` | `#1E3A8A` | `#869FE8` |
| `onAccent` | `#FFFFFF` | `#0A1330` |
| `line` | `#8189A8` | `#5B678C` |

| Par | Mín. | Claro | Oscuro |
|---|---|---|---|
| text sobre canvas | 4.5 | **16.36** | **16.15** |
| text sobre surface | 4.5 | **17.67** | **14.64** |
| muted sobre canvas | 4.5 | **7.26** | **9.14** |
| muted sobre surface | 4.5 | **7.84** | **8.29** |
| accent sobre canvas | 4.5 | **9.59** | **9.30** |
| accent sobre surface | 4.5 | **10.36** | **8.43** |
| onAccent sobre accentFill | 4.5 | **10.36** | **7.08** |
| line sobre canvas | 3.0 | **3.20** | **3.42** |
| line sobre surface | 3.0 | **3.46** | **3.10** |
| accentFill sobre canvas | 3.0 | **9.59** | **7.39** |

Matiz del acento: claro 224°, oscuro 224° (fuera de la franja 40–70° del amarillo). Medido con el mismo algoritmo WCAG del validador del BE y repetido en el DOM por Playwright.

**Portada · móvil.** Regla trazada, birrete girado −6° y diploma girado 4° en una fila, y debajo el título alineado al inicio (56 px).

**Portada · escritorio.** Regla a todo el ancho; título de 96 px a la izquierda (8 columnas) y, a la derecha, birrete girado 8°, libros y diploma.

**Ornamento.** `rule` (regla); itinerario con numeración de actos en romanos (`display: list`); secciones sin caja.

**Dibujos.** Birrete, diploma y libros (portada); regalo, sobre y mapa en sus secciones. Construcción DOne: disco de piedra, sombra plana, figura rellena de tinta y una sola pieza de color, la del acento.

**Foto.** Con foto: rectángulo 4:3 sobre el título. Sin foto: birrete, libros y diploma dan la portada.

**Se diferencia por.** Es la única con regla a todo el ancho, objetos girados y programa numerado en la familia; el azul marino (224°) es el más oscuro y saturado.

---

## Aproximaciones (el contrato 1.2.0 no se amplió)

- **Nubes de papel.** No existe un dibujo de nube en la biblioteca ni máscara para recortar la foto: las nubes de Cielo de bautizo son el ornamento `onda` (filete ondulado) en dos alturas.
- **Tipografías.** Las semillas de F4 PR a fijan Quicksand/Nunito tanto en Menta infantil como en Baby shower; para que las dos no compartan pareja, Menta infantil usa Fredoka/Mulish y Baby shower conserva Quicksand/Nunito. El catálogo del contrato no tiene una redondeada tercera con todos los pesos.
- **Foto.** La variante de portada solo admite cinco valores (pregunta 13 ya abierta): los cinco se reparten entre `classic`, `festive`, `minimal`, `editorial` y `corporate` y la foto toma el tratamiento del renderizador; no hay marco de recordatorio ni foto en esquina.
- **Alto de los elementos.** El renderizador apila los elementos de la portada por filas; la altura la decide el contenido, no el documento.
