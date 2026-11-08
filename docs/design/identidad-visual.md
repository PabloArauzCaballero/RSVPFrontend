# Identidad visual de DOne: formas, trazo, color y recursos

Complementa `DESIGN.md` y `upgrade-brief.md` (no los reemplaza; las prohibiciones de ambos siguen vigentes). Fuente de identidad: *DOne Brand Kit v3*. API de los componentes: sección «Identidad» de `primitives.md`. Se revisa en `/identidad` (ruta de desarrollo, `apps/universal/app/(dev)/identidad.tsx`), en claro y oscuro.

## 1. Dirección

**Una celebración que ya está resuelta.** El kit dice «Una D que ya dice que sí»: la inicial y el gesto de confirmar. De ahí sale todo el lenguaje: formas de la D, el cheque como motor y un detalle ámbar que es la chispa de la fiesta. La calidez boliviana-contemporánea no se dice con símbolos, se siente en tres cosas:

- **La mesa y la puerta**: mesa redonda con una silla libre, arco de puerta, sobre que se abre, puesto de feria con toldo. Escenas domésticas de preparación, no postales.
- **El tejido como textura, nunca como motivo**: rombos escalonados de trazo finísimo (`WeavePattern`) que solo existen como fondo casi invisible de portada y banda noche. Es geometría abstracta; no hay figuras, colores de bandera ni trajes.
- **Orgullo tranquilo**: pocas formas, trazo grueso y redondeado, un solo acento. Nada recargado.

**Qué NO hacer (de verdad):** sombreros, polleras, quenas, llamas, bandera o sus colores, cholita, iconos «étnicos», fuente decorativa, confeti permanente, mascotas, personas dibujadas con rostro, emoji, glifos Unicode como iconos, clip-art o ilustración de stock, ilustración en cada tarjeta.

| Decisión | Skill que la produjo |
|---|---|
| Marca = una D con cheque; formas derivadas de la D, el cheque, el sobre y el arco | `impeccable` (identidad existente se preserva, DESIGN.md), kit §Concepto |
| Ilustración solo en estado vacío, bienvenida, error amable y momentos; no decorar tarjetas | `iconography-imagery` (ilustraciones con propósito, mismo estilo en todo el producto), `rsvp-accessible-states` |
| Decorativo = `aria-hidden`; el texto vecino lleva el significado; nombre solo si la imagen dice algo que el texto no dice | `iconography-imagery`, `rsvp-accessible-states` |
| Un solo foco por composición, acento ámbar único, espacio en lugar de relleno | `visual-hierarchy-composition` (una palanca fuerte, un punto focal), `frontend-design` (gastar la audacia en un solo sitio) |
| Tonos semánticos (`brand`, `night`, `onDark`, `onBrand`, `auto`), jamás hex; el oscuro redefine el tono, no invierte colores | `color-systems` (roles antes que colores; superficie elevada más clara en oscuro) |
| Patrón de 1.25 px con opacidad por tono y contraste calculado en pruebas (peor caso: la línea cubre todo el fondo) | `color-systems` (contraste como restricción), `ui-ux-pro-max` (AA, sin color solo) |
| SVG inline, sin filtros ni raster, un `<pattern>` en lugar de cientos de nodos | `ui-ux-pro-max` (rendimiento), `frontend-beautiful-ui` (glass/blur solo con motivo) |
| Soft desplazado +6, acento ámbar, centrado óptico (la D se centra por su masa, el cheque a 0.43 del ancho) | `frontend-beautiful-ui` (alineación óptica, profundidad por capas), `typography-systems` (letras de avatar 800 con tracking cerrado) |
| Sin animación en ninguna ilustración o fondo; solo el cheque se dibuja | `rsvp-motion-design` (no hay movimiento decorativo), `impeccable animate` |
| Prohibiciones de plantilla (eyebrows, tarjetas iguales, glifos) respetadas en el catálogo | `impeccable` (craft-floor «Refuse») |

## 2. Sistema de formas

