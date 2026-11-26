# Plantillas F3 · biblioteca de dibujitos y ornamentos para invitaciones

Fecha: 2026-11-24. Corrige PL-A1 y PL-M7 (`PLAN-PLANTILLAS.md`, rama `bugs/catalogo` de RSVPBackend). Aprobado por Pablo: F3, P4, P13, P18, Q1.

## Qué hay

- Módulo `@rsvp/celebration-theme/art` (`packages/celebration-theme/src/art/`): **82 dibujos** y **6 conjuntos de ornamentos**. **No está conectado a las plantillas** (eso es F4).
- Cada dibujo es **dato**: trazados con rol `disc`, `shadow`, `ink`, `cutout`, `secondary` o `accent`. Ningún color: `artPalette` resuelve los roles desde la paleta de la plantilla (claro u oscuro) y el render pinta `var(--celebration-art-<rol>)`.
- La **única pieza de color** toma el acento de la plantilla (P4). Si el acento no llega a 3:1 contra el fondo o el disco, se acerca a la tinta conservando el matiz.
- Construcción de DOne/Cuotea: disco de piedra, sombra de contacto plana, figura de tinta con detalles calados, piezas secundarias en el color del borde de campo, un solo acento. Sin contornos, degradados, desenfoque, rostros ni personas. `InvitationArt` solo fija un tamaño por defecto (104 px) a los dibujos: separadores, esquinas y marcos conservan su ancho intrínseco. Un dibujo que ya está en pantalla al hidratar no se arma (no parpadea). Un acento es **una sola forma conexa** (un trazado con un solo subtrazado); lo demás va en tinta o en secundario. Los anillos, las cifras, la percha, el vestido y la tijera son figuras rellenas de tinta (`band` convierte una línea en polígono relleno), no trazos gruesos. Las líneas miden 2,5 o más, ningún dibujo pasa de 13 subtrazados (el máximo de DOne) y cada figura mide **a lo sumo 96 de ancho y de alto** (el disco mide 92: los 4 de más son el medio trazo de una línea en el borde; DOne llega a 100). No se afirma que toda figura quepa en 92: banderines, tazas, antifaz, vela y rosario pasan de 92 sin llegar a 96.
- Animación opcional (`animate`): al **entrar en pantalla** (IntersectionObserver, una vez) las piezas suben 12 px y aparecen en 500 ms con la curva de DOne, en cascada de 70 ms y **máximo 8 pasos** (560 ms de retraso en total; el último paso arranca a los 490 ms); los calados entran con su tinta y las líneas se trazan. Los valores son los de `MOTION` de `packages/ui` (`motion.ts`, fijados por `invitation-art-sync.test.ts`). Sin JavaScript, sin IntersectionObserver o con `prefers-reduced-motion` el dibujo se ve en su estado final.
- `InvitationArt` es **decorativo por defecto** (`aria-hidden`); `label` (texto o `true` para el nombre es-BO/en-US de la biblioteca) lo vuelve `role="img"`. El SVG tiene tamaño intrínseco (`width`/`height`) y `styles.css` importa `art.css`.
- Suelos: `canvas`, `surface`, `accent` y `photo` (sobre un bloque de acento o una foto el disco es un halo sólido del color del lienzo). Sin paleta, disco, sombra y secundario retroceden a mezclas de los tokens de la invitación, nunca a negro.

## Dónde vive y por qué

`packages/celebration-theme`, porque es el paquete que ya pintan las invitaciones en web (`apps/seo-web`) y en la vista web de la app (P10). `apps/seo-web` no puede importar `packages/ui` (regla de fronteras), y `celebration-theme` tampoco depende de él. Por eso `src/art/geometry.ts` reescribe los constructores de trazado de `packages/ui/src/illustrations.ts` y `apps/universal/test/invitation-art-sync.test.ts` falla si dejan de escribir las mismas cadenas.

## Dibujos por tipo de evento

| Tipo | Dibujos |
|---|---|
| Comunes (10) | sobre, reloj, mapa-pin, copas, regalo, camara, percha, pregunta, auto, cama |
| Boda | anillos, ramo, pastel-bodas, campanas, velas |
| Aniversario | tazas, album, cifra-diez, reloj-arena |
| Quinceaños | tiara, zapatilla, vestido, vinilo |
| Bautizo | concha, vela, paloma, zapatito |
| Cumpleaños infantil | globos, pinata, gorrito, pastel-velas, tren |
| Cumpleaños adulto | copa-vino, pastel-porcion, botella, vinilo |
| Corporativo | microfono, credencial, laptop, libreta |
| Graduación | birrete, diploma, toga, libros |
| Baby shower y revelación | biberon, sonajero, globo-pregunta, chupete, cochecito |
| Comunión y confirmación | caliz, rosario, biblia, vela, paloma |
| Despedidas y reuniones | maleta, postal, mesa-larga, brujula |
| Fiesta patronal | mascara-morenada (silueta con cuernos y corona; su ornamento es **una sola banda continua de calado** (greca de 8 escalones cuadrados, 4 dientes, trazo 2,5, sin segundo color) que cruza el huevo de borde a borde en lo alto de la frente, como una cinta de diadema bajo la corona; el resto del huevo es tinta lisa: **sin cuencas, ojos, cejas, dientes ni boca**, ni anillo, punto, par de aberturas, «W» ni «V» (PL-116-R5-1, PL-138-1); ver `mascara-morenada-claro.png` y `-oscuro.png` a 48, 104 y 240 px), matraca, banderines, bombo |
| Inauguración | tijera-cinta, llave, cartel («Abierto» colgado), puerta, cohete |
| Pedida y compromiso | caja-anillo, solitario, rosa, botella |
| Despedida de soltero/a | antifaz, coctel, pajarita, sombrero-copa |
| Bodas de oro y plata | cifra-25, cifra-50, medalla, laurel |
| Reencuentro | cassette, anuario, marco-foto, mochila |
| Fiesta temática y fin de año | bola-disco, uvas, popper, vinilo, botella |

