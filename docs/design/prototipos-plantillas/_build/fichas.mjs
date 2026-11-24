// Genera FICHAS.md a partir de tokens.mjs, audit.json y contraste-dom.json (medidos con audit.cjs). Uso: node fichas.mjs
import { writeFileSync, readFileSync } from 'node:fs';
import { TOKENS, pairs } from './tokens.mjs';
const audit = JSON.parse(readFileSync(new URL('./audit.json', import.meta.url)));
const dom = JSON.parse(readFileSync(new URL('./contraste-dom.json', import.meta.url)));
const roles = ['canvas', 'surface', 'text', 'muted', 'accent', 'accentFill', 'onAccent', 'line'];
const tokTable = (k) => { const extra = ['stone', 'stone2', 'shadow', ...(TOKENS[k].dark.disc ? ['disc'] : [])]; return `| Rol | Claro | Oscuro |\n|---|---|---|\n${[...roles, ...extra].map((r) => `| \`${r}\` | \`${TOKENS[k].light[r]}\` | \`${TOKENS[k].dark[r]}\` |`).join('\n')}`; };
const uiTable = (k) => { const L = pairs(TOKENS[k].light), D = pairs(TOKENS[k].dark); const mk = (p) => (p.r >= p.min ? `**${p.r.toFixed(2)}** ✓` : p.deco ? `${p.r.toFixed(2)} (decorativo)` : `**${p.r.toFixed(2)}** ✗`); return `| Par de tokens | Mín. | Claro | Oscuro |\n|---|---|---|---|\n${L.map((p, i) => `| ${p.n} | ${p.min}:1 | ${mk(p)} | ${mk(D[i])} |`).join('\n')}`; };
const domTable = (k) => ['light', 'dark'].map((m) => { const rows = dom[`${k}|${m}`]; return `**${m === 'light' ? 'Claro' : 'Oscuro'}** (${rows.length} pares únicos)\n\n| Texto de ejemplo | Color | Fondo efectivo | Tamaño | Ratio | Mín. | |\n|---|---|---|---|---|---|---|\n${rows.map((r) => `| ${r.sample.replace(/\|/g, '/')} | \`${r.fg}\` | \`${r.bg}\` | ${r.large ? 'grande' : 'normal'} | **${r.ratio.toFixed(2)}** | ${r.need} | ${r.ratio >= r.need ? '✓' : '✗'} |`).join('\n')}`; }).join('\n\n');
const minOf = (k, m) => Math.min(...dom[`${k}|${m}`].map((r) => r.ratio)).toFixed(2);
const runs = Object.keys(audit).filter((n) => !n.startsWith('anim')).length;
const maxOv = Math.max(...Object.values(audit).filter((r) => r.overflow !== undefined).map((r) => r.overflow));

const md = `# Fichas de personalidad · prototipos de 3 plantillas (Q4 · F4)

