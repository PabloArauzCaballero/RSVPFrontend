# Pasadas de mejora del rediseño minimalista (rama `feat/diseno-minimalista`)

Cada pasada reaplica `minimalist-ui` y las skills de marketing/UX, mira capturas reales de la app (export propia, backend real por Kong :28000, Chrome real), elige los 3 peores defectos, los corrige y verifica. Capturas en el scratchpad de la sesión (fuera del repo).

## Pasada 0: integración (antes de la pasada 1)

- Cuatro carriles (base, anfitrión, proveedor/admin/invitado, sitio público) migrados en paralelo; integración y verificación por el orquestador.
- `turbo typecheck lint test --force`: dos errores reales corregidos (import sin usar en `packages/ui/src/identity.test.tsx`, que rompía la compuerta de `config-eslint`). Los 18 fallos de `apps/universal` y 2 de `packages/ui-web` en la corrida completa eran tiempos de espera: la máquina tenía carga 101 por procesos ajenos a este repositorio (simulador de iOS y Xcode de otro proyecto). Aislados y con menos trabajadores pasan: `apps/universal` 329/329, `ui-web` 15/15.
- Hallazgo del carril de acceso: la exportación de página única **ignora** `app/+html.tsx`, así que ninguna fuente de marca se había cargado nunca en la app (ni la anterior). Se corrigió con `src/platform/fonts.ts`.
- Umbral de la barra de acciones fija: bajo 960 px (la cabecera se desplaza con la página).

## Pasada 1

Capturas reales, 1280 y 390, claro y oscuro, anfitrión (Inicio, Invitados, Regalos, Publicar, Ajustes) y proveedor. En revisión: acceso, Invitados vacío, Mis celebraciones y Invitados móvil oscuro.

Hallazgos (los tres peores):
1. **Sin celebración elegida, Invitados es un callejón de «Elige una celebración» aunque la persona tenga una sola.** El identificador viaja en la ruta (`useHostRoute`), por lo que elegir automáticamente la única celebración es un cambio de enrutamiento, no de estilo. Pendiente de la pasada 2.
2. **Ilustración de estado vacío demasiado protagonista** frente al texto (sobre de 130 px con titular serif y botón). Candidata a bajar de tamaño.
3. **Pestañas de sección cortadas en móvil** («Acompañante…» con chevron). Funciona, pero el rótulo truncado resta limpieza.

Corregido en esta pasada: (2) la ilustración de los estados vacíos baja de 148 a 104 px (`EmptyState`). Pendiente: (1) y (3).
Verificación: `packages/ui` 229/229 y typecheck limpio; ver `Pasada 0`.

## Pasada 2

Corregido:
1. **Callejón «Elige una celebración» con una sola celebración** (hallazgo 1 de la pasada 1). `CelebrationScreen` (`host/gate.tsx`) consulta `useMyCelebrations` cuando no hay `?c=`; con exactamente una celebración navega directo a la pantalla pedida con su `?c=`, con esqueleto mientras carga. Con 0 o varias, sigue el estado «Elige una celebración». `useMyCelebrations` acepta `{ enabled }` (compatible hacia atrás). Prueba nueva en `test/host.test.tsx` (una celebración → navega; varias → pregunta) y aserción existente ajustada a asíncrona.
2. **Pestañas cortadas en móvil** (hallazgo 3): se mantiene por diseño. La fila de pestañas se desplaza y el chevron avisa de que hay más; cortar el rótulo es la señal. No se cambia.

Verificación: `apps/universal` y `packages/query-hooks` con `tsc` limpio; `host.test.tsx` 23/23. Suite completa de la app en la corrida final de la pasada.

## Pasada 3

Capturas reales (1280 y 390, claro y oscuro) de acceso, Invitados, Mis celebraciones, Regalos, Publicar, Ajustes y proveedor, con la compilación de la pasada 2.

