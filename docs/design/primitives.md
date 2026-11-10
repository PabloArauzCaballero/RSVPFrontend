# Primitivos del sistema minimalista (rama `feat/diseno-minimalista`)

## Aviso para quien migra pantallas (publicado primero)

**Fuentes.** `import { fonts } from "@rsvp/ui"` -> `fonts.sans` (interfaz y cuerpo, Geist), `fonts.display` (titulares, Newsreader 500, tracking `-0.02em` a `-0.03em`, interlineado 1.1), `fonts.mono` (codigos y metadatos, Geist Mono). Sustituye las constantes `fontFamily = Platform.select({ web: "'Plus Jakarta Sans'..." })` de `host/shell.tsx`, `host/ui.tsx` y `host/more-options.tsx`. En nativo devuelven la fuente de plataforma.

**Exports eliminados** de `@rsvp/ui` (sin reemplazo; quita el uso): `BrandBand`, `WeavePattern`, `HeroArt`, `MomentBackdrop` y sus tipos `HeroVariant`/`MomentVariant`, el módulo `brand-art` y `pattern`. Desaparecen también los tonos de marca: `LogoTone` pasa a `'auto' | 'ink' | 'onDark'`, `IllustrationTone` a `'auto' | 'ink' | 'onDark'`, y `CheckMark` a `tone?: 'ink' | 'success'` (se adapta solo al esquema). `ILLUSTRATION_COLORS` se sustituye por la función `illustrationColors(tone, pastel)`.

**Nuevos.** `fonts` (`sans`, `display`, `mono`), `useTones()` (pares pastel `{ red, blue, green, yellow, gray }` con `bg` y `fg` del esquema activo; para etiquetas, fondos de icono y estados), `tracking(size, em)` (interletrado en px para nativo), `ILLUSTRATION_PASTEL`, prop `pastel` en `Illustration`, prop `ground` en `CheckMark`. `Palette`/`useColors()` ya no tienen `brand`, `night` ni `onNight`: usa `palette.canvas|surface|surfaceMuted|text|textMuted|primary|onPrimary|border|fieldBorder|danger|success|warning|dangerBg|successBg`.

**Sin cambios de nombre**: las 32 ilustraciones (`ILLUSTRATION_NAMES`), `Button` (`primary|secondary|ghost|danger`), `Chip`, `Avatar`, `AvatarMark`, `EmptyState`, `PageIntro`, `SuccessNote`, `Celebrate`, `OverflowMenu`, `FilterSelect`, `StickyActions`, `Enter`/`Stagger`/`PressFeedback`/`SkeletonList`/`StepTransition`/`ScreenTransition`, `SwitchRow`, `Logo`. Solo cambia su aspecto (ver abajo). Los nombres accesibles no cambian.

**Cómo cambian los botones.** `primary` = fondo tinta, texto `onPrimary`, radio 6, sin sombra. `secondary` = sin relleno, borde 1 px `fieldBorder`. `ghost` = solo texto subrayado (terciaria). `danger` = fondo pastel rojo, borde y texto `danger` (el rojo nunca es un bloque sólido). Alto mínimo 48 px.

Las secciones siguientes se han reescrito para el sistema minimalista (`docs/design/minimalista-brief.md`).

---

## CheckMark

El cheque de la D: un trazo de tinta sobre un disco verde pastel, dibujado con trazo animado. Es la única animación «de celebración» del producto.

```tsx
<CheckMark />                                   // 48 px, tinta sobre verde pastel, se dibuja al montarse
<CheckMark size={28} tone="success" />          // ink (por defecto) | success (cheque verde sobre el mismo disco)
<CheckMark ground={false} />                    // sin disco, cuando ya está sobre un fondo pastel
<CheckMark play={saved} onDone={() => ...} />   // se dibuja cada vez que play pasa de false a true
<CheckMark label="Guardado" />                  // sin label es decorativo (aria-hidden)
```

- Los colores salen de `tones` y del texto del esquema (claro y oscuro los resuelve `CheckMark`; la pantalla nunca nombra un color).
- Web: `stroke-dashoffset` con transición CSS de 360 ms, `cubic-bezier(0.16, 1, 0.3, 1)`. Nativo: `Animated` sobre `strokeDashoffset`, `Easing.out(cubic)`, 360 ms. Sin bucles.
- `prefers-reduced-motion` (web) y `AccessibilityInfo.isReduceMotionEnabled` (nativo): aparece ya dibujado, sin transición. Hasta que el nativo responde se muestra quieto.
- Si `play` cambia a mitad de trazo, el efecto se cancela y vuelve a empezar (interrumpible).

