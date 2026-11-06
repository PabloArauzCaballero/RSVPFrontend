# Línea base visual (Playwright `toHaveScreenshot`)

Qué cubre: `apps/seo-web/e2e/catalogo.visual.spec.ts` (catálogo de primitivas, landing) y `apps/seo-web/e2e/screens.visual.spec.ts` (celebración pública F08-F13, RSVP sin enlace y con enlace inválido F15, regalos sin credencial F22, directorio, búsqueda y categoría F24) a 360 y 1280 px. Las pantallas se pintan contra el **fixture local** (`apps/seo-web/scripts/fixture-api.mjs`, puerto 28100), no contra el backend, para que los píxeles sean deterministas. No cubre el microsite `/p/*`, cotización ni agenda (el fixture no las sirve). La app Expo (auth, host, admin, portal e invitado) tiene su propia compuerta: `apps/universal/e2e/*.visual.spec.ts` (`yarn workspace @rsvp/universal test:visual`, 390/768/1440 px, contra `apps/universal/scripts/visual-mock.ts`, que sirve el contrato de ejemplo de `@rsvp/testing`). La lista de rutas vive en `apps/universal/e2e/screens.ts`.

Estado honesto: las imágenes `*.png` sin sufijo son salida de máquina (macOS, Chrome local). **Nadie las ha revisado como aprobación humana.** Una corrida verde significa "igual que la línea base", no "aprobado por diseño". Las de Linux todavía no existen en el repositorio.

## Local (macOS)

```
CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" yarn workspace @rsvp/seo-web test:visual
# regenerar tras un cambio visual intencional:
... yarn workspace @rsvp/seo-web test:visual --update-snapshots
```
El servidor visual usa su propio `NEXT_DIST_DIR=.next-visual`: no comparte `.next` con un `next dev` abierto en :3000. Los dos casos del catálogo pueden fluctuar ~1 % de píxeles en 768 px / oscuro 360 px entre corridas (cosa preexistente, anotada en BLOCKERS).

## Linux (CI)

La fuente tipográfica se rasteriza distinto en Linux, así que los PNG de macOS no sirven allí. Línea base aparte con sufijo `-linux`:

1. Actions -> **visual-baselines** -> Run workflow con `mode = generate` (equivale a `VISUAL_PLATFORM=linux yarn workspace @rsvp/seo-web test:visual --update-snapshots` en `ubuntu-24.04`).
2. Descarga el artefacto `visual-baselines-linux`, **mira las imágenes**, y solo si son correctas cópialas a `apps/seo-web/e2e/__screenshots__/**` y súbelas en un PR (la revisión humana queda en ese PR).
3. Con las imágenes `-linux.png` confirmadas, `mode = compare` (por defecto) falla ante cualquier diferencia. Hasta entonces ese modo falla porque no hay referencia: es lo esperado.

El job no hace commit ni aprueba nada por sí mismo.

## Servidor de las pruebas visuales

Las pruebas visuales corren contra el build de producción (`next build` + `next start`), no contra `next dev`: el modo desarrollo inyecta un indicador flotante y compila bajo demanda, lo que producía diferencias de píxeles intermitentes y llegó a quedar incrustado en las líneas base. El fixture (`apps/seo-web/scripts/fixture-api.mjs`) envía CORS y responde 401 a la lista de regalos sin credencial para que las pantallas muestren su estado real y no un error de red.
