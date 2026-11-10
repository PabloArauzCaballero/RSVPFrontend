# Selector de fecha y hora, y datos del asistente (PR #13)

Entorno: macOS, Node 22, Chrome real (Google Chrome.app) con Playwright. Fecha: 2026-11-10.

## Estática y pruebas

```
yarn turbo run build lint typecheck test   -> Tasks: 72 successful, 72 total
yarn eslint . --max-warnings 0             -> código 0
yarn harness:validate                      -> Harness frontend: 28 carriles, 61 skills y recarga por prompt válidos.
gitleaks git --log-opts="origin/dev..HEAD" -> no leaks found
```

```
packages/ui vitest          -> 16 archivos, 254 pruebas
apps/universal vitest       -> 28 archivos, 362 pruebas
```

## Recorrido real (Playwright + Chrome contra el backend de TEST, por proxy de mismo origen)

- Bautizo, paso 2: Madre o padre, Padrino o madrina, El nombre de quien se bautiza, Fecha (date), Hora (time), Lugar principal.
- Negativo: solo hora -> "Elige también la fecha.", no avanza.
- POST /celebrations lleva eventDate, venueName y hosts; /publicar responde "Tu celebración está lista para publicar".

## Matriz 360/768/1280 × claro/oscuro × es-BO/en-US (scratch `verify.mjs`, axe wcag2a/2aa/21aa/22aa)

Asistente (paso 2), editor general y configuración: **36 de 36** sin scroll horizontal y sin violaciones críticas ni serias.
Primer pase: 12 fallas `nested-interactive` (el botón Atrás vivía dentro del progressbar; defecto previo). Corregido y cubierto con prueba.

## Comparación visual

`playwright test -g "host-editor-general|host-configuracion" --update-snapshots` -> 10 passed; 8 PNG regenerados y revisados (campos de fecha y hora).

## Límites (no probado)

- iOS y Android reales: no hay dispositivo ni simulador en este entorno. Lo nativo se cubre con pruebas de componente.
- Línea base Linux del CI (`visual-baselines.yml`): no se generó; las de este PR son las de macOS.
- La suite visual de `apps/universal` tiene 38 comparaciones que ya fallan en `dev` sin estos cambios (portal-*, guest-rsvp, guest-regalos, auth-login, auth-registro): se verificó corriéndola sobre el código de app de `dev`. No se tocaron; es un desfase previo de la línea base.
- Skills Impeccable / UI-UX Pro Max / motion: no se aplicaron como procedimiento formal.


## Ajustes tras la revisión en teléfono (2026-11-10, tarde)

Pedidos de la revisión en un Android real sobre el entorno TEST:

1. **«Lugar principal» pasa a llamarse «Ubicación»** (es-BO) / «Location» (en-US), en el asistente, el editor y la lista de pendientes para publicar.
2. **La hora ya no usa el reloj del navegador.** `packages/ui/src/time-field.tsx` es ahora un campo propio: muestra la hora como se dice («7:30 p. m.») y abre un panel (hoja inferior en teléfono, diálogo en pantallas anchas) con la hora, los minutos de cinco en cinco y mañana o tarde, cada uno a un toque. El contrato del valor no cambia (`HH:MM` de 24 horas) y iOS/Android nativo sigue con el selector del sistema.
3. **Todos los datos del paso 2 del asistente son obligatorios** (anfitriones requeridos por el tipo, datos propios del tipo, fecha, hora y ubicación): con uno vacío el paso no avanza, cada campo dice qué falta y un aviso lo resume. El enlace vacío también detiene la creación. En el editor, guardar se rechaza mientras falte un dato que el tipo de evento exige para publicar, nombrando cuáles.

Verificación:

- Unitarias: `packages/ui` 257/257, `apps/universal` 364/364 (nuevas: reloj propio, paso obligatorio, guardado con dato obligatorio vacío).
- `yarn turbo run lint typecheck test`: sin fallos.
- Build web exportado y servido contra el API de TEST, con sesión real, en claro y oscuro a 360 y 1280 px: el paso vacío queda bloqueado, el panel de hora y el editor con dato faltante pasan axe (WCAG 2.2 AA, 0 critical/serious) y no hay scroll horizontal (12/12 comprobaciones).
- Líneas base visuales regeneradas para `host-editor-general`, `host-configuracion` y `host-onboarding` (13/13).

No verificado: los scripts `scripts/live/*.mjs` se actualizaron al nuevo campo de hora pero no se volvieron a ejecutar completos contra TEST; el selector nativo de iOS/Android no cambió y sigue sin probarse en dispositivo.
