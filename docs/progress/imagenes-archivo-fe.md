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

## Segunda tanda (2026-11-28)
- E4: panel "Imágenes de la invitación" (nivel Avanzado, solo con fuente de medios): subir o elegir una foto mirando su miniatura (radios accesibles) y agregarla como bloque imagen, imagen con texto, monograma o fondo de cualquier página; quitar fondo. Referencia por `mediaId`, sin direcciones. `PhotoPicker` reutiliza el panel de subida de la galería.
- E5: en el panel de código, «Insertar una imagen» escribe la única referencia que el saneador admite (`/media/public/assets/{id}/medium` en HTML, `url(.../full)` en una regla CSS) sin que la persona escriba direcciones.
- Póster de video (E4): NO hecho; el esquema base no tiene `posterMediaId` (llega con BE #164, sin fusionar).
- Vista previa del anfitrión: `usePreviewTheme` dibuja el BORRADOR del diseño sobre la plantilla (vista previa del editor de contenido y pantalla de vista previa); sin diseño o con error vuelve a la plantilla.
- HEIC (decisión): Template/Media lo acepta y convierte en el servidor, así que la galería y el editor lo suben tal cual. KYP NO lo admite (el servidor no lo decodifica ni lo firma): se rechaza en el cliente con un mensaje propio que explica cómo mandarlo como PDF/JPG o volver a tomar la foto. No se mete conversor WASM (peso y CSP `script-src 'self'` sin medir). Fotos de producto: sin cambio (R2 sigue con su decisión de convertir en dispositivo).
- `CreateListingInput` ya no tiene `imageUrl` (BE B8 lo rechaza para todos los tipos).
- Pruebas: universal 865, design-editor 457, i18n 18, seo-web y celebration-theme sin cambios desde la tanda 1; tsc y eslint limpios en lo tocado.
- Sigue sin probarse en navegador real (Playwright/Chrome), Safari, Firefox ni dispositivos.

## Bloqueado por decisión del dueño (D2/D3)
Fotos de servicio (B6), galería del micrositio con `provider_media` (B7), UI de fotos de servicio y micrositio (F10) y logo de proveedor.
