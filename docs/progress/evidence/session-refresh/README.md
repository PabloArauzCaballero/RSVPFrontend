# Actualización de recursos y sesión web · 2026-11-17

Base: `origin/chore/deploy-contabo-coolify`, `669547884aabaf6cf625ce91a0fccb44676312e9`. Rama: `fix/invitation-refresh-and-session`.

## Entregas observables

| Requisito | Causa y cambio | Prueba positiva y límite |
| --- | --- | --- |
| R1 · actualizar la sección después de escribir | El contrato de Media devuelve 202/PROCESSING; el dominio manual omitía ese estado y solo se invalidaba una vez. La consulta sigue cada 2 s mientras haya procesamiento, conserva fotos existentes, pausa en segundo plano y se detiene al terminar o fallar. Muestra preparación, rechazo con eliminación y reintento de lectura. | Unidad: procesamiento → foto, rechazo, error/reintento, cancelación al desmontar y otra celebración intacta. Flujo real: presign → PUT → 202 → worker → miniatura visible, sin navegación de documento. |
| R1 · invitados y regalos | Invitados también tiene proyecciones asíncronas: la lista y el resumen consultan cada 2 s cuando el contrato informa eventos pendientes. Las mutaciones invalidan grupos; cambiar grupo actualiza también el detalle. Regalos ya invalidaba el prefijo correcto; se verifica la lista después de la escritura. | Unidad: alta de regalo, alta de invitado, grupos y cambio de grupo; consultas ajenas intactas. Altas reales en celebración propia de prueba. |
| R2 · confirmar cierre de sesión | Las cuatro entradas de interfaz llamaban directamente al cierre. Ahora solicitan un diálogo compartido, montado fuera del menú móvil; solo confirmar llama al cierre. Cancelar conserva la sesión. Al cerrar el diálogo se devuelve el foco al botón Más en móvil; PressFeedback expone su referencia en las dos variantes. | Unidad: no hay petición antes de confirmar; cancelación conserva sesión; el ref permite enfocar el botón real. Matriz web: Tab queda dentro, Escape cancela y se restaura el foco; cierre confirmado y recarga posterior. Los diálogos reciben nombre accesible. |
| R3 · recarga sin perder sesión | El JS desplegado llamaba desde `dev.done.arauzsoftware.com` a `rsvp-api.161.97.85.216.sslip.io`; SameSite=Strict impide recuperar una cookie entre esos sitios. La imagen web incrusta `/api`; nginx reenvía al gateway configurado, verifica TLS y ajusta únicamente el Path de la cookie a `/api/identity/auth`. | Login, cookie Secure/HttpOnly/Strict y restauración después de recargar. Un fallo de red/503/429 no revoca credenciales; recuperación muestra reintento sin abrir contenido privado. Un 401 de Identity sí termina sesión. |

## Ejecución y límites

