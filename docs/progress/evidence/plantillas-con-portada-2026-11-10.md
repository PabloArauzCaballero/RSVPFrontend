# Plantillas con portada propia por layout (PR #15)

Entorno: macOS, Node 22, Chrome real (Google Chrome.app) con Playwright. Fecha: 2026-11-10.

## Estática y pruebas

```
yarn turbo run build lint typecheck test   -> Tasks: 72 successful, 72 total
yarn eslint . --max-warnings 0             -> código 0
yarn harness:validate                      -> Harness frontend: 28 carriles, 61 skills y recarga por prompt válidos.
gitleaks git --log-opts="origin/dev..HEAD" -> no leaks found
```

```
packages/celebration-theme vitest -> 3 archivos, 30 pruebas (10 snapshots de marcado actualizados)
apps/seo-web vitest               -> 16 archivos, 130 pruebas
apps/universal vitest             -> 28 archivos, 359 pruebas
```

## Invitación pública: las 16 plantillas del catálogo (seeds de RSVPBackend origin/dev)

Servidas por una copia del fixture del sitio. 16 plantillas × 360/768/1280 × es-BO/en-US, axe wcag2a/2aa/21aa/22aa:

- Con fotos: **96 de 96** sin scroll horizontal y sin violaciones críticas ni serias.
- Sin fotos (`data-has-image="false"`, donde la portada depende solo del color): **96 de 96**.

La invitación pública no tiene modo oscuro (el sitio no pasa `colorScheme`); el oscuro del motor se cubre con los snapshots claro/oscuro por layout.

## Vista previa en la app (contra el backend de TEST)

"Elige el estilo" y "Vista previa", 360/768/1280 × claro/oscuro × es-BO/en-US: **24 de 24**.
Primer pase: 20 fallas. `color-contrast` 4.49:1 en el lugar de la portada (tenía opacidad) y `scrollable-region-focusable` en el marco de vista previa, que ahora tiene scroll. Ambas corregidas.

## Comparación visual

- Sitio: `playwright test screens.visual` -> 21 passed; solo cambió `celebracion-publica` (360/768/1280). Las otras 18 pantallas, idénticas.
- App: `playwright test -g "host-vista-previa|host-templates" --update-snapshots` -> 6 passed; 6 PNG regenerados y revisados.

## Límites (no probado)

- iOS y Android reales: no hay dispositivo ni simulador en este entorno. Lo nativo se cubre con pruebas de componente.
- Línea base Linux del CI (`visual-baselines.yml`): no se generó; las de este PR son las de macOS.
- La suite visual de `apps/universal` tiene 38 comparaciones que ya fallan en `dev` sin estos cambios (portal-*, guest-rsvp, guest-regalos, auth-login, auth-registro): se verificó corriéndola sobre el código de app de `dev`. No se tocaron; es un desfase previo de la línea base.
- Skills Impeccable / UI-UX Pro Max / motion: no se aplicaron como procedimiento formal.

