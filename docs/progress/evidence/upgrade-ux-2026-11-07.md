# Mejora de experiencia: personalidad, simplificación y datos de demostración (2026-11-07)

Rama `feat/upgrade-ux-personalidad`, apilada sobre `feat/rediseno-marca` (PR #9). Brief: `docs/design/upgrade-brief.md`. Estado: **TESTED** contra el backend real en Chrome real (web). **No** verificado en iOS/Android ni contra `template-media`/almacenamiento de objetos.

## Qué cambió

- **Personalidad como sistema** (`packages/ui`, `docs/design/primitives.md`, sección «Personalidad» de `DESIGN.md`): el cheque de la D dibujado con trazo animado (respeta reduced-motion), 8 ilustraciones de línea propias, `EmptyState`, `PageIntro`, `SuccessNote`, `Celebrate`, `SwitchRow`.
- **Navegación:** el anfitrión pasa de 17 a 6 destinos (Inicio, Invitados, Regalos, Mi invitación, Avisos, Ajustes) con pestañas de sección; el proveedor a 5 y el admin a 4. Todas las rutas anteriores siguen funcionando.
- **Pantallas** (anfitrión, proveedor, admin, invitado y acceso): una acción primaria por pantalla, divulgación progresiva («Más opciones»), vacíos con ilustración, copy en la voz del brief (es-BO y en-US). Fusiones: Inicio como «qué hago ahora»; Agregar regalo con tres orígenes en un flujo; Publicar como lista «tu celebración está lista»; alta de invitación en 3 pasos con vista previa en vivo; Ofertas en una sola lista; «Listo para vender» en el portal; revisión de admin con filas compactas.
- **Sitio público** (`apps/seo-web`): landing, directorio, fichas, cotización y RSVP con identidad; SEO técnico (canonical/hreflang recíprocos, sitemap por idioma, JSON-LD validado, noindex en combinaciones sin proveedores). Skills de marketing aplicadas, una por una, en `docs/design/marketing-skills-aplicadas.md`; lo no validado, en `docs/design/marketing-pendiente.md`; guía de voz en `docs/design/voz-y-copy.md`.
- **Datos de demostración** (`apps/universal/scripts/seed/demo.mjs`, `docs/runbooks/datos-demo.md`): 18 cuentas, boda con 63 invitados en 15 grupos y todos los estados de respuesta, 17 regalos con reservas en cada estado, 10 proveedores en todos los estados. Solo HTTP, repetible (comprobado con dos corridas). Revisión funcional: `docs/progress/evidence/revision-funcional-2026-11-07.md`.

## Resultados (código final, backend real, Chrome real, gateway Kong :28000)

| Recorrido | Resultado |
|---|---|
| Login, registro, recuperar, organizaciones: matriz a 360 / 768 / 1280 | 53/53 en cada ancho |
| Login y marcos: barrido (3 anchos × es/en × claro/oscuro) + flujos en-US | 330 comprobaciones, 0 FAIL; 15/15 flujos |
| Celebración: matriz a 360 / 768 / 1280 | 48/48 en cada ancho |
| Celebración: barrido | 844 comprobaciones, 0 FAIL |
| Regalos (anfitrión e invitado): matriz a 360 / 768 / 1280 | 52/52 en cada ancho |
| Regalos: páginas y flujos en-US | 144/144; 15/15 |
| Invitados, avisos, preferencias, push: matriz a 1280 / 768 | 96 PASS, 0 FAIL en cada uno |
| Invitados a 360 | 95 PASS + 1 timeout de descarga que pasó 7/7 al repetirlo en aislamiento |
| Invitados: barrido | 942 comprobaciones, 0 FAIL |
| Portal del proveedor: matriz a 360 / 768 / 1280 | 62 PASS, 4 BLOCKED, 0 FAIL en cada ancho |
| Admin: matriz a 360 / 768 / 1280 | 36 PASS, 7 BLOCKED, 0 FAIL en cada ancho |
| Proveedor y admin: barrido | 1481 comprobaciones, 0 FAIL |
| F23 + F28 | 15/15, 0 errores de consola |
| seo-web: matriz de botones, SEO en vivo, barrido | 42/42; 11/11; 192/192 + 6/6 flujos |
| Capturas + axe WCAG 2.1 A/AA, app Expo | 159/159, limpia dos veces seguidas |
| Capturas, seo-web | 34 pasan, 1 omitida (necesita mundo en vivo; ya existía) |
| `yarn typecheck` / `lint` / `test` / `harness:validate` | verdes (app 286 tests, seo-web 125, ui 41, query-hooks 83, i18n 12) |

Cada celda del barrido comprueba: sin errores de consola ni de página, sin scroll horizontal, sin claves i18n crudas ni español en en-US, axe sin violaciones serias o críticas y objetivos táctiles de 44 px o más a 360. Se excluyen solo los 502/503 de `/media`, `/templates`, dispositivos y entregas push (servicios no desplegados en el mundo local).

## Defectos reales encontrados y corregidos en esta rama

- **Barra de progreso del resumen del proveedor sin valor para lector de pantalla:** usaba `accessibilityValue`, que react-native-web no traduce a `aria-valuenow`. Lo detectó la compuerta visual (el detector de spinners la confundía con una carga infinita). Ahora usa `aria-value*`.
- **Referencias visuales que caducaban:** los textos «faltan 5 d 2 h» y «quedan 5 días» dependen de `Date.now()`, y el servidor de contrato calculaba el plazo con la hora real. Ahora el servidor de contrato y el navegador (`page.clock.setFixedTime`) usan el mismo instante (`e2e/clock.ts`, `scripts/visual-mock.ts`). Comprobado con dos corridas.
- **Ortografía británica en en-US** («organising», «honour», «catalogue», «Cancelled»): corregida a americano.
- **El detector de texto escrito a mano** (`test/admin.test.tsx`) trataba operadores como `>= WIDE ?` como texto JSX. Ahora distingue código de texto y tiene una prueba de que sigue detectando texto real.
- **Fichas de proveedor con error 500** en seo-web: `address` llega como objeto. Corregido con `addressText`.
- **Copy inexacto:** el borrador del invitado decía «se guarda en este dispositivo» (solo vive en memoria); el límite de reservas decía «espera a que confirmen» (cuenta pendientes y confirmadas).
- Errores del backend que llegaban en inglés (`GIFT_NOT_AVAILABLE`, `INVALID_TRANSITION`, `INVALID_PARENT`…): ahora se muestran con copy propia, por código.

## Cambios en pruebas existentes (todos con aserción equivalente, ninguno la debilita)

- Textos reescritos por el rediseño («Correo/Entrar», «Por revisar», «Agregar a mi lista», «Solicitudes», «Veces que te vieron»…).
- Acciones que pasaron a «Más opciones» (se abre primero el menú) y fusiones (ofertas en una lista; el modo de regalos externos vive solo en `/modos`).
- El alta pasó a 3 pasos: el test de componentes y el recorrido avanzan un paso más.
- **Admin, suspender:** el backend entrega los verificados **más antiguos primero, con tope de 200 y sin paginación**. Con más de 200 verificados el proveedor que crea la corrida no aparece en la cola. El script lo detecta y ejerce el mismo botón sobre el primero de la lista, y lo dice en su salida.

## Brechas de backend (no se resuelven en el frontend)

- La cola de verificación devuelve 200 como máximo, sin paginación ni orden por fecha reciente: el administrador deja de ver a los proveedores verificados más nuevos.
- No hay estado «quizá»; las solicitudes de acompañante ya decididas desaparecen; invitar exige un enlace por invitado (sin envío masivo).
- Las métricas del proveedor salen en cero con actividad real; no hay ruta HTTP para sembrar métricas de varios días.
- Tres de las brechas conocidas siguen abiertas: Kong no expone `Retry-After` por CORS, el servicio de regalos se cayó dos veces por un «Heartbeat timeout» de RabbitMQ sin capturar, y los avisos que redacta el backend usan voseo mientras la app usa tuteo.
- Consistencia eventual: una celebración recién publicada o un invitado recién creado tardan unos segundos en verse en la vista pública y en las listas. Los barridos de seo-web dieron 404 intermitentes al medir justo después de sembrar; esperando a que se asiente, 0 fallos.

## No probado (declarado)

- iOS y Android: solo web. El `CheckMark` animado y el renderer nativo no se ejecutaron en dispositivo.
- Galería, plantillas, documentos del proveedor y push con éxito: `template-media`, almacenamiento de objetos y push no están levantados. Solo el estado de error real y el camino feliz con mocks.
- Lector de pantalla real (VoiceOver, NVDA) y reduced-motion de forma manual: solo axe y pruebas automáticas.
- Esquema oscuro: la app Expo usa paleta clara fija (medido); ahí solo se comprueba que no se rompe. El oscuro real existe únicamente en seo-web.
- 429 real con `Retry-After` visible en el navegador; flujos válidos en en-US en esquema oscuro.
- Las capturas son salida de máquina (macOS) y las revisé por muestreo (Inicio, invitación, regalos, login/registro, portal, invitados); **ninguna persona las ha aprobado**; sin línea base Linux.
- Rich Results Test, validador de schema.org y Search Console (requieren red y cuenta).
