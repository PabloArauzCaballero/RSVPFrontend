# Evidencia · F19 Push (solo parte de código) · 2026-11-04

## Continuación local · 2026-11-06

| Corte | REQ | Resultado observable y negativo |
|---|---|---|
| Explicar → pedir permiso → registrar en una plataforma | 01, 02 | Canal Android antes del diálogo, permiso solo por acción explícita y POST autorizado con instalación estable. Denegado o proyecto ausente no registra. Primer push real exige build y credenciales. |
| Cerrar sesión y volver a iniciar | 02 | Baja autenticada antes de perder el acceso. Reactivación solo para celebraciones previamente habilitadas y permiso ya concedido. Un error de baja no impide cerrar sesión. |
| Recibir y abrir según el estado de la app | 03, 04, 05 | Aviso discreto en primer plano; sistema en segundo plano; respuesta del arranque en frío. Resolver el ID del aviso mediante la bandeja autenticada; un ID desconocido no navega. |
| Leer desde la bandeja → sincronizar insignia | 06 | Usar los mismos `readAt` y la misma caché de F18. Verificar rollback de lectura y cierre de sesión. |

CodeGraph 1.6.2 confirmó el flujo de la pantalla, autenticación y hooks. Se conserva `/permisos-push` dentro de `(host)`: registro y baja requieren sesión y celebración con permiso. La copia backend del adaptador Expo envía `notificationId` y `deliveryId`, sin URL ni celebración. Se prueban las rutas con el driver falso sin atribuirle entrega real. Impeccable y UI/UX Pro Max guían el contexto previo, mensajes recuperables y el aviso en primer plano sin animación.

### Resultados locales

| REQ | Estado de la capa probada | Evidencia |
|---|---|---|
| REQ-F19-01 | PASS · componente con driver falso y Expo web | Contexto previo al diálogo, canal Android antes de pedir permiso, denegación sin segundo diálogo, estado sin soporte y salida a preferencias con teclado. |
| REQ-F19-02 | PASS · cliente con MSW; integración real pendiente | POST autorizado, DELETE de esta instalación antes del logout y POST al volver con la misma cuenta habilitada. Si falla la baja, el logout local continúa y el servidor puede conservar el registro hasta que se pueda completar la baja. |
| REQ-F19-03 | BLOCKED-EXTERNAL · recepción física | El driver simula la recepción y suprime el banner del sistema en primer plano. La app presenta un aviso discreto cuando encuentra el ID en la bandeja autenticada. |
| REQ-F19-04 | BLOCKED-EXTERNAL · recepción física | El driver permite la presentación del sistema en segundo plano y procesa la respuesta al tocar. APNs/FCM no ejecutados. |
| REQ-F19-05 | BLOCKED-EXTERNAL · recepción física | El driver cubre arranque en frío y una sola apertura, con destino derivado de la plantilla del aviso autenticado. No abre URLs del payload ni ejecuta acciones de F20. |
| REQ-F19-06 | BLOCKED-EXTERNAL · insignia física | Se calcula desde los `readAt` de la misma consulta que usa F18. La prueba de lógica comprueba conteo y cambio tras lectura. Falta medir la insignia en el sistema, según soporte del lanzador. |

- `node apps/universal/scripts/e2e-guests.mjs --f19` con `CHROMIUM_PATH` apuntando a Chrome → exit 0. Exportación Expo web, dos comprobaciones, cuatro capturas y cuatro revisiones axe sin hallazgos críticos o serios. [Reporte y capturas](local-web/e2e-result.json).
- Con `NODE_OPTIONS=--no-experimental-webstorage`, `vitest run` → exit 0, 244/244 en universal, 85/85 en query-hooks y 12/12 en i18n. Suite con cobertura acotada a `permissions-screen.tsx` → exit 0, 90/90 y 98,82 % de líneas y sentencias. Query-hooks → 99,39 % de líneas y sentencias. Vitest avisa que el proveedor de cobertura tiene una versión diferente del runner.
- MSW cubre errores 400/401/403/404/409/413/415/422/503 de GET/POST/DELETE de dispositivos. El camino de registro y baja usa 201 y 204. TypeScript en universal, ESLint dirigido, sintaxis del script y parseo del YAML → exit 0. CodeGraph sincronizado.

**Estado: TESTED local.** Para cierre quedan los recorridos físicos, la aprobación de las capturas, las tres corridas en CI y la revisión de otro eje.

### Prueba física pendiente

En esta sesión `EXPO_PUBLIC_EAS_PROJECT_ID`, `EXPO_IOS_BUNDLE_IDENTIFIER` y `EXPO_ANDROID_PACKAGE` no están definidos. `adb`, `maestro` y `eas` no aparecen en PATH. Kong rechazó conexiones en 8000 y 28000. `node packages/contracts/scripts/generate.mjs --check` devuelve exit 1 por el desajuste preexistente entre contratos vendorizados y la copia local de backend, incluido Notification.

1. En un entorno de QA, usar el backend compatible del carril 24, una celebración con permiso MANAGE y builds EAS para iPhone y Android físicos con proyecto, APNs y FCM configurados. Usar una URL de API accesible desde los teléfonos y los identificadores nativos configurados en el proyecto.
2. Ejecutar [el flow F19 de Maestro](../../../../apps/universal/.maestro/f19-permission.yaml) en una instalación de QA. Pasar `APP_ID`, `CELEBRATION_ID`, `QA_EMAIL` y `QA_PASSWORD` desde el entorno de prueba. El flow limpia el estado del build, deja el permiso sin decidir, verifica el contexto y registra al aceptar. El YAML se parseó localmente; el flow aún no se ejecutó.
3. Con el dispositivo registrado, generar avisos nuevos desde el backend, o usar `POST /notifications/celebrations/{celebrationId}/devices/{deviceId}/test` con una clave de idempotencia UUID distinta por envío de prueba. Confirmar en el teléfono el aviso dentro de la app abierta, la notificación del sistema en segundo plano y la apertura desde la notificación con la app cerrada. Usar un aviso real de acompañantes o RSVP para comprobar el destino específico. Un ticket aceptado del proveedor por sí solo no verifica recepción.
4. En cada plataforma, leer los avisos en el centro, comparar el total con la insignia si el lanzador la admite y comprobar que al cerrar sesión se da de baja el dispositivo. Repetir el ingreso y confirmar que solo se registra la cuenta que había habilitado esa celebración. En una instalación limpia aparte, rechazar el permiso y verificar que al volver a la pantalla no se repite el diálogo.
5. Guardar capturas de cada estado, plataforma y resultado junto al identificador de build. Mantener los tokens y credenciales fuera de los artefactos.

Referencias de herramientas: [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) y [Maestro launchApp](https://docs.maestro.dev/reference/commands-available/launchapp).

## Evidencia histórica
Pantalla de permisos (`/permisos-push`) y registro de dispositivo con `expo-notifications` + `expo-device` (`apps/universal/src/push`). Pruebas: `test/push.test.ts` (permiso concedido → token Expo con projectId EAS → `POST /notifications/celebrations/{id}/devices`; denegado; simulador/web no soportado; sin projectId; fallo de token) y captura `permisos-push-web-no-soportado-360.png`.
**No verificado**: recepción real, builds EAS, credenciales APNs/FCM, dispositivo físico. `REQ-F19-*` siguen `BLOCKED-EXTERNAL`. Plugin `expo-notifications` añadido a la config.