Todo vive en una rejilla de **120 unidades**, con margen de 8 y trazo de **6** (grueso, extremos y uniones redondeados).

| Forma | Construcción | Dónde aparece |
|---|---|---|
| **La D** | Rectángulo de esquinas izquierdas redondeadas (r = 0.1 h) cerrado por una media circunferencia (r = h/2). Proporción 0.86 : 1 como el símbolo | `verified`, `verifying`, `welcomeHost`, `published` (sobre la tarjeta), `AvatarMark`, fondo `auth` |
| **El cheque** | Tres puntos del símbolo (−7,0 · −2,5 · 7,−6 por escala `k`), centrado en su caja; dentro de la D se coloca a 0.43 del ancho | sellos, burbujas, tarjetas, `success`, `firstReply`, `nothingPending` |
| **El sobre** | Rectángulo de r16 con solapa en V | `invitation`, `welcomeGuest` |
| **El arco** | Rectángulo con remate semicircular (puerta, ventana, tarjeta de invitación) | `published`, anillos de `HeroArt cover`, `MomentBackdrop published` |
| **El sello** | Disco sólido con el cheque «calado» (o candado/plus a `w=3–4`) | confirmaciones, `deadlineClosed`, `offerPublished`, `importDone` |
| **El escalón** | Rombo o escalera de pasos rectos | patrón de tejido, banda «Listo para vender» |
| **La chispa** | Cruz ámbar de 5–7 unidades | casi todas, una o dos por pieza |

**Capas** (`Layer`): `soft` bloque desplazado (+6,+6) detrás, `line` trazo, `solid` relleno, `knock`/`knockFill` el glifo dentro de un sello (color opuesto, no depende del fondo), `accent`/`accentFill` ámbar. Una pieza tiene **una idea**: una escena y, cuando cuadra, la D o el cheque. Si necesitas explicarla con texto para que se entienda, simplifícala.

## 3. Trazo, relleno y acento

- **Trazo** 6 en ilustraciones (3 en composiciones grandes, 1.25 en el patrón). Nunca mezclar grosores dentro de una pieza salvo glifos pequeños dentro de sellos (`w` 3 a 4).
- **Relleno**: solo el sello, la D de «verificado», el bloque `soft` y el acento. El resto es línea.
- **Ámbar** (`#FFB020`): único acento, **una chispa o un detalle relleno por pieza** (silla libre, panel del toldo, ojo de la cerradura, aguja norte). Significa «lo que falta» o «lo que se enciende». No se usa para texto ni información que no esté también en palabras.
- **Offset**: bloque `soft` a +6/+6. Es el «desajuste lúdico» de la marca; no lleva sombra.
- **Sin** degradados, sombras, filtros ni transparencias en ilustraciones. La opacidad solo vive en composiciones y patrón.

## 4. Tonos (semánticos, nunca hex)

| `tone` | Fondo sobre el que va | `line/solid` | `soft` | `knock` |
|---|---|---|---|---|
| `brand` | claro (canvas, surface) | azul | bruma | blanco |
| `night` | claro, más sobrio | noche | bruma | blanco |
| `onDark` | noche y superficies oscuras | cielo | `colors.dark.surfaceMuted` | noche |
| `onBrand` | azul eléctrico (bandas, portadas) | blanco | azul oscuro | azul |
| `auto` | **sigue el modo activo**: `brand` en claro, `onDark` en oscuro | | | |

Reglas: en pantallas de producto usa `tone="auto"` (el tema oscuro lo resuelve solo; no ramifiques por modo en la pantalla). `onBrand` y `onDark` en bandas de marca (que son azul/noche en ambos modos). `night` solo sobre claro. El ámbar es igual en todos.

## 5. Tamaños y centrado óptico

`sm` 64 · `md` 104 · `lg` 148 (o un número). Mínimo 64 px para escenas; por debajo de eso usa solo `verified`/`success` (una forma sola, hasta 32). Estados vacíos: `lg`; tarjetas y listas: `md`; avisos en línea: `sm`. Cada pieza está compensada ópticamente (las formas con masa a un lado, como la D o la cerradura, se desplazan hacia el centro visual, no el geométrico).

