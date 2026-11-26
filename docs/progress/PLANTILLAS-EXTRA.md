# Plantillas extra: Otros, Despedida y Pedida (decisión 6 de Pablo, 2026-11-25)

Ramas FE y BE `feat/plantillas-extra-otros-despedida-pedida` (se retoma el WIP `b0cc6cb` / `5ba9a37`; se compararon con `feat/plantillas-f4d-nuevas` del orquestador, que tiene otros nombres y documentos distintos: se conservó el WIP, que ya traía la prueba de migración con filas editadas). PRs enlazados: ver sus cuerpos.

## Qué hay
- Seis documentos v2 (`otros-rumbo`, `otros-mesa`, `despedida-disco`, `despedida-esmoquin`, `pedida-solitario`, `pedida-rosa`) generados por `scripts/design-documents/extra.py`, registro `documents/extra.ts`, arte en `hero-art.ts`. BE: semillas v1 031-036 y los mismos bytes en `seeds/templates/design-v2/`.
- «P20 no pisa filas editadas» ya estaba en la rama oficial (`migrate_templates_to_v2`: `skipped` con motivo `edited`, `--include-edited` apagado); aquí solo se prueba con las seis filas nuevas.
- Ronda PL-130-M2 propia: el nuevo `e2e/plantillas-v2-extra.spec.ts` falló en 8 casos (h1 o texto de portada bajo el dock a 360×800; h1 de Mesa larga fuera de la ventana a 1280). Corregido en `extra.py`: Mesa larga pone los nombres antes de la mesa, Rumbo/Disco/Solitario/Rosa reducen los dibujos con relleno horizontal, Black tie pasa a la variante `corporate`.

## Hallazgos propios
- PL-EXTRA-1: la prueba `plantillas-v2-sobrio.spec.ts` de la rama oficial falla para `otros-evento 360x800` con foto en este entorno (h1 en 839 > dock 723). No se toca (fuera de alcance); se informa.

## Ronda 1 del orquestador (corrección)
- PL-FE143-V1 (alta): Allura solo en titulos de 32 px o mas; fecha, lugar, cuenta atras, horarios y sedes usan Mulish (`data-heading-face="script"` en `render.tsx` y regla en `styles.css`). Prueba e2e: ningun nodo de texto con Allura bajo 32 px, en las seis a 360/768/1280.
- PL-FE143-V2: la foto en arco o circulo comparte eje con el texto cuando el documento centra la portada (`data-align="center"`); el aro del arco queda a 13 px de los nombres. Prueba e2e: eje de la foto = eje del h1 (±1,5 px).
- PL-FE143-V3: los nombres van primero en el telefono en las seis; 360×640 no es parte de la regla PL-130-M2 (360×800 y 390×844): cifras en la ficha; pregunta a Pablo.
- PL-FE143-V4: Rumbo, Disco y Solitario tienen dibujo heroe en escritorio (`hero=` de `bodas.py:stack`).
- PL-FE143-V5: Solitario 206° (a 51° de Pedida de mano), Black tie con copa de vino; prueba de matiz >= 30° entre hermanas de un tipo.
- PL-FE143-1/-3: se registra PL-EXTRA-2 en `bugs/catalogo`; `seeded-palettes.json` y `seed-palettes.ts` ya no citan ramas que se borran tras el squash.
- Hallazgo nuevo (no corregido aqui): `Canvas` toma la tipografia del elemento movil (`phone.get(id) ?? wide.get(id)`), de modo que `typography` del lienzo de escritorio (tamano 72/80/104, alineacion) no se aplica; las portadas de escritorio usan el tamano fluido del movil. Se registra en `bugs/catalogo`.

## Líneas base macOS que cambian
Ninguna. Capturas nuevas solo en `docs/progress/evidence/plantillas-extra/` (360/768/1280, claro y oscuro, con y sin foto) y `contraste.md` / `contrast.jsonl`.

## Reversión
Revertir el PR; las filas sembradas en un entorno se quedan hasta que se archiven (la migración tiene `--revert` para las no editadas).
