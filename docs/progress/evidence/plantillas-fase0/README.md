# Plantillas, fase 0: evidencia visual antes/después (Linux)

- **Fecha:** 2026-11-24. **Antes** = `origin/chore/deploy-contabo-coolify` (`d5f9c17`). **Después** = `fix/plantillas-fase0-contraste-oscuro`.
- **Plataforma:** Linux, Chromium 1243 de Playwright, contra los servidores simulados del propio repositorio (`apps/seo-web/scripts/fixture-api.mjs`, `apps/universal/scripts/visual-mock.ts`). **No** es la línea base de macOS: esas imágenes (sin sufijo de plataforma) no se tocaron.
- **Método:** se generó una línea base temporal `-base` con el código «antes» (`VISUAL_PLATFORM=base ... --update-snapshots=all`), se volvió al código «después» y se corrió la comparación con las mismas especificaciones. Los `*-base.png` se borraron; no están en el repositorio.

## Qué cambia en píxeles

| App | Capturas comparadas | Cambian | Sin cambio |
|---|---|---|---|
| seo-web (`screens` + `catalogo`) | 28 | 3: `celebracion-publica` 360/768/1280 | 25 (incluye catálogo claro/oscuro) |
| universal (authed, anon, authed-dark, anon-dark) | 189 | 6: `host-templates` y `host-vista-previa` a 390/768/1440 | 183 (incluye `admin-templates`, `guest-rsvp` y todas las oscuras) |

El cambio visible hoy es el piso de 13 px del antetítulo y de la cuenta atrás de la portada (la altura de la página crece 1 a 2 px). En el modo oscuro de las pantallas existentes no cambia nada: la invitación en oscuro no aparece en ninguna pantalla (PL-A4).

## Carpetas

- `seo-web/`: `celebracion-publica-{360,768,1280}-{antes,despues,diff}.png` y recortes de portada.
- `universal/`: `host-templates-*` y `host-vista-previa-*` (`antes`, `despues`, `diff`).
- `paletas/`: hojas de contacto de las 16 plantillas sembradas (`seeds/templates/data/*.json` del backend, idénticas en `dev` y en la rama oficial) pintadas con `CelebrationRenderer` + `styles.css`: `{claro,oscuro}-{movil,escritorio}-{antes,despues}.png`. Los textos salen como claves i18n porque el renderizador se alimenta con el traductor de pruebas.
- Herramienta: `packages/celebration-theme/test/render-dark-palettes.tsx <seeds> <salida> [dark|light]` genera un HTML por plantilla; las capturas son Playwright a 390 y 1280 px.

## Límites

- Los diffs del carril `host-*` muestran además un desplazamiento de unos 4 px de la tira de pestañas (parte alta, fuera del renderizador). No se probó su causa; parece el desplazamiento horizontal automático de la tira y no el tema, pero **no está verificado**.
- Estas imágenes no sustituyen la revisión a ojo de las líneas base de macOS en el Mac de Pablo.
