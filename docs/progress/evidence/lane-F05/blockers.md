# F05 · bloqueos externos

Actualizado: 2026-10-11.

`POST /identity/auth/password-recovery` y `POST /identity/auth/logout` ya forman parte del contrato de Identity y están consumidos por `@rsvp/auth`.

Para cerrar la demostración de enlaces universales en dispositivos reales siguen faltando recursos que no pueden inventarse desde código:

- dominio verificado para `EXPO_PUBLIC_LINK_DOMAIN`;
- Apple Developer Team ID / App ID (`RSVP_APPLE_APP_ID`);
- package Android y huella SHA-256 de la firma;
- cuentas Apple Developer y Google Play con dispositivos físicos de prueba.

Las rutas `/.well-known/apple-app-site-association` y `/.well-known/assetlinks.json` están listas y responden 404 hasta recibir esos identificadores, para no publicar archivos de verificación falsos.
