# Mejora v2: modo oscuro, movimiento, identidad y móvil (2026-11-08)

Rama `feat/upgrade-ux-v2`, apilada sobre `feat/upgrade-ux-personalidad` (PR #10). Pedido: «me gusta pero puede estar mejor»; el usuario eligió más identidad visual, movimiento y transiciones, móvil y simplificar más, y modo oscuro real. Estado: **TESTED** contra el backend real en Chrome real (web). **No** verificado en iOS/Android ni contra `template-media`/almacenamiento de objetos/push.

## Qué cambió

- **Modo oscuro real** en toda la app (anfitrión, proveedor, admin, invitado, acceso): tokens compuestos (no invertidos) con escala de elevación por superficie, 71 pares de contraste medidos en `packages/design-tokens/src/contrast.test.ts`, preferencia Sistema · Claro · Oscuro persistida y aplicada antes del primer pintado (sin parpadeo), selector en Ajustes y en el menú. Las regiones de marca (banda noche, portada azul) son iguales en ambos modos; la vista previa de la celebración conserva el tema del anfitrión. Se retiró el puente temporal (`livePalette`, `styles` y `authStyles` estáticos): todas las pantallas usan `useColors()` / `useStyles()`.
- **Identidad:** de 8 a 32 ilustraciones de línea propias (una por situación real), patrón de tejido (`WeavePattern`), `BrandBand`, `HeroArt`, `MomentBackdrop`, `AvatarMark`; aplicados en las pantallas según la tabla de `docs/design/identidad-visual.md` §8.
- **Movimiento** (`docs/design/motion.md`, medido en Chrome real: 59,8 a 60 fps, 0 CLS, 0 tareas largas, reduced-motion sin animación): transición entre pantallas y entre pasos del alta, listas escalonadas, feedback al tocar, esqueletos con la forma de la fila (también `Loading()`), apertura animada de hojas y diálogos. El cheque sigue siendo la única animación de celebración.
- **Móvil:** barra de acción fija inferior (`StickyActions`), indicador de desborde en las pestañas, barra inferior de 56 px con feedback, vista previa plegable en el alta, filas de invitados que ponen el estado bajo el nombre. 120 capturas móviles revisadas (`MOBILE.md` del agente de marco).
- **Simplificación:** lo avanzado tras «Más opciones» en proveedor y admin, títulos distintos para las tres rutas de ofertas, sin códigos internos en pantalla. Lo que no se simplificó más y por qué, abajo.

## Resultados (código final, backend real, Chrome real, Kong :28000)

| Recorrido | Resultado |
|---|---|
| Login y registro, matriz a 360/768/1280 | 53/53 en cada ancho |
| Login y marcos, barrido (3 anchos × es/en × claro/oscuro) | 606 comprobaciones, 0 FAIL |
| Celebración, matriz a 360/768/1280 | 48/48 en cada ancho |
| Celebración, barrido | 1036 comprobaciones, 0 FAIL |
| Regalos, matriz a 360/768/1280 | 52/52 en cada ancho |
| Regalos: páginas y flujos en-US | 144/144; 15/15 |
| Portal del proveedor / Admin, matriz a 360/768/1280 | 62 PASS / 36 PASS, 0 FAIL en cada ancho |
| Proveedor y admin, barrido | 0 FAIL |
| Invitados, matriz a 768 | 96/96 |
| Invitados, matriz a 1280 y 360 | 94 PASS + 2 FAIL en cada una en la corrida paralela (Avisos y una descarga de CSV); **13/13 al repetirlos solos** sobre un mundo nuevo |
| Invitados, barrido | 1014 comprobaciones, 0 FAIL |
| F23 + F28 | 15/15 |
| seo-web: botones / SEO en vivo / barrido | 42/42; 11/11; 192/192 + 6/6 flujos |
| Lighthouse SEO (4 URLs, navegador en español y en inglés, sin backend como CI) | 1.0 en las 8 |
| Capturas + axe, app Expo (claro: 159, oscuro: 30) | 189/189, estables en una segunda corrida limpia |
| Capturas, seo-web | 34 pasan, 1 omitida (necesita mundo en vivo; ya existía) |
| `turbo run build lint typecheck test --force` | 72/72 sin caché |
| `yarn lint:code`, `design-tokens test`, `check:generated`, `test:coverage --force`, `harness:validate` | verdes (coverage 21/21) |

## Defectos reales encontrados al integrar (los agentes no los vieron)

- **Ámbar sucio en la portada del invitado:** la opacidad 0,65 del contenedor del arte volvía marrón el punto ámbar. Arte a opacidad completa y más estrecho para no pasar detrás del texto.
- **Mensaje duplicado en el resumen del proveedor** (banda y momento de celebración decían lo mismo): la banda omite su prosa mientras se celebra un hito.
- **Las capturas habrían guardado el esqueleto** en vez del contenido: los esqueletos son `role=status` con `aria-busy`, y las pruebas visuales solo esperaban al `progressbar`. Ahora esperan también `[aria-busy=true]` (cuatro suites).
- **Carrera local `build`/`typecheck` en seo-web** (TS6053) cuando existe un `.next` viejo: no ocurre en CI con checkout limpio.

## Lo que NO se hizo, y por qué

- **Simplificar más el alta y la configuración:** los agentes de alta (3 pasos) y de ajustes (zona horaria y moneda) no la redujeron más, alegando los `testID` de las pruebas; esa razón no era válida (las matrices se actualizan con aserciones equivalentes). El alta ya son 3 pasos cortos con valores por defecto, pero queda margen.
- **Hápticos:** `expo-haptics` no está en el repo y en web no aplican; sin dispositivo no se puede verificar en nativo. Idea futura.
- **Skills:** los agentes de esta tanda declararon que no abrieron íntegras las skills vendorizadas ni invocaron las no vendorizadas (salvo la primera pasada de marketing en la rama anterior); la calidad se respalda con las capturas revisadas y las matrices, no con esas citas.

## No probado (declarado)

- iOS y Android en dispositivo o simulador: el `CheckMark` animado, el driver nativo de movimiento, el `Appearance` nativo y la barra fija con teclado abierto solo se ejercitan con react-native-web.
- Galería, plantillas, documentos del proveedor y push con éxito (servicios no desplegados).
- Estado «plazo cerrado» del invitado renderizado, lector de pantalla real (VoiceOver, NVDA), Safari/WebKit.
- Al cambiar de tema, el árbol se remonta una vez: lo escrito y no guardado en un formulario se pierde. No medido.
- Las 219 capturas (189 de la app, 30 oscuras nuevas; 34 de seo-web) son salida de máquina (macOS); las revisé por muestreo (Inicio claro y oscuro, invitación, resumen del proveedor en oscuro, lista de invitados) y **ninguna persona las ha aprobado**.
