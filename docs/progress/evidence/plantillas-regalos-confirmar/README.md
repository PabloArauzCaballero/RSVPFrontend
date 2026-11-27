# Regalos y confirmar en el mismo bloque (seguimiento 2, decisión 8 de FE #114)

Actualizado en la corrección de la ronda 1 (2026-11-27). Las capturas son de esa ronda (ya con la página de regalos conservada y el bloque con `z-index: 1000`).

Fecha: 2026-11-26. Base: `origin/chore/deploy-contabo-coolify` (e299654b). Corrige: PL-114-D8.

- Capturas (Chrome real, fixture de contrato, sin credencial): `{v1-clasico,marfil,pinata}-{360,768,1280}-{light,dark}.png`, recorte de la sección de respuesta.
- Mediciones numéricas de 120 combinaciones (10 plantillas x claro/oscuro x 360/768/1280 x con/sin credencial): `mediciones.json`.
- Producidas con `apps/seo-web/e2e/plantillas-regalos-confirmar.spec.ts` (141 pruebas) contra `next build` + `next start -p 4203` y `scripts/fixture-api.mjs` (PORT=28103). Evidencia de renderizado, no es el backend real.
- Resumen: altura 52.47 px en ambos botones (diferencia 0), ancho igual (diferencia 0), mínimo de contraste texto/relleno 5.56:1, mínimo de contraste relleno/fondo 3.65:1, objetivo táctil mínimo 52.47 px de alto.

## Corrección de la ronda 1 (PL-139-01 a 08)

- La e2e (`plantillas-regalos-confirmar.spec.ts`) ahora recorre las 30 plantillas v2 en disco más el v1 clásico (antes 10), y mide también el dock (ambos botones, mismo peso y ancho, respuesta primero, no cubierto, nombre propio), la capa protegida (`position: relative`, `z-index: 1000`), un solo botón de regalos en el cuerpo, sin enlace en la sección de regalos que se conserva y sin lienzos vacíos.
- `mediciones-ronda1.json`: mediciones numéricas de los últimos 5 documentos de la tanda (pinata, pedida-de-mano, primera-comunion, reencuentro, rosa-antiguo; 53 combinaciones registradas de las 60 ejecutadas; el resto pasó pero su fila no llegó al archivo). La primera parte de la corrida (26 objetivos, 363 pruebas) pasó entera, pero el proceso se cortó por el límite de tiempo de la herramienta antes de escribir su JSON: de esas solo hay el resultado «pasa» con las mismas aserciones (umbrales: alto >= 44, texto/relleno >= 4.5, relleno/fondo >= 3, diferencias <= 1 px). `mediciones.json` es el de la ronda anterior (10 plantillas, antes del cambio) y se conserva como referencia.
- Medido en esta tanda: bloque 52.47 px de alto en ambos botones, contraste texto/relleno mínimo 5.56:1, relleno/fondo mínimo 5.31:1; dock con botones de 44 px de alto como mínimo e igual ancho (diferencia 0).
- No probado: en-US en Chrome (el SSR de seo-web no recibe el estado de la lista de regalos, así que EMPTY y CLOSED se cubren solo en pruebas unitarias, 40 plantillas x 3 estados); backend real; líneas base de macOS.
