# PL-OF-1 · «Otros eventos» con foto: el título quedaba bajo el dock a 360×800

## Causa raíz
La portada `editorial` en móvil debía poner el título primero y la foto debajo (`order: 1` sobre `.cdesign-cover-photo`). Pero `MediaImage` envuelve la foto en un `<picture>`, que es el elemento de la grilla; `order` sobre el `<img>` hijo no hace nada. La foto (410 px) quedaba primero y el título caía a y=748 (h1 748–839, dock en 723). No era la semilla: el documento `otros-evento.json` no cambia, así que **no hay PR de BE**. Afectaba a toda plantilla con variante `editorial` y foto en móvil.

## Corrección
`packages/celebration-theme/styles.css`: en móvil el `order: 1` va a `> :is(picture, .cdesign-cover-photo)`; el tope de altura sigue en el `<img>`. Prueba nueva en `render.test.tsx` (falla sin el cambio, pasa con él). La aserción del spec PL-130-M2 no se toca.

## Medidas a 360×800 (fixture `fixture-v2-otros-evento`, Chrome, `next build` + `next start`)
| | h1 (y) | texto de la portada | dock.top |
|---|---|---|---|
| Antes | 748–839 | 748–922 | 723 |
| Después | 322–413 | 322–496 | 723 |

Capturas (evidencia, no líneas base): `docs/progress/evidence/plantillas-of-1/antes-…png`, `despues-…png`.

## Verificación
- `plantillas-v2-sobrio.spec.ts`: 157 pasadas (7 plantillas, con/sin foto, claro/oscuro, 360/768/1280, axe, dock/PL-130-M2).
- `plantillas-v2-bodas|fiestas|infantil-ritos|v2.spec.ts`: 643 pasadas (otras plantillas `editorial` incluidas).
- `celebration-theme`: `vitest run` 3014 en verde; `tsc --noEmit` limpio; eslint del archivo tocado limpio.
- Sin ejecutar: backend real, iOS/Android, Safari/Firefox (el fixture es de contrato).

## Líneas base macOS que cambian
Ninguna.

## Reversión
Revertir el commit: solo CSS y una prueba.
