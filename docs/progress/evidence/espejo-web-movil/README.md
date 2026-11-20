# Espejo web en la app · slice 1: la invitación pública (`/c/{slug}` y sus secciones)

Fecha: 2026-11-20 · Rama `feat/espejo-web-movil` (base `chore/deploy-contabo-coolify` @ `129d366`) · Carriles relacionados: F10 (sitio público), F21 (app del invitado).

**Resultado observable:** quien abre `https://<dominio>/c/{slug}` en la app (o en la app servida en el navegador) ve la misma invitación que el sitio público: portada con foto según el layout, secciones en el orden del template, navegación a la página propia de cada sección (`/historia`, `/itinerario`, `/lugares`, `/galeria`, `/dress-code`, `/faq`, `/recomendaciones`), «Cómo llegar», fotos a tamaño completo, recomendaciones por el redirector y selector de idioma de la celebración.
Antes: la imagen desplegada respondía «Esta página no existe» a `/c/{slug}` ([captura](antes-dev-c-slug-sin-ruta-360.png)).

Nivel alcanzado: **VERIFIED en Expo web (Chrome real) contra el backend real de dev**. **No** verificado en iOS ni Android (ningún simulador o dispositivo en esta corrida).

## Requisitos del slice

| ID | Requisito | Estado | Comando / artefacto | Resultado |
|---|---|---|---|---|
| ESP-01 | `/c/{slug}` renderiza la invitación con los datos del servidor, sin sesión | PASS | `scripts/live/invitation-mirror.mjs` · [results.json](results.json) | 3 celebraciones publicadas × 360/768/1280 × claro/oscuro × es-BO/en-US = 36 combinaciones: h1 igual al título del servidor, sin desborde horizontal, 0 errores de consola |
| ESP-02 | Página propia de cada sección en la dirección de la web | PASS | ídem | 6 navegaciones (`/historia`, `/lugares`, `/galeria`): una sola sección, h1 con su nombre |
| ESP-03 | «Cómo llegar» abre mapas fuera de la app | PASS | ídem | 3/3 abren `google.com/maps` (punto marcado o búsqueda por nombre) |
| ESP-04 | Recomendaciones de partner solo por `/r/{listingId}` | TESTED | `test/guest-invitation.test.tsx`, `native.test.tsx` | `surface=APP` + `celebrationId`; id no UUID → sin enlace. Ninguna celebración de dev tiene recomendaciones: no observado en vivo |
| ESP-05 | Idiomas de la celebración; contenido con `Accept-Language` | PASS | live + test | `roxana-y-pedro` en en-US muestra «Roxanne», «Our story», «Get directions» |
| ESP-06 | Negativo 404 (slug inexistente) | PASS | live | gateway 404 → «Esta celebración no está disponible» + ir al inicio |
| ESP-07 | Negativo: ruta que no es sección no consulta nada | PASS | live | 0 peticiones a `/celebrations/public/` |
| ESP-08 | Negativo: sección vacía o no ubicada → 404 | TESTED | `guest-invitation.test.tsx` | `dress-code` vacío → no disponible |
| ESP-09 | 5xx ≠ 404, con reintento | TESTED | ídem | 503 → «no disponible por ahora» + Reintentar |
| ESP-10 | Template/fotos caídos no tumban la invitación | TESTED | ídem | 503/502 en media → aspecto por defecto, sin foto |
| ESP-11 | Accesibilidad (axe wcag2a/aa) | PASS | live | 0 critical/serious en 36 combinaciones, tras dos correcciones halladas aquí (abajo) |
| ESP-12 | Columna del layout en pantallas anchas | PASS | live + test | 1280 px: columna de 720 px centrada, como `--celebration-max-width` |

## Hallazgos corregidos durante la verificación en vivo

1. axe `aria-required-children` (serious) en las 36 combinaciones: la navegación usaba `role="menu"` sin `menuitem`. Ahora `role="navigation"`, como el `<nav>` de la web. Prueba de regresión en `native.test.tsx`.
2. axe `color-contrast` (serious) en oscuro con dos idiomas: el selector usaba la paleta de la app sobre la invitación clara. Ahora usa la tinta de la plantilla. Prueba de regresión en `guest-invitation.test.tsx`.
3. A 1280 px la invitación se estiraba a todo el ancho; ahora respeta el `maxWidth` del layout.

## Comandos (2026-11-20, macOS, Node 22)

```
yarn turbo run test typecheck lint      → se detuvo en @rsvp/contracts#test (preexistente, ver abajo) tras 24/45 tareas; corregido: con --continue (rama del slice 2, que incluye este) 65/66, única falla esa
  apps/universal vitest                  → 29 archivos, 386+ pruebas OK (13 nuevas de la invitación)
  packages/celebration-theme vitest      → 44 OK (11 nuevas del renderer con acciones)
  packages/query-hooks vitest            → 89 OK
  apps/seo-web vitest                    → 140 OK (usa sections/index.tsx refactorizado)
yarn lint:code (eslint --max-warnings 0) → exit 0
yarn harness:validate                    → exit 0
expo export --platform web               → Exported: web-build
node scripts/live/invitation-mirror.mjs  → 50/50 PASS, exit 0
```

Cómo reproducir: `EXPO_PUBLIC_API_URL=http://localhost:8300/api expo export --platform web`, servir `web-build` con un proxy que reenvíe `/api/*` al gateway de dev con `Origin: https://dev.done.arauzsoftware.com` (su CORS no admite localhost), y `SLUGS=sofia-y-victor-boda,roxana-y-pedro,fabio CHROMIUM_PATH=<Chrome> node apps/universal/scripts/live/invitation-mirror.mjs`. El script genera todas las capturas; aquí se guarda una muestra (el resto queda referenciado en `results.json`).

## Límites y fuera de alcance

- **iOS/Android no probados**: el renderer usa solo primitivas RN (`Pressable`, `Image`, `ScrollView`, `Linking`), pero sin simulador ni dispositivo no se declara.
- Los universal links de `/c/{slug}` dependen de `apple-app-site-association`/`assetlinks.json`, que todavía no se sirven (bloqueo de F05/F21).
- `@rsvp/contracts#test` falla porque `specs/gift-list.openapi.json` vendorizado difiere del checkout hermano de `RSVPBackend`. No se tocó `packages/contracts`; es una deriva entre repos, fuera del propósito de este PR.
- Las capturas `fullPage` muestran el primer viewport: la invitación se desplaza dentro de su `ScrollView`.
- Movimiento: no se añadió animación (motion design: la navegación entre secciones es un cambio de página, sin transición propia).

Siguientes slices del espejo: regalos públicos (`/c/{slug}/regalos`, `/regalos/{id}`), directorio de proveedores (`/proveedores/...`), microsite del partner (`/p/{slug}`, catálogo, agenda, cotizar) y catálogo (`/catalogo`).
