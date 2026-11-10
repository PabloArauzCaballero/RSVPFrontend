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

