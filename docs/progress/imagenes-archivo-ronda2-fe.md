# Imagenes por archivo, FE, ronda 2 (2026-11-28)

Rama `feat/req-imagenes-archivo-fe`. Sin PR (el gate pide Playwright con Chrome real contra el backend real). Nada fusionado, sin push forzado; no se toca FE #169, #81 ni BE #90.

## Recorrido de pantallas (sin campos de direccion de imagen, video o audio)
Revise `apps/universal`, `apps/seo-web` y `packages/*` buscando `imageUrl`, `photoUrl`, `logoUrl`, `videoUrl`, `audioUrl`, `type="url"`, `keyboardType="url"` y placeholders `https://`. Hoy NINGUNA pantalla pide la direccion de una imagen:

| Superficie | Estado |
|---|---|
| Galeria y portada del anfitrion | archivo (ronda 1, `MediaUploadPanel`) |
| Editor de diseno: portada, bloques, fondos, monograma | archivo (ronda 1, `PhotoPicker`) |
| Editor de diseno: imagen en HTML/CSS | boton "Insertar una imagen" (ronda 1) |
| **Editor de diseno: musica de la invitacion** | **nuevo**: sube un MP3 (derechos aceptados) y lo agrega como bloque `music` con `source: media`; sin escribir direcciones |
| Pagina publica de la invitacion | diseno publicado del anfitrion (ronda 1) |
| Documentos KYP proveedor y admin | archivo con zona de arrastre (ronda 1) |
| Fotos de producto | archivo (R2) |
| **Fotos de servicio** | **nuevo**: fila SERVICE de "Mis ofertas" > "Fotos del servicio", mismo cargador que el producto (hasta 5, arrastrar o galeria del dispositivo, portada, orden) |
| **Micrositio: galeria (hasta 12) y logo** | **nuevo**: seccion "Fotos y logo" del perfil publico; las fotos se suben, entran al borrador del perfil y salen en la pagina al guardar (y aprobar). Se guarda el `mediaId`, nunca una direccion |
| **Micrositio publico y app: logo y galeria** | **nuevo**: `seo-web` (`/p/{slug}`) y la pantalla del socio muestran el logo y las fotos |
| **Directorio** | la tarjeta ya muestra la portada subida (BE) |
| Regalo "De una tienda" | pide la URL de la TIENDA (no es imagen) y no tiene foto: D1, fuera de esta tanda |
| Poster de video del editor | NO hecho: necesita `posterMediaId` (BE #164 sin fusionar) |

Camara: en la web movil el selector abre galeria y camara; en nativo el selector es la galeria (`pickImage`). La camara nativa y `cameraPermission` en `app.config.ts` requieren un binario nuevo y no se tocan aqui.

## Contrato
`packages/contracts` re-vendorizado desde el commit `22450ab6` de `feat/req-imagenes-archivo-be` (provider-catalog 3.14.0, template-media 1.11.0) con `RSVP_BACKEND_REPO=/home/user/wt/be-imagenes-archivo node scripts/generate.mjs --ref 22450ab6`. **Ese SHA no esta fusionado**: al fusionar hay que volver a fijar `backend.lock.json` al SHA fusionado del backend (`yarn workspace @rsvp/contracts generate --ref <sha>`). Tabla de versiones y choques de contrato: `docs/progress/imagenes-archivo-ronda2-be.md` en RSVPBackend (provider-catalog 3.14.0 y template-media 1.11.0 porque 3.8-3.12 y 1.6-1.9.1 ya las usan #158-#170).

## Evidencia (local)
- `yarn turbo run typecheck`: 19 de 19.
- `eslint --max-warnings 0` sobre todo lo tocado: limpio.
- vitest: universal 872 (6 nuevas de `provider-media-ui`, 1 de `design-media`), query-hooks 217 (7 nuevas `provider-media`), design-editor 460 (2 de musica), seo-web 227 (1 nueva), i18n 18, contracts 6, celebration-theme 3026. Todos verdes, sin `skip` ni `only`.
- `yarn build` de `apps/universal` (expo export web) y de `apps/seo-web` (next build): ok.
- Pruebas negativas en pantalla: archivo que no es imagen, direccion arrastrada en vez de archivo (`text/uri-list`), galeria llena (12) sin peticion, borrar una foto que el perfil guardado usa (409 `MEDIA_IN_USE` con su mensaje), tipo/tamano fuera de rango antes de cualquier peticion, PUT 403 (tamano distinto) sin `complete`.

## NO probado
Chromium/Safari/Firefox reales contra el backend real (lista abajo), camara y galeria en iPhone/Android, HEIC en dispositivo, MinIO real, Kong real, lector de pantalla real, rendimiento con fotos grandes. `gitleaks` no esta instalado: diffs revisados a mano, sin secretos ni datos personales.

## Arranque para quien haga los recorridos Chromium
1. Backend (otro agente con Docker): `docker compose up` del gateway de RSVPBackend con la rama `feat/req-imagenes-archivo-be` (aplicar migraciones de `provider-catalog-service`: `yarn workspace @rsvp/provider-catalog-service db:migrate`; `PROVIDER_MEDIA_BUCKET`, `MINIO_PUBLIC_ENDPOINT` = origen del gateway; worker `provider:marketplace-workers` encendido).
2. FE: `yarn install --immutable`; `cd apps/universal && yarn web` (o `yarn build` + servir `web-build`); `cd apps/seo-web && yarn dev`. Apuntar `EXPO_PUBLIC_API_URL`/`API_URL` al gateway (ver `README.md`).
3. Cuentas: un proveedor VERIFIED con dueno, otro proveedor, un anfitrion con celebracion publicada. No usar cuentas reales ni datos personales.

## Recorridos Chromium a ejecutar (cada uno con captura y consola limpia)
1. Proveedor > Ofertas > servicio > "Fotos del servicio": arrastrar un JPG de 2 MB; ver etapas, "Lista" y portada; arrastrar un 6.o: mensaje de limite; "Usar como portada" reordena; recargar y ver la foto.
2. Lo mismo con un PDF renombrado `.jpg` (esperar rechazo `PHOTO_MISMATCH`), un `.gif`, un archivo de 6 MB y una URL arrastrada desde otra pestana ("guarda el archivo y subelo").
3. Proveedor > Perfil publico > "Fotos y logo": subir logo y 3 fotos (arrastrando y con el boton), escribir descripcion, Guardar; abrir `/p/{slug}` en otra pestana y ver logo y galeria (tras aprobar en el panel admin si el perfil esta retenido).
4. Quitar una foto del perfil sin guardar y ver "Subidas que no estan en tu perfil"; "Eliminar archivo" de una que el perfil GUARDADO usa: mensaje 409; quitarla, guardar y eliminar: 204.
5. Segundo proveedor: no ve ni puede borrar fotos del primero (probar copiando un id en la consola de red: 403/404 uniforme).
6. Directorio `/proveedores/...` y tarjeta del app: la oferta con foto muestra la portada subida; un producto sin foto sigue sin imagen.
7. Editor de diseno > Avanzado > "Imagenes" y "Musica": subir un MP3 de 12 MB (acepta derechos), agregarlo, previsualizar y publicar; en la invitacion publica se ve el reproductor. Con 16 MB debe fallar con mensaje claro (Kong 16 MB) y con 14 MB pasar.
8. Misma batalla en movil (viewport 390 px): areas tactiles de 44 px, foco visible, teclado (Enter/Espacio en el boton, flechas en los radios), zoom 200 %.
9. Una galeria de mas de 100 miniaturas o 120 GET por minuto desde una IP para confirmar el 429 de Kong (hipotesis del inventario).

## Pendiente / decisiones
- D2/D3 aplicadas como lo recomienda el inventario; si el dueno decide otra cosa se retira la seccion del perfil o el boton de servicios sin tocar el resto.
- HEIC en servicio/micrositio sigue la decision de producto: se rechaza en el cliente (convertir en el dispositivo).
- Camara nativa y permisos (`app.config.ts`) y el poster de video: siguientes PR.

## Hallazgos del recorrido real (F-1 a F-4, corregidos)
- F-1: varias fotos arrastradas juntas a la galeria solo dejaban la ultima en el borrador. `MicrositePhotos.onChange` ahora recibe un ACTUALIZADOR que parte del ultimo borrador (galeria, logo, quitar, descripcion). Prueba de componente con 3 archivos a la vez.
- F-2: una foto subida viaja solo por `mediaId` (sin `url`); la direccion solo vuelve en una entrada guardada antes de las subidas. El FE distingue con la lista de fotos del proveedor (`useProviderMedia`); el logo ya iba solo por id. Sin cambio de contrato.
- F-3: con 5 de 5 fotos ya no se muestra «Foto lista.» junto al aviso de limite.
- F-4: cada foto de la galeria del micrositio tiene su campo «Descripcion de la foto N» (es-BO y en-US, hasta 200 caracteres, en el idioma de la persona); vacio queda como decorativa. No se inventa un alt a partir del nombre del negocio.
- Evidencia: typecheck 19/19, eslint limpio, vitest universal 875, seo-web 227, i18n 18, build web ok. Contrato sin cambios (BE `22450ab6`).
