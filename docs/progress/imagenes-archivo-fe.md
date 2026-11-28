# Imagenes por archivo, FE (carril 2, 2026-11-28)

Rama `feat/req-imagenes-archivo-fe`. Depende de BE `feat/req-imagenes-archivo-be` (Template/Media 1.6.0) solo para que el invitado vea el diseno publicado; sin el endpoint la pagina publica se ve como antes.

## Que cambia
- Editor de diseno: la foto de portada se sube (arrastrar, selector, camara en movil) con la misma cola y panel que la galeria, con proposito `background`. `MediaSource.renderUploader` la inyecta; el editor sigue sin conocer la API. Sin campo URL.
- KYP del proveedor y del admin: zona de arrastre (`DocumentDrop`) alrededor del boton existente, un documento por vez, camara en movil, mensaje si lo soltado es una direccion y no un archivo. Validacion y subida siguen en cada pantalla.
- seo-web: `loadPublicPage` pide el diseno publicado y reemplaza el `theme` de la plantilla solo si es un documento v2; cualquier otra cosa deja la plantilla igual.
- F0: `isPhotoImage` (celebration-theme). La galeria v1 y las vistas previas ya no pintan fondos, logos ni ilustraciones como fotos.
- Quita claves i18n muertas del campo URL de foto de producto.
- Accesibilidad: zona `role=group` con nombre y `aria-describedby`, boton real (Enter/Espacio), estado de arrastre anunciado con `aria-live`, areas tactiles del `ActionButton`; sin animacion nueva (movimiento reducido no aplica).

## Evidencia (local)
- vitest: universal 862, design-editor 452, celebration-theme 3026, query-hooks 210, i18n 18, seo-web 225; todos verdes.
- tsc sin errores en universal, design-editor, celebration-theme, seo-web. eslint --max-warnings 0 en lo tocado.
- No probado: Playwright con Chrome real contra backend real, Safari/Firefox, camara y HEIC en dispositivos, TestFlight. Por eso no hay PR (gate de rsvp-pr-gate incompleto).

## Pendiente
Fotos de servicio y galeria del micrositio (necesitan BE), bloques/fondos del editor, "insertar imagen" en HTML/CSS, vista previa del anfitrion con el borrador.