## Celebrate

Un hito (publicaste, quedó guardado para siempre): el cheque de 72 px, un titular serif (Newsreader 500, 34 px) y una línea. Región `role="status"`. Úsalo una vez por hito, no para cada guardado. Sin insignia de color ni bloque saturado.

```tsx
<Celebrate title="Tu invitación ya está publicada" body="Comparte el enlace y mañana sabrás quién viene.">
  <ActionButton label="Copiar enlace" onPress={copy} />
</Celebrate>
```

## SuccessNote

Confirmación en línea: tarjeta de superficie con borde de 1 px, cheque verde dibujado y frase. Es lo que `Notice kind="success"` dibuja; usa `SuccessNote` cuando quieras además un detalle.

```tsx
<SuccessNote message="Guardado" detail="Tus invitados ya ven el cambio." />
```

Una frase corta en pasado, sin signos de exclamación.

## Illustration

Ilustración de línea de tinta, trazo de 3,5 sobre una rejilla de 120, con UNA forma pastel desplazada detrás (el único color) y, donde encaja, el sello con el cheque. Sin chispas ni acento de segundo color. Decorativa por defecto (`aria-hidden`).

```tsx
<Illustration name="invitation" />                       // auto: tinta en claro, tinta clara en oscuro; 104 px
<Illustration name="gift" size="sm" />                   // sm 64 · md 104 · lg 148 · o un número
<Illustration name="gift" pastel="blue" />               // cambia el pastel del grupo (red | blue | green | yellow | gray)
<Illustration name="offline" tone="onDark" size={120} /> // fuerza tinta clara (fondo oscuro fijo)
<Illustration name="success" label="Listo" />            // con label deja de ser decorativa
```

Nombres (32): los 8 originales (`invitation`, `gift`, `calendar`, `table`, `provider`, `offline`, `emptySearch`, `success`) y 24 por situación (`guestsEmpty`, `firstReply`, `noGifts`, `giftReserved`, `published`, `deadlineClosed`, `welcomeHost`, `linkExpired`, `welcomeGuest`, `noOffers`, `offerPublished`, `freeAgenda`, `newClient`, `verifying`, `verified`, `suspended`, `welcomeProvider`, `nothingPending`, `importDone`, `noAccess`, `searching`, `serverError`, `maintenance`, `notFound`). Tonos: `auto` (por defecto; úsalo en las pantallas), `ink`, `onDark`. El pastel sale del grupo (`ILLUSTRATION_PASTEL`: anfitrión amarillo, invitado azul, proveedor verde, admin y sistema gris, acceso rojo). Las formas viven en `packages/ui/src/illustrations.ts`; una nueva lleva exactamente una capa `soft`, el resto `line`/`solid` (tinta).

## EmptyState

Una pantalla vacía responde tres preguntas: qué es esto, por qué importa, cuál es el primer toque. No es una tarjeta; se apoya en la página.

```tsx
<EmptyState
  illustration="table"
  title="Aquí verás quién viene"
  body="Agrega a las primeras personas y mándales el enlace. Sus respuestas aparecen aquí."
  action={<ActionButton label="Agregar invitados" onPress={add} />}
/>
```

`action` es un solo botón primario (la acción única de la pantalla). Errores amables (sin conexión): `illustration="offline"` con el texto «Sin conexión por ahora» y `action` «Reintentar».

## PageIntro y la prop `intro` de Screen

Una frase cálida bajo el título, opcional, una sola idea (≤ 90 caracteres). Se pasa a `Screen`; no dupliques el título ni pongas nada encima.

```tsx
<Screen title={t("guests.list.title")} intro={t("guests.list.intro")} nav={nav} current="guests" onNavigate={go}>…</Screen>
```

Con `CelebrationScreen` (gate.tsx) todavía no hay `intro`; la oleada 2 lo agrega en `gate.tsx` o usa `<PageIntro>` como primer hijo. `PageIntro tone="onDark"` es para fondos oscuros fijos (usa el color de texto del esquema oscuro).

## Navegación: destinos y pestañas

`Screen` recibe `nav: NavItem[]` y `current` (la clave de ruta de la pantalla). Los marcos construyen `nav` con un solo constructor por área:

