# F05 · bloqueos externos y de contrato

Fecha: 2026-10-10.

- `REQ-F05-01` no puede cerrar completamente: el contrato OpenAPI de Identity v1.0.0 solo declara registro, login y refresh; no declara recuperación de contraseña.
- `REQ-F05-06` no puede cerrar completamente: el contrato no declara revocación/cierre de sesión remoto. El cliente borra el estado local de forma garantizada, pero necesita un endpoint de revocación para invalidar el refresh token en servidor.
- `REQ-F05-04` y `REQ-F05-05` requieren el dominio verificado, Apple Developer Team ID, Android package name y fingerprint SHA-256 de la firma. `@rsvp/auth` genera el contenido correcto de ambos documentos; su publicación bajo `apps/seo-web/public/.well-known/` y la prueba en dispositivos físicos quedan bloqueadas hasta contar con esos valores y las cuentas de tienda.

Evidencia de fuente: `RSVPBackend/packages/contracts-openapi/specs/identity.openapi.json` v1.0.0.
