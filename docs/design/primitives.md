# Primitivos de personalidad y navegación

Para los agentes que construyen pantallas. Todo sale de `@rsvp/ui` (web y nativo; `.native.tsx` dibuja lo mismo con `react-native-svg`). Las pantallas de anfitrión, proveedor y admin importan además desde `apps/universal/src/host/ui.tsx`, que reexporta estos primitivos junto a `Screen`, `Section`, `Notice`. La voz y las prohibiciones están en `DESIGN.md` (sección «Personalidad») y en `upgrade-brief.md`.

## CheckMark

El cheque de la D dibujado con un trazo animado. Es la única animación «de celebración» del producto.

```tsx
<CheckMark />                                   // 48 px, azul, se dibuja al montarse
<CheckMark size={28} tone="success" />          // success | brand | white | onDark
<CheckMark play={saved} onDone={() => ...} />   // se dibuja cada vez que play pasa de false a true
<CheckMark label="Guardado" />                  // sin label es decorativo (aria-hidden)
```

- Web: `stroke-dashoffset` con transición CSS de 360 ms, `cubic-bezier(0.22, 1, 0.36, 1)`. Nativo: `Animated` sobre `strokeDashoffset`, `Easing.out(cubic)`, 360 ms. Sin bucles.
- `prefers-reduced-motion` (web) y `AccessibilityInfo.isReduceMotionEnabled` (nativo): aparece ya dibujado, sin transición. Hasta que el nativo responde se muestra quieto.
- Si `play` cambia a mitad de trazo, el efecto se cancela y vuelve a empezar (interrumpible).
- Duración y reduced-motion: `MOTION` y `useReducedMotion()` también se exportan.

## Celebrate

Un hito (publicaste, quedó guardado para siempre): insignia azul de esquinas redondas con el cheque blanco, título 800 y una línea. Región `role="status"`. Úsalo una vez por hito, no para cada guardado.

```tsx
<Celebrate title="Tu invitación ya está publicada" body="Comparte el enlace y mañana sabrás quién viene.">
  <ActionButton label="Copiar enlace" onPress={copy} />
</Celebrate>
```

## SuccessNote

Confirmación en línea (cheque verde dibujado + frase). Es lo que `Notice kind="success"` dibuja ahora; usa `SuccessNote` cuando quieras además un detalle.

```tsx
<SuccessNote message="Guardado" detail="Tus invitados ya ven el cambio." />
```

Una frase corta en pasado, sin signos de exclamación.

## Illustration

Ilustración de línea propia: trazo grueso redondeado, un bloque suave desplazado detrás (el «desajuste» lúdico), el sello con el cheque donde encaja y una chispa de ámbar como único acento. Decorativa por defecto (`aria-hidden`).

```tsx
<Illustration name="invitation" />                       // brand, 104 px
<Illustration name="gift" tone="night" size="sm" />      // sm 64 · md 104 · lg 148 · o un número
<Illustration name="offline" tone="onDark" size={120} /> // sobre fondo noche
<Illustration name="success" label="Listo" />            // con label deja de ser decorativa
```

Nombres (32): los 8 originales (`invitation`, `gift`, `calendar`, `table`, `provider`, `offline`, `emptySearch`, `success`) y 24 por situación; lista, idea y pantalla de cada una en `identidad-visual.md` §7 y §8. Tonos: `brand` (azul sobre claro), `night` (noche sobre claro), `onDark` (cielo sobre noche), `onBrand` (blanco sobre el azul) y `auto` (sigue el modo claro/oscuro; úsalo en las pantallas). Las formas viven en `packages/ui/src/illustrations.ts`; para agregar una, ver `identidad-visual.md` §9.

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

Con `CelebrationScreen` (gate.tsx) todavía no hay `intro`; la oleada 2 lo agrega en `gate.tsx` o usa `<PageIntro>` como primer hijo. `PageIntro tone="onDark"` es para fondos noche.

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

Recursos de marca además de las ilustraciones. Todo sale de `@rsvp/ui` (web y nativo comparten las formas; `.native.tsx` solo cambia el dibujo). Son **decorativos** (`aria-hidden`); el texto vecino lleva el significado. Dirección, tonos y tabla de uso: `identidad-visual.md`. Revisión visual: ruta de desarrollo `/identidad`.