| Área | Constructor | Archivo |
|---|---|---|
| Anfitrión | `hostNav(t, celebrationId)` | `apps/universal/src/host/routes.ts` |
| Proveedor | `portalNav(t)` | `apps/universal/src/provider/frame.tsx` |
| Admin | `adminNav(t)` | `apps/universal/src/admin/admin-screen.tsx` |

Un `NavItem` es un destino del menú (`key`, `label`, `href`, `tabs`) y cada `NavTab` (`key`, `label`, `href`) es una pantalla de ese destino. `Screen` marca como activo el destino que contiene la pestaña `current` y dibuja bajo el título las pestañas de ese destino (solo si son dos o más): `role="tablist"`, blancos de 44 px, foco visible, flechas Izquierda/Derecha/Inicio/Fin mueven el foco, desplazamiento horizontal en móvil. Las pantallas no construyen pestañas propias para cambiar de sección.

Para mover una pantalla a otro destino se edita únicamente la tabla (`DESTINATIONS` en routes.ts, `NAV` en frame.tsx, `ADMIN_GROUPS` en admin-screen.tsx) y las etiquetas `host.dest.*` / `host.tabs.*` / `portal.dest.*` / `portal.nav.*` / `admin.dest.*` / `admin.nav.*`. Una pantalla nueva que cuelga de otra (formulario, importar) pasa como `current` la clave de su pestaña padre.

Barra inferior móvil: caben cinco espacios. Si destinos + «Más» (con sesión iniciada) caben, se muestran todos; si no, cuatro y el resto detrás de «Más» junto a «Cerrar sesión».

## Cabecera de página: acción primaria, menú «⋯» y filtros (tanda 3)

**Dónde vive.** El espacio de acciones es del marco `Screen` (`apps/universal/src/host/shell.tsx`), no de `PageIntro`: `PageIntro` es solo una frase bajo el título y no conoce el ancho ni la barra fija. `Screen` ya posee la cabecera, el ancho y el contenido, así que decide la ubicación. Lo usan anfitrión, proveedor y admin.

```tsx
<Screen title={t("guests.list.title")} nav={nav} current="guests" onNavigate={go}
  actions={<ActionButton label={t("guests.add")} onPress={add} />}
  menu={<OverflowMenu items={[{ key: "import", label: t("guests.import"), onPress: importGuests }]} />}>…</Screen>
```

- `actions?: ReactNode`: la acción primaria única de la pantalla (un solo botón). `menu?: ReactNode`: las secundarias (`OverflowMenu`).
- Desde 768 px: `[⋯][acción primaria]` arriba a la derecha de la cabecera, alineados con el título (`headRow`/`headActions` en shell.tsx). El título y la intro ocupan el resto y envuelven sin chocar.
- Menos de 768 px: el `⋯` queda arriba a la derecha junto al título y la acción primaria pasa a `StickyActions` al pie del contenido (`testID="screen-sticky-actions"`). No pongas tu propio `StickyActions` además de `actions`.
- Formularios con su propio «Guardar»: no pases `actions`; siguen usando `StickyActions` como antes. Sin `actions` ni `menu` la cabecera no cambia.

- `status?: ReactNode`: una línea sobre el trabajo en curso («Tienes cambios sin guardar», «Cambios guardados»). Desde 768 px va arriba del contenido; en móvil, sobre la barra fija.
- **Pantallas del anfitrión con estado propio** (editor, idiomas, estilo, galería, publicar, ajustes, regalos): el cuerpo publica su cabecera con `useScreenHeader({ actions, menu, status })` (`apps/universal/src/host/gate.tsx`); los guardados usan `useSaveHeader` (`save-bar.tsx`). Se guarda en un almacén externo, así que publicar no vuelve a pintar el marco ni hace bucles. Fuera de `CelebrationScreen` no hace nada.
- `CelebrationScreen` ya no pinta la línea «nombre · tipo» bajo el título: el contexto vive en el menú lateral e Inicio.

### OverflowMenu

```ts
interface OverflowMenuItem { key: string; label: string; onPress: () => void; destructive?: boolean; disabled?: boolean }
interface OverflowMenuProps { items: readonly OverflowMenuItem[]; label?: string; testID?: string }
```

- Botón «⋯» de 44 × 44 px con nombre accesible `ui.moreOptions` («Más opciones» / «More options»); `label` lo sustituye. Sin `items` no dibuja nada. Los textos de los ítems los traduce quien llama.
- Web: `aria-haspopup="menu"`, `aria-expanded`, panel `role="menu"` con `role="menuitem"` de 44 px. Al abrir el foco va al primer ítem activo; flechas Arriba/Abajo (circular, saltan los deshabilitados), Inicio/Fin, Escape cierra y devuelve el foco al botón, Tab o pulsar fuera cierran. Foco visible con contorno de 2 px. Las acciones destructivas usan `palette.danger`.
- Nativo: hoja modal con los mismos ítems (`menuitem`); el fondo cierra.
- Tema claro/oscuro por `palette`. Sin animación propia.

