# Visor de fotos de la invitación

Validación del 27 de noviembre de 2026 sobre `chore/deploy-contabo-coolify` en `6a2b8a7f`.

La galería compartida enlazaba directamente al archivo. Ahora abre un diálogo dentro de la invitación, conserva el enlace como alternativa si el navegador no puede abrir el diálogo y carga la imagen ampliada al seleccionarla.

| Verificación | Resultado |
| --- | --- |
| `yarn workspace @rsvp/celebration-theme test` | 3014 pruebas, salida 0 |
| `yarn workspace @rsvp/i18n test` | 16 pruebas, salida 0 |
| `yarn workspace @rsvp/seo-web test` | 210 pruebas, salida 0 |
| `yarn workspace @rsvp/seo-web build` con la API de fixtures | Build de producción, salida 0 |
| `apps/seo-web/e2e/gallery-dialog.spec.ts` con Playwright y Chrome | Abre con Enter, navega con flecha y botón, cierra con Escape y Cerrar, devuelve el foco a la miniatura y conserva la URL. Una prueba, salida 0 |
| Playwright con Chrome y la API de fixtures | 12 combinaciones de 360, 768 y 1280 px, claro y oscuro, es-BO y en-US. Controles visibles, foto contenida en la ventana y cero hallazgos serios o críticos de axe en el diálogo |

El lint y el typecheck del área, `node scripts/validate-harness.mjs` y los checks de archivos generados pasaron. La prueba en Chrome usa fotos de ejemplo. La comprobación con una invitación publicada que tenga fotos reales sigue pendiente.

Para revertir el visor, se revierte el commit de frontend. El cambio usa los campos de medios que ya entrega la API.