Todos llevan nombre accesible en es-BO y en-US, que se expone con `label`; sin `label` son decorativos (`aria-hidden`).

Ornamentos (un solo trazo de 1,8, tinta + un acento): laurel, art déco, filete, onda, banderines y arcos; cada uno con separador, esquina y marco (la esquina repetida cuatro veces).

## Pruebas (`yarn workspace @rsvp/celebration-theme test`)

- `art-palette.test.ts`: las 16 plantillas sembradas (copiadas de BE `seeds/templates/data`, verificadas el 2026-11-24) en claro y oscuro, sobre lienzo, tarjeta, bloque de acento y foto. Disco ≥ 1,1 en claro y entre 1,16 y 1,25 en oscuro (el de DOne ronda 1,15); sombra siempre más oscura que el disco, ≥ 1,2 del fondo en claro, un paso bajo la página en oscuro (L16: nunca el color de la página) y ≥ 1,08 contra el disco; secundario y acento ≥ 3:1 contra fondo y disco; en `accent`/`photo` el disco es el lienzo.
- `art-library.test.tsx` (por dibujo): solo roles (sin hex ni color literal); **un solo acento: un trazado con un solo subtrazado**; **tinta rellena sin trazo como figura principal**; **calado obligatorio salvo la lista `NO_CUTOUT`** (hoy solo `cifra-25`, justificada); **trazo mínimo 2,5**; **≤ 13 subtrazados**; **figura de a lo sumo 96 × 96 dentro de la cuadrícula**; nombres es-BO y en-US con `label`, decorativo por defecto; tamaño intrínseco; **un golden por dibujo y por ornamento**. De conjunto: ≥ 4 dibujos por cada uno de los 18 tipos; ornamentos con las líneas de la esquina continuadas en el lateral; pasos de la entrada (≤ 8, calado con su tinta); IntersectionObserver simulado (arma antes de pintar, revela una vez, estado final con movimiento reducido o sin observador); `art.css` con los números de DOne y `styles.css` que lo importa.
- `art-library.test.tsx`, «dibujos sin cara» (PL-138-2): el ornamento es la única pieza de calado de la máscara y es una banda de 4+ dientes que cruza el huevo; **ninguna pieza suelta de ningún tamaño en el huevo** (frente incluida); nada alcanza el rostro bajo la banda; los detectores atrapan los diseños anteriores (anillo y punto, par de aberturas en los ojos o en la frente, línea corta, «W», «V», segunda franja, línea larga).
- `apps/universal/test/invitation-art-sync.test.ts`: la geometría es la de `packages/ui`.
- Chrome real: con `prefers-reduced-motion: reduce` `animation-name` es `none`; sin preferencia, `celebration-art-trace` / `celebration-art-in`, 1 iteración.

## Catálogo visual

`yarn workspace @rsvp/celebration-theme art:catalogue` (con `CHROMIUM_PATH` si el Chromium no es el que pide Playwright) renderiza todos los dibujos y ornamentos con Chromium sobre cuatro paletas sembradas, en claro y oscuro: `clasico-marfil`, `pinata`, `gala-dorada` y `editorial-granate` (la fila `gala-dorada` conserva el id de la semilla del backend pero usa la dirección «Gala art déco», con acento vino `#7B2A3C`, decidida por Pablo; ver `test/seed-palettes.ts`) (`*-claro.png`, `*-oscuro.png`). Se revisaron a ojo; se rehicieron copas, ramo, zapatilla, matraca, tijera, pastel, chupete (parecía una cara), banderines y los marcos.

## Límites

- Las capturas son salida de máquina revisada por quien abrió el PR; Pablo las aprueba en el PR.
- El oscuro de la plantilla (`paletteFor(..., "dark")`) vive en la rama `fix/plantillas-fase0-contraste-oscuro`, que aún no está en la base. `test/dark-palette.ts` copia esa composición y `art-palette.test.ts` la fija; al entrar esa rama se borra y se importa `paletteFor`.
- Pendiente de F4: conectar los dibujos a las plantillas, elegir el set por tipo de evento y el ornamento por plantilla, y el sobre que se abre.
- No se probó en iOS/Android nativos ni en el backend real: el módulo no toca ni contratos ni API.
