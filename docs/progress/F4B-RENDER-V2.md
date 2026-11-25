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
Semilla Marfil a la rejilla de 8 px y con sello relleno; isla de credencial voltea todos los botones (dock y sección); `readDesign` valida tipos y rangos y descarta elementos nulos; oscuro propio aplicado con reglas (no en línea); `scroll-padding` y relleno de página para el dock; navegación bajo la portada en una fila; intro de Regalos/Confirmar alineada; banderines rellenos de tinta; hover con color; el encabezado del sitio deja de ser sticky en invitaciones (compartía el borde superior con el dock). **Composición de las fichas (M1 de b), dentro del contrato 1.2.0:** Marfil en escritorio 5/6 con el separador de dos anillos (ornamento `anillos-dobles`) y sello relleno; Piñata en columnas en escritorio, con banderines y piñata en acento; Gala simétrica (todo centrado) con las iniciales de los anfitriones en grande. **Decisión del orquestador: no se siembran números fijos** (un «6» o «25» constante sería falso en celebraciones reales y duplica el título). El contrato 1.2.0 no liga un texto a un dato de la celebración (`text.config.text` es fijo), así que la cifra destacada del prototipo (el «6» de Piñata, el «25» de Gala) **necesita un campo de contrato (edad/aniversario)**: pregunta 13. 

## Cambios de la ronda 2 (revisiones a y b)
- **VM1 (mayor, Marfil):** el «AL» ya no es una cápsula rellena del color de «Ver regalos». Es un sello circular en tinta con borde fino de 1 px (`border` del contrato, sin `background`), de 104 px, centrado en el eje de la portada (arco, título y regla de anillos; a 1280 queda en `x7 w2` bajo el filete, que pasa a `x5 w6` como el título). Mismos bytes en BE `seeds/templates/design-v2/marfil.json`.
- **Estado de foto con error:** `src/photo.tsx` (`Photo`, cliente). Con la foto cargada es el mismo `<img>`; si falla (evento `error` o ya fallada antes de hidratar: se comprueba `complete`/`naturalWidth` al montar) se sustituye por una caja de la misma clase y proporciones sobre la superficie de la paleta con el dibujo `camara` en tinta; con `alt` conserva `role="img"` y nombre. Cubre portada, bloque `image` y galería. La portada del renderizador v1 (`celebration-hero-image`) no cambia.
- **«Ver regalos» en OPEN, EMPTY y CLOSED (costura `giftsStatus`, BE #128 sin conectar):** textos propios `celebration.gifts.ctaEmpty` y `ctaClosed` (es-BO y en-US) en `GIFTS_CTA_KEYS`, sin usar ni crear `gifts.guest.cta.*`. El botón es siempre visible y enlaza a `/c/{slug}/regalos`; cambian palabras y aspecto (`data-gifts-status`: OPEN relleno de acento, EMPTY contorno discontinuo sobre la superficie, CLOSED contorno liso en gris), todo con roles de paleta y AA en claro y oscuro. Sin `giftsStatus` no hay atributo y el marcado de v1 no cambia.
- **m1:** de 600 a 899 px los dibujos de portada se detienen en 13 rem; a 768 con foto el título arranca en y=614 (Marfil) y 654 (Piñata) frente a la barra en 839 (antes 848 y 887).
- **m3:** título, dibujo y primera línea de cada sección forman un grupo: 16 px entre título y dibujo (antes 60 a 90); la separación de sección se reparte mitad arriba y mitad abajo del título.
- **m5 (a):** `readDesign` descarta `typography.monogram` si no pasa `isFont`; `designFontStylesheet` ya no puede lanzar. Caso en `render.test.tsx`.
- **m5/m6 (b y a):** capturas de evidencia por viewport (no `fullPage`), todas recapturadas, incluida `pinata-sinfoto-1280-dark.png`; se añaden `marfil-sello-*`, `*-foto-error-*` y `regalos-{open,empty,closed}-390`.

## Límites honestos del contrato 1.2.0 (preguntas para Pablo)
1. **Firmas de movimiento** (ventana de arco que se traza, puertas deco, piñata que se mece): el contrato solo ofrece entradas `fade|rise|scale|draw|envelope`. Se aproximan; la firma completa pide ampliar el contrato (animaciones nombradas por plantilla o una `frame`/`mask` de elemento).
2. **Arco de la foto de Marfil** y **chaflán/doble línea de Gala**: el arco sale de CSS de la variante `classic`; el chaflán no es expresable (el elemento solo tiene `radius`).
3. **Enlace `url`**: el renderizador acepta `https` y lo marca `nofollow`, pero no conoce los dominios de proveedores registrados; reescribirlos a `/r/{listingId}` exige ese registro (F5/F6).
4. **Cursivas**: no se piden a Google Fonts (no toda familia las tiene); las fechas «en cursiva» del prototipo van en romana.
5. M3 (oscuro propio de las 30) lo resuelve la rama z al migrar cada semilla a v2; el v1 sigue con el oscuro derivado.

## Reversión
BE: `DESIGN_V2_ACCEPTED=false` y redeploy: POST/PATCH de v2 vuelven a 422 `DESIGN_V2_NOT_AVAILABLE` y el admin deja de listar filas v2. Un v2 ya publicado se sigue leyendo en lo público; para retirarlo, `POST /templates/{id}/archive`. FE: revertir el PR (el v1 no cambia salvo el dock y B2/M4).

## Verificación (ejecutado el 2026-11-25, tras la ronda 2 de las revisiones a y b)
- `eslint . --max-warnings 0` → 0. `tsc --noEmit` en celebration-theme, seo-web, universal y query-hooks → 0.
- vitest: celebration-theme **2492**, seo-web **196/196**, universal **667/667** (57 archivos). `next build` de seo-web → 0.
- Playwright (Chrome 158 real, `next build` + `next start`, API de contrato `fixture-api.mjs`, **no** el backend real): `e2e/plantillas-v2.spec.ts` → **179 pasadas** (101 anteriores más sello de Marfil, título sobre la barra a 768, 16 px bajo el título, foto con error y los tres estados de «Ver regalos» en claro y oscuro a 320/390/1280): «Ver regalos» visible, a `/c/{slug}/regalos`, ≥ 44 px y siempre en pantalla; sin desborde; axe a 390 sin violaciones en claro y oscuro; **el lienzo y el titular miden la paleta clara u oscura del documento** (360/768/1280); **con Tab ningún elemento enfocado queda bajo el dock** (360/768/1280); movimiento reducido; `/r/{listingId}`. Una primera corrida con el servidor aún arrancando dio 13 fallos que no se repitieron (arranque en frío); la corrida válida es la última.
- BE (`wt-be-f4b`, Postgres 16 real con rol `template_owner` NOSUPERUSER NOBYPASSRLS, venv con `requirements.txt`): `manage.py test tests` → **233 pruebas OK** (incluye las tres semillas por `validate_design` sin avisos) (3 omitidas), `ruff check` OK, `manage.py check` OK.
- Sin ejecutar: recorrido con backend real, iOS/Android, Safari/Firefox, lector de pantalla, gitleaks, `harness:validate`, `contracts check:source`, Playwright de `apps/universal`.

## Líneas base macOS que cambiarían (no se tocó ninguna)
Todas las que dibujan una invitación v1: `celebracion-publica-{360,768,1280}` (seo-web), `host-templates-*`, `host-vista-previa-*` y las de invitado de la app, por el dock fijo de regalos, los titulares en tinta, las barras de acento a filete y el velo editorial. Regenerar en el Mac de Pablo y revisar a ojo.
