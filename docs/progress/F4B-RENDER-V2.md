# F4 b · renderizador del documento de diseño v2 (estado)

Rama FE `feat/plantillas-f4b-render-v2` (sobre `feat/plantillas-f4-rediseno`), rama BE `feat/plantillas-f4b-v2` (sobre `feat/plantillas-f4-semillas`).

## Qué hay
- `packages/celebration-theme/src/design/read.ts`: lectura defensiva del documento (un v2 ilegible cae a la plantilla neutra, nunca rompe la página pública), pila tipográfica, hoja de Google Fonts con los pesos exactos del documento, layout derivado de los tokens.
- `src/theme.ts`: `themeFromTemplate` acepta v2; `paletteFor`, `accentFill`, `layoutOf`, `themeVariables`, `fontStylesheet` leen la paleta clara **y** oscura propias del documento (P8). El lector nativo y el admin heredan esto.
- `src/design/render.tsx` + `styles.css` (bloque «Design document v2»): lienzos en cuadrícula (móvil; de 900 px el de escritorio), 21 tipos de bloque (los que no dibuja —vídeo, música, mapa, grupo nupcial, HTML— se omiten, nunca a medias), enlaces `listing` → `/r/{listingId}`, `gifts` → `/c/{slug}/regalos`, entradas de movimiento una vez y sin movimiento si el sistema lo reduce, oscuro del sistema cuando la página no fuerza esquema.
- `src/dock.tsx`: **P22/M1**: barra inferior fija (<900 px) y cabecera fija (≥900 px) con «Ver regalos» y la respuesta, en v1 y v2. Ningún documento puede ocultarla.
- Tres documentos: `src/design/documents/{marfil,pinata,gala}.json` (los mismos bytes que `seeds/templates/design-v2/` del BE).
- Admin: una plantilla v2 se abre en solo lectura (el editor de diseños es F5).
- Revisión de F4 a: B2 (titulares en tinta, barras de acento a filete), M1 (dock), M2 (ornamento de la plantilla en cualquier layout), M4 (foto editorial a brightness .35: 7:1 con foto blanca, probado).

## Cambios de las revisiones (a) y (b) de la ronda 1
Semilla Marfil a la rejilla de 8 px y con sello relleno; isla de credencial voltea todos los botones (dock y sección); `readDesign` valida tipos y rangos y descarta elementos nulos; oscuro propio aplicado con reglas (no en línea); `scroll-padding` y relleno de página para el dock; navegación bajo la portada en una fila; intro de Regalos/Confirmar alineada; banderines rellenos de tinta; hover con color; el encabezado del sitio deja de ser sticky en invitaciones (compartía el borde superior con el dock). **No cerrado, por el contrato 1.2.0 o por tiempo:** composición 5fr/6fr de Marfil, «6» en acento y columnas de Piñata, eje simétrico y cifra de Gala, separador de dos anillos (hoy `filete`), estado de foto con error, `giftsStatus` (costura hasta BE #128).

## Límites honestos del contrato 1.2.0 (preguntas para Pablo)
1. **Firmas de movimiento** (ventana de arco que se traza, puertas deco, piñata que se mece): el contrato solo ofrece entradas `fade|rise|scale|draw|envelope`. Se aproximan; la firma completa pide ampliar el contrato (animaciones nombradas por plantilla o una `frame`/`mask` de elemento).
2. **Arco de la foto de Marfil** y **chaflán/doble línea de Gala**: el arco sale de CSS de la variante `classic`; el chaflán no es expresable (el elemento solo tiene `radius`).
3. **Enlace `url`**: el renderizador acepta `https` y lo marca `nofollow`, pero no conoce los dominios de proveedores registrados; reescribirlos a `/r/{listingId}` exige ese registro (F5/F6).
4. **Cursivas**: no se piden a Google Fonts (no toda familia las tiene); las fechas «en cursiva» del prototipo van en romana.
5. M3 (oscuro propio de las 30) lo resuelve la rama z al migrar cada semilla a v2; el v1 sigue con el oscuro derivado.

## Reversión
BE: `DESIGN_V2_ACCEPTED=false` y redeploy: POST/PATCH de v2 vuelven a 422 `DESIGN_V2_NOT_AVAILABLE` y el admin deja de listar filas v2. Un v2 ya publicado se sigue leyendo en lo público; para retirarlo, `POST /templates/{id}/archive`. FE: revertir el PR (el v1 no cambia salvo el dock y B2/M4).

## Verificación (ejecutado el 2026-11-25, tras las revisiones a y b)
- `eslint . --max-warnings 0` → 0. `tsc --noEmit` en celebration-theme, seo-web, universal y query-hooks → 0.
- vitest: celebration-theme **2470**, seo-web **196/196**, universal **667/667** (57 archivos). `next build` de seo-web → 0.
- Playwright (Chrome 158 real, `next build` + `next start`, API de contrato `fixture-api.mjs`, **no** el backend real): `e2e/plantillas-v2.spec.ts` → **101 pasadas**: «Ver regalos» visible, a `/c/{slug}/regalos`, ≥ 44 px y siempre en pantalla; sin desborde; axe a 390 sin violaciones en claro y oscuro; **el lienzo y el titular miden la paleta clara u oscura del documento** (360/768/1280); **con Tab ningún elemento enfocado queda bajo el dock** (360/768/1280); movimiento reducido; `/r/{listingId}`. Una primera corrida con el servidor aún arrancando dio 13 fallos que no se repitieron (arranque en frío); la corrida válida es la última.
- BE (`wt-be-f4b`, Postgres 16 real con rol `template_owner` NOSUPERUSER NOBYPASSRLS, venv con `requirements.txt`): `manage.py test tests` → **233 pruebas OK** (3 omitidas), `ruff check` OK, `manage.py check` OK.
- Sin ejecutar: recorrido con backend real, iOS/Android, Safari/Firefox, lector de pantalla, gitleaks, `harness:validate`, `contracts check:source`, Playwright de `apps/universal`.

## Líneas base macOS que cambiarían (no se tocó ninguna)
Todas las que dibujan una invitación v1: `celebracion-publica-{360,768,1280}` (seo-web), `host-templates-*`, `host-vista-previa-*` y las de invitado de la app, por el dock fijo de regalos, los titulares en tinta, las barras de acento a filete y el velo editorial. Regenerar en el Mac de Pablo y revisar a ojo.
