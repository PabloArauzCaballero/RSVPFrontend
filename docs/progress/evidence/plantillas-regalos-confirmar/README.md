# Regalos y confirmar en el mismo bloque (seguimiento 2, decisión 8 de FE #114)

Fecha: 2026-11-26. Base: `origin/chore/deploy-contabo-coolify` (e299654b). Corrige: PL-114-D8.

- Capturas (Chrome real, fixture de contrato, sin credencial): `{v1-clasico,marfil,pinata}-{360,768,1280}-{light,dark}.png`, recorte de la sección de respuesta.
- Mediciones numéricas de 120 combinaciones (10 plantillas x claro/oscuro x 360/768/1280 x con/sin credencial): `mediciones.json`.
- Producidas con `apps/seo-web/e2e/plantillas-regalos-confirmar.spec.ts` (141 pruebas) contra `next build` + `next start -p 4203` y `scripts/fixture-api.mjs` (PORT=28103). Evidencia de renderizado, no es el backend real.
- Resumen: altura 52.47 px en ambos botones (diferencia 0), ancho igual (diferencia 0), mínimo de contraste texto/relleno 5.56:1, mínimo de contraste relleno/fondo 3.65:1, objetivo táctil mínimo 52.47 px de alto.
