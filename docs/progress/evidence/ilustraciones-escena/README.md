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

## Segundo PR: portada (2026-11-21)

Por decisión de Pablo («uno por rol»): cada bloque de «Para cada lado de la fiesta» lleva su escena (`welcomeHost`, `welcomeGuest`, `welcomeProvider`) en el sitio (`landing.tsx`, `HostArt`/`GuestArt`/`ProviderArt`) y en la app web (`landing-screen.tsx`, `Illustration` de 96 px, igual que `.roles__art` de 6rem).

- `design-tokens` emite los pastel de `tones` como `--pastel-{tono}-bg/fg` (son los mismos valores que ya usa la app; ningún color nuevo). Así el sitio pinta las escenas con los mismos pastel y el mismo filete que la app; antes `.art` tomaba `--accent-muted`/`--success-bg`, que no coincidían.
- En oscuro, la sombra de contacto del sitio es `canvas`, como en la app.

| Comando | Resultado |
|---|---|
| `yarn typecheck` / `yarn lint:code` | exit 0 / exit 0 |
| `@rsvp/seo-web test` | 145 passed (nueva `landing-art.test.tsx`) |
| `@rsvp/universal test` | 457 passed (nuevo caso en `landing.test.tsx`) |
| `@rsvp/design-tokens test` | 80 passed (el pipeline comprueba que `generated/` está al día) |
| `landing-mirror.mjs` (app exportada en :8340 contra el sitio construido de la rama en :3100) | **15/15 PASS**, 12 combinaciones 360/768/1280 × claro/oscuro × es/en con `roleArt app=3 site=3`, axe 0 críticos/serios |
| seo-web `playwright test` | 33 passed, 1 failed (`landing 360/1280`, por el dibujo) → `--update-snapshots`: 1 passed |

Capturas: `portada-roles-{sitio,app}-{light,dark}.png`. El espejo se corrió contra el sitio construido en local, no contra el desplegado: el desplegado todavía no tiene este cambio.
## iOS nativo (2026-11-21)

Expo Go 54.0.7 en un simulador propio («DOne iPhone 17», iOS 26.5), con el bundle de la rama abierto en la ruta de desarrollo `/identidad`. Las láminas se dibujan con `react-native-svg` y muestran disco, sombra, figura de tinta y pieza pastel, iguales a la web (`ios-nativo-identidad-claro.png`). Nivel: **VERIFIED en iOS (claro)**. El modo oscuro nativo no se capturó: la página de identidad es fija en claro y el simulador no admitía desplazamiento sin permiso de accesibilidad. Lo cubre `identity.native.test.tsx` (mismos `d`, colores de `illustrationColors('onDark')`). Android no se ejecutó.

## Tercer PR: portada completa (2026-11-23)

Rama `feat/portada-dibujos-completa` → `chore/deploy-contabo-coolify` (se integra en fe-07, #80). Pedido de Pablo: «dibujitos minimalistas al estilo de Cuotea» en la portada (hero), los tres toques y la llamada final, **solo objetos**, sin cambiar a amarillo ni la paleta de DOne.

**Dibujos nuevos en `@rsvp/ui`** (misma gramática: disco de piedra, sombra plana, figura de tinta, una sola pieza en el pastel del grupo; ningún color nuevo):

| Lámina | Dónde | Objeto | Pastel (grupo) |
|---|---|---|---|
| `landingSend` | Portada, sobre la marca de la sección (4.5rem; 5.5rem desde 52rem) | Avión de papel con estela de tres puntos | azul (`guest`) |
| `landingCreate` | Paso 1, debajo de la imagen del producto (4rem) | Invitación de arco con su lápiz | `tones.yellow` de DOne (`host`) |
| `landingShare` | Paso 2 | Teléfono con la burbuja del enlace | azul (`guest`) |
| `landingReplies` | Paso 3 | Portapapeles: dos respuestas con tic y una pendiente | `tones.yellow` de DOne (`host`) |
| `invitation` (ya existía) | Llamada final, en lugar del tic suelto, sobre una baldosa `surface` (el panel es `primary`, invertido) | Sobre con la tarjeta y el sello | `tones.yellow` de DOne (`host`) |

El «amarillo» de la tabla es el pastel `tones.yellow` (#FBF3DB / #3A3012) que DOne ya usaba en las láminas del anfitrión y en el degradado de la portada; no es el amarillo de Cuotea.

**Espejo sitio/app.** El sitio no puede importar `packages/ui`, así que copia los trazados en `apps/seo-web/components/brand/illustrations.tsx`. La prueba nueva `apps/universal/test/site-art-sync.test.ts` lee esa copia y falla si capas, trazados, grosores o (en la portada) el pastel se separan de `@rsvp/ui`: cubre las 11 copias del sitio. `landing-mirror.mjs` exige además los mismos 5 dibujos en el mismo orden en ambos lados.

| Comando | Resultado |
|---|---|
| `yarn typecheck` / `yarn lint:code` | exit 0 (18 tareas) / exit 0 |
| `@rsvp/ui test` | 317 passed |
| `@rsvp/seo-web test` | 147 passed (caso nuevo en `landing-art.test.tsx`) |
| `@rsvp/universal test` | 475 passed (caso nuevo en `landing.test.tsx` y `site-art-sync.test.ts`, 12 casos) |
| `landing-mirror.mjs` (app exportada en :8340 contra el sitio construido de la rama en :3100) | **15/15 PASS**, 12 combinaciones 360/768/1280 × claro/oscuro × es/en con `scenes app=5 site=5`, `roleArt 3/3`, overflow 0, axe 0 críticos/serios |
| seo-web `playwright test` | 33 passed, 1 failed (`landing 360/1280`, por los dibujos) → `--update-snapshots -g "landing 360/1280"`: 1 passed; línea base revisada a ojo |
| `landing-art-capture.mjs` (Chrome real) | 24 capturas, overflow 0 en 390 y 1280, claro y oscuro |

La app no tiene línea base visual de la portada (`apps/universal/e2e` no la captura), así que no se regeneró ninguna de la app.

Capturas: `portada-dibujos-{sitio,app}-{hero,pasos,cierre}-{390,1280}-{light,dark}.png`.

**Límite conocido (L16, no se toca aquí):** en oscuro la sombra de contacto es `canvas` y, sobre el fondo de la portada (avión del hero), muerde el borde inferior del disco. Lo corrige la rama `fix/l16-sombra-ilustracion-oscuro`; dentro de las tarjetas de los pasos y de la baldosa del cierre (`surface`) se ve bien.

**No verificado:** iOS/Android nativo (la portada solo existe en la app web; en nativo `/` abre el ingreso) y el entorno TEST desplegado.

**Reversión:** revertir el commit. Solo suma láminas y nodos decorativos; ningún dato ni contrato cambia.