## 6. Patrón de tejido, bandas y composiciones

- **`WeavePattern`**: rombos escalonados (tile de 48) en trazo de 1.25 y opacidad 0.10 (claro) a 0.20 (azul). Rellena su contenedor, no recibe puntero y es `aria-hidden`. Se usa en **portada del invitado, panel de acceso, banda noche y banda «Listo para vender»**; nunca bajo formularios ni tablas. El contraste del texto encima se calcula en `identity.test.tsx`.
- **`BrandBand`**: banda azul o noche con el patrón detrás y, a partir de 720 px, una composición a la derecha. Texto blanco.
- **`HeroArt`**: `cover` (arcos anidados con el sol ámbar, portada del invitado), `auth` (la D enorme recortada y los escalones, panel de login/registro) y `ready` (escalones que suben al sello, para bandas anchas). Decorativas; se recortan (`slice`) al caja que les des.
- **`MomentBackdrop`**: `confirmed` (anillos de luz) y `published` (arco de rayos). Estáticos, detrás de `Celebrate`/`CheckMark`. Sin animación: el movimiento lo pone solo el cheque.
- **`AvatarMark`**: avatar con la forma de la D para proveedores sin foto; iniciales (sin conectores «y», «de»…) sobre cuatro fondos semánticos elegidos por nombre.
- Rendimiento: todo es SVG inline, sin filtros ni imágenes. El patrón usa un único `<pattern>` (web) o `<Pattern>` (nativo).

## 7. Catálogo de ilustraciones (32)

Originales: `invitation`, `gift`, `calendar`, `table`, `provider`, `offline`, `emptySearch`, `success`.

| Nombre | Idea | Situación |
|---|---|---|
| `guestsEmpty` | Mesa redonda con silla ámbar libre | Lista de invitados vacía |
| `firstReply` | Burbuja con el cheque | Primera respuesta recibida |
| `noGifts` | Caja con la tapa levantada | Aún sin regalos |
| `giftReserved` | El regalo con el sello | Regalo reservado |
| `published` | Tarjeta en arco con la D | Invitación publicada |
| `deadlineClosed` | Reloj con candado | Plazo para responder cerrado |
| `linkExpired` | Cadena rota con chispa ámbar | Enlace caducado |
| `noAccess` | Candado con ojo de cerradura ámbar | Sin permiso |
| `searching` | Lupa sobre una persona | Buscando a alguien |
| `noOffers` | Etiqueta de precio con el «+» | Proveedor sin ofertas |
| `offerPublished` | Etiqueta con el sello | Oferta publicada |
| `freeAgenda` | Calendario con días libres y un hueco ámbar | Agenda libre |
| `newClient` | Persona con el «+» | Cliente nuevo |
| `verifying` | La D con medio cheque y puntos ámbar | Verificación en curso |
| `verified` | La D sólida con el cheque calado | Verificado |
| `suspended` | Círculo con pausa (sobrio) | Cuenta suspendida |
| `nothingPending` | Bandeja con el cheque encima | Admin: nada pendiente |
| `importDone` | Hoja de personas con el sello | Importación completada |
| `serverError` | Dos módulos con una grieta ámbar | Error del servidor |
| `maintenance` | Cono con franjas ámbar | Mantenimiento |
| `notFound` | Brújula que perdió el norte | 404 |
| `welcomeHost` | Banderines y la D | Bienvenida del anfitrión |
| `welcomeProvider` | Puesto con toldo y sello | Bienvenida del proveedor |
| `welcomeGuest` | Invitación saliendo del sobre | Bienvenida del invitado |

## 8. Tabla de uso por pantalla (para la tanda siguiente)

`EmptyState illustration=…` salvo que se indique. Una ilustración por pantalla; nunca en cada fila. Todas con `tone="auto"` salvo indicación.

