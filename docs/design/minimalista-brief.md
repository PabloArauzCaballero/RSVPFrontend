# Brief del rediseño minimalista (rama `feat/diseno-minimalista`)

Sustituye por completo la identidad anterior (azul eléctrico, noche, bandas, patrón de tejido, ilustraciones de color, peso 800). Fuente de reglas: skill [`minimalist-ui`](../../.agents/skills/minimalist-ui/SKILL.md) (abrirla íntegra) más Impeccable y UI/UX Pro Max. Donde la skill choca con AGENTS.md (contraste AA, objetivos de 44 px, foco visible, reduced-motion, i18n, modo oscuro), manda AGENTS.md.

## Idea: papel de invitación
DOne organiza eventos. El diseño es el de una buena invitación impresa: papel cálido, tinta, mucho aire, un titular serif con carácter y nada que compita con el nombre del evento. Profesional, armonioso y silencioso. El color solo significa algo (estado de una respuesta, error, aviso).

## Sistema (ya en `packages/design-tokens`; generar con `yarn workspace @rsvp/design-tokens generate`)
- **Lienzo y tinta:** `canvas` hueso cálido (`#F7F6F3`), `surface` blanco, texto `#111111`, secundario `textMuted`. Oscuro compuesto en carbón cálido (`#151514`), no invertido.
- **Acción primaria:** fondo tinta (`primary`), texto `onPrimary`, radio `radius.button` (6), sin sombra. Hover: ligero aclarado o `scale(0.98)` al pulsar. Secundaria: borde 1 px `border`/`fieldBorder`, sin relleno. Terciaria: texto subrayado.
- **Color:** solo pastel apagado de `tones` (rojo, azul, verde, amarillo, gris) para etiquetas, estados y fondos de icono; `danger`, `success`, `warning` solo para texto o avisos. Nunca un bloque grande de color saturado, nunca degradados, nunca neón, nunca vidrio.
- **Tipografía:** titulares en serif `Newsreader` (peso 500, tracking `-0.02em` a `-0.03em`, interlineado 1.1); interfaz y cuerpo en `Geist`; códigos y metadatos en `Geist Mono`. Prohibido Inter, Roboto, Open Sans y el peso 800. Cuerpo con interlineado ~1.6.
- **Formas:** tarjetas con `border: 1px solid border`, radio 8 a 12, relleno generoso (24 a 40). Etiquetas de estado en píldora pequeña (`radius.full`), mayúsculas, tracking `0.05em`. Nada de píldoras en contenedores grandes ni botones principales.
- **Sombras:** prácticamente ninguna; un borde de 1 px separa. Solo elevación ultradifusa (`shadow.md/lg`, < 0.06) en menús y diálogos.
- **Espacio:** macro-espacio primero. Columna de contenido de 720 a 960 px, secciones separadas con `spacing[12..24]`.
- **Navegación:** barra lateral clara (superficie), ítems de texto, activo con fondo `surfaceMuted` y texto tinta (sin borde lateral de color). Móvil: cabecera clara sobre `canvas`, sin bandas oscuras ni gradientes; barra inferior de 5 destinos.
- **Logo:** marca y palabra en tinta (`ink`) sobre claro, en `text` oscuro-esquema sobre oscuro.
- **Iconos:** un solo set de trazo uniforme, mismo grosor en toda la app, sin glifos de texto. No añadir librerías sin decisión documentada.
- **Ilustración:** solo en estados vacíos y bienvenida: línea de tinta continua sobre fondo plano con una única forma geométrica en pastel (`tones`). Cuando no aporte nada, texto y espacio.
- **Movimiento:** casi invisible. Entrada `translateY(12px)` + opacidad ~400 a 600 ms con `cubic-bezier(0.16,1,0.3,1)`, cascada de 60 a 80 ms en listas, `scale(0.98)` al pulsar. El cheque sigue siendo la única animación de celebración, en tinta con verde pastel. Solo `transform` y `opacity`; reduced-motion respetado.
- **Se elimina:** `BrandBand`, `WeavePattern`, `HeroArt`, `MomentBackdrop`, cualquier fondo decorativo, avatares de color saturado, peso 800, `brand.*`, `night`, `onNight`.

## Voz
Se mantiene `docs/design/voz-y-copy.md` (tuteo boliviano neutro, frases cortas, sin exclamaciones en errores). Sin emojis ni clichés («Seamless», «Elevate»). Contenido realista, nunca «Lorem ipsum».

## Estructura
Se mantiene la reorganización de `feat/reorganizacion-ux` (acción primaria arriba a la derecha, `OverflowMenu`, `FilterSelect`, barra fija en móvil bajo 960 px). Este rediseño cambia el aspecto, no lo que hace cada botón ni sus nombres accesibles.

## Verificación obligatoria
Contraste AA, objetivos de 44 px, foco, claro y oscuro, es-BO y en-US, 360 / 768 / 1280; pruebas unitarias, matrices live contra el backend real y barridos responsivos del área; mirar las capturas uno mismo y corregir lo feo. Sin `skip`/`only`, sin debilitar aserciones. Las capturas base las regenera el orquestador.
