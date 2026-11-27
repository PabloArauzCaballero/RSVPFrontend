# F4 · Rediseño de las 16 y plantillas nuevas: troceo en PR apilados

Fecha: 2026-11-25. Fuente: `PLAN-PLANTILLAS.md` §F4, decisiones P7, P8, P13, P20, P22, Q1, Q4 y la dirección aprobada en FE #117 (Marfil, Piñata, Gala art déco).

## Pila

```
chore/deploy-contabo-coolify
  └─ feat/f1-diseno-v2-esquema   (BE #132 · FE #115)
       ├─ BE feat/plantillas-f4-semillas      ← PR a (BE)
       └─ FE feat/plantillas-f4-rediseno      ← continuación (ver «Estado»)
```

F1 almacén (BE #135) y referencia (BE #136) siguen la misma pila; F4 no las necesita hasta la rama z.

## Hallazgo que fija el orden

Un documento v2 **no se puede publicar ni crear** hoy (BE: `DESIGN_V2_NOT_AVAILABLE` con `DESIGN_V2_ACCEPTED=false`, `DESIGN_NOT_PUBLISHABLE`) porque ni el administrador (`apps/universal/src/admin/templates.tsx` lee `theme.palette`) ni el renderizador público leen v2. La nota de BE dice que **F4 enciende la puerta junto con el cambio del frontend**. Por eso las tres plantillas prototipadas «como diseño v2» no pueden ser el primer PR: dependen de un renderizador v2 que ningún PR de F1 trae. Se hace antes lo que sí se puede entregar y probar sobre v1.

## Trozos

| PR | Rama | Contenido | Estado |
|---|---|---|---|
| a (BE) | `feat/plantillas-f4-semillas` | 16 semillas v1 rediseñadas (paleta, pareja del catálogo, estilo, orden), Gala art déco con acento vino, 14 plantillas para los tipos nuevos, **14 tipos de evento nuevos en celebration-site** (P13/Q1), `upgrade_seed_templates` (las filas sin tocar pasan solas, nunca pisa una edición del admin) y la instantánea `legacy/2026-11-24-v1` | Hecho en esta ejecución, PR en borrador |
| a (FE) | `feat/plantillas-f4-rediseno` | Motor v1: dibujos y ornamentos por plantilla, sin degradados, sin banda saturada, sin antetítulo en mayúsculas (PL-A2, A3, A6, A8, A9, M1, M6, M8); fixtures de las 30 semillas | Hecho (ejecución anterior) y fusionado con F1 hoy. **PR sin abrir:** incluye F0, F2, F3 y #117 fusionados (333 archivos contra F1); se abre cuando F0/F2/F3 estén en la oficial o contra una rama que los reúna |
| b | `feat/plantillas-f4-render-v2` | Renderizador v2 (web y nativo) y lector del admin; enciende `DESIGN_V2_ACCEPTED`; Marfil, Piñata y Gala art déco como documentos v2 con su ficha (composición móvil y escritorio, firma, animación), claro y oscuro | Pendiente |
| c1 | `…-grupo-bodas` | Jardín botánico, Rosa antiguo, Editorial, Editorial granate, Editorial oliva, Bodas de oro y plata, Pedida | Pendiente |
| c2 | `…-grupo-fiestas` | Festivo, Fiesta lila, Cumpleaños adulto, Fiesta tematica, Fin de año, Despedida, Reencuentro | Pendiente |
| c3 | `…-grupo-infantil-y-ritos` | Cielo de bautizo, Menta infantil, Baby shower, Primera comunión, Graduación | Pendiente |
| c4 | `…-grupo-sobrio` | Minimalista, Arena y terracota, Corporativo, Corporativo grafito, Inauguración, Fiesta patronal, Otros | Pendiente |
| z | `feat/plantillas-f4-migracion-p20` | Migración explícita en Template/Media: las 16 conservan `key` e id determinista y pasan a una versión v2 publicada; las celebraciones existentes la toman con conversión v1→v2 sin perder contenido ni fotos | Pendiente (depende de #135 y de b) |

## Menores de #117 que este trabajo corrige

G1, M1 y M2 se corrigen en los prototipos de esta rama (evidencia en `docs/progress/evidence/plantillas-f4/README.md`) y la rama b debe medirlos en el motor real.
