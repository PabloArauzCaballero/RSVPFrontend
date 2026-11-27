# Evidencia F4 · menores de #117 (G1, M1, M2) y pila F1 → F4

Nivel: `TESTED` en Chromium de Linux (Google Chrome del sistema). No son líneas base: las líneas base Playwright comprometidas son de macOS y **no se tocan**. Ningún archivo `*.png` de líneas base cambia en esta rama.

Medición: `medir-menores-117.cjs` (abre los tres prototipos a 360, 768 y 1280 y mide la caja de cada elemento). Salida antes y después, en este orden: plantilla, ancho, hueco por fila de la galería en px, fondo de la cabecera, `column-gap` de `.faq2`, desbordamiento horizontal.

| Menor | Antes | Después |
|---|---|---|
| M1 · hueco en la última fila de la galería (Marfil, Piñata) | 768: filas `[0,0,243]`; 1280: `[0,0,205]` (px sin cubrir en la última fila) | 360, 768 y 1280: `[0,0,…,0]` en las dos plantillas. Causa raíz: 6 fotos con la 1.ª y la 6.ª a 2 de 3 columnas dejaban una celda vacía. Ahora la 6.ª ocupa la fila entera. |
| M2 · cabecera de Marfil translúcida a 768 | `rgba(251,247,240,0.94)` | `rgb(251, 247, 240)` opaca (el `color-mix` se quitó) |
| G1 · `.sec .body{gap:0}` anulaba el `column-gap` de `.faq2` en Gala | `column-gap: 0px` a 1280 (la regla de 2 clases gana a `.faq2`) | `column-gap: 48px` a 1280; la regla pasa a `row-gap:0` |

Desbordamiento horizontal: 0 px en las 9 combinaciones (3 plantillas × 3 anchos), antes y después.

## Qué cambió en el código

`docs/design/prototipos-plantillas/_build/{shared,marfil,gala}.mjs` y los tres `.html` regenerados con `node _build/build.mjs`. Los prototipos son HTML estáticos: no entra en producción nada de esto. El motor `celebration-theme` no replica estos tres defectos (no usa `.gal` ni `.faq2`); cuando el renderizador v2 construya la galería y las preguntas frecuentes, las pruebas de la rama b deben medir lo mismo (última fila sin hueco, `column-gap` efectivo) para que no vuelvan.

## Líneas base macOS que cambiarían

Ninguna en este PR. Las plantillas rediseñadas (rama b) cambiarán `celebracion-publica-*` (seo-web) y `host-templates-*`/`host-vista-previa-*` (app) y las de invitado; se listan en ese PR.
