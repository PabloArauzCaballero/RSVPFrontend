# Carrusel y visor de fotos de la invitación

Validación del 27 de noviembre de 2026 sobre `chore/deploy-contabo-coolify` en `6a2b8a7f` (rama `fix/visor-galeria-invitacion`).

La galería compartida enlazaba directamente al archivo. Se comprobó ese comportamiento en el HTML de la invitación publicada con dos fotos. La galería ahora muestra una foto por vez ocupando todo el ancho del carrusel (`width: 100%` alineado con los controles en móvil, tablet y escritorio) y avanza mediante deslizamiento táctil, botones o flechas cuando la miniatura tiene el foco. Al pulsar Ampliar foto se abre el visor dentro de la invitación. Cerrar con el botón, con Escape o haciendo clic fuera del diálogo (en el fondo oscuro) devuelve el foco a la miniatura y conserva la URL. Con una foto se puede ampliar sin controles de recorrido. La sección permanece oculta cuando faltan fotos.

El deslizamiento usa el desplazamiento nativo del navegador y las fotos conservan sus variantes responsivas, carga diferida y espacio reservado. Los botones cambian de foto al instante y las diapositivas avanzan por iniciativa del invitado, sin reproducción automática y respetando `prefers-reduced-motion`. Se actualizaron ocho snapshots de los cuatro diseños tradicionales para reflejar el HTML del carrusel, en claro y oscuro.

## Verificaciones y salidas observadas

| Verificación | Resultado |
| --- | --- |
| `corepack yarn install --immutable` | Dependencias verificadas sin cambios en el lockfile, salida `0` |
| `node scripts/validate-harness.mjs` | 28 carriles, 61 skills y recarga por prompt válidos, salida `0` |
| `corepack yarn workspace @rsvp/contracts check:generated` | 8 contratos verificados contra `PabloArauzCaballero/RSVPBackend@68c2b25b8e9c`, salida `0` |
| `corepack yarn lint:code` | Limpio, salida `0` |
| `corepack yarn workspace @rsvp/celebration-theme typecheck`, `@rsvp/i18n typecheck`, `@rsvp/seo-web typecheck` | Limpios, salida `0` |
| `corepack yarn workspace @rsvp/celebration-theme test` | 17 archivos, 3014 pruebas, salida `0` |
| `corepack yarn workspace @rsvp/i18n test` | 3 archivos, 16 pruebas, salida `0` |
| `corepack yarn workspace @rsvp/seo-web test` | 25 archivos, 210 pruebas, salida `0` |
| `corepack yarn workspace @rsvp/seo-web build` con `RSVP_API_URL` y `NEXT_PUBLIC_API_URL` apuntando al gateway real de QA (`https://rsvp-api.161.97.85.216.sslip.io`) | Build de producción, salida `0` |
| `corepack yarn workspace @rsvp/seo-web test:visual gallery-dialog.spec.ts` (Playwright + Chrome contra fixtures) | 2 pruebas aprobadas, salida `0`. Recorrido del carrusel (ancho completo alineado con el track) y visor con cierre por Escape, botón Cerrar y clic en el fondo oscuro, foco y URL conservados; sin fotos, la invitación omite la galería y `/galeria` devuelve `404` |
| `apps/seo-web/e2e/plantillas-v2.spec.ts` con `--grep "photo that fails to load"` | 12 pruebas del tratamiento de imágenes fallidas, salida `0` |
| Playwright con Chrome y la API de fixtures | 12 combinaciones (`360`, `768` y `1280` px; claro y oscuro; `es-BO` y `en-US`), salida `0`. Deslizamiento, controles en una fila, teclado, visor, foco, URL y `axe` |
| Playwright con Chrome sobre el build local conectado al gateway real (referencia en español `fabio`) | Celebration HTTP `200`, `locale=es-BO`, 2 fotos reales. 12 combinaciones, salida `0`, `axe` sin violaciones serias ni críticas |
| Playwright con Chrome `158.0.8127.88` sobre `corepack yarn workspace @rsvp/seo-web start` conectado al gateway real con invitación de QA en inglés (`locale=en-US`) | 6 combinaciones (`360`, `768` y `1280` px × claro y oscuro, `lang=en-US`, movimiento reducido), todas `APROBADO`, salida `0`. Celebration devolvió HTTP `200` con `locale=en-US` y Template Media entregó 2 fotos reales subidas por PUT firmado. Se verificaron textos en inglés (`Photo 1 of 2`, `Enlarge photo`, `Previous`, `Next`, `Close`), decodificación de ambas fotos, ancho completo de la foto alineado con el carrusel (`<= 2 px` de diferencia), ausencia de desborde horizontal, deslizamiento táctil en `360` px, botones `Previous`/`Next`, flechas de teclado y `Enter`, ampliación de la segunda foto, navegación dentro del visor, cierre por `Escape`, botón `Close` y clic en el fondo oscuro (`::backdrop`), retorno del foco a la segunda miniatura y URL conservada. `axe` registró `0` violaciones en el carrusel y `0` en el visor en las 6 combinaciones. Comparación en TEST desplegado: HTTP `200` sin carrusel candidato (`candidate toolbar present=false`). La invitación temporal de QA fue despublicada al finalizar. Capturas locales de QA archivadas fuera de Git |
| `gitleaks` sobre el diff de la rama | `0` hallazgos de secretos, salida `0` |

## Nivel alcanzado, límites y reversión

- **Nivel:** `VERIFIED` en web responsive (`@rsvp/seo-web` sobre Chrome real contra Celebration y Template Media reales en `es-BO` y `en-US`).
- **Fuera de alcance / no probado aquí:** binarios nativos iOS/Android (la galería pública pertenece únicamente a `@rsvp/seo-web`) y ejecución en runners Linux de CI (se valida en GitHub Actions del PR).
- **Reversión:** revertir los commits de esta rama en frontend. El cambio consume los campos de medios ya expuestos por la API sin migraciones ni cambios de contrato.