Corregido:
1. **Avatares con el color de un estado** (hallazgo del carril del anfitrión). Los fondos de avatar usaban verde, amarillo y rojo pastel, los mismos de «Confirmó», «Quizá» y «No asistirá»; una fila con iniciales en rojo junto a una píldora verde se leía como contradicción. `avatars` pasa a neutros cálidos y un azul (`packages/design-tokens/src/colors.ts`), con el contraste AA comprobado por `contrast.test.ts`.
2. **La persona con una sola celebración aterrizaba en «Mis celebraciones» (una lista de uno)** al entrar. `app/index.tsx` envía a los anfitriones a `/celebraciones?entrar=1`; con exactamente una celebración, `CelebrationsScreen` abre su Inicio. Con varias o ninguna, y al entrar por la pestaña, sigue la lista. Prueba nueva en `test/host.test.tsx`.
3. **Barra fija de acción blanca sobre el lienzo hueso bajo 960 px** (hallazgo del carril del anfitrión): se mantiene. Es la misma superficie blanca con borde superior que la barra inferior de navegación; separa la barra del contenido y es coherente. No se cambia.

Verificación: `packages/design-tokens` 80/80, `packages/ui` 229/229, `apps/universal` 331/331 con `tsc` limpio. Compilación re-exportada y vista en localhost:8081.

## Pasada 4

Capturas reales de pantallas aún no revisadas a ojo (1280 y 390, claro y oscuro): Inicio, Publicar, Configuración, Mi invitación, Regalos, proveedor.

Corregido:
1. **Inicio ya no decía de qué celebración era.** Tras quitar la línea repetida bajo los títulos (pasada del carril de reorganización), Inicio quedó titulado «Tu celebración» y el nombre real («Lucía Flores y Daniel Choque») no aparecía en ninguna parte de la app. `CelebrationScreen` acepta `heading`, que sustituye al título una vez cargada la celebración; Inicio lo usa con el título de la celebración. La subfrase («Invitas hoy. Mañana sabes quién viene.») se mantiene. Aserción nueva en `test/guests.test.tsx`.

Revisado y sin cambio:
2. **Publicar:** contenido corto alineado a la izquierda, con mucho aire a la derecha; es el estado «publicada» (enlace + cómo se verá en WhatsApp). Correcto para el estado; no hay nada que quitar.
3. **Configuración:** las tarjetas miden 720 px y la cabecera 896 px. Es a propósito (medida de lectura de formulario); se conserva.

Verificación: `apps/universal` `tsc` limpio; `guests.test.tsx` 45/45 y `host.test.tsx` 24/24.

## Pasada 5

Capturas reales (Playwright, 1280 y 390): Regalos, portal del proveedor, acceso. Nota de método: `chrome --headless --window-size=390` no baja de ~500 px de ancho de maqueta y recorta la captura; produce falsos desbordes (login y 404 «cortados»). Las capturas de la pasada usan Playwright con viewport real; las de `--window-size` solo valen para páginas de ancho fijo.

Corregido:
1. **Resumen del proveedor verificado repetía tres veces lo mismo.** «Listo para vender · 3 de 3 pasos · Verificado», la tarjeta «Tu ficha ya es pública» y la lista de los tres pasos ya hechos. Con el proveedor verificado el camino terminó: se quita la lista de pasos (la cabecera ya dice «3 de 3» y «Verificado»). Mientras el camino sigue abierto (borrador, pendiente) los pasos se listan como antes. Aserciones nuevas en `test/provider-reorganization.test.tsx` para los dos estados.

Revisado y sin cambio:
2. **Regalos 1280:** lista con estado en píldora pastel, aviso de reservas por revisar y acción primaria arriba a la derecha; sin hallazgos.
3. **Invitación pública (`/c/{slug}`):** vive en `apps/seo-web` (:3000), no en la app Expo; no se revisó en esta pasada (queda para la pasada 6 junto con el sitio público, que necesita su servidor). El admin tampoco se revisó a ojo en esta pasada.

Verificación: `apps/universal` `tsc` limpio; `provider-reorganization` 8/8.

## Pasada 6 (a pedido del dueño: «que se sienta premium, los espacios están horribles»)

Skill reaplicada: `visual-hierarchy-composition` (proximidad: más espacio *entre* grupos que *dentro*; espaciado como sistema por tokens; whitespace generoso para producto premium) junto con `minimalist-ui` (macro-espacio primero). Revisado con capturas reales (Playwright, 1280 y 390).

