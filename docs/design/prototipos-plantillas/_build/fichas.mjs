import { writeFileSync, readFileSync } from 'node:fs';
import { TOKENS, pairs, ratio } from './tokens.mjs';
const audit = JSON.parse(readFileSync(new URL('./audit.json', import.meta.url)));
const roles = ['canvas', 'surface', 'text', 'muted', 'accent', 'accentFill', 'onAccent', 'line'];
const tokTable = (k) => `| Rol | Claro | Oscuro |\n|---|---|---|\n${[...roles, 'stone (disco)', 'stone2 (piezas)', 'shadow (sombra plana)'].map((r) => { const key = r.split(' ')[0]; return `| \`${key}\` | \`${TOKENS[k].light[key]}\` | \`${TOKENS[k].dark[key]}\` |`; }).join('\n')}`;
const ratioTable = (k) => { const L = pairs(TOKENS[k].light), D = pairs(TOKENS[k].dark); return `| Par | Mínimo | Claro | Oscuro |\n|---|---|---|---|\n${L.map((p, i) => `| ${p.n} | ${p.min}:1 | **${p.r.toFixed(2)}:1** ✓ | **${D[i].r.toFixed(2)}:1** ✓ |`).join('\n')}`; };
const minC = (k) => { const v = Object.entries(audit).filter(([n]) => n.startsWith(k + '|') && !n.startsWith('anim')).map(([, r]) => r.contrast.min); return Math.min(...v).toFixed(2); };
const ll = { marfil: '45 (390) · 63 (1280)', pinata: '47 (390) · 58 (1280)', gala: '46 (390) · 68 (1280)' };

const md = `# Fichas de personalidad · prototipos de 3 plantillas (Q4 · F4)

