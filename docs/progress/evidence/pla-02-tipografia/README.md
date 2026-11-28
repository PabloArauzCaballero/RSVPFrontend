# PLA-02 · tipografía de escritorio por lienzo (NO FUSIONAR sin aprobación de capturas)

Base medida: oficial `1045ff8a` («antes») contra esta rama («después»). Chromium 1243 preinstalado (Playwright), Linux, movimiento reducido, Chrome sin fuentes web propias. Datos del fixture de pruebas (Ana y Luis), sin PII real. Solo la portada (`h1` de la página `cover`), sin foto.

Regla escrita: CATALOGO-BRECHAS PLA-02 «lo ausente en escritorio se hereda del móvil; el cambio visual masivo exige aprobación de capturas»; PLAN-CORRECCIONES «fusionar solo con capturas aprobadas».

## Qué cambia
`render.tsx` emite `--tm-*` (lienzo móvil) y `--td-*` (escritorio) en vez de tipografía en línea; `styles.css` usa `--td-*` desde 56,25 rem (900 px) y cae a `--tm-*`.

## Resultado (36 plantillas, `resumen.json`, `medidas.json`)
| Ancho | Cambian | Cambia alineación | Cambia nº de líneas del título | Nuevo solape con el dock | Desborde horizontal | AA del título < 4,5 |
|---|---|---|---|---|---|---|
| 360 | 0 | 0 | 0 | 0 | 0 | 0 |
| 900 | 28 | 3 | 12 | 0 | 0 | 0 |
| 1280 | 28 | 3 | 6 | 0 | 0 | 0 |

A 1280 pasan a dos líneas: pinata, editorial (72 a 120 px), bodas-de-plata, pedida-de-mano, fin-de-ano y otros-evento. Cambia la alineación: menta-infantil, fiesta-patronal y despedida-disco. Tamaños: de 56 a 120 px.
Hojas de contacto antes (izq.)/después (der.), borde rojo = cambia: `hoja-{360,900,1280}-antes-despues.png`.

Límites: el AA es del color del título contra el primer fondo opaco medido (aproximación, no recalcula superposiciones con foto); el solape se midió contra `.cdesign-dock` con el título, no con todos los bloques; sin foto. Otros 8 elementos del lienzo (padding, rotation, etc.) no se tocan. No aprobado por el dueño.

Arnés: `packages/celebration-theme/scripts/typography-harness.tsx` (`npx vite-node ... <dir>`).
