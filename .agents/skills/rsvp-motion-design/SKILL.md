---
name: rsvp-motion-design
description: Diseña y verifica transiciones y microinteracciones accesibles y fluidas en Expo, React Native Web y Next.js de RSVP.
---

# Motion design RSVP · ANIMATION obligatoria

Usa esta skill para cualquier animación, transición, interacción animada, carrusel o elemento que se mueva automáticamente. Parte del criterio de `atlas-movimiento` de AtlasPromptManager y lo adapta a las superficies reales de RSVP.

Antes de decidir un efecto, lee el playbook [Impeccable animate](../impeccable/reference/animate.md) y consulta la categoría `ux` o `gsap` de UI/UX Pro Max solo cuando corresponda a web. No traslades presets GSAP a React Native. Registra la decisión de animar o no según propósito y contexto.

1. Define la función del movimiento: orientar en una transición, mostrar relación espacial, confirmar una acción o comunicar progreso. Si no aporta una de ellas, simplifica o quita el efecto. Una animación en bucle requiere propósito, control y duración justificados; evita movimiento decorativo continuo en formularios y vistas de lectura.
2. Busca primero tokens y primitivas existentes en `packages/design-tokens`, `packages/ui`, `packages/ui-web` y las apps. Hoy `packages/design-tokens/src/` tiene color, espaciado y tipografía, pero aún no define tokens de movimiento: si introduces movimiento reutilizable, define primero duración y curvas allí y prueba su uso en las superficies afectadas. No inventes cifras por pantalla ni uses valores de Atlas. Mantén una jerarquía coherente de respuestas breves al toque, cambios de estado y transiciones de navegación.
3. En Expo/React Native, usa la API de `react-native-reanimated` compatible con la versión fijada actualmente en `apps/universal/package.json` (`~4.1.1`); vuelve a comprobarla si cambia el lockfile. Reanimated puede ejecutar animaciones en el hilo de UI. En Next.js, prefiere CSS para transiciones simples y anima `transform` y `opacity` cuando sea suficiente. Evita animar geometría que provoca recálculo de layout. Comprueba hidratación y primer render de rutas SEO.
4. Respeta la preferencia de movimiento reducido en web y nativo. Suprime o reduce efectos no esenciales, incluidas transiciones de hover. El contenido y la acción deben funcionar completos sin animación. El movimiento que arranca solo y dura más de cinco segundos debe ofrecer pausa, parada u ocultación según WCAG 2.2. Evita destellos peligrosos.
5. Prueba entrada, salida, interrupción, repetición rápida, error y movimiento reducido en cada plataforma afectada. Observa tirones y saltos de layout en dispositivo o navegador pertinente; captura una secuencia o video si el cambio es temporal. Anota plataforma y límites de la evidencia.

Consulta la documentación de la versión instalada y las referencias oficiales: [Reanimated useReducedMotion](https://docs.swmansion.com/react-native-reanimated/docs/device/useReducedMotion/), [React Native Accessibility](https://reactnative.dev/docs/accessibility), [WCAG Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide), [prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion).
