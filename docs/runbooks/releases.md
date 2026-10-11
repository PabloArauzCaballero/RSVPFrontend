# Release móvil y actualizaciones OTA

## Requisitos

Los secretos `EXPO_TOKEN`, credenciales de Apple/Google y `EXPO_ASC_APP_ID` se configuran en GitHub/EAS, nunca en el repositorio. El proyecto de Expo debe estar enlazado desde `apps/universal/app.config.ts`.

Configurar estas variables de despliegue en EAS/GitHub, nunca en el repositorio: `EXPO_PUBLIC_EAS_PROJECT_ID`, `EXPO_PUBLIC_LINK_DOMAIN`, `EXPO_IOS_BUNDLE_IDENTIFIER`, `EXPO_ANDROID_PACKAGE`, `RSVP_APPLE_APP_ID`, `RSVP_ANDROID_PACKAGE` y `RSVP_ANDROID_SHA256_FINGERPRINTS`.

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

Si cambia código nativo, se requiere una nueva build de producción, no una actualización OTA.
