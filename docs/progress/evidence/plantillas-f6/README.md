# Evidencia F6 (frontend, parte a): medios y embebidos en el renderizador v2

Capturas **Linux** (Chrome 1xx estable, sitio real `next build` + `next start` sobre `apps/seo-web/scripts/fixture-api.mjs`, celebración `fixture-v2-medios`).
No son líneas base: las líneas base commiteadas son de macOS y no se tocan.

- `portada-{360,768,1280}-{light,dark}.png` y `medios-{360,768,1280}-{light,dark}.png`: portada con fondo de foto bajo velo y bloques imagen, video, mapa y canción.
- `lcp-4g.json`: LCP de la portada a 390x844 con red 4G emulada (1,6 Mbit/s, 150 ms) y CPU 4x más lenta. El LCP es la foto AVIF de fondo.
- `playwright-salida.txt`: salida de `playwright.f6.config.ts` (21 pruebas).

Es un fixture de contrato: prueba el renderizado, no el backend real. Los iframes de YouTube y Google Maps se interceptan en la prueba (sin red externa), de modo que se verifica cuándo se pide, no el reproductor del proveedor.
