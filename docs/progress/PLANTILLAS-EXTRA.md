# Plantillas extra: Otros, Despedida y Pedida (decisión 6 de Pablo, 2026-11-25)

Ramas FE y BE `feat/plantillas-extra-otros-despedida-pedida` (se retoma el WIP `b0cc6cb` / `5ba9a37`; se compararon con `feat/plantillas-f4d-nuevas` del orquestador, que tiene otros nombres y documentos distintos: se conservó el WIP, que ya traía la prueba de migración con filas editadas). PRs enlazados: ver sus cuerpos.

## Qué hay
- Seis documentos v2 (`otros-rumbo`, `otros-mesa`, `despedida-disco`, `despedida-esmoquin`, `pedida-solitario`, `pedida-rosa`) generados por `scripts/design-documents/extra.py`, registro `documents/extra.ts`, arte en `hero-art.ts`. BE: semillas v1 031-036 y los mismos bytes en `seeds/templates/design-v2/`.
- «P20 no pisa filas editadas» ya estaba en la rama oficial (`migrate_templates_to_v2`: `skipped` con motivo `edited`, `--include-edited` apagado); aquí solo se prueba con las seis filas nuevas.
- Ronda PL-130-M2 propia: el nuevo `e2e/plantillas-v2-extra.spec.ts` falló en 8 casos (h1 o texto de portada bajo el dock a 360×800; h1 de Mesa larga fuera de la ventana a 1280). Corregido en `extra.py`: Mesa larga pone los nombres antes de la mesa, Rumbo/Disco/Solitario/Rosa reducen los dibujos con relleno horizontal, Black tie pasa a la variante `corporate`.

## Hallazgos propios
- PL-EXTRA-1: la prueba `plantillas-v2-sobrio.spec.ts` de la rama oficial falla para `otros-evento 360x800` con foto en este entorno (h1 en 839 > dock 723). No se toca (fuera de alcance); se informa.

## Líneas base macOS que cambian
Ninguna. Capturas nuevas solo en `docs/progress/evidence/plantillas-extra/` (360/768/1280, claro y oscuro, con y sin foto) y `contraste.md` / `contrast.jsonl`.

## Reversión
Revertir el PR; las filas sembradas en un entorno se quedan hasta que se archiven (la migración tiene `--revert` para las no editadas).
