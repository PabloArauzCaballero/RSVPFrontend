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