```tsx
<WeavePattern tone="onBrand" />                        // rellena el contenedor (absoluto), no recibe puntero
<BrandBand tone="night" art="ready">…texto blanco…</BrandBand>   // banda noche o azul; el arte a la derecha desde 720 px
<HeroArt variant="cover" tone="onBrand" style={{ height: 220 }} /> // cover | auth | ready; se recorta al cuadro
<MomentBackdrop variant="confirmed" />                 // confirmed | published; detrás de Celebrate, estático
<AvatarMark name="Flores y Eventos Sol" size={48} />    // avatar con la forma de la D, para proveedor sin foto
<Illustration name="verified" tone="auto" size="lg" />
```

- `WeavePattern`: rombos escalonados de 1.25 px, opacidad 0.10 a 0.20 según el tono. Úsalo solo en portada del invitado, panel de acceso y bandas noche/«Listo para vender»; nunca bajo formularios o tablas.
- `HeroArt` y `MomentBackdrop` llenan el cuadro que les des (`slice`): dale ancho y alto. `ready` está pensado para bandas anchas (≥ 2.5 : 1).
- `AvatarMark` toma el color del nombre (cuatro fondos semánticos, claro y oscuro). Sin foto del proveedor, nunca un círculo gris.
- Sin animación en ninguno: el movimiento lo pone solo `CheckMark`.
- `IdentityCatalog` (la página `/identidad`) muestra todo en claro y oscuro; añadir un recurso nuevo implica mostrarlo ahí.

## Movimiento

Infraestructura de `@rsvp/ui` para que la app se sienta viva sin cansar. Inventario, tokens, mediciones y parches de integración: `docs/design/motion.md`. Solo se anima `transform` y `opacity`; con `prefers-reduced-motion` o Reduce Motion nativo todo aparece en su estado final y el orden de lectura no cambia.

```tsx
<Enter from="down" play={visible}>…</Enter>                       // entrada con dirección (up | down | left | right | none); FadeSlide es un alias
<Stagger>{rows.map((r) => <Row key={r.id} {...r} />)}</Stagger>    // 40 ms entre filas, tope de 8
<PressFeedback accessibilityLabel="Guardar" onPress={save}>…</PressFeedback>   // escala 0.97, área de 44 px intacta
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

`Button` (y por tanto `ActionButton`) escala a 0,97 al pulsar (atenúa a 0,72 con Reduce Motion) sin encoger el área táctil: el `Pressable` guarda el área y la vista interior se escala. `EmptyState`, `Celebrate` y `StickyActions` centran su botón desde 640 px mediante `ButtonAlignContext`; fuera de ellos sigue al inicio de la fila. `ToggleChip` usa el mismo feedback (`pressVisual`).

### Aperturas

- `Sheet`, `Modal` y `ConfirmDialog` abren en web con `Enter` (hoja: `from="down"`, diálogo: fundido) y desactivan la animación de plataforma; en nativo conservan la suya (deslizar / fundido), que ya respeta el ajuste del sistema. Primitivos: `OverlayEnter` y `overlayAnimation`.
- `Notice` entra con `Enter from="down"` (ligero, 220 ms; sin movimiento con Reduce Motion).

### Navegación

- Pestañas de sección: si no caben, un desvanecido en el borde con más contenido (`tabs-fade-left` / `tabs-fade-right`, decorativos) y la pestaña activa se trae a la vista al entrar y al cambiar de ancho. Las flechas del teclado siguen moviendo el foco, y el navegador lo desplaza a la vista.
- Barra inferior: cada destino es un `PressFeedback` de 56 px, con la raya activa de 24 × 4 y relleno para el área segura inferior. La hoja «Más» abre con `Enter` y respeta el área segura.
- Menú lateral (≥ 960 px): `WeavePattern tone="onDark"` abajo, difuminado, a 70 % de opacidad, bajo el selector de tema.
- Hápticos: `expo-haptics` no está en el repositorio; no se añadió una dependencia nueva sin acuerdo. Ver NEEDS.