> **Son prototipos.** HTML estáticos de alta fidelidad para aprobar la dirección visual antes de rehacer las 16 plantillas. No usan el motor \`celebration-theme\`, no se conectan al backend y no cambian ninguna plantilla sembrada. El contenido (nombres, lugares, precios, proveedores) es **ficticio**; las fotos son ilustraciones marcadas «Foto de ejemplo». Los enlaces apuntan a las rutas reales (\`/c/{slug}/regalos\`, \`/r/{listingId}\`) que en el prototipo no existen.

- **Fuente de la decisión:** \`PLAN-PLANTILLAS.md\` (BE \`bugs/catalogo\`): §1 (P4, P8, P9, P18, P22), §3 (PL-A1, A2, A3, A6, A8, A9, M1, M7, M8), F3, F4 y Q4.
- **Cómo verlos:** abre \`marfil.html\`, \`pinata.html\` o \`gala.html\` en un navegador (necesitan red para Google Fonts). Arriba hay una franja del prototipo con **Claro · Oscuro · Sistema** y **Sin foto / Con foto**. Parámetros: \`?theme=dark&photo=1&bare=1\` (\`bare\` oculta la franja) y \`?still=1\` (sin animación).
- **Construcción de los dibujos** (igual que \`packages/ui/src/illustrations.ts\`): disco de piedra, sombra de contacto plana, figura rellena de tinta con detalles calados en el color del fondo y **una sola pieza de color, la del acento de la plantilla** (P4). Sin contornos, degradados, desenfoque ni caras. Nunca amarillo ni color fuera de la paleta. Hoja de contacto: [\`capturas/dibujitos.png\`](capturas/dibujitos.png).
- **Lo que NO cambia entre plantillas (P22):** «Ver regalos» → \`/c/{slug}/regalos\` y «Confirmar asistencia» están siempre a la vista: barra fija inferior en móvil (<900 px), cabecera fija en escritorio, y de nuevo en las secciones Regalos y Confirmar.

---

## 1. Clásico marfil · boda

**Concepto.** Una tarjeta de papel de algodón vista a través de una ventana en arco: lo ceremonial, sin adornos de más.

**Firma (una sola).** *La ventana de arco*: el marco doble se traza de abajo hacia arriba, la foto (o los anillos) sube a la ventana y el sello con las iniciales se estampa al final.

**Pareja tipográfica.** Cormorant Garamond 500/600 + cursiva 500 (titulares y horas) · Hanken Grotesk 400/500/600 (cuerpo y botones). Sin Inter ni peso 800.

### Tokens
${tokTable('marfil')}

### Contraste (WCAG 2.x, calculado con \`_build/tokens.mjs\`)
${ratioTable('marfil')}

Medido además en el DOM real de los 12 estados (390/768/1280 × claro/oscuro × con/sin foto): peor par texto/fondo efectivo **${minC('marfil')}:1**.

**Portada · móvil 390.** Columna centrada. Arco (70 vw, máx. 290 px) con marco doble; debajo, nombres en dos líneas (Cormorant 58 px), fecha en cursiva, lugar y «Faltan N días» como texto. Sin botones en la portada: los lleva la barra inferior.
**Portada · escritorio 1280.** Asimétrica en dos columnas (5fr/6fr): arco de 430 px a la izquierda; a la derecha, nombres de 118 px alineados a la izquierda junto a una línea vertical con un nodo-anillo. Cabecera fija con índice y los dos botones.
**Ornamento.** Trazo de 1,25 px con extremos redondos: separador *línea · dos anillos · línea* (se traza al entrar), marco de arco doble, nodos-anillo del itinerario, signo + de las preguntas.
**Dibujos.** Anillos (portada sin foto, el segundo anillo es la pieza de color), alfiler en mapa (lugares), percha con saco (vestimenta), regalo, sobre (confirmar).
**Animación (P18).** Trazado del marco con máscara que se desplaza (\`transform\`), ascenso de la foto, sello que se estampa (\`scale\`), cascada de textos de 70–80 ms, nodos del itinerario que aparecen, paralaje de 5 % en la foto. Una sola vez, sin bucles.
**Foto.** Dentro del arco, recorte vertical con un 8 % de margen para el paralaje; marco doble alrededor y sello de acento superpuesto (única pieza de color de la portada con foto). Sin foto: los anillos sobre su disco, en el mismo arco, y sin sello.
**Se diferencia de las otras dos por:** composición asimétrica y serena, fondo de papel, trazo fino redondeado, un solo elemento de color por pantalla; es la única con serif de contraste suave y columna de encabezados fija a la izquierda.

---

## 2. Piñata · cumpleaños infantil

**Concepto.** Papel crema, banderines trazados y una piñata que cuelga: alegre por la forma y el tamaño del tipo, no por saturar el color.

**Firma (una sola).** *La piñata que se mece una vez*: cuelga del cordel, cae, oscila amortiguada y queda quieta; los banderines se despliegan uno a uno.

**Pareja tipográfica.** Bricolage Grotesque 500/600/700 (titular enorme con interletrado negativo; el «6» va en acento) · Figtree 400/500/600 (cuerpo). Sin Fredoka ni peso 800.

### Tokens
${tokTable('pinata')}

### Contraste
${ratioTable('pinata')}

Medido en el DOM real de los 12 estados: peor par **${minC('pinata')}:1**.

**Portada · móvil 390.** Banderines a todo el ancho, piñata colgada al centro (168 px; 112 px si hay foto), titular «Sofi / cumple 6» alineado a la izquierda a 82 px, datos y, con foto, el **disco de foto** con su sombra plana.
**Portada · escritorio 1280.** Titular a la izquierda (≈135 px) y, a la derecha, el disco de foto de 430 px con la piñata colgando solapada en su borde; sin foto, la piñata sola a 280 px.
**Ornamento.** Trazo de 2,25 px redondeado: festón de arcos como separador, banderines (algunos en acento) y líneas de puntos para filas y preguntas.
**Dibujos.** Piñata de siete puntas (portada y «La piñata»), pastel con vela (la llama es la pieza de color), gorrito (confirmar), regalo, alfiler. El globo está en la biblioteca pero no se usa en la página.
**Animación (P18).** Caída y balanceo de ~3 s con \`transform\` (una sola vez), despliegue de banderines escalonado (70 ms), titular que sube, disco de foto que entra, paralaje en la foto.
**Foto.** Recorte circular que repite el **disco de piedra** de los dibujos, con la sombra plana debajo: la foto se siente un dibujito más. Sin foto: no hay disco y la piñata crece.
**Se diferencia por:** titular gigante a la izquierda, trazo grueso y punteado, esquinas de 14 px; es la única con un objeto que se mueve de verdad y la única sin línea fina.

---

## 3. Gala dorada · corporativo y aniversario

**Concepto.** Invitación de gala art déco: un eje de simetría, doble línea fina y chaflán a 45°; dorado solo como detalle.

**Firma (una sola).** *Las puertas deco*: dos hojas con abanico de líneas se abren sobre la portada y revelan el marco; el «25» se asienta al final.

**Pareja tipográfica.** Bodoni Moda 500/600 (cifras, titulares; el «25» a 150–176 px) · Jost 400/500 (cuerpo y botones). Sin Playfair ni IBM Plex.

### Tokens
${tokTable('gala')}

### Contraste
${ratioTable('gala')}

Medido en el DOM real de los 12 estados: peor par **${minC('gala')}:1**. El oscuro es verde-negro profundo con champán; no es el claro invertido.

**Portada · móvil 390.** Esquinas escalonadas en las cuatro esquinas, copa sobre disco (o foto con chaflán y marco desplazado en acento), «25» enorme, «años de Grupo Altiplano», y fecha y sede en bloques simétricos debajo.
**Portada · escritorio 1280.** Tres columnas sobre un eje: fecha a la derecha-alineada, copa/foto y «25» al centro, sede a la izquierda-alineada.
**Ornamento.** Trazo de 1 px con uniones en ángulo y chaflán: separador de doble línea con rombo, esquinas escalonadas, abanico de las puertas, chevrón de las preguntas.
**Dibujos.** Copa de champán (el líquido es la pieza de color), medalla de reconocimiento, alfiler, percha, credencial con QR (confirmar), regalo.
**Animación (P18).** Apertura de las dos hojas (1,7 s, \`translateX\`), asentamiento escalonado de foto/título/datos, esquinas que aparecen, trazado de separadores, paralaje en la foto.
**Foto.** Recorte con chaflán de 28 px y un marco de 1 px en acento desplazado 12 px; sin recortar el contenido. Sin foto: copa sobre su disco.
**Se diferencia por:** simetría y chaflán (frente a la asimetría de Marfil y la redondez de Piñata), cifras de Bodoni a tamaño de cartel y botones de esquina recta.

---

## 4. Evidencia de verificación (Chromium 1243, Playwright, \`_build/audit.cjs\`)

36 combinaciones (3 plantillas × 390/768/1280 × claro/oscuro × con/sin foto), **0 avisos**:

| Comprobación | Resultado |
|---|---|
| Desbordamiento horizontal | ninguno en 36/36 |
| Texto < 13 px | ninguno |
| Objetivos táctiles < 44 px (enlaces, botones, resúmenes) | ninguno |
| Contraste del texto en el DOM (fondo efectivo) | mín. ${minC('marfil')} (Marfil), ${minC('pinata')} (Piñata), ${minC('gala')} (Gala); todos ≥ 4,5 |
| «Ver regalos» visible en 0/25/50/75/100 % del scroll, 390 y 1280 | sí, en las 3 plantillas |
| Foco visible con teclado | contorno sólido de 3 px en el acento |
| \`prefers-reduced-motion: reduce\` | 0 animaciones activas y estado final |
| Movimiento permitido | tras recorrer la página no queda ningún bloque sin revelar |
| Largo de línea (mediana de párrafos, caracteres) | Marfil ${ll.marfil}; Piñata ${ll.pinata}; Gala ${ll.gala} |

**Límites honestos.** En 390 px, algunas líneas sueltas (finales de párrafo y notas en columnas estrechas) bajan de 45 caracteres; la mediana de la lectura sí está en rango. En 1280, los párrafos llegan a 68–72 (Piñata ocasionalmente 78 en una nota). El «trazado» de dibujos y ornamentos se hace con una máscara animada con \`transform\` (no con \`stroke-dashoffset\`), para cumplir «solo transform/opacity»; visualmente es un barrido, no el recorrido de un lápiz. Las muestras de vestimenta son el único color fuera de la paleta (es contenido del anfitrión, con nombre escrito). No se probó en Safari ni Firefox ni en dispositivo real; las capturas se revisaron a ojo por quien las generó, no por una persona del equipo.

---

## 5. Autocrítica con la rúbrica \`ui-quality-review\` (PLAN §3.2)

Bloqueantes: 1 Jerarquía, 4 Consistencia con el sistema, 5 Contraste y 7 Estados deben valer 2.

| Dimensión | Marfil | Piñata | Gala |
|---|---|---|---|
| 1 Jerarquía (bloqueante) | 2 | 2 | 2 |
| 2 Alineación | 2 | 2 | 2 |
| 3 Espaciado | 2 | 2 | 2 |
| 4 Consistencia con el sistema (bloqueante) | 2 | 2 | 2 |
| 5 Contraste (bloqueante) | 2 | 2 | 2 |
| 6 Densidad | 2 | 2 | 1 |
| 7 Estados (bloqueante) | 2 | 2 | 2 |
| 8 Pulido | 1 | 1 | 1 |
| **Total /16** | **15** | **15** | **14** |

Motivos de lo que no es 2:
- **Gala · densidad (1):** en escritorio la portada ocupa casi dos pantallas con foto; el eje simétrico deja aire a los lados.
- **Pulido (1) en las tres:** las fotos son ilustraciones de ejemplo (el recorte real puede cambiar el equilibrio); en Piñata la columna vacía en las filas del programa sin dibujo y el disco de la piñata en oscuro se funden con el fondo; en Marfil el sello depende de la tipografía cargada; Gala no tiene aún estado «puertas» con un clic.
- **Estados (2):** cubiertos hover/foco/pulsado, pregunta abierta/cerrada, con/sin foto, claro/oscuro/sistema y movimiento reducido. Quedan por diseñar al construir de verdad: lista de regalos vacía/cerrada (\`gifts.status\`), plazo vencido, error de carga de la foto.

**Iteraciones sobre las capturas propias** (antes → después): marco del arco recortado por \`max-width\` de SVG; sello con iniciales apiladas; botón «Confirmar asistencia» partido en dos líneas; disco invisible dentro del arco (se pasó a superficie); título de Piñata en escritorio roto en tres líneas y piñata a la derecha del texto; «25» de Gala tapado por la foto (rejilla corregida); botones de Gala con borde cortado por el chaflán (ahora rectos); líneas de 35–40 caracteres en móvil (cuerpo 15,5 px, ancho de columna y dibujos apilados); enlace «Denunciar» de 17 px de alto (ahora 44).

---

## 6. Qué se pide aprobar

1. **Dirección por plantilla:** ¿Marfil (arco y anillos), Piñata (piñata que se mece, disco de foto) y Gala (simetría y puertas deco) son la personalidad correcta?
2. **Familia de trazo por plantilla** (1,25 redondo / 2,25 punteado / 1 en ángulo) y la **foto como parte del dibujo** (arco, disco, chaflán).
3. **Barra fija inferior en móvil y cabecera fija en escritorio** para «Ver regalos» y «Confirmar asistencia».
4. **Dorado de Gala:** acento \`#6E5200\` en claro y champán \`#CDAE6C\` en oscuro; ningún amarillo.
5. Si se aprueba, se rehacen las 16 con la misma ficha y las capturas pasan a ser las líneas base de F8.

## 7. Archivos

- \`marfil.html\`, \`pinata.html\`, \`gala.html\`: autocontenidos (CSS y SVG en línea; solo Google Fonts por red).
- \`capturas/\`: \`<plantilla>-<390|1280>-<claro|oscuro>-<foto|sinfoto>.png\` (24, página completa), \`pliegue-*.png\` (primer pliegue), \`animacion-*.png\` (cinco fotogramas de la entrada), \`dibujitos.png\`.
- \`_build/\`: generador (\`build.mjs\`), tokens y contraste (\`tokens.mjs\`), dibujos (\`drawings.mjs\`), auditoría (\`audit.cjs\`, \`audit.json\`) y capturas (\`shoot.cjs\`). Regenerar: \`node _build/build.mjs && node _build/audit.cjs && node _build/shoot.cjs\`.
`;
writeFileSync(new URL('../FICHAS.md', import.meta.url), md);
console.log('FICHAS.md', md.length);
