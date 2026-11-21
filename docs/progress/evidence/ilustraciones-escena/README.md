# Ilustraciones como escena (2026-11-21)

Rama `feat/ilustraciones-estilo-escena` → `chore/deploy-contabo-coolify`.

**Qué cambia.** Las 32 láminas de `@rsvp/ui` y las 3 del sitio público adoptan la gramática de dibujo de la dirección de arte de Cuotea: disco de piedra, sombra de contacto plana, figura rellena de tinta y una sola pieza de acento. **No cambia ningún color de DOne**: el acento es el pastel del grupo que ya existía (`ILLUSTRATION_PASTEL`), y el disco, la sombra y la piedra salen de `primaryMuted`, `border`/`canvas` y `fieldBorder`. Nombres y props de `Illustration` intactos. En el ingreso (columna editorial) y en los estados del enlace del invitado la ilustración pasa a `lg` (148 px).

**Nivel:** TESTED. Pruebas unitarias y visuales locales en macOS con Chrome real contra los servidores de las suites (contrato de ejemplo y fixture). No se probó en iOS/Android nativo: el renderer nativo es el mismo `ArtSvg` y la prueba `identity.native.test.tsx` comprueba que dibuja exactamente los mismos `d`.

## Comandos y salida

| Comando | Resultado |
|---|---|
| `yarn typecheck` | exit 0 (18 tareas) |
| `yarn lint:code` | exit 0 |
| `yarn workspace @rsvp/ui test` | 297 passed (incluye 33 nuevas: gramática de escena por lámina y paleta solo de tokens) |
| `yarn workspace @rsvp/universal test` | 456 passed |
| `yarn workspace @rsvp/seo-web test` | 144 passed |
| `yarn harness:validate` | válido |
| `gitleaks git --log-opts=origin/chore/deploy-contabo-coolify..HEAD` | no leaks found |
| universal `playwright test` en la base (`origin/chore/deploy-contabo-coolify`) | 56 failed / 133 passed — diferencias previas de este Mac |
| universal `playwright test` en la rama | 69 failed / 120 passed: las mismas 56 más **13 que solo fallan por el dibujo** |
| universal `--update-snapshots` solo de esas 13 | 13 passed; líneas base actualizadas y revisadas a ojo |
| seo-web `playwright test` base / rama | 34 passed / 9 failed (solo F15 enlace inválido y F24 directorio, las pantallas con dibujo) |
| seo-web `--update-snapshots` de esas 9 | 9 passed |

Las 13 de universal: admin-operacion 390px,admin-operacion 768px,auth-recuperar 1440px,guest-rsvp-invalido 1440px,guest-rsvp-invalido 390px,guest-rsvp-invalido 768px,host-editor-galeria 390px,host-onboarding 390px,host-onboarding 768px,host-templates 390px,portal-alta 1440px,portal-alta 390px,portal-alta 768px.

Las 56 que fallan igual en la base **no se regeneraron** (no son de este cambio): admin-metricas 1440px,admin-metricas 390px,admin-metricas 768px,auth-login 1440px,auth-login 390px,auth-login 768px,auth-login dark 1440px,auth-login dark 390px,auth-registro 1440px,auth-registro 390px,auth-registro 768px,auth-registro dark 1440px,auth-registro dark 390px,guest-regalos 1440px,guest-regalos 390px,guest-regalos 768px,guest-regalos dark 1440px,guest-regalos dark 390px,guest-rsvp 1440px,guest-rsvp 390px,guest-rsvp 768px,host-editor-general 1440px,host-editor-general 390px,host-editor-general 768px,host-editor-general dark 1440px,host-editor-general dark 390px,host-regalos-catalogo 1440px,host-regalos-catalogo 390px,host-regalos-catalogo 768px,portal-agenda 1440px,portal-agenda 390px,portal-agenda 768px,portal-destinos 1440px,portal-destinos 390px,portal-destinos 768px,portal-documentos 1440px,portal-documentos 390px,portal-documentos 768px,portal-entrega 1440px,portal-entrega 390px,portal-entrega 768px,portal-leads 1440px,portal-leads 390px,portal-leads 768px,portal-metricas 1440px,portal-metricas 390px,portal-metricas 768px,portal-perfil 1440px,portal-perfil 390px,portal-perfil 768px,portal-productos 1440px,portal-productos 390px,portal-productos 768px,portal-servicios 1440px,portal-servicios 390px,portal-servicios 768px.
Algunas de ellas también muestran una ilustración (p. ej. `auth-login`); su línea base ya estaba desfasada antes de este cambio y queda pendiente de la regeneración general.

## Capturas

- `catalogo-claro.png`, `catalogo-oscuro.png`: las 32 láminas.
- `antes-login-1440.png` / `despues-login-1440.png` / `despues-login-oscuro-1440.png`.

## Reversión

Revertir el commit del PR: el modelo de datos (`Shape`, `Layer`) solo suma capas, ninguna pantalla depende de la forma interna del dibujo.

## Fuera de este PR

Portada (seo-web `landing.tsx` + app `landing-screen.tsx`, espejo `landing-mirror.mjs`) y pasos del onboarding: van en un PR aparte cuando se resuelvan los PR #13/#14.

## iOS nativo (2026-11-21)

Expo Go 54.0.7 en un simulador propio («DOne iPhone 17», iOS 26.5), con el bundle de la rama abierto en la ruta de desarrollo `/identidad`. Las láminas se dibujan con `react-native-svg` y muestran disco, sombra, figura de tinta y pieza pastel, iguales a la web (`ios-nativo-identidad-claro.png`). Nivel: **VERIFIED en iOS (claro)**. El modo oscuro nativo no se capturó: la página de identidad es fija en claro y el simulador no admitía desplazamiento sin permiso de accesibilidad. Lo cubre `identity.native.test.tsx` (mismos `d`, colores de `illustrationColors('onDark')`). Android no se ejecutó.