- Node usado para validación: 24.18.1, dentro del rango del repo. Yarn 4.10.3. El Node 25 instalado causaba conflictos con localStorage en jsdom; no se cambiaron los tests para tolerarlo.
- `yarn hooks:install` ejecutado; `core.hooksPath=.githooks`.
- CodeGraph 1.6.2: consultas `SessionManager AuthProvider RouteGuard HostShell useUploadMedia useMediaAssets`, `useGuestList useGuestSummary useRegisterGuest useChangeGuestGroup` y `ConfirmDialog`; rutas contrastadas con archivos actuales. El índice anterior correspondía a otra rama; se sincronizó después de cambiar de rama.
- La recarga canónica falla en el frontmatter preexistente de `minimalist-ui`; se leyó explícitamente AGENTS.md y todos los SKILL.md desde disco. No se modificaron skills ni se omitieron hooks.
- El script reproducible es `apps/universal/scripts/verify-session-refresh.mjs`. Usa una cuenta sintética y una celebración propia sin publicar; nunca modifica la celebración proporcionada por el usuario. No escribe contraseñas ni tokens en evidencias.
- Para subir la foto y dar de alta invitado/regalo, `BROWSER_ORIGIN` conserva el origen permitido por CORS para las URLs firmadas de almacenamiento; las rutas de la app se transportan a nginx local mediante Playwright. Después se abre un contexto nuevo que accede directamente a `http://localhost:8340`: toda la matriz de sesión usa nginx sin ese transporte. Se comprueba que el propio navegador envía la cookie en la petición de refresh. API, Identity, proyecciones, procesamiento y almacenamiento son los servicios reales desplegados. No se simulan sus respuestas de éxito. Solo el caso negativo de red aborta deliberadamente la petición de refresh.
- El ejecutable usado, resultados y matriz se registran en `live-results.json`: PASS, 19 comprobaciones, finalizado el 2026-11-17 a las 19:37 UTC. `direct-session-results.json` registra además dos recargas por tamaño (360/1280), teclado y refresh 200 en una ejecución directa sin interceptar solicitudes. Chromium no acredita Chrome, iOS ni Android. Se inspeccionaron las capturas finales del diálogo móvil claro en español y escritorio oscuro en inglés: texto completo, botones visibles y sin desbordamiento. No son una comparación aprobada contra baseline.
- Movimiento: se reutiliza el diálogo y su transición existente, con `overlayAnimation` y movimiento reducido; no se incorpora una animación nueva. Los estados de procesamiento son texto anunciado mediante `Notice`, sin un bucle decorativo nuevo.

## Controles generales que ya fallaban en la base

- `contracts check:generated`: el clon hermano local está en otra rama y sus ocho contratos difieren. Además, `provider-catalog.ts` e índice generados ya están desactualizados respecto del snapshot vendorizado.
- `design-tokens generate --check`: `generated/tokens.json` y `generated/tokens.css` ya están desactualizados.
- `harness:validate`: frontmatter/entrada de descubrimiento de `minimalist-ui` inválidos.
- Se reprodujeron fallos de sincronización en una extracción aislada del commit base. `git diff --exit-code 6695478 -- packages/contracts packages/design-tokens .agents/skills/minimalist-ui .claude/skills/minimalist-ui` devuelve 0: esos archivos no se tocaron. La extracción no tiene el backend hermano y el formato de los generados difiere del checkout; no se presenta como una comparación exacta de sus diagnósticos.

## Resultados observados

| Comando o recorrido | Resultado |
| --- | --- |
| `node node_modules/vitest/vitest.mjs run --maxWorkers=1 --no-file-parallelism`, desde cada workspace afectado, con Node 24 | Auth 73 PASS y un live test preexistente omitido; API client 15 PASS; query hooks 89 PASS; universal 372 PASS. |
| La misma ejecución desde `packages/ui` y repetición dirigida de consumidores tras ajustar el foco | UI 258 PASS; auth/auth-submit/theme de universal 56 PASS; motion-kit 28 PASS después de normalizar el contenido de la nueva prueba. Las pruebas `native` de UI son de componentes en jsdom, no un dispositivo. |
| Suites de todos los workspaces, en serie | 16 workspaces PASS; contracts y design-tokens FAIL por los problemas anteriores. No se añadieron `skip`, ignores ni cambios de umbral. |
| `yarn turbo run typecheck lint --concurrency=1 --output-logs=errors-only` | 36/36 PASS, exit 0. |
| `yarn lint:code` | PASS, exit 0. |
| `docker build -f deploy/Dockerfile.universal --build-arg EXPO_PUBLIC_API_URL=https://rsvp-api.161.97.85.216.sslip.io --build-arg EXPO_PUBLIC_SITE_URL=https://rsvp-web.161.97.85.216.sslip.io --build-arg EXPO_PUBLIC_RSVP_ORIGIN=https://dev.done.arauzsoftware.com -t rsvp-session-refresh:verify .` | PASS, exit 0. Imagen `sha256:e5131f8a07fffaba6c72091afbdb671be028547c9c9c80285481ed7109d80a81`. Avisos preexistentes de recursos CSS de Leaflet y peers de Yarn. |
| `docker exec rsvp-session-refresh-verify nginx -t` | PASS, exit 0; también se ejercita la conexión TLS real con verificación activada. |
| `APP=http://localhost:8340 BROWSER_ORIGIN=https://dev.done.arauzsoftware.com node --use-system-ca apps/universal/scripts/verify-session-refresh.mjs` | Resultado completo en `live-results.json`: login, subida y miniatura reales, invitado y regalo, fallo de red simulado con recuperación real, matriz 360/768/1280 × claro/oscuro × es-BO/en-US, teclado, cierre real y recarga sin sesión. Se conserva movimiento reducido en la matriz y se prueba además la cancelación móvil con movimiento normal. |
| `git diff --cached --no-ext-diff --unified=0` enviado a `ghcr.io/gitleaks/gitleaks:v8.24.0 stdin --redact --no-banner` | PASS, exit 0, sin hallazgos en el diff. |
| `git diff --check` y CodeGraph sync | PASS, exit 0. |
| `yarn turbo run build --concurrency=1 --output-logs=errors-only` | FAIL, exit 1, por design-tokens generado desactualizado; la imagen universal sí se construyó. |
| `yarn workspace @rsvp/contracts check:generated` y `node scripts/validate-harness.mjs` | FAIL, exit 1, por los problemas de base descritos. |

