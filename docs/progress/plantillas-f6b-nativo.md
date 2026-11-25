# Plantillas F6-b · App nativa (P10)

Corrige: PL-F6 (P10), PL-L3. Rama `feat/plantillas-f6b-nativo` sobre `feat/plantillas-f6-medios-render` (FE #131).

## Qué cambia

- La invitación del invitado (`/c/{slug}[/{sección}]`) es la página pública de seo-web dentro de una vista web (`react-native-webview`). Una sola implementación: plantilla, fotos, medios, idiomas y oscuro salen del renderizador v2.
- El enlace personal llega como un script que la app entrega a la vista web antes de cargar la página (sessionStorage de la visita, solo si el origen es el del sitio). Nunca va en la URL, ni en un log, ni en un Referer. En web (Expo web) el sitio no se puede embeber (`X-Frame-Options: DENY`), así que la invitación es una navegación al sitio con el crédito en el fragmento `#t=`, que ningún servidor ni Referer recibe y que el sitio borra de la barra al leerlo.
- Vista previa del anfitrión (`PreviewFrame`: onboarding, editor, galería de estilos, vista previa) y admin de plantillas: cargan `/vista-previa` del sitio y le entregan tema, vista y fotos en un mensaje (web: `postMessage` con origen verificado desde el padre; nativo: puente de la vista web, que solo existe si el anfitrión lo declara). Sin credencial en el mensaje. La página es inerte (sus enlaces no navegan), `no-store`, `noindex`, `no-referrer`, y solo `NEXT_PUBLIC_APP_URL` puede embeberla.
- Los enlaces de la página se reparten: regalos y responder pasan a las pantallas de la app (sin token en la ruta), mapas, proveedores (`/r/{listingId}`) y cualquier otro sitio abren fuera; esquemas distintos de http/https/mailto/tel/sms se bloquean.
- Estados: cargando (esqueleto anunciado), sin red o sitio caído (reintento con vista web nueva), 404 (pantalla de «no disponible»). El botón de regalos está en la invitación misma, y además en la app mientras carga y cuando falla.
- Se retira `packages/celebration-theme/src/native.tsx` (+ su prueba, `invitation-icon.tsx` y la prueba de tamaño de fuente nativa). Se quitan `react-native`/`react-native-web` de ese paquete, que ya es solo web.
- i18n: `celebration.app.*` en es-BO y en-US.

## Evidencia (Linux, Chrome real)

- `apps/seo-web/e2e/plantillas-f6b-vista-previa.spec.ts` (sitio `next build` + `next start` sobre el fixture de contrato, arnés en otro origen): 4 casos, incluido el rechazo de un origen no listado y de mensajes sin ser el padre, y los encabezados.
- Capturas: `docs/progress/evidence/plantillas-f6b/vista-previa-{360,768,1280}.png` (fixture, no backend real).

## No verificado

- iOS y Android: solo se comprobó que Metro empaqueta (`expo export --platform ios|android`, módulo `RNCWebView` incluido en el bundle de iOS). No se ejecutó en simulador ni dispositivo; el puente (`injectJavaScript`, `onMessage`), `onShouldStartLoadWithRequest` y `onHttpError` están probados contra un doble de prueba, no contra el módulo real.
- `onHttpError` de Android: se asume que solo avisa de la navegación principal; falta confirmarlo en un dispositivo.
- Línea base Playwright del universal (macOS): `host-vista-previa` y las demás pantallas con vista previa cambian de aspecto (ahora un iframe al sitio); no se regeneró desde Linux.
- Recorrido de Expo web contra el backend real.

## Ronda 1 del orquestador (PL-134-M1..M4, m1, m2, m3)

- M1: `/c/{slug}` guarda el token del fragmento `#t=` y limpia la dirección con un script en línea al comienzo de la página (antes de cualquier iframe o recurso de terceros) y, de respaldo, `readGuestCredential` en la isla. e2e: `location.hash === ""`, token en sessionStorage, «Confirmar asistencia» visible, ninguna petición ni Referer con el token, sin iframes.
- M2: en web, antes de navegar al sitio se sondea (`HEAD`, `no-cors`, sin cookies ni Referer, 6 s). Sin respuesta: `OfflineState` con reintento y «Ver regalos». Límite: `no-cors` solo distingue «el sitio responde» de «no responde»; un 5xx del sitio lo muestra el propio sitio. e2e con red bloqueada y reintento.
- M3: el esqueleto de carga usa la columna de 720 px centrada (e2e a 1440).
- M4: la vista previa web falla por `error` del iframe, a los 3 s de su `load` si la página no avisa, o a los 8 s si no carga.
- m1: la regla de encabezados usa `(?!vista-previa$)`. m2: `/vista-previa` ya no lleva CSP-Report-Only. m3: el 404 de la invitación no ofrece «Ver regalos» a propósito (no hay invitación ni lista); se documenta aquí.
- No hecho: m4 (logo del sitio duplicado en oscuro dentro de la vista previa), m5 (marco del admin a 390), m6 parcial (los enlaces inertes siguen en el Tab: quitarlos del Tab deja la navegación desplazable sin contenido enfocable y axe lo marca como serio).
- Hallazgo de la base (#131): `design/render` importa `postcss`, y Metro tomaba su envoltorio ESM: el bundle web del universal fallaba al cargar con «Cannot read properties of undefined (reading 'stringify')». `apps/universal/metro.config.js` fuerza la entrada CJS de postcss.

### Líneas base macOS que cambian (no regeneradas desde Linux)

`host-vista-previa-{390,768,1440}`, `host-templates-{390,768,1440}`, `host-editor-general-{390,768,1440}`. El gate visual no define `EXPO_PUBLIC_SITE_URL`: regenerar exige el sitio servido, o se captura el esqueleto.
