# L13 — líneas base visuales de la app desfasadas (2026-11-21)

`playwright test` en `origin/chore/deploy-contabo-coolify` (macOS, Chrome real): **56 failed / 133 passed** sin ningún cambio. Revisé cada pantalla comparando base, actual y diferencia (16 pantallas, 56 capturas).

## Clasificación

| Pantalla (capturas) | Diferencia | Tipo |
|---|---|---|
| auth-login (5), auth-registro (5) | La pantalla mostraba «We couldn't restore your session» en lugar del formulario | **Fallo del entorno de prueba**, corregido aquí |
| portal-agenda (3) | La línea base congeló la clave sin traducir `PORTAL.AGENDA.STATUS.PENDING`, sin el botón Confirmar | **Fixture fuera de contrato**, corregido aquí |
| guest-regalos (5) | Filtros nuevos (precio, origen, «solo disponibles») y «Volver a la celebración» | Intencional (PRs ya fusionados) |
| host-editor-general (5) | Fecha y hora con el selector propio («Elegir fecha») | Intencional |
| admin-metricas (3) | Campos de fecha nativos y texto de ayuda nuevo | Intencional |
| guest-rsvp (3), host-regalos-catalogo (3), portal-* (servicios, productos, perfil, métricas, leads, entrega, documentos, destinos: 24) | Todo el contenido baja 1-2 px; el texto y los colores son iguales | Desplazamiento global, sin cambio visible |

Ninguna regresión del producto: el login desplegado en TEST muestra el formulario (`/api/identity/auth/refresh` responde 401 sin cookie).

## Causas corregidas en este PR

1. `packages/testing/src/contract-server.ts`: el preflight CORS del mock no permitía `X-Session-Transport`, que Kong sí permite (`RSVPBackend infra/kong/kong.yml:221`). La recuperación de sesión de la web (commit 52af3eb) falla con `net::ERR_FAILED` y la app muestra «No pudimos restaurar tu sesión». La lista ahora es `ALLOWED_HEADERS`, igual a la de Kong.
2. `apps/universal/scripts/visual-fixtures.ts`: el mock respondía 404 a `POST /identity/auth/refresh`. Ahora responde 401 (Problem Details), como Identity sin cookie.
3. El mismo archivo enviaba una reserva con `status: "PENDING"`, que no existe en `BookingStatus` del contrato (`REQUESTED | CONFIRMED | REJECTED | CANCELLED | EXPIRED`). Ahora envía `REQUESTED`.

Prueba nueva `apps/universal/test/visual-mock.test.ts`: los headers del cliente de Identity pasan el CORS del mock, `refresh` sin cookie da 401 y las reservas del fixture usan estados del contrato.

Tras los arreglos: **51 failed / 5 passed** de las 56. Las 5 que pasan son las de login y registro (oscuro y 1440 px).

## Por qué no se regeneran todavía

Por pedido de rsvp-1e (integración): los PRs de integración FE #74 a #80 cambian pantallas (ErrorBoundary, `lang` y tema en el HTML, carga diferida, regalos, cotizaciones, invitaciones, íconos). Regenerar ahora obligaría a hacerlo otra vez. **Pendiente:** después de fusionar #80, correr `playwright test --update-snapshots` sobre la rama oficial y revisar a ojo solo las pantallas de la tabla.

| Comando | Resultado |
|---|---|
| `@rsvp/universal test` | 459 passed |
| `yarn lint:code`, `yarn typecheck`, `harness:validate` | exit 0, exit 0, válido |
| `playwright test -g <las 56>` antes / después | 56 failed / 51 failed, 5 passed |

---

# L13 · regeneración final sobre `integracion/fe-07-web-e-higiene` (2026-11-23)

