# Estados de carga de la app universal

Validación del 24 de noviembre de 2026 sobre `chore/deploy-contabo-coolify` en `ba6250a`. Hallazgo M22 del catálogo compartido, relacionado con M12 y M13.

## Reproducción y alcance

Al retener en Chrome la descarga del módulo de anfitrión en `/modos`, la base mostró tres filas de personas. El documento ya tenía `data-theme="dark"`, pero el navegador de Expo pintó su superficie predeterminada `rgb(242, 242, 242)`. Al completar la descarga aparecieron la barra lateral, el título, las pestañas y las tarjetas. El problema se reproduce antes de obtener la celebración.

El navegador usa ahora los colores del mismo proveedor de tema que las pantallas. Mientras llega el módulo, el marco reutiliza el título, la navegación, las pestañas y el ancho de contenido de la ruta. Las 53 rutas diferidas tienen un diseño de carga y textos existentes en ambos idiomas. Las esperas compartidas del anfitrión y del portal usan esos mismos diseños mientras llegan sus datos. El control de acceso conserva la comprobación de la sesión antes de montar las pantallas privadas.

La carga presenta un solo anuncio localizado, usa formas decorativas y respeta el movimiento reducido del componente compartido. El cambio no hace solicitudes adicionales al cargar. La exportación conservó tres módulos diferidos. Los tres archivos JavaScript iniciales pasaron de 561 800 a 564 656 bytes comprimidos con gzip.

## Evidencia

| Comando | Resultado |
| --- | --- |
| `corepack yarn install --immutable` | Salida `0` con el lockfile comprobado. |
| `git diff --check` y `git diff --binary \| gitleaks stdin --redact --no-banner` | Salida `0` y cero hallazgos en el diff. |
| `corepack yarn lint:code` y `corepack yarn harness:validate` | Salida `0`. |
| `corepack yarn workspace @rsvp/contracts check:generated` | Salida `0` y ocho contratos comprobados. |
| `TURBO_TELEMETRY_DISABLED=1 DO_NOT_TRACK=1 corepack yarn turbo run lint typecheck test --concurrency=2` | Salida `0` en 67 tareas. Expo aprobó 645 pruebas. |
| `corepack yarn workspace @rsvp/universal test test/lazy-zones.test.tsx test/theme.test.tsx test/web-shell.test.ts` | Salida `0` y 26 pruebas. El caso de Modos espera el módulo, comprueba el título y verifica que el marco de carga no hace solicitudes. |
| `TURBO_TELEMETRY_DISABLED=1 DO_NOT_TRACK=1 corepack yarn test:coverage` | Salida `0` en 22 tareas. En una primera ejecución simultánea con las compilaciones, una prueba del menú de renombrado de proveedor agotó la espera. La ejecución aislada pasó sin cambiar ese test. |
| `EXPO_PUBLIC_API_URL=/api EXPO_PUBLIC_SITE_URL=http://localhost:8330 EXPO_NO_TELEMETRY=1 DO_NOT_TRACK=1 corepack yarn workspace @rsvp/universal build --clear` | Salida `0` en la base y el candidato. Los dos usos de `/api` se verificaron en las exportaciones. |
| `corepack yarn workspace @rsvp/seo-web build` | Salida `0` con los archivos de fuente descargados previamente. |
| `bash skeleton-browser-run.sh` | Salida `0` en la comparación de Chrome, la matriz, la recarga y el recorrido público. Los scripts y capturas de la muestra se guardaron con la ejecución local. |

Chrome for Testing `151.0.7922.34` con Playwright comprobó Modos de control a 360, 768 y 1280 px, en ambos temas e idiomas. En las 12 combinaciones se retuvieron por separado el módulo y los datos. El título mantuvo su posición, la pestaña activa quedó visible y el fondo oscuro se conservó. La revisión comparó capturas de la línea base y el candidato. Otras nueve rutas del anfitrión, proveedor y admin pasaron a 360 y 1280 px, para 18 casos adicionales. Axe comprobó 43 estados con cero infracciones críticas o serias.

Las pantallas privadas usaron datos de contrato y sesiones locales de prueba para controlar la latencia. Una sesión ausente redirigió a ingreso sin consultar datos privados. Al activar Oscuro en la barra lateral y recargar con el sistema en claro, el modo elegido se mantuvo desde la carga del módulo. El directorio público funcionó contra respuestas HTTPS del Kong desplegado. La evidencia visual corresponde a Expo web, con compilación adicional del sitio Next.js.

## Reversión

Para revertir, fusionar un PR que revierta este cambio y redesplegar el frontend. Los componentes solo consumen el tema actual y los datos que ya pedían las rutas. La línea base se ejecutó contra las mismas respuestas de prueba durante la comparación.
