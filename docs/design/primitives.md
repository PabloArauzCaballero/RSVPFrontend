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

Nombres: `invitation` (sobre) · `gift` · `calendar` · `table` (mesa y personas) · `provider` (ficha) · `offline` (conexión caída) · `emptySearch` (lupa vacía) · `success`. Tonos: `brand` (azul sobre claro), `night` (noche sobre claro), `onDark` (cielo sobre noche). Las formas viven en `packages/ui/src/illustrations.ts`; para agregar una, dibújala en la rejilla de 120 con las capas `soft | line | solid | knock | accent | accentFill`.

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