Ritmo de espaciado anterior vs. nuevo (todo con tokens `spacing`, sin valores sueltos):
- Margen lateral del contenido en escritorio: 32 → 48. Relleno superior de la cabecera: 48 → 64. Separación entre secciones: 32 → 40. Título → subtítulo: 8 → 12; subtítulo → pestañas: 24 → 32. Separación entre pestañas: 4 → 12.
- Tarjetas: relleno 24 → 32, separación interna 16 → 20. Filas de lista: 16×16 → 20×24; filas de invitados: 68 → 84 px de alto, 12×16 → 16×24 de relleno, hueco nombre/dato 2 → 4.
- Menú lateral: logo → ítems 32 → 48; separación entre ítems 2 → 4.
- Móvil: margen lateral 16 → 20, separación entre bloques 24 → 32, relleno superior 16 → 24; cabecera, pestañas y hoja alineadas al mismo margen.
- Inicio, «Cómo vas»: la letra pequeña (plazo, última actualización, solicitudes) es un solo bloque con líneas pegadas y separado de las cifras, en vez de tres líneas con el mismo hueco que todo lo demás.

Método: servidor de desarrollo de Expo en :8081 con vigilancia de archivos (en modo `CI=1` no recarga y mostraba código viejo).

## Pasada 7 (sitio público)

Skills reaplicadas: `minimalist-ui`, `visual-hierarchy-composition`, `marketing-loops` (la invitación es el bucle viral: el logo y el enlace «Crear mi celebración» del pie se quedan; la navegación de venta y el titular no). Capturas reales de página completa con Playwright (1280 y 390) de landing, directorio e invitación pública, contra el backend real.

Corregido:
1. **«Quinceañe-ros» partido a mitad de palabra** en las tres celdas de tipos de celebración de la landing (`hyphens: auto` con una tipografía demasiado grande para el ancho de la celda). Tamaño `clamp(1.5rem, 2.9vw, 2.6rem)` y sin guionado: las tres palabras caben enteras.
2. **La invitación de un invitado mostraba la navegación de ventas de DOne** («Proveedores · Ingresar · Crear mi celebración») y un titular de marca enorme en el pie, compitiendo con la invitación. `PublicCelebration` marca la página con `data-quiet-chrome` y `globals.css` oculta `.site-nav` y `.site-footer__line` solo ahí (`body:has(...)`); verificado en el navegador: invitación `display: none`, landing `flex`/`block`.

Pendiente (visto, no corregido): en la invitación pública, el cuerpo del texto sale en una sans de sistema y los títulos en el serif verde de la plantilla; es la paleta y la tipografía de cada plantilla del anfitrión (`packages/celebration-theme`), fuera del sistema de la marca. Decisión de producto, no de espaciado.

Verificación: `apps/seo-web` typecheck y lint limpios, 130/130 pruebas.

## Pasada 8 (a pedido del dueño: «disciplina icono–texto»)

El dueño señaló, con una captura del acceso, que el aviso de error era una caja roja de texto sin icono mientras el de éxito sí llevaba el cheque dibujado: no había una regla común entre icono y texto.

Regla nueva: **todo aviso lleva un icono dibujado junto a sus palabras**, del mismo lenguaje (disco, trazo de punta redonda, 24 px, alineado con la primera línea de texto). Éxito: el cheque de la D. Error: disco con tallo y punto (`!`) en el color de peligro del esquema. Información: lo mismo (`i`) en tinta.
- `packages/ui`: componente `NoticeMark` (web y nativo), exportado, con prueba (`notice-mark.test.tsx`: caja de 48, 24 px, decorativo, un trazo y dos círculos, color de peligro en claro y oscuro).
- `Notice` (anfitrión, proveedor, admin) y `Banner` (acceso) lo usan; el éxito del acceso pasa de 28 a 24 px para igualar.
- Verificado a ojo con el error real del acceso (contraseña equivocada), 1280 claro y 390 oscuro.

Verificación: `apps/universal` 331/331 con `tsc` limpio; `packages/ui` con la prueba nueva.
Nota para el usuario: la contraseña de las cuentas demo es `Demo-Bolivia-2026!` (con el «!» final); sin él, el acceso responde «no coinciden».