> **Son prototipos.** HTML estáticos de alta fidelidad para aprobar la dirección visual antes de rehacer las 16 plantillas. No usan el motor \`celebration-theme\`, no se conectan al backend y no cambian ninguna plantilla sembrada. El contenido (nombres, lugares, precios, proveedores) es **ficticio**; las fotos son ilustraciones planas marcadas «Foto de ejemplo». Los enlaces apuntan a las rutas reales (\`/c/{slug}/regalos\`, \`/c/{slug}/rsvp\`, \`/r/{listingId}\`) que en el prototipo no existen.

- **Fuente de la decisión:** \`PLAN-PLANTILLAS.md\` (BE \`bugs/catalogo\`): §1 (P4, P8, P9, P18, P22), §3 (PL-A1, A2, A3, A6, A8, A9, M1, M7, M8), F3, F4 y Q4.
- **Cómo verlos:** abre \`marfil.html\`, \`pinata.html\` o \`gala.html\` en un navegador (necesitan red para Google Fonts). Arriba hay una franja plegable del prototipo con **tema** (claro, oscuro, sistema) y los selectores de **foto** (sin foto, con foto, error de carga), **regalos** (abierto, vacío, cerrado), **enlace personal** (con, sin) y **plazo** (vigente, vencido). Parámetros equivalentes: \`?theme=dark&photo=1&photoerr=1&gifts=empty|closed&link=none&deadline=past&bare=1\` (\`bare\` oculta la franja) y \`?still=1\` (sin animación).
- **Construcción de los dibujos** (igual que \`packages/ui/src/illustrations.ts\`): disco de piedra, sombra de contacto plana, figura rellena de tinta con detalles calados en el color del fondo y **una sola pieza de color, la del acento de la plantilla** (P4). Sin contornos, degradados, desenfoque ni caras. Nunca amarillo ni color fuera de la paleta. Hoja de contacto: [\`dibujitos.png\`](../../progress/evidence/plantillas-prototipos/dibujitos.png).
- **Lo que NO cambia entre plantillas (P22):** «Ver regalos» → \`/c/{slug}/regalos\` (sin token) está **siempre** a la vista, en cualquier estado: barra fija inferior en móvil (<900 px), cabecera fija en escritorio, y de nuevo en la sección Regalos. «Confirmar asistencia» (o «Busca tu enlace personal», ver estados) lo acompaña.
- **Capturas** (Linux, Chromium; evidencia, no líneas base): [\`docs/progress/evidence/plantillas-prototipos/\`](../../progress/evidence/plantillas-prototipos/README.md).

## 0. Cambios de la ronda de revisión 1

| Id | Resolución |
|---|---|
| R1 · Gala usaba amarillo | El acento de Gala pasa a **vino** (\`#7B2A3C\` claro, matiz 347°; rosa palo \`#E6A3B1\` oscuro, 347°). Fuera de la franja 40–70° del amarillo del sistema. Se conserva el concepto «gala» con el marco art déco. Fotos de ejemplo planas y sin \`#E8C987\`. **Decisión de Pablo (2026-11-24, comentario en el PR): cerrada.** La plantilla lleva acento vino y se llama «Gala art déco»; el dorado queda descartado (la semilla \`016-gala-dorada\` conserva su clave y se renombra en la migración). |
| R2 · Familias fuera del catálogo | Las seis familias salen ahora del **catálogo curado de F1** (\`packages/celebration-theme/src/design/catalog.ts\`, rama \`feat/f1-diseno-v2-esquema\`, PR #115, 41 familias). Se reemplazan Hanken Grotesk y Bricolage Grotesque. |
| R3 · Banderines con contorno | Banderines como **figuras rellenas de tinta** sobre un cordel (algunos en el acento); el festón es una franja rellena de semicírculos. |
| R4 · Estados | Prototipados y capturados: sin enlace personal, regalos OPEN/EMPTY/CLOSED, plazo vencido, galería y error de carga de la foto (§5). |
| R5 · Barra móvil | Los botones encogen y parten la etiqueta; ocultan el icono bajo 400 px. Auditada a 320 y 360 px: 0 botones fuera de pantalla, objetivos ≥ 44 px. |
| R6 · Cabecera 900–1024 | El índice de secciones solo aparece desde 1200 px; entre 900 y 1199 la cabecera lleva logo, fecha y los dos botones. 0 px de desbordamiento a 900, 960 y 1024. |
| Menores | Capturas en \`docs/progress/evidence/plantillas-prototipos/\`; la percha de Marfil se usa en Vestimenta; titular de Piñata fluido con \`clamp()\` y sin desplazamiento por los banderines (recorte en el contenedor); Gala sin colisiones en el héroe a 1280; Piñata a 768 usa la composición de dos columnas; disco de la piñata en oscuro a ≥ 3:1; Gala con columnas en escritorio. |

---

## 1. Clásico marfil · boda

**Concepto.** Una tarjeta de papel de algodón vista a través de una ventana en arco: lo ceremonial, sin adornos de más.

**Firma (una sola).** *La ventana de arco*: el marco doble se traza de abajo hacia arriba, la foto (o los anillos) sube a la ventana y el sello con las iniciales se estampa al final.

**Pareja tipográfica (catálogo de F1).** \`cormorant-garamond\` 500/600 + cursiva 500 (titulares y horas) · \`source-sans-3\` 400/500/600 (cuerpo y botones). Sin Inter ni peso 800.

### Tokens
${tokTable('marfil')}

### Contraste de tokens (WCAG 2.x, \`_build/tokens.mjs\`)
${uiTable('marfil')}

### Contraste del texto medido en el DOM (Chromium, todos los estados)
${domTable('marfil')}

**Portada · móvil.** Columna centrada. Arco (70 vw, máx. 290 px) con marco doble; debajo, nombres en dos líneas, fecha en cursiva, lugar y «Faltan N días» como texto. Sin botones en la portada: los lleva la barra inferior.
**Portada · escritorio 1280.** Asimétrica en dos columnas (5fr/6fr): arco de 430 px a la izquierda; a la derecha, nombres de 118 px alineados a la izquierda junto a una línea vertical con un nodo-anillo.
**Ornamento.** Trazo de 1,25 px con extremos redondos: separador *línea · dos anillos · línea*, marco de arco doble, nodos-anillo del itinerario, signo + de las preguntas. Son filetes (no figuras); los dibujos sí siguen la construcción rellena.
**Dibujos.** Anillos (portada sin foto, el segundo anillo es la pieza de color), alfiler en mapa (lugares), percha con saco (vestimenta), regalo, sobre (confirmar).
**Animación (P18).** Trazado del marco con máscara que se desplaza (\`transform\`), ascenso de la foto, sello que se estampa (\`scale\`), cascada de textos, nodos del itinerario, paralaje de 5 % en la foto. Una sola vez, sin bucles.
**Foto.** Dentro del arco, con marco doble y sello de acento superpuesto. Sin foto: los anillos sobre su disco. Con error de carga: panel de superficie con icono, «No pudimos cargar la foto» y «Reintentar».
**Se diferencia por:** composición asimétrica y serena, fondo de papel, trazo fino redondeado, un solo elemento de color por pantalla; serif de contraste suave y columna de encabezados fija a la izquierda.

---

## 2. Piñata · cumpleaños infantil

**Concepto.** Papel crema, banderines de tinta y una piñata que cuelga: alegre por la forma y el tamaño del tipo, no por saturar el color.

**Firma (una sola).** *La piñata que se mece una vez*: cuelga del cordel, cae, oscila amortiguada y queda quieta; los banderines se despliegan uno a uno.

**Pareja tipográfica (catálogo de F1).** \`fredoka\` 500/600/700 (titular enorme; el «6» va en acento) · \`figtree\` 400/500/600 (cuerpo). Sin peso 800.

### Tokens
${tokTable('pinata')}

En oscuro, \`disc\` (\`#725F57\`) separa el disco de piedra del fondo a ≥ 3:1 y \`accentFill\` sube a \`#FFB5A0\` para que la pieza de color del dibujo mantenga ≥ 3:1 sobre ese disco.

### Contraste de tokens
${uiTable('pinata')}

### Contraste del texto medido en el DOM
${domTable('pinata')}

**Portada · móvil.** Banderines a todo el ancho, piñata colgada al centro (168 px; 112 px si hay foto), titular «Sofi / cumple 6» alineado a la izquierda (\`clamp(46px, 18vw, 82px)\`, parte palabras largas), datos y, con foto, el **disco de foto** con su sombra plana.
**Portada · desde 720 px.** Dos columnas: titular a la izquierda y disco de foto a la derecha con la piñata colgando en su borde; sin foto, la piñata sola.
**Ornamento.** Figuras rellenas: banderines de tinta (uno de cada tres en el acento) sobre un cordel, y festón en franja de semicírculos. Líneas de puntos de 2,25 px solo para filas y preguntas.
**Dibujos.** Piñata de siete puntas (portada y «La piñata»), pastel con vela (la llama es la pieza de color), gorrito (confirmar), regalo, alfiler.
**Animación (P18).** Caída y balanceo de ~3 s con \`transform\` (una sola vez), despliegue de banderines escalonado, titular que sube, disco de foto que entra, paralaje en la foto.
**Foto.** Recorte circular que repite el **disco de piedra** de los dibujos, con la sombra plana debajo. Sin foto: no hay disco y la piñata crece.
**Se diferencia por:** titular gigante a la izquierda, esquinas de 14 px, banderines rellenos; es la única con un objeto que se mueve de verdad.

---

## 3. Gala art déco · corporativo y aniversario

**Concepto.** Invitación de gala art déco: un eje de simetría, doble línea fina y chaflán a 45°; el acento vino (rosa palo en oscuro) solo como detalle.

**Firma (una sola).** *Las puertas deco*: dos hojas con abanico de líneas se abren sobre la portada y revelan el marco; el «25» se asienta al final.

**Pareja tipográfica (catálogo de F1).** \`bodoni-moda\` 500/600 (cifras, titulares; el «25» a 150–176 px) · \`jost\` 400/500 (cuerpo y botones).

### Tokens
${tokTable('gala')}

### Contraste de tokens
${uiTable('gala')}

### Contraste del texto medido en el DOM
${domTable('gala')}

**Portada · móvil.** Esquinas escalonadas, copa sobre disco (o foto con chaflán y marco desplazado en acento), «25» enorme, «años de Grupo Altiplano», y fecha y sede en bloques simétricos debajo.
**Portada · escritorio 1280.** Tres columnas sobre un eje: fecha a la derecha-alineada, foto o copa y «25» al centro, sede a la izquierda-alineada; los dos bloques laterales arrancan en la misma línea y el marco queda a 36 px del «25». La etiqueta «Foto de ejemplo» va dentro de la foto.
**Secciones en escritorio.** Historia en dos columnas (texto y hitos), preguntas y recomendados en dos columnas, programa y etiqueta a 900 px de ancho.
**Ornamento.** Trazo de 1 px con uniones en ángulo y chaflán: separador de doble línea con rombo, esquinas escalonadas, abanico de las puertas, chevrón de las preguntas.
**Dibujos.** Copa de champán (el líquido es la pieza de color), medalla de reconocimiento, alfiler, percha, credencial con QR (confirmar), regalo.
**Animación (P18).** Apertura de las dos hojas (1,7 s, \`translateX\`), asentamiento escalonado de foto/título/datos, esquinas que aparecen, trazado de separadores, paralaje en la foto.
**Foto.** Recorte con chaflán de 28 px y un marco de 1 px en acento desplazado 12 px. Sin foto: copa sobre su disco.
**Galería.** No lleva: la semilla real (\`016-gala-dorada\`) no incluye \`gallery\` ni \`gifts\` en \`sectionOrder\`; el botón de regalos sigue siempre visible.
**Se diferencia por:** simetría y chaflán (frente a la asimetría de Marfil y la redondez de Piñata), cifras de Bodoni a tamaño de cartel y botones de esquina recta.

---

## 4. Evidencia de verificación (Chromium, Playwright, \`_build/audit.cjs\`)

${runs} combinaciones (ancho × claro/oscuro × con/sin foto, estados y nombres largos), **0 avisos**:

| Comprobación | Resultado |
|---|---|
| Anchos de base | 320, 360, 390, 768, 900, 960, 1024, 1280 × claro/oscuro × con/sin foto, en las 3 plantillas |
| Estados | regalos vacío, regalos cerrado, sin enlace, plazo vencido, error de foto y todos a la vez, a 320/360/768/1024/1280, claro y oscuro |
| Desbordamiento horizontal | máximo ${maxOv} px en todas |
| Botones de la barra (<900) y de la cabecera (≥900) dentro de la pantalla | sí, en todas; etiquetas largas incluidas |
| Texto < 13 px | ninguno |
| Objetivos táctiles < 44 px | ninguno |
| Contraste del texto en el DOM | mín. claro: Marfil ${minOf('marfil', 'light')}, Piñata ${minOf('pinata', 'light')}, Gala ${minOf('gala', 'light')}; mín. oscuro: Marfil ${minOf('marfil', 'dark')}, Piñata ${minOf('pinata', 'dark')}, Gala ${minOf('gala', 'dark')}; todos ≥ AA |
| «Ver regalos» visible en 0/25/50/75/100 % del scroll, 390 y 1280 | sí, en las 3 plantillas |
| Nombres largos (320, 360, 1280) | sin desbordar en las 3 plantillas |
| Foco visible con teclado | contorno sólido de 3 px en el acento |
| \`prefers-reduced-motion: reduce\` | 0 animaciones activas y estado final |
| Movimiento permitido | tras recorrer la página no queda ningún bloque sin revelar |

**Límites honestos.** No se probó en Safari ni Firefox, en dispositivo real ni con lector de pantalla. El «trazado» de dibujos y ornamentos usa una máscara animada con \`transform\` (un barrido, no el recorrido de un lápiz). Las muestras de vestimenta y las fotos de ejemplo usan solo tonos de la paleta de cada plantilla (acento, tinta y neutros), con el nombre del color escrito. Las fotos son ilustraciones planas; con una foto real el recorte puede cambiar el equilibrio. El rendimiento de las animaciones no se midió. Las etiquetas «Ver mi respuesta» (plazo vencido) y los textos de los avisos son una **propuesta de redacción** que decide Pablo. Las capturas las revisó quien las generó, no una persona del equipo.

---

## 5. Estados (dimensión 7)

| Estado | Cómo se ve | Cómo abrirlo |
|---|---|---|
| Sin enlace personal | El botón principal dice «Busca tu enlace personal» y va a \`/c/{slug}/rsvp\`; la sección Confirmar explica cómo encontrarlo | \`?link=none\` |
| Regalos OPEN | «Ver regalos» | por defecto |
| Regalos EMPTY | Etiqueta «Lista de regalos (pronto)»; mismo destino \`/c/{slug}/regalos\`; el texto avisa que aún no hay regalos | \`?gifts=empty\` |
| Regalos CLOSED | «Ver regalos» con aviso de solo lectura | \`?gifts=closed\` |
| Plazo de confirmación vencido | Aviso en Confirmar y el botón pasa a «Ver mi respuesta» | \`?deadline=past\` |
| Galería | Mosaico de 6 fotos de ejemplo (Marfil y Piñata, como en sus semillas) | sección \`#galeria\` |
| Error de carga de la foto | Panel con icono, «No pudimos cargar la foto» y «Reintentar» en portada y en una tesela de la galería | \`?photoerr=1\` |

Además: hover, foco y pulsado, pregunta abierta/cerrada, con/sin foto, claro/oscuro/sistema y movimiento reducido. Capturas en \`docs/progress/evidence/plantillas-prototipos/estado-*.png\`. Siguen sin prototipar: carga (esqueletos), lista de regalos paginada y reintento de red real; son del trabajo de producción.

## 5.1. Autoevaluación con la rúbrica \`ui-quality-review\` (PLAN §3.2)

Bloqueantes: 1 Jerarquía, 4 Consistencia con el sistema, 5 Contraste y 7 Estados deben valer 2. Es una autoevaluación; la puntuación válida es la de quien revisa.

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
- **Gala · densidad (1):** aunque las secciones ya van en dos columnas, el héroe de escritorio sigue ocupando algo más de una pantalla y el eje simétrico deja aire a los lados.
- **Pulido (1) en las tres:** fotos ilustradas de ejemplo, Safari/Firefox y dispositivo real sin probar, rendimiento de animaciones sin medir; en Marfil el sello depende de la tipografía cargada.
- **Estados (2), con reserva:** los siete estados exigidos existen, pero la redacción de los avisos es propuesta y falta el esqueleto de carga.

---

## 6. Qué se pide aprobar

1. **Dirección por plantilla:** ¿Marfil (arco y anillos), Piñata (piñata que se mece, disco de foto, banderines de tinta) y Gala (simetría y puertas deco) son la personalidad correcta?
2. **Familia de trazo por plantilla** (1,25 redondo / 2,25 punteado / 1 en ángulo) y la **foto como parte del dibujo** (arco, disco, chaflán).
3. **Barra fija inferior en móvil y cabecera fija en escritorio** para «Ver regalos» y «Confirmar asistencia».
4. **Acento de Gala: decidido por Pablo (2026-11-24).** Acento **vino** (\`#7B2A3C\` claro, \`#E6A3B1\` oscuro) y nombre **«Gala art déco»**. Ya no hay nada que aprobar aquí; el dorado anterior (\`#6E5200\` / \`#CDAE6C\`) queda descartado.
5. **Tipografías.** Las tres parejas salen del catálogo de F1, así que no se amplía el catálogo; \`DESIGN.md\` (Newsreader + Geist) sigue siendo la tipografía de la app, no de las plantillas.
6. Si se aprueba, se rehacen las 16 con la misma ficha y las capturas pasan a ser las líneas base de F8.

## 7. Archivos

- \`marfil.html\`, \`pinata.html\`, \`gala.html\`: autocontenidos (CSS y SVG en línea; solo Google Fonts por red).
- \`docs/progress/evidence/plantillas-prototipos/\`: capturas (base 390/1280, anchos 320–1024, barra a 320/360, estados, filmstrips, dibujos) y README.
- \`_build/\`: generador (\`build.mjs\`), tokens y contraste (\`tokens.mjs\`), dibujos (\`drawings.mjs\`), fotos de ejemplo (\`photos.mjs\`), auditoría (\`audit.cjs\`, \`audit.json\`, \`contraste-dom.json\`), capturas (\`shoot.cjs\`). Regenerar: \`node _build/build.mjs && node _build/audit.cjs && node _build/fichas.mjs && node _build/shoot.cjs\`.
`;
writeFileSync(new URL('../FICHAS.md', import.meta.url), md);
console.log('FICHAS.md', md.length);