### Anfitrión
| Pantalla o estado | Recurso |
|---|---|
| Invitados: lista vacía | `guestsEmpty` |
| Invitados: sin resultados de búsqueda/filtro | `emptySearch` |
| Invitados: importación terminada | `importDone` (en `Celebrate` o aviso con `size="sm"`) |
| Inicio: primera respuesta recibida | `firstReply` |
| Inicio: nada que hacer / todo al día | `success` |
| Regalos: sin lista | `noGifts` |
| Regalos: regalo reservado (confirmación) | `giftReserved` |
| Mi invitación: publicada (momento) | `published` + `MomentBackdrop published` |
| Mi invitación: aún sin contenido | `invitation` |
| Ajustes → equipo: sin personas | `table` |
| Avisos: bandeja vacía | `calendar` |
| Primera vez en la app (bienvenida) | `welcomeHost` |
| Guardado / hito | `CheckMark` o `Celebrate` (no ilustración) con `MomentBackdrop confirmed` solo en hitos grandes |

### Invitado
| Pantalla o estado | Recurso |
|---|---|
| Portada de la invitación | `HeroArt cover` (tone `onBrand`) + `WeavePattern onBrand` |
| Llegada / bienvenida sin respuesta aún | `welcomeGuest` |
| Respuesta enviada (confirmación) | `MomentBackdrop confirmed` + `CheckMark` |
| Plazo cerrado | `deadlineClosed` |
| Enlace caducado o inexistente | `linkExpired` |
| Regalos: lista sin regalos | `noGifts` |
| Regalo reservado | `giftReserved` |

### Proveedor
| Pantalla o estado | Recurso |
|---|---|
| Resumen: bienvenida (primer ingreso) | `welcomeProvider` |
| Ofertas: vacío | `noOffers` |
| Ofertas: oferta publicada | `offerPublished` |
| Agenda: libre | `freeAgenda` |
| Clientes: sin clientes aún | `emptySearch`; primer cliente nuevo: `newClient` |
| Perfil: verificación en curso | `verifying` |
| Perfil: verificado | `verified` |
| Cuenta suspendida | `suspended` (texto sobrio, una acción) |
| Banda «Listo para vender» | `BrandBand tone="night" art="ready"` |
| Proveedor sin foto (listas, tarjetas, mapa) | `AvatarMark` |

### Administración
| Pantalla o estado | Recurso |
|---|---|
| Verificación y moderación: nada pendiente | `nothingPending` |
| Catálogo/Personas: sin resultados | `emptySearch` |
| Importación completada | `importDone` |
| Operación: sin incidentes | `success` |

### Acceso, errores y sistema
| Pantalla o estado | Recurso |
|---|---|
| Login, registro, recuperar (panel ancho) | `BrandBand`-like con `HeroArt auth` + `WeavePattern onBrand` |
| Sin conexión | `offline` |
| Buscando (carga larga de búsqueda) | `searching` |
| Sin permiso (403) | `noAccess` |
| No encontrada (404) | `notFound` |
| Error del servidor (5xx) | `serverError` |
| Mantenimiento | `maintenance` |
| Sin resultados | `emptySearch` |

## 9. Cómo agregar una ilustración

1. Dibuja en la rejilla de 120 con los ayudantes de `illustrations.ts` (`rect`, `circle`, `dShape`, `archCard`, `check`, `capsule`, `arcAt`, `poly`, `seal`, `dMark`).
2. Una idea, un acento ámbar, trazo 6; el bloque `soft` va a +6/+6.
3. Agrega el nombre a `IllustrationName`, su grupo a `ILLUSTRATION_GROUPS` y las formas a `ILLUSTRATIONS`. Web y nativo la dibujan solas (una sola fuente).
4. Míralas en `/identidad` en claro y oscuro (y en `onBrand`) antes de usarlas. Las pruebas (`identity.test.tsx`, `identity.native.test.tsx`) comprueban que existe, es decorativa, usa solo colores del tono y tiene acento.

## 10. Lo que no cubre este documento

Ilustraciones del sitio público (`apps/seo-web/components/brand`, mismo lenguaje, otra frontera de código), iconos de navegación (set propio aparte) y fotografía de proveedores.
