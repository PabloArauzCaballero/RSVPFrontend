# Plantillas F3 · biblioteca de dibujitos y ornamentos para invitaciones

Fecha: 2026-11-24. Corrige PL-A1 y PL-M7 (`PLAN-PLANTILLAS.md`, rama `bugs/catalogo` de RSVPBackend). Aprobado por Pablo: F3, P4, P13, P18, Q1.

## Qué hay

- Módulo `@rsvp/celebration-theme/art` (`packages/celebration-theme/src/art/`): **82 dibujos** y **6 conjuntos de ornamentos**. **No está conectado a las plantillas** (eso es F4).
- Cada dibujo es **dato**: trazados con rol `disc`, `shadow`, `ink`, `cutout`, `secondary` o `accent`. Ningún color: `artPalette` resuelve los roles desde la paleta de la plantilla (claro u oscuro) y el render pinta `var(--celebration-art-<rol>)`.
- La **única pieza de color** toma el acento de la plantilla (P4). Si el acento no llega a 3:1 contra el fondo o el disco, se acerca a la tinta conservando el matiz.
- Construcción de DOne/Cuotea: disco de piedra, sombra de contacto plana, figura de tinta con detalles calados, piezas secundarias en el color del borde de campo, un solo acento. Sin contornos, degradados, desenfoque, rostros ni personas.
- Animación opcional (`animate`): trazo, opacidad y transformación, una vez, sin bucle; con `prefers-reduced-motion` queda el estado final.

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
| Fiesta patronal | mascara-morenada, matraca, banderines, bombo |
| Inauguración | tijera-cinta, llave, puerta, cohete |
| Pedida y compromiso | caja-anillo, solitario, rosa, botella |
| Despedida de soltero/a | antifaz, coctel, pajarita, sombrero-copa |
| Bodas de oro y plata | cifra-25, cifra-50, medalla, laurel |
| Reencuentro | cassette, anuario, marco-foto, mochila |
| Fiesta temática y fin de año | bola-disco, uvas, popper, reloj-medianoche, vinilo |

Todos llevan nombre accesible en es-BO y en-US (`role="img"` + `aria-label`) o `aria-hidden` con `decorative`.

Ornamentos (un solo trazo de 1,8, tinta + un acento): laurel, art déco, filete, onda, banderines y arcos; cada uno con separador, esquina y marco (la esquina repetida cuatro veces).

## Pruebas (`yarn workspace @rsvp/celebration-theme test`)

- `art-palette.test.ts`: las 16 plantillas sembradas (copiadas de BE `seeds/templates/data`, verificadas el 2026-11-24) en claro y oscuro, sobre lienzo y tarjeta: disco ≥ 1,1, sombra ≥ 1,2 contra el fondo y ≥ 1,08 contra el disco (L16: nunca el color de la página), secundario y acento ≥ 3:1 contra fondo y disco.
- `art-library.test.tsx`: solo roles (sin hex ni color literal), exactamente un acento por dibujo, ≥ 4 dibujos por cada uno de los 18 tipos, nombres es-BO y en-US, `aria-hidden` decorativo, y **un golden por dibujo y por ornamento** (88 snapshots). También comprueba que la animación no tiene bucle, solo anima trazo, opacidad y transformación, y que `prefers-reduced-motion` la apaga.
- `apps/universal/test/invitation-art-sync.test.ts`: la geometría es la de `packages/ui`.
- Chrome real: con `prefers-reduced-motion: reduce` `animation-name` es `none`; sin preferencia, `celebration-art-trace` / `celebration-art-in`, 1 iteración.

## Catálogo visual

`yarn workspace @rsvp/celebration-theme art:catalogue` (con `CHROMIUM_PATH` si el Chromium no es el que pide Playwright) renderiza todos los dibujos y ornamentos con Chromium sobre cuatro paletas sembradas, en claro y oscuro: `clasico-marfil`, `pinata`, `gala-dorada` y `editorial-granate` (`*-claro.png`, `*-oscuro.png`). Se revisaron a ojo; se rehicieron copas, ramo, zapatilla, matraca, tijera, pastel, chupete (parecía una cara), banderines y los marcos.

## Límites

- Las capturas son salida de máquina revisada por quien abrió el PR; Pablo las aprueba en el PR.
- El oscuro de la plantilla (`paletteFor(..., "dark")`) vive en la rama `fix/plantillas-fase0-contraste-oscuro`, que aún no está en la base. `test/dark-palette.ts` copia esa composición y `art-palette.test.ts` la fija; al entrar esa rama se borra y se importa `paletteFor`.
- Pendiente de F4: conectar los dibujos a las plantillas, elegir el set por tipo de evento y el ornamento por plantilla, y el sobre que se abre.
- No se probó en iOS/Android nativos ni en el backend real: el módulo no toca ni contratos ni API.
