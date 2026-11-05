# F01 · Área segura en iPhone (antes y después)

App universal en **Expo Go SDK 54, iPhone 17 simulado (iOS 26.5)**, 2026-11-05. Las capturas `antes-*` muestran el defecto: el logo, el título y el spinner se montaban sobre la hora y el notch. Las `despues-*` son la misma ruta con `SafeFrame` en el layout raíz.

| Pantalla | Ruta | Antes | Después |
|---|---|---|---|
| Acceso | `/login` | `antes-login.png` | `despues-login.png` |
| Crear cuenta | `/registro` | `antes-registro.png` | `despues-registro.png` |
| Recuperar contraseña | `/recuperar` | `antes-recuperar.png` | `despues-recuperar.png` |
| Catálogo de componentes | `/catalogo` | `antes-catalogo.png` | `despues-catalogo.png` |
| Invitación (sin backend) | `/c/demo/rsvp/<token>` | `antes-invitado.png` | `despues-invitado.png` |

Causa: `react-native-safe-area-context` estaba instalado pero ningún layout lo usaba. Corrección: `SafeAreaProvider` + `SafeFrame` (cuatro bordes, color canvas del tema) una sola vez en `apps/universal/app/_layout.tsx`.

Prueba automática: `apps/universal/test/safe-frame.test.tsx` (bordes, relleno y color del tema claro/oscuro). Las capturas son de simulador, no de un dispositivo físico; Android no se ha ejecutado.
