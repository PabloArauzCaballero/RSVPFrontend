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

## Verificación de la punta fusionada con la oficial (2026-11-27, Linux, Node 22, Chrome real `/usr/bin/google-chrome`, fixture de contrato)

Merge de `origin/chore/deploy-contabo-coolify` (`0fdd74f63`: #156 visor de galería, #112, #161, #146, #160) sobre `2a761c50`. Único conflicto: el snapshot de `renderer.test.tsx`; se conservó el del PR y se regeneró con la galería de la oficial (solo cambia el carrusel y el botón «ampliar»). `next build` + `next start` sobre el fixture, una sola corrida por suite, sin reintentos.

| Corrida | Resultado |
|---|---|
| `celebration-theme`: `tsc --noEmit`; `vitest run` | exit 0; 18 archivos, 3395 pruebas pasan |
| `i18n` `vitest run`; `seo-web` `tsc --noEmit`, `vitest run` | 16 pasan; exit 0; 25 archivos, 211 pasan |
| `eslint --max-warnings 0` (13 archivos `ts/tsx/mjs` del PR), `validate-harness` | exit 0; carriles, skills y recarga válidos |
| `next build` de seo-web | exit 0 |
| `playwright.actions.config.ts` | **498 pasan, 0 fallan** (8,3 min); incluye las 16 de `pinata` (los 12 de aire 20 px < 24 px del `5dad9c10` pasan con `6ce7e4a3`) |
| `playwright.v2.config.ts` (`plantillas-v2.spec.ts`) | primera corrida 125 pasan, **54 fallan**; tras corregir la aserción, **179 pasan, 0 fallan** (3,0 min) |
| `playwright.f6.config.ts` (medios + ataques + libre) | **454 pasan, 0 fallan** (12,1 min): 414 ataques, 35 medios, 5 libre |

- Causa raíz de los 54 fallos de v2 (marfil, gala, piñata; OPEN/EMPTY/CLOSED): `4ac7a191` cambió la aserción del dock a `borderTopStyle === "none"`, pero el reinicio de Tailwind deja el estilo en `solid` con ancho `0px`. El botón no tiene borde (lo que pide la decisión 8); la prueba ahora mide `borderTopWidth === "0px"`. No se baja ningún umbral ni se quita aserción: el criterio sigue siendo «sin borde propio».
- Mutación (revertida): quitar el piso `max(1.5rem, ...)` de `.cdesign-actions` en `styles.css` hace fallar 1 prueba (`PL-139-R2-V2/V3/V4`; 3394 pasan de 3395).
- Los JSON y capturas versionados son de rondas anteriores; no se regeneraron líneas base ni mediciones.
- Sigue sin probar: backend real, estado de la lista con la API real (en Chrome se fuerza en el DOM), en-US en Chrome, Safari/Firefox, lector de pantalla, líneas base de macOS, `contracts:validate`, gitleaks.
