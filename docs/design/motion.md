# Movimiento de DOne

Tanda 3 (rama `feat/upgrade-ux-v2`). Infraestructura de movimiento reutilizable en `@rsvp/ui`; la integración pantalla por pantalla es de la tanda siguiente. Skills aplicadas: `rsvp-motion-design` (decidir si se anima, reduced-motion, interrupción), `animate` y `emil-design-eng` (puerta de frecuencia y propósito, curvas y duraciones, transiciones en vez de keyframes, `scale(0.97)`), `animate-expo` y `animating-react-native-expo` (hilo nativo, solo transform y opacity, Reduce Motion que atenúa y no apaga), `animation-performance` (qué propiedades, qué hilo, CLS), `apple-design` (interrumpible, respuesta al presionar, dirección espacial), `find-animation-opportunities` (lista de rechazos), `animation-vocabulary` (nombres), `impeccable` (`animate.md`: un momento autoral, el resto es feedback y continuidad; sin bounce ni loops decorativos), `ui-ux-pro-max` (prioridad 7: tiempos por contexto, nunca animar width/height, reduced-motion siempre) y `rsvp-accessible-states` (foco, anuncios, estados de carga).

## 1. Inventario: qué se mueve y qué no

Puerta de cada candidato: frecuencia de uso, propósito en una palabra, velocidad dentro de presupuesto, función (no mover datos que se leen).

| Momento | Frecuencia | Propósito | Decisión | Pieza |
|---|---|---|---|---|
| El cheque al guardar, publicar, responder | raro | deleite (único) | Ya existe. Se queda como la única animación de celebración | `CheckMark` |
| Cambio de destino (Inicio a Invitados) | decenas/día | consistencia espacial | Aparece con fundido y 6 px de subida, 200 ms | `ScreenTransition` |
| Cambio de pestaña dentro de un destino | decenas/día | evitar el salto | Solo fundido, 140 ms. Las pestañas son pares: deslizarlas inventaría una jerarquía que no existe | `ScreenTransition` |
| Pasos del alta (3 pasos) | raro | dirección (adelante/atrás) | Entra deslizando 24 px desde el lado hacia donde vas, 240 ms; el foco pasa al paso | `StepTransition` |
| Entrada de listas (invitados, regalos) | ocasional | evitar el salto | Escalonado de 40 ms, tope de 8 filas; el resto aparece en su sitio | `Stagger` |
| Tocar un botón o fila | decenas/día | feedback | Escala 0.97 en 90 ms al presionar, 160 ms al soltar. Área de 44 px intacta | `PressFeedback` |
| Guardado / éxito | ocasional | estado | No hay movimiento nuevo: `Notice`/`SuccessNote` y el cheque | (existente) |
| Carga de listas | ocasional | evitar el salto + estado | Esqueleto con la forma de la fila, un pulso lento de opacidad. Único bucle y solo mientras carga | `SkeletonList`, `SkeletonRow`, `Skeleton` |
| Siguiente mejor paso en Inicio | ocasional | estado | Sube 8 px y aparece, una vez, cuando cambia el paso sugerido (`key` = id del paso) | `Enter` |
| Diálogos y hojas | ocasional | consistencia espacial | Web: `Enter` con `from="down"` (hoja) o `from="none"` (diálogo). Nativo: se queda la animación de plataforma del `Modal`. Pendiente de integrar: `Sheet` y `Modal` viven en `index.tsx` | `Enter` |

Rechazado (no se anima), con la pregunta de la puerta que lo mató:
- Barra de navegación, menú lateral y resaltado de pestaña activa: más de 100 veces al día (frecuencia).
- Deslizar entre pestañas hermanas: sugiere profundidad que no hay (propósito).
- Efectos de hover (no hay hover en móvil; en escritorio sería ruido) y revelado al hacer scroll (frecuencia y función).
- Contadores que ruedan, barras de avance que crecen en ancho, gráficos que se dibujan: son datos que la persona lee (función). La barra del alta cambia a su valor sin animar `width`.
- Sacudida en errores, rebotes y overshoot, confeti, parallax, ilustraciones que flotan (prohibido en `DESIGN.md`; propósito).
- Foco con teclado, atajos y salto de campos: nunca se anima lo que dispara el teclado.
- Salida de pantalla: no hay animación de salida; lo que sale desaparece al instante y lo nuevo entra (salir es más rápido que entrar).

## 2. Tokens

