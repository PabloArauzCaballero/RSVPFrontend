# Portada con el producto a la vista (PR #14)

Entorno: macOS, Node 22, Chrome real (Google Chrome.app) con Playwright. Fecha: 2026-11-10.

## Estática y pruebas

```
yarn turbo run build lint typecheck test   -> Tasks: 72 successful, 72 total
yarn eslint . --max-warnings 0             -> código 0
yarn harness:validate                      -> Harness frontend: 28 carriles, 61 skills y recarga por prompt válidos.
gitleaks git --log-opts="origin/dev..HEAD" -> no leaks found
```

## Matriz 360/768/1280 × claro/oscuro × es-BO/en-US (scratch `verify.mjs`, axe wcag2a/2aa/21aa/22aa)

**12 de 12** sin scroll horizontal y sin violaciones críticas ni serias.
Primer pase: 12 fallas. `color-contrast` en los textos dorados de cuatro invitaciones de muestra (se oscureció el acento de cada hoja) y `scrollable-region-focusable` en el carrusel de estilos (ahora es enfocable y lleva nombre).

## Comparación visual

`playwright test catalogo.visual -g landing` sobre `next build` + `next start` -> 1 passed (landing-360 y landing-1280).

## Prueba que falló en CI y se corrigió

`packages/design-tokens` REQ-F02-01/05 prohíbe en el CSS del sitio un hex igual a un token. La hoja minimalista copiaba `#111113`; ahora usa `--bone` e `--ink` y las variables de las hojas se llaman `--sheet-*`.

La portada no consume el backend: la prueba en entorno real es el build de producción servido con `next start`.

## Límites (no probado)

- iOS y Android reales: no hay dispositivo ni simulador en este entorno. Lo nativo se cubre con pruebas de componente.
- Línea base Linux del CI (`visual-baselines.yml`): no se generó; las de este PR son las de macOS.
- La suite visual de `apps/universal` tiene 38 comparaciones que ya fallan en `dev` sin estos cambios (portal-*, guest-rsvp, guest-regalos, auth-login, auth-registro): se verificó corriéndola sobre el código de app de `dev`. No se tocaron; es un desfase previo de la línea base.
- Skills Impeccable / UI-UX Pro Max / motion: no se aplicaron como procedimiento formal.

