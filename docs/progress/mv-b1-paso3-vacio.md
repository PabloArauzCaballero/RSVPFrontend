# MV-B1 · Paso 3 del flujo móvil vacío

Corrige (parcialmente, ver «Límites»): MV-B1. Rama `fix/mv-b1-paso3-vacio`, apilada sobre `fix/mv-b1-pantalla-opacidad-cero` (FE #159, 27bc0121). Va en FE #177 (junto a otros cambios móviles). No está probado en dispositivo. La decisión de `useNativeDriver:false` sigue siendo de Pablo, y el dueño decide si este arreglo cuenta como el «paso 3» de DECISIONES-2026-11-28.

## Causa raíz (lo que se demostró y lo que no)

- Demostrado por lectura y prueba: `Enter` nativo (`packages/ui/src/enter.native.tsx`) empieza en `opacity` 0 y su ÚNICO camino a 1 es `Animated.timing(..., { useNativeDriver: true })`. Si el driver nativo no arranca o no avisa, nada en JS lo nota y el contenido queda en opacidad 0 para siempre: título y progreso (fuera de `StepTransition`) se ven, el paso (dentro) no. Con el driver JS (react-native-web) el paso 3 sí aparece: lo cubre #159.
- No demostrado: POR QUÉ el driver nativo falla en el paso 3 (hipótesis: reemplazo de una `Enter` con `key` por otra en el mismo frame, nueva arquitectura de RN 0.81). Eso solo se confirma en iPhone/Android reales, que esta nube no puede ejecutar.
- Por lo tanto el arreglo es de defensa en profundidad sobre la causa demostrable (estado final no garantizado), no la corrección de un fallo nativo reproducido.

## Cambio (un solo archivo de código)

`packages/ui/src/enter.native.tsx`:
- Un temporizador del reloj de JS (`duración + retardo + ENTER_SETTLE_MARGIN_MS` = 250 ms) fuerza el estado final aunque el driver no haya hecho nada: `progress.setValue(1)`, `onDone` y estado `settled`.
- Con `settled` la vista se renderiza con props planas (`opacity: 1`, transform identidad), sin nodo animado enlazado; así el estado final deja de depender del driver. La animación normal no cambia (mismo `useNativeDriver: true`, misma curva y duración).
- Las salidas (`play={false}`) no se fuerzan a visible. Con movimiento reducido el camino es el mismo de antes (final inmediato).
- No requiere la decisión de `useNativeDriver:false`; el valor sigue en `true`. Si Pablo la autoriza, el cambio sería de una línea en este mismo archivo (`useNativeDriver: true` -> `false`), a costa de que la animación corra en el hilo JS (jank si JS está ocupado) y de perder el hecho de que `opacity`/`transform` siguen animándose con JS bloqueado.

## Evidencia

- Vitest (`packages/ui/src/motion-kit.native.test.tsx`, 4 pruebas nuevas con un driver «detenido» que nunca arranca): sin el arreglo, 2 fallan (opacidad 0 en `Enter` y en el paso 3 tras 1->2->3); con él, pasan. Suite `packages/ui`: 21 archivos, 341 pruebas OK; `tsc --noEmit` 0; `eslint` de los archivos tocados 0.
- Chromium real (/opt/pw-browsers/chromium-1243, Playwright) sobre un arnés con los archivos `.native` reales vía react-native-web, anchos 360 y 1280, con y sin `prefers-reduced-motion`, pasos 1->2->3, driver JS y driver «detenido» simulado:
  - sin arreglo + driver detenido: paso 3 con opacidad efectiva 0 (360 y 1280, sin reducir movimiento); con movimiento reducido, 1.
  - con arreglo: opacidad efectiva 1 en las 8 combinaciones.
  - Capturas: `docs/progress/evidence/mv-b1/paso3-driver-detenido-{antes,despues}-360.png`.

## Límites (no probado)

- iOS y Android reales: NO probados; el driver nativo real no se ejercitó (react-native-web cae al driver JS y el «driver detenido» es una simulación del síntoma, no el fallo real). No se sabe si el síntoma de Pablo tiene esta causa; hay que probar en teléfono (Expo Go/EAS/TestFlight) con y sin «Reducir movimiento».
- No se corrió el recorrido completo de la app contra el backend real ni Playwright de `apps/universal`; el arnés solo cubre `Enter` y `StepTransition`.
- `gitleaks` no está instalado en esta nube.
- Revisión independiente: no se pudo lanzar un revisor aparte desde este agente; la revisión fue propia (no independiente).
- Efecto secundario a vigilar: al terminar la entrada la vista pasa de nodo animado a props planas (un renderizado extra por `Enter`).

## Reversión

`git revert` del commit; sin migraciones ni contratos.