Todo sale de `MOTION`, `EASE` y `cssEase` en `packages/ui/src/motion.ts` (nativo reexporta lo mismo). Solo se animan `transform` y `opacity`; no hay `transition: all`.

| Token | Valor | Uso |
|---|---|---|
| `checkMs` / `popMs` | 360 / 260 ms | El cheque (sin cambios) |
| `pressInMs` / `pressOutMs` | 90 / 160 ms | Presionar / soltar |
| `pressScale` | 0.97 | Escala al presionar |
| `pressReducedOpacity` | 0.72 | Con Reduce Motion: se atenúa en vez de escalar |
| `enterMs` / `exitMs` | 220 / 150 ms | Entrada / salida (salir es más rápido) |
| `enterDistance` | 8 px | Subida de `Enter` |
| `stepMs` / `stepDistance` | 240 ms / 24 px | Pasos |
| `screenMs` / `sectionMs` / `screenDistance` | 200 / 140 ms / 6 px | Destino nuevo / pestaña hermana |
| `staggerMs` / `staggerMax` | 40 ms / 8 filas | Escalonado (320 ms de retraso como máximo) |
| `skeletonMs` / `skeletonLow` | 1400 ms / 0.55 | Pulso del esqueleto (ida; la vuelta es otra mitad) |
| `EASE.out` | `cubic-bezier(0.23, 1, 0.32, 1)` | Entrar, salir, presionar |
| `EASE.inOut` | `cubic-bezier(0.77, 0, 0.175, 1)` | Movimiento en pantalla (pulso) |
| `MIN_TARGET` | 44 | Mínimo táctil |

Nunca `ease-in`, nunca `scale(0)`, nada por encima de 250 ms salvo el cheque (360 ms, decidido antes).

Los tokens de movimiento viven en `packages/ui` (no en `packages/design-tokens`) porque `rsvp-motion-design` los pide donde se prueban en las superficies afectadas y `design-tokens` solo genera valores visuales; si se quieren compartir con `apps/seo-web` (que no importa `packages/ui`), el siguiente paso es moverlos allí.

## 3. Componentes y hooks

Todos se importan de `@rsvp/ui`. Web usa transiciones CSS (interrumpibles, fuera del hilo principal); nativo usa `Animated` con `useNativeDriver: true` porque `packages/ui` no depende de Reanimated (solo `apps/universal`). Con Reduce Motion el estado final es inmediato y el orden de lectura no cambia: el contenido está en el árbol desde el primer cuadro.

```tsx
// Entrada con dirección (play=false retrocede desde donde esté, más rápido)
<Enter from="down" delay={0} play={visible}>{card}</Enter>   // from: up | down | left | right | none
<FadeSlide>…</FadeSlide>                                      // alias de Enter

// Lista que llega como lista (tope 8)
<Stagger>{guests.map((g) => <GuestRow key={g.id} {...g} />)}</Stagger>

// Feedback al tocar. El pressable exterior conserva 44 px; la escala vive en el interior
<PressFeedback accessibilityLabel={t("host.common.next")} onPress={next}><View style={button}>…</View></PressFeedback>

// Esqueleto con la forma de la fila real. Pasa la altura de la fila real (minHeight) para no mover la página al cargar
{isLoading ? <SkeletonList count={5} row={{ minHeight: 64 }} label={t("guests.loading")} /> : <GuestList />}
<SkeletonRow lines={2} avatar trailing minHeight={64} />      // piezas sueltas; <Skeleton width height circle />

// Pasos del alta
<StepTransition step={step} announce={`${t("host.onboarding.step", { step })}: ${name}`}>{body}</StepTransition>

// Contenido de Screen
<ScreenTransition routeKey={current ?? title} groupKey={destinationKey}>{children}</ScreenTransition>
```

Comportamiento relevante:
- `Enter`: oculto y desplazado al montar; dos cuadros después pasa a `opacity: 1; transform: none` (no `translate(0)`: un elemento en reposo no crea bloque contenedor para hijos `fixed`). `onDone` se llama una vez; con Reduce Motion no se llama.
- `Stagger`: filas pasado el tope (`max`, 8) se renderizan sin envoltorio ni animación; un refetch con las mismas `key` no repite la entrada.
- `PressFeedback`: rol `button` por defecto; con Reduce Motion no escala, se atenúa a 0.72. Sin movimiento al pasar el ratón.
- `SkeletonList`: región `role="status"` con `aria-busy` y texto oculto (por defecto `ui.loading`: «Cargando…» / "Loading…"). Un solo pulso sobre el grupo (una capa). Con `prefers-reduced-motion` la hoja de estilos ya lo apaga antes de que corra JS.
- `StepTransition`: el primer paso nunca anima; en cada cambio el foco pasa al panel del paso (grupo etiquetado con `announce`), así no se pierde al desaparecer el botón pulsado. Nativo anuncia con `AccessibilityInfo.announceForAccessibility`.
- `ScreenTransition`: ver sección 4.
- `useReducedMotion()`: web lee `matchMedia` de forma síncrona; nativo guarda la respuesta del sistema en caché al importar, así todo montaje posterior ya la conoce (solo los primeros cuadros tras abrir la app salen quietos).