El test existente de config-eslint intenta borrar su fixture con `rm`, que no está disponible en PowerShell. Después de la suite dejó `apps/universal/src/__lint_fixture__/bad.tsx`, causando un fallo intermedio de tsc. Se comprobó su origen en el test, se retiró únicamente ese archivo generado y su carpeta vacía, y se repitieron los controles estáticos en verde. No se cambió ni excluyó el test.

Las ejecuciones usan cuentas sintéticas con sufijos `@example.invalid`, celebraciones con prefijos `refresh-`/`keys-` y datos ficticios; permanecen sin publicar. No se envía correo a destinatarios reales ni se alteran objetos de la celebración del usuario. El navegador instalado de prueba es Chromium 151.0.7922.34 de Playwright. No se pudo completar la variante Chrome for Testing: su ejecutable dejó de estar disponible tras el primer intento. No se cambió la configuración de seguridad del equipo.

La semántica de SameSite usada en el diagnóstico está documentada por [MDN, Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#samesitesamesite-value). No se cambió a SameSite=None ni se guardaron credenciales en localStorage.

## Despliegue y reversión

El destino previsto es `chore/deploy-contabo-coolify`, mediante revisión humana. No se hace merge ni se cambia el servidor desde este trabajo. La regla de `.agents/skills/rsvp-pr-gate/SKILL.md` dice: «Si algo no se puede probar en un entorno real, no se abre PR»; los controles generales rojos tampoco satisfacen la puerta de PR.

Coolify conserva el valor actual de `EXPO_PUBLIC_API_URL` como argumento de build: ahora configura el upstream fijo de nginx, mientras el JS de esa imagen usa `/api`. No se pone ningún dominio concreto en el código. Las apps nativas y Expo de desarrollo conservan su transporte configurado. Se preservan Secure, HttpOnly, SameSite y la verificación de certificados. Después del cambio de dominio de la cookie hace falta iniciar sesión una vez; las siguientes recargas usan la cookie del dominio de la app.

Para revertir, volver a desplegar la imagen anterior del frontend; no hay cambios de base de datos ni de contrato público. La cookie nueva tiene otro Path y no se migra a un sitio ajeno. Puede requerirse volver a iniciar sesión al revertir.

Con 10× usuarios solo consultan rápido los recursos con trabajo pendiente y pestañas activas; al terminar no hay sondeo adicional de Media. Las consultas comparten caché y peticiones en curso. El resumen de invitados conserva su intervalo normal de 30 s cuando no hay eventos pendientes. El mantenimiento queda en los hooks de cada recurso y en el transporte de despliegue, sin temporizadores por pantalla nueva ni recargas globales.
