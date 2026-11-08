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

## Reglas de uso

- Un botón primario por pantalla; lo demás es secundario o enlace.
- Una pantalla vacía hereda `EmptyState`; un error recuperable usa `ErrorNotice`; un guardado usa `Notice kind="success"` o `SuccessNote`; un hito usa `Celebrate`.
- No animes nada más que el cheque. Sin movimiento decorativo en bucle.
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