Textos: ningún componente trae texto propio. Los anuncios (`announce`, `label`) los traduce quien llama con el catálogo (`es-BO` y `en-US`); el único valor por defecto es `ui.loading`, que ya existe en ambos idiomas.

## 4. Transición de pantalla con expo-router

Hechos del repo que condicionan el diseño:
- Cada ruta renderiza su propio `<Screen>`, así que al navegar entre archivos de ruta el `Screen` se desmonta y se monta de nuevo. «Cambió la ruta» no se puede guardar en el estado de un componente: `ScreenTransition` recuerda el último destino a nivel de módulo (`motion-history.ts`).
- La primera pantalla de la sesión (carga inicial) no anima ni roba el foco. Las siguientes sí. La primera pantalla tras iniciar sesión cuenta como carga inicial si el login no usa `ScreenTransition`.
- Cuando solo cambia un parámetro y el mismo componente sigue montado, `routeKey` distinto reinicia la transición con la misma lógica.

Qué hace en cada navegación (web):
1. Aparece el contenido: fundido de 140 ms entre pestañas del mismo destino, o 200 ms con 6 px de subida si cambia el destino (`groupKey`).
2. El scroll vuelve arriba: recorre los ancestros desplazados y la ventana.
3. El foco va al `h1` (`tabindex=-1`, `preventScroll`). El lector de pantalla anuncia el título al recibir el foco, que es el anuncio del cambio de página.
4. Con `prefers-reduced-motion` el contenido está ya en su estado final, pero el scroll y el foco se mueven igual.

Nativo: mismo contrato; `headingRef` recibe el foco de VoiceOver/TalkBack (`setAccessibilityFocus`), y si no hay ref se anuncia `title`. `scrollRef` (el `ScrollView`) vuelve a `y: 0`.

Pendiente fuera de esta tanda: `document.title` por ruta (lo debe fijar quien posea las rutas).

### Parche exacto para `apps/universal/src/host/shell.tsx` (aplicar después; no se tocó)

1. Importar:
```tsx
import { ScreenTransition } from "@rsvp/ui";   // junto al import existente de @rsvp/ui, si lo hay
```
2. En `Screen`, antes del `if (wide)`:
```tsx
const destination = items.find((item) => isCurrentDestination(item, current))?.key;
const content = <ScreenTransition routeKey={current ?? title} groupKey={destination}>{children}</ScreenTransition>;
```
3. Sustituir `{children}` por `{content}` en los dos sitios: dentro del `ScrollView role="main"` ancho (`contentContainerStyle={[s.content, s.contentWide]}`) y dentro de `<View style={s.mSheet}>`.
4. Nativo (cuando se pruebe en dispositivo): pasar `title={title}` y, si el título se guarda en un `ref`, `headingRef`/`scrollRef`.

Comprobar al aplicar: `yarn workspace @rsvp/universal test:visual` (el envoltorio añade un `div` flex con `flex-grow: 1`) y que ningún hijo dependa de `height: 100%` del `ScrollView` directo.

### Parche exacto para el alta (`apps/universal/src/host/onboarding.tsx`)

```tsx
import { StepTransition } from "@rsvp/ui";
…
const form = (
  <View style={{ gap: spacing[5], flex: wide ? 1 : undefined, width: "100%" }}>
    <StepProgress step={step} />
    {!wide && step > 1 ? <View …>…</View> : null}
    <StepTransition step={step} announce={`${t("host.onboarding.step", { step })}: ${t(`host.onboarding.stepLabels.${stepName}`)}`}>
      {bodies[stepName]()}
    </StepTransition>
  </View>
);
```
`StepProgress` y la vista previa en vivo quedan fuera para que no se muevan al cambiar de paso.

## 5. Mediciones reales

