# F07 · bloqueos externos

Actualizado: 2026-10-11.

Los workflows de CI, EAS Build y Lighthouse, los perfiles de `eas.json`, el runtime version y el runbook de OTA están versionados.

Una build firmada y su distribución requieren recursos externos que no existen en el repositorio:

- `EXPO_TOKEN` y proyecto EAS enlazado (`EXPO_PUBLIC_EAS_PROJECT_ID`);
- credenciales de firma Apple y Google;
- `EXPO_ASC_APP_ID` y acceso a TestFlight / Google Play Internal Testing.

No se añadieron secretos ni identificadores ficticios al código.
