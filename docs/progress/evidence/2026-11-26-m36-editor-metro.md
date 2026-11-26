# M36 · Carga del panel y del editor web

Regresión observada el 26 de noviembre de 2026. El HTML de `/celebraciones`,
el login y la salud de Identity devolvieron HTTP 200. Al arrancar los archivos
publicados en Chrome con un refresh de sesión de prueba, el panel mostró
«Esta parte no se pudo mostrar». La consola registró
`TypeError: Cannot read properties of undefined (reading 'stringify')` en
`screens-1581a82eefa9d35bd021b3e12082089e.js`. El módulo 1397 de ese archivo
tenía 1397 como única dependencia.

El resolver de Metro quitaba `.js` también a las importaciones de dependencias
externas. En PostCSS resolvía `./postcss.js` al propio `postcss.mjs`.
[El PR #142](https://github.com/PabloArauzCaballero/RSVPFrontend/pull/142)
corrigió el resolver y entró a la rama de despliegue en `58ddce68`, base de
este cambio.

CodeGraph y los archivos de las rutas confirman que `/celebraciones` cargaba
el editor por el export de `src/host/screens.ts`. `/diseno` ahora importa su
pantalla al abrirse y tiene su propio límite de error. El fallo de descarga
se puede reintentar desde esa misma ruta. El archivo JavaScript compartido
del panel pasó de 670 kB en el build publicado a 234 kB en este export.

## Verificación

- `yarn workspace @rsvp/universal build` salió con código 0 con Node 24.18.1
  y la API en `/api`. Metro emitió `design-editor-screen-*.js` por separado
  y el archivo nuevo no contiene autoimportaciones del módulo de PostCSS.
- Chrome reprodujo el error con los archivos publicados y una sesión
  sintética. El recorrido del build candidato usó Identity, Celebration y
  Template/Media del backend `68c2b25b`, con PostgreSQL, Redis, RabbitMQ y
  MinIO detrás de Kong en un proyecto Docker local.
- En 360, 768 y 1280 px, en ambos idiomas y temas, el listado cargó sin pedir
  el JavaScript del editor. Al abrir el editor se descargó su archivo y se
  restauró la sesión. Axe no registró violaciones críticas o serias en ambas
  pantallas. Las capturas son del entorno local.
- El guardado del borrador devolvió HTTP 200 y una lectura a Template/Media
  verificó el color nuevo y el incremento de versión. Una celebración
  inexistente devolvió 404. Tras interrumpir una sola descarga del editor,
  «Reintentar» volvió a abrir el editor en la misma celebración.
- Lint, tipado, validación del harness, `check:generated` y `check:source`
  terminaron con código de salida 0. Los ocho contratos corresponden al
  commit del backend fijado en `backend.lock.json`.

La captura a 768 px mostró superposición de paneles del editor. El HTML
publicado y el del candidato referencian el mismo archivo CSS
`editor-8758c018b8d25d5b02004485ddd554a5.css`.

## Prueba de restauración en CI

La prueba de `versions.test.tsx` superó su límite de cinco segundos al
ejecutar cinco escenarios dentro de un solo caso. Los errores 409, 401, 403
y 422 y la pérdida de conexión ahora se prueban por separado con el mismo
límite por caso. Cada prueba verifica su mensaje y que el borrador se
conserve. El 409 también comprueba el estado de conflicto.
[Ejecución que registró el timeout](https://github.com/PabloArauzCaballero/RSVPFrontend/actions/runs/45902783888/job/140192308213)

## Reversión

Revertir este PR en `chore/deploy-contabo-coolify`.