Chrome 156 real contra la exportación web (`/movimiento`, ruta de demostración temporal), viewport 390 x 844, máquina cargada, 3 invocaciones del script con 3 repeticiones cada una (contexto nuevo por repetición); todas las aserciones de `scripts/live/motion.mjs` pasaron en las 3 invocaciones finales (una anterior falló por una medición de interrupción sensible a la carga y se corrigió midiendo dentro de la página). La duración es `transitionend` menos `transitionstart` (incluye un cuadro de 16.7 ms de cuantización, por eso sale unos 10 ms sobre el token).

| Medida | Token | Real (3 corridas) |
|---|---|---|
| Entrada `Enter` | 220 ms | 232.8 a 232.9 ms |
| Salida `Enter` | 150 ms | 149.3 a 166.3 ms |
| Paso del alta | 240 ms | 249.1 a 250.5 ms |
| Pestaña hermana (fundido) | 140 ms | 149.3 a 149.8 ms |
| Destino nuevo (fundido + 6 px) | 200 ms | 199.8 a 216.6 ms |
| Presionar / soltar | 90 / 160 ms | 99.7 a 100.7 / 162.6 a 175.4 ms |
| Escalonado (inicio de cada fila) | 40 ms | 49, 83, 132, 166, 216, 248, 282 ms (8 filas; las filas 9 a 12 no animan) |
| CLS de toda la demostración | menor que 0.01 | 0 en las 3 corridas |
| Cambio esqueleto a lista | 0 px | 354 px a 354 px, CLS 0 |
| Fotogramas durante la interacción | 60 fps | 59.8 a 60.0 fps de media, p95 16.7 a 16.8 ms, 0 cuadros sobre 33 ms |
| Long tasks (más de 50 ms) durante la interacción | 0 | 0 (PerformanceObserver) y 0 en la traza de Chrome (`RunTask`, 10 744 tareas) |
| Long task de la carga inicial | n/a | un solo bloqueo de unos 100 a 117 ms (análisis del bundle), anterior al movimiento y ajeno a él |
| Interrupción de `Enter` (salir a los 50 ms y volver) | n/a | opacidad 0.27 en pleno vuelo, termina en 1 sin saltos |
| Reduced motion (`reducedMotion: "reduce"`) | 0 | 0 eventos de transición, 0 animaciones vivas muestreadas cada 25 ms, opacidad 1 en el primer pintado, `transition-duration: 0s`, esqueleto sin pulso, pulsar atenúa a 0.72 sin escalar, foco y scroll se mueven |
| Axe (WCAG 2.0/2.1/2.2 A y AA) | 0 | 0 en la demostración tras el recorrido, con el esqueleto visible y en modo oscuro |

Reproducir: exportar con `EXPO_PUBLIC_API_URL=http://localhost:28000 npx expo export --platform web --output-dir <dir> --clear`, servirlo (`spa.mjs`) y ejecutar `APP=http://localhost:8400 CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node apps/universal/scripts/live/motion.mjs` (también `OUT=<dir>` y `REPEATS=<n>`).

## 6. Pruebas

- `packages/ui/src/motion-kit.test.tsx` (vitest + jsdom + axe): tokens dentro del brief, tope del escalonado, entrada oculta y luego en reposo con `transform: none`, solo `opacity` y `transform` en las transiciones, reduced-motion sin transición y en estado final, interrupción (retargeting más rápido, sin reinicio), 44 px y escala 0.97, esqueleto accesible y sin pulso con reduced-motion, dirección de los pasos y foco, primera pantalla intacta, foco al `h1` y scroll arriba, opt-out.
- `packages/ui/src/motion-kit.native.test.tsx`: los archivos `.native.tsx` sobre react-native-web (caché de Reduce Motion, tokens iguales, props y accesibilidad, anuncios). No prueba el controlador nativo.
- `apps/universal/scripts/live/motion.mjs`: lo medido arriba, en Chrome real.

## 7. Cómo añadir movimiento nuevo

1. Pasa la puerta: ¿cuántas veces al día? ¿qué propósito (feedback, consistencia espacial, estado, evitar un salto, deleite solo si es raro)? Si no hay respuesta, no se anima. Anótalo en el inventario.
2. Usa una pieza existente. Si necesitas un valor nuevo, agrégalo a `MOTION` aquí, no en la pantalla.
3. Solo `transform` y `opacity`. Transición, no keyframes, salvo el pulso de carga.
4. Prueba reduced-motion, interrupción y (si hay lista) el tope. Mide en Chrome real.