Base: `a4d4fb0` (fe-07 con #87, #88, #89, #90, #91, #92, #93 y L19). macOS, Chrome del sistema (`CHROMIUM_PATH`), contra los mocks de contrato (`apps/seo-web/scripts/fixture-api.mjs` y `apps/universal/scripts/visual-mock.ts`). Revisé **cada** captura que falló (esperada, actual y diferencia), no una muestra.

| Suite | Antes | Regeneradas | Después |
|---|---|---|---|
| `@rsvp/seo-web test:visual` | 13 failed / 21 passed (34) | 13 | **34 passed** |
| `@rsvp/universal test:visual` | 77 failed / 112 passed (189) | 68 (67 + `host-acompanantes-390`, ver abajo) | **179 passed / 10 failed**: las 10 de la regresión A26, a propósito |

El análisis previo contaba 22/34 en seo-web; #92 ya había regenerado 9 (M21), por eso quedan 13. En la app eran 79; hoy fallaron 77.

## seo-web (13, todas intencionales)

| Captura | Motivo | PR/ID |
|---|---|---|
| `catalogo` light/dark 360, 768 (4) | El pie suma «Política de privacidad» y «Términos de uso»: a 360 los enlaces pasan a dos filas y a 768 el selector de idioma baja a su propia fila (`.site-footer__cols` es `flex-wrap`, así está diseñado). Además, 1-2 px en la flecha nativa de `<select>` | B6 (FE #61) |
| `landing-360` | Mismo pie legal; el resto de la portada (dibujos de #87) ya estaba en la línea base | B6 (FE #61) |
| `celebracion-publica` 360, 768 | Pie legal | B6 (FE #61) |
| `directorio` 360, 768 | Pie legal y flecha de `<select>` | B6 (FE #61) |
| `directorio-busqueda` 360, 768 y `directorio-categoria` 360, 768 | Pie legal; la lupa del estado vacío usa el pastel gris de la app (`--pastel-gray-bg` con borde) en vez de `--tone-gray-bg` | B6 (FE #61), FE #72 y #89 |

Las capturas de 1280 no fallaron: el pie cabe en una fila y la diferencia queda bajo el umbral.

**Observación, no regenera nada:** la portada de la celebración muestra «Faltan N días» calculado con la hora real del servidor (`packages/celebration-theme/src/renderer.tsx`, `new Date()`), y la suite de seo-web no fija el reloj. Hoy son 73 px, bajo el umbral de 0,2 %. Desde el 2026-12-19, fecha del fixture, cambia el texto. Lo anoté en L13.

## App (`apps/universal`)

### Regresión encontrada, NO regenerada (10)

`guest-rsvp` 390/768/1440, `guest-rsvp dark` 390/1440, `guest-regalos` 390/768/1440 y `guest-regalos dark` 390/1440, todas del proyecto con sesión (`authed`). La pantalla se queda para siempre en «Abriendo tu invitación…» / «Opening the list…» ([captura](regresion-guest-rsvp-cargando-390.png)). Sin sesión (`anon`) carga bien.

Causa (reproducida a mano con Chrome real contra el mock): B12 (FE #59, `packages/query-hooks/src/session-scope.ts`). En la web la sesión se restaura de forma asíncrona, así que el usuario pasa de anónimo a la persona **mientras** la página pública ya pidió la celebración. `switchUser` cancela esa petición, hace `query.reset()` y `client.clear()`. El `reset` solo cambia `fetchStatus` (la consulta ya estaba `pending`), que las pantallas no leen, así que React Query no vuelve a pintar la pantalla, el observador sigue colgado de la entrada borrada y nadie vuelve a pedirla. Lo comprobé con un registro temporal en `GuestRsvpScreen`: al leer también `fetchStatus` la pantalla carga (6/6), sin él se queda cargando (4/4).

No lo corregí aquí. Es código de privacidad (B12) y la corrección no es trivial: volver a pedir con las opciones del observador ejecuta la `queryFn` antigua (cierre de la cuenta anterior), y la prueba de B12 «cambio de cuenta sin cerrar sesión» lo detecta. Queda registrado como **A26** en el catálogo, con la prueba que lo reproduce. Estas 10 líneas base se regeneran cuando A26 se corrija.

### Intencionales, regeneradas (68)

| Captura | Motivo | PR/ID |
|---|---|---|
| Todas las de abajo, además de su motivo propio | El documento web ahora aplica `-webkit-font-smoothing: antialiased`, `font-feature-settings: "cv11","ss01"` y `text-wrap: balance` en títulos, y carga Geist 700. Antes `+html.tsx` no se usaba en la exportación de una sola página. El texto se ve más fino, algunos títulos cortan en otra palabra y todo se mueve 1-2 px | M12 (FE #60) |
| `auth-login` 390, 768, 1440, dark 1440 | A 1440, la escena nueva (disco, sombra de contacto y banderines) en lugar del dibujo de línea. En oscuro, la sombra es visible ([captura](final-app-login-escena-oscuro-1440.png)) | FE #48, L16 (FE #88) |
| `auth-registro` 390, 768, 1440, dark 390, dark 1440 | Casilla «Acepto los Términos de uso y la Política de privacidad», y «Crear mi cuenta» deshabilitado hasta marcarla ([captura](final-app-registro-terminos-390.png)). A 1440, la escena de la mesa | B6 (FE #61), FE #48 |
| `guest-rsvp-publico` 390, dark 390; `guest-rsvp-invalido` 390 | Solo la tipografía y el corte de los títulos | M12 (FE #60) |
| `host-publicar` 390, 768, 1440, dark 390, dark 1440 | Interruptor «Mostrar en buscadores» ([captura](final-app-publicar-indexacion-390.png)) | M10 (FE #55) |
| `host-editor-general` 390, 768, 1440, dark 390, dark 1440 | Fecha y hora con el selector propio («Elegir fecha», «Elegir hora») en vez de los campos nativos | FE #13 |
| `host-configuracion` dark 390, dark 1440 | Plazo del RSVP: «FECHA» sin «(AAAA-MM-DD)» y hora con el reloj propio en el idioma de la app («2:00 PM» y no el «02:00 p. m.» nativo) | FE #13 |
| `admin-operacion` 390, 768, 1440 | Sin el menú ⋯ de Grafana/RabbitMQ (no están configurados) y la ilustración de servicios como escena ([captura](final-app-admin-operacion-390.png)) | L8 (FE #65), FE #48 |
| `admin-metricas` 390, 768, 1440 | Campos de fecha nativos y «Los días se cuentan en UTC» | Ya clasificado en FE #82 |
| `portal-agenda` 390, 768, 1440 | Estado «PENDING» traducido con Confirmar y ⋯, encabezado «1 fecha por confirmar», horas con el reloj propio | FE #82 (fixture), FE #13 |
| `portal-leads` y `portal-metricas` 390, 768, 1440 | Pestaña nueva «Cotizaciones»; a 1440, la escena del gráfico | B11 (FE #57), FE #48 |
| `host-regalos-catalogo` 390, 768, 1440 | «Ya está en tu lista» con 4 px menos de espacio | M12 (FE #60) |
| `portal-destinos`, `-documentos`, `-entrega`, `-perfil`, `-productos`, `-servicios` (390, 768 y 1440 de cada uno); `portal-inicio` 390, dark 390; `host-regalos` dark 390; `host-editor-galeria`, `host-invitados-importar`, `host-modos` y `host-preferencias` 390 | Solo tipografía y desplazamiento de 1-2 px: mismo texto y mismos colores | M12 (FE #60) |
| `host-acompanantes-390` | No falló en la primera corrida y sí en la de regeneración: solo antialiasing (M12), al borde del umbral. La revisé igual: mismo texto y mismos colores | M12 (FE #60) |

**Observaciones (no son regresiones):** a 390 px el campo de hora del editor corta el texto de ayuda («Choose a ti…») en en-US. Los campos de fecha que siguen siendo nativos (admin-metricas, plazo del RSVP) muestran el formato del idioma de Chrome, no el de la app, así que en otra máquina la línea base puede cambiar.

## Corrida final

Comandos (exit code y resultado, 2026-11-23, `CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`):

| Comando | Resultado |
|---|---|
| `yarn workspace @rsvp/seo-web test:visual` (antes) | exit 1 · 13 failed / 21 passed |
| `yarn workspace @rsvp/universal test:visual` (antes) | exit 1 · 77 failed / 112 passed |
| `... @rsvp/seo-web test:visual --update-snapshots` | exit 0 · 34 passed · 13 PNG cambiadas, las 13 revisadas |
| `... @rsvp/universal test:visual --update-snapshots --grep-invert "guest-(rsvp\|regalos) "` | exit 0 · 179 passed · 68 PNG cambiadas: las 67 revisadas y `host-acompanantes-390` |
| `yarn workspace @rsvp/seo-web test:visual` (después) | exit 0 · **34 passed** |
| `yarn workspace @rsvp/universal test:visual` (después) | exit 1 · **179 passed / 10 failed** (solo `guest-rsvp`/`guest-regalos` con sesión: A26) |
| `... @rsvp/universal test:visual -g "admin-moderacion\|host-acompanantes" --repeat-each 3` | exit 0 · 18 passed (la intermitente conocida, admin-moderacion 768, y host-acompanantes, 3 veces cada una) |
| `yarn harness:validate` | exit 0 |
| `gitleaks detect --no-git --source docs/progress/evidence/l13-lineas-base` | sin hallazgos |

**No verificado:** las líneas base de Linux (`-linux.png`, workflow `visual-baselines`), iOS y Android. Tampoco verifiqué A26 en TEST con una sesión real; lo reproduje con el mock local y el token de desarrollo.
