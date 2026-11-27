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

## Corrección de la ronda 2 (2026-11-27, macOS, Node 24.18.1, Chrome real, fixture de contrato)

| Corrida | SHA | Resultado |
|---|---|---|
| `celebration-theme`: `tsc --noEmit`, `vitest run` | `6ce7e4a3` | exit 0; 18 archivos, 3394 pruebas pasan |
| `i18n` / `seo-web`: `tsc`, `vitest run` | `14e46a8e` + oficial `470144bf` + arreglo R2-04 | exit 0; 15 y 210 pasan |
| `eslint --max-warnings 0` (área y las dos e2e), `harness:validate`, `contracts` (6), `test-filters` (5), gitleaks sobre el rango | igual | exit 0; sin fugas |
| `next build` de seo-web | `5dad9c10` y `6ce7e4a3` | exit 0 |
| `playwright.actions.config.ts` | `5dad9c10` | 498 pruebas: **486 pasan, 12 fallan**, todas de `pinata`: aire 20 px < 24. Las 62 de OPEN/EMPTY/CLOSED y las 62 de axe pasan |

- Los 12 fallos se corrigen en `6ce7e4a3` (piso de 1.5rem). **Esa punta NO se repitió en Chrome:** el disco compartido bajó a 4,9 GB, bajo el límite de 5 GB, y se detuvieron las corridas pesadas. Que `pinata` pase a 24 px sale del cálculo de la regla, no de una medición.
- **No corridas en la ronda 2:** batería F6 (`playwright.f6.config.ts`; la última completa es la de la revisión (a) sobre `fff430b2`: 454 pasan, anterior a estos cambios de CSS) y `plantillas-v2.spec.ts` (`playwright.v2.config.ts`, cuya aserción de los tres estados cambió en `14e46a8e`).
- Sin mediciones ni capturas nuevas versionadas: las capturas y los JSON de esta carpeta son de rondas anteriores y no muestran el CSS actual (EMPTY/CLOSED, aire, eje, ancho de 44rem). Desde `14e46a8e` la e2e escribe `mediciones-<pid>.jsonl` fila a fila.
- Sigue sin probar: backend real, estado de la lista con la API real (en Chrome se fuerza en el DOM), en-US en Chrome, Safari/Firefox, lector de pantalla y líneas base de macOS (no regeneradas).
