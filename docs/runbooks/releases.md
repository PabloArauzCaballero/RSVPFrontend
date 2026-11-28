# Release móvil y actualizaciones OTA

## Requisitos

Los secretos `EXPO_TOKEN`, credenciales de Apple/Google y `EXPO_ASC_APP_ID` se configuran en GitHub/EAS, nunca en el repositorio. El proyecto de Expo debe estar enlazado desde `apps/universal/app.config.ts`.

Configurar estas variables de despliegue en EAS/GitHub, nunca en el repositorio: `EXPO_PUBLIC_EAS_PROJECT_ID`, `EXPO_PUBLIC_LINK_DOMAIN`, `EXPO_IOS_BUNDLE_IDENTIFIER`, `EXPO_ANDROID_PACKAGE`, `RSVP_APPLE_APP_ID`, `RSVP_ANDROID_PACKAGE` y `RSVP_ANDROID_SHA256_FINGERPRINTS`.

La app (nativa, EAS y la imagen web de Coolify) necesita dos orígenes distintos, ambos incrustados al compilar:

- `EXPO_PUBLIC_SITE_URL`: el sitio público (seo-web). Ahí viven el redirector de proveedores `/r/{listingId}` y las páginas indexables. Es **obligatoria** cuando el sitio no está en el mismo dominio que la app; sin ella, los enlaces a proveedores usan `EXPO_PUBLIC_RSVP_ORIGIN`, lo que solo es correcto si un único dominio sirve las dos cosas. En TEST: `https://rsvp-web.161.97.85.216.sslip.io`.
- **Invitación en la app (P10):** el invitado, la vista previa del anfitrión y el admin cargan el sitio público en una vista web, así que `EXPO_PUBLIC_SITE_URL` es obligatoria también para ellos, y el sitio debe construirse con `NEXT_PUBLIC_APP_URL` igual al origen de la app web: es el origen que `/vista-previa` deja embeber (`frame-ancestors`) y al que le habla. Si la app se sirve desde más de un dominio, `NEXT_PUBLIC_PREVIEW_EXTRA_ORIGINS` (variable de build en Coolify) admite una lista explícita separada por comas de orígenes adicionales, p. ej. `https://dev.doneapp.events`; sin comodines (una entrada con `*`, ruta, credenciales o esquema no http(s) se descarta). `react-native-webview` es un módulo nativo: llega con un build nuevo de EAS, no con una actualización OTA; una versión instalada sin él no abre la invitación hasta actualizarse.
- `EXPO_PUBLIC_RSVP_ORIGIN`: el dominio de los enlaces personales de RSVP. En TEST: `https://dev.done.arauzsoftware.com`.

El sitio SEO sirve `/.well-known/apple-app-site-association` y `/.well-known/assetlinks.json` de forma dinámica. Ambos responden 404 hasta contar con los identificadores verificados: publicar valores de ejemplo puede dejar los enlaces universales invalidados por caché.

## Preview para QA

En Actions, ejecutar **EAS build** con perfil `preview`. EAS entrega un APK Android instalable y una build iOS interna. Compartir el enlace de artefacto con QA.

## Producción

Crear y publicar el tag `mobile-vX.Y.Z`. El workflow usa el perfil `production`, firma ambos binarios y los deja disponibles para envío a TestFlight e Internal Testing. Ejecutar `eas submit --platform all --profile production --latest` después de aprobar los artefactos.

## Parche JavaScript

Para un cambio que no altere permisos, dependencias nativas ni configuración de Expo, ejecutar desde `apps/universal`:

```sh
yarn eas update --channel production --message "Descripción del parche"
```

O desde Actions: workflow **EAS update** (`.github/workflows/eas-update.yml`), con canal y mensaje. Requiere `EXPO_TOKEN` y `EXPO_PUBLIC_EAS_PROJECT_ID`; hasta tenerlos, no se ha ejecutado.

Si cambia código nativo, se requiere una nueva build de producción, no una actualización OTA.

## iOS · TestFlight (F12 / A8)

- Proyecto EAS: `@pablo28809s-team/rsvp` (`a7c4435b-6494-458c-b142-83b2b0705ef1`). Bundle iOS y paquete Android: `com.arauzsoftware.done` (no se cambia después del primer build subido).
- Perfiles en `apps/universal/eas.json`; todos heredan `base`, que fija `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SITE_URL` y `EXPO_PUBLIC_RSVP_ORIGIN`. Hoy apuntan a TEST; cuando exista producción se cambian ahí y se compila un build nuevo.
- Un build de release sin `EXPO_PUBLIC_API_URL`, o con una URL `http://`, falla al arrancar (`resolveApiUrl`, A8).
- Primer build y envío (interactivo, requiere la cuenta de Apple Developer y su 2FA): `cd apps/universal && eas build -p ios --profile production --auto-submit`. EAS registra el bundle id, crea certificado y perfil, y `--auto-submit` crea la app en App Store Connect si no existe y sube el build a TestFlight.
- Ficha de la tienda: `docs/release/app-store-connect.md`.

## Interruptor `GUEST_MARKETPLACE` (seo-web)

Variable de build y de runtime del contenedor `seo-web` (declarada en ambos lados en `docker-compose.coolify.yml`, valor por defecto `off`). Con `on` se abren `/c/{slug}/proveedores` y sus entradas (invitación y RSVP); con cualquier otro valor la ruta responde 404 y no hay entradas. Encender primero en TEST, y solo con el backend `provider-catalog` 3.15.0 o superior ya desplegado. Apagarla revierte al instante. No encender en producción hasta cumplir los requisitos de `docs/progress/marketplace-invitado-fe.md`.