### FilterSelect

```ts
interface FilterOption<T extends string = string> { value: T; label: string; count?: number }
interface FilterSelectProps<T extends string = string> { label: string; options: readonly FilterOption<T>[]; value: T; onChange: (value: T) => void; testID?: string }
const FILTER_SELECT_THRESHOLD = 3;
```

- Regla: con más de 3 opciones (`FILTER_SELECT_THRESHOLD`) el filtro es un `FilterSelect`; con 3 o menos se quedan los chips (`ToggleChip`).
- `label` es el nombre accesible (traducido, p. ej. «Filtrar invitados»). El conteo opcional se muestra «Sin responder (5)». Controlado: `value` manda.
- Web: `<select>` nativo (teclado, selector del móvil y lector de pantalla gratis), 44 px de alto como mínimo, `color-scheme` y colores del tema, flecha propia. Nativo: botón `combobox` que abre una hoja con `radiogroup` de ítems de 44 px.
- `OverflowMenu`, `FilterSelect`, `OverflowMenuItem` y `FilterOption` se importan también desde `apps/universal/src/host/ui.tsx`.
- Copia nueva: `ui.moreOptions` en `packages/i18n/locales/{es-BO,en-US}/common.ts`.

## Reglas de uso

- Un botón primario por pantalla; lo demás es secundario o enlace.
- Una pantalla vacía hereda `EmptyState`; un error recuperable usa `ErrorNotice`; un guardado usa `Notice kind="success"` o `SuccessNote`; un hito usa `Celebrate`.
- El cheque es la única animación de celebración. Lo demás se mueve solo si pasa la puerta de frecuencia y propósito de `motion.md` (transición de pantalla, pasos del alta, listas, feedback al tocar, esqueletos). Sin movimiento decorativo en bucle.
- Ilustraciones solo en estados vacíos, bienvenida y errores amables; no como adorno de cada tarjeta.

## Identidad

Recursos de marca además de las ilustraciones; todo sale de `@rsvp/ui` y comparte formas entre web y nativo. Son decorativos (`aria-hidden`); el texto vecino lleva el significado. Revisión visual: ruta de desarrollo `/identidad` (`IdentityCatalog`: ilustraciones, logo, cheque y avatares en claro y oscuro).

```tsx
<Logo />                                              // palabra + marca en tinta (auto: tinta clara en oscuro)
<Logo variant="mark" height={32} tone="onDark" />      // tone: auto | ink | onDark
<AvatarMark name="Flores y Eventos Sol" size={48} />   // forma de la D, pastel + tinta, color estable por nombre
<Avatar name="Marta Quispe" />                         // círculo pequeño, iniciales sobre pastel (peso 600)
<Chip tone="yes">Confirmó</Chip>                       // píldora pequeña, mayúsculas, punto + palabra
```

- No hay patrones, bandas, portadas ni fondos decorativos: el aire y el titular serif hacen el trabajo.
- Etiquetas de estado: píldora (`radius.full`) solo para etiquetas pequeñas y avatares; nunca para contenedores grandes ni botones primarios.

## Tipografía

```tsx
import { fonts, tracking } from "@rsvp/ui";
<Text style={{ fontFamily: fonts.display, fontWeight: "500", fontSize: 34, lineHeight: 38, letterSpacing: tracking(34, -0.02) }}>…</Text>
```

- `fonts.display` (Newsreader 500) solo en titulares y citas; `fonts.sans` (Geist 400 a 600; 700 como máximo) en interfaz y cuerpo; `fonts.mono` (Geist Mono) en códigos y metadatos. Nunca 800 ni Inter/Roboto/Open Sans.
- `styles.title` (de `useTheme().styles`) ya es serif 500 de 22 px; `styles.label` es la etiqueta pequeña en mayúsculas (12 px, interletrado 0,05em) de los campos; `styles.body` es Geist 16/26.

## Movimiento

Infraestructura de `@rsvp/ui` para que la app se sienta viva sin cansar. Inventario, tokens, mediciones y parches de integración: `docs/design/motion.md`. Solo se anima `transform` y `opacity`; con `prefers-reduced-motion` o Reduce Motion nativo todo aparece en su estado final y el orden de lectura no cambia.

```tsx
<Enter from="down" play={visible}>…</Enter>                       // entrada con dirección (up | down | left | right | none); FadeSlide es un alias
<Stagger>{rows.map((r) => <Row key={r.id} {...r} />)}</Stagger>    // 70 ms entre filas, tope de 8
<PressFeedback accessibilityLabel="Guardar" onPress={save}>…</PressFeedback>   // escala 0.98, área de 44 px intacta
{loading ? <SkeletonList count={5} row={{ minHeight: 64 }} label={t("guests.loading")} /> : <List />}
<StepTransition step={step} announce="Paso 2 de 3: Quién y cuándo">…</StepTransition>   // alta en 3 pasos
<ScreenTransition routeKey={current} groupKey={destination}>{children}</ScreenTransition> // contenido de Screen
```

- Esqueleto: pasa a `SkeletonRow` la altura (`minHeight`) de la fila real para que cargar no mueva la página; es el único bucle y solo mientras carga.
- `ScreenTransition` también lleva el scroll arriba y el foco al `h1` tras navegar; la primera pantalla de la sesión no anima ni roba el foco.
- Los textos (`announce`, `label`) los traduce quien llama; por defecto `SkeletonList` usa `ui.loading`.
- No animes nada más sin pasar la puerta de frecuencia y propósito de `motion.md`: el cheque sigue siendo la única animación de celebración.


## Marco y móvil (tanda 2)

### StickyActions

Barra de acción fija al pie para formularios largos en móvil. Un botón primario y, como mucho, una acción secundaria; apilados a ancho completo en el teléfono.

```tsx
import { ActionButton, StickyActions } from "../host/ui";
<StickyActions summary={<Text style={styles.muted}>{t("guests.form.unsaved")}</Text>}>
  <ActionButton label={t("common.save")} onPress={save} busy={saving} />
  <ActionButton variant="secondary" label={t("common.cancel")} onPress={back} />
</StickyActions>
```

- Web: `position: sticky; bottom: 0` dentro del área que hace scroll, `padding-bottom: max(12px, env(safe-area-inset-bottom))` (respeta la barra de inicio), borde superior y superficie opaca. Ocupa su propio espacio en el flujo: no tapa el último campo ni el teclado del navegador.
- Nativo: va en el flujo tras el formulario con el mismo estilo; el teclado lo gestiona el `ScrollView` de la pantalla (`keyboardShouldPersistTaps="handled"`). No hay barra flotante nativa todavía.
- Ponla como último hijo del formulario, fuera de cualquier `Section`. No la uses en pantallas cortas: allí el botón va tras el último campo.

### Botón, centrado y feedback

`Button` (y por tanto `ActionButton`) escala a 0,98 al pulsar (atenúa a 0,72 con Reduce Motion) sin encoger el área táctil: el `Pressable` guarda el área y la vista interior se escala. `EmptyState`, `Celebrate` y `StickyActions` centran su botón desde 640 px mediante `ButtonAlignContext`; fuera de ellos sigue al inicio de la fila. `ToggleChip` usa el mismo feedback (`pressVisual`).

### Aperturas

- `Sheet`, `Modal` y `ConfirmDialog` abren en web con `Enter` (hoja: `from="down"`, diálogo: fundido) y desactivan la animación de plataforma; en nativo conservan la suya (deslizar / fundido), que ya respeta el ajuste del sistema. Primitivos: `OverlayEnter` y `overlayAnimation`.
- `Notice` entra con `Enter from="down"` (12 px y fundido, `MOTION.enterMs`; sin movimiento con Reduce Motion). Las hojas, diálogos y menús usan `MOTION.overlayMs` (240 ms): responden a un toque.

### Navegación

- Pestañas de sección: si no caben, un desvanecido en el borde con más contenido (`tabs-fade-left` / `tabs-fade-right`, decorativos) y la pestaña activa se trae a la vista al entrar y al cambiar de ancho. Las flechas del teclado siguen moviendo el foco, y el navegador lo desplaza a la vista.
- Barra inferior: cada destino es un `PressFeedback` de 56 px, con el activo marcado por el fondo `surfaceMuted` y el texto en tinta y relleno para el área segura inferior. La hoja «Más» abre con `Enter` y respeta el área segura.
- Hápticos: `expo-haptics` no está en el repositorio; no se añadió una dependencia nueva sin acuerdo. Ver NEEDS.
