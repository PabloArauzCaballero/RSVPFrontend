# Transiciones suaves de la app (Expo Router)

Rama `fix/app-transiciones-suaves`, contra `chore/deploy-contabo-coolify` (integrada hasta `470144bf` el 2026-11-27). Skills: `rsvp-motion-design`, `impeccable`, `ui-ux-pro-max`, `rsvp-accessible-states`, `rsvp-frontend-visual-proof`, `rsvp-pr-gate`.

## Lo hecho antes (3 commits de agentes anteriores, revisados, no rehechos)
- Marco persistente (`PersistentShell`, `ShellStore`, `ShellStack`): menú y barras se montan una vez por grupo; un solo árbol para que el `Stack` no se remonte al cruzar 960 px ni al no haber menú.
- `Stack` sin deslizamiento entre destinos y pestañas, empuje de plataforma solo para detalles, sin deslizamiento con movimiento reducido.
- Esqueleto con retraso (`MOTION.loadingDelayMs` = 150 ms, `useAfterDelay`); `WebView` con el lienzo de la app (sin destello blanco en oscuro); precarga de zona.

## Hecho en esta ronda
- **Defecto hallado y corregido (resaltado atrasado un paso):** al volver a una pantalla ya montada (p. ej. Inicio tras Invitados y Regalos) el menú seguía resaltando el destino anterior, y en movimiento reducido lo hacía incluso en la primera visita. Causa raíz: `Screen` publicaba al marco en cada render; el `Stack` conserva montadas las pantallas anteriores, que se re-renderizan por sus consultas y pisan el resaltado de la enfocada, y una pantalla ya montada no se re-renderiza al enfocarse. Corrección: `ShellPublisher` publica solo mientras la pantalla está enfocada (`useNavigation` + eventos `focus`/`blur`, en `useLayoutEffect`, antes de pintar). Cubierto por `transitions.spec.ts` (falló antes: `aria-current` en Home vacío tras volver; pasa después).
- Nuevo `apps/universal/e2e/transitions.spec.ts` (proyecto `transitions`, sin líneas base) y `VISUAL_REUSE_SERVERS=1` en `playwright.config.ts` para reutilizar servidores ya levantados (CI no lo define).
- Lint: import sin uso en `shell-persistence.test.tsx`.
- `docs/design/motion.md` sección 8.

## Evidencia (2026-11-27, Linux, Chromium de `/opt/pw-browsers`, Expo web en modo desarrollo contra el mock de contratos)
Ver el cuerpo del PR (comandos y salidas). Nivel: `TESTED` en web; `WRITTEN` para iOS/Android.

## Corrección de la ronda 1 de revisión (2026-11-27, macOS)

### Causas raíz
- **Foco y anuncio (PL-153-V1):** `focusHeadingOf` tomaba el primer h1 del documento, que con el `Stack` es el de una pantalla oculta; además dependía del montaje, y volver a una pantalla no la monta. Nuevo `platform/screen-arrival.ts`: la llegada la decide el foco del navegador; mueve el foco al título propio (o a la pestaña de sección que la abrió, PL-153-V3) y nombra el documento. En nativo, `Screen` no pasaba `headingRef` ni `title` a `ScreenTransition`, así que no movía ni anunciaba nada; ahora usa `moveScreenFocus` (no ejecutado en dispositivo). `ScreenTransition` suelto busca el h1 en su antecesor más cercano.
- **Cruce de 960 px (PL-153-V2):** `Screen` devolvía dos árboles distintos. Ahora hay uno, y las pantallas sin `Stack` usan el mismo marco (`ShellChrome`) que el persistente.
- **«Más» (PL-153-V4):** `aria-current="true"` cuando contiene la pantalla actual. **Firma del marco (PL-153-5):** toda la `NavItem[]`.
- **Pruebas (PL-153-1):** el stub de `expo-router` no emitía eventos. Además `setWidth` de `shell-persistence.test.tsx` cambiaba `innerWidth`, que react-native-web no lee: los casos «wide» corrían en estrecho.

### Primer pintado (PL-153-4)
La hipótesis (primer cuadro sin menú) no se reproduce en Chrome real: sonda desde antes de cargar, en `/inicio` y `/invitados`, 0 cuadros con el marco sin menú (el marco de carga de código publica en un efecto de layout, antes de pintar). No se sembró el almacén (en `/onboarding` pintaría un menú que no corresponde); quedó la prueba como guardia.

### Evidencia (Node 24.18.1, Google Chrome, Expo web en desarrollo contra el mock de contratos)
```
apps/universal: tsc --noEmit                      -> exit 0 (sin los tipos de rutas que genera `expo start` en .expo/, ignorados por git)
packages/ui:    tsc --noEmit                      -> exit 0
eslint . --max-warnings 0 (tras el merge)         -> exit 0
apps/universal: vitest run --maxWorkers=3         -> 62 archivos, 747 pruebas pasan
packages/ui:    vitest run --maxWorkers=3         -> 20 archivos, 335 pruebas pasan
node scripts/validate-harness.mjs (tras el merge) -> exit 0
gitleaks 8.30.1 (ad6dd0ac..HEAD y lo preparado)   -> no leaks found
playwright test --project=transitions --repeat-each=2 -> 72 passed (3.0 m): 36 casos, dos veces
```
Las dos suites de vitest, `tsc` y la e2e se ejecutaron antes del merge; este solo trae `ci.yml`, tres pruebas de `design-editor` y `scripts/test-filters*`.

Las pruebas nuevas fallan sin el arreglo: con el `shell.tsx` de `fc8210e1`, 7 de 22 de `shell-persistence`; con la mutación «publicar sin foco», 2 de 22; con el `screen-transition.tsx` de `fc8210e1`, la nueva de `motion-kit`. La e2e nueva no se corrió contra el código anterior; los tres defectos (V1, V2, V3) se reprodujeron antes en Chrome con un sondeo.

La prueba de caché de la e2e esperaba `aria-busy` = 0, que se cumple durante los 150 ms de retraso antes de que lleguen los datos; ahora espera a que no quede ninguna petición vista por primera vez (Inicio e Invitados sondean, la red nunca calla).

El disco compartido bajó de 8 GB (otro proyecto estaba corriendo su suite); se cerraron los servidores y se esperó a que volviera a 9,7 GB. La corrida final de la e2e (72/72) empezó con 7,9 GB libres.

## No probado / límites
- «Adelante» del navegador remonta el área: expo-router 6.0.24 reconstruye el estado desde el historial. Observado también en la oficial `ad6dd0ac` (la primera pantalla del `Stack` sale del DOM). Resaltado, foco y título quedan bien; el estado local de la pantalla restaurada se pierde.
- Al cruzar 960 px la cabecera sí cambia de sitio: un foco puesto en ella (pestaña, acción) o el estado abierto de un menú de la cabecera no se conserva.
- El detalle de invitado tiene dos h1 («Invitado» y «Su enlace personal»), anterior a esta rama; no se tocó.
- iOS y Android nativos: no se ejecutaron (sin simulador/dispositivo). El empuje de plataforma, el gesto de volver y `useReducedMotion` nativo quedan sin verificar.
- Backend real: el recorrido usa el mock de contratos (como el gate visual), no el gateway Docker.
- axe, 768 px y es-BO ya se cubren en la e2e (3 anchos × 2 temas × 2 idiomas, 3 destinos cada uno, 0 violaciones críticas o serias); solo esas pantallas, con movimiento reducido y sin comparación de píxeles.
- Rendimiento: medido con el bundle de desarrollo (React en modo dev, sin minificar) en 4 núcleos compartidos: valores absolutos no representan un dispositivo. Sirve solo de comparación relativa con la oficial (ver PR). El gate absoluto es opt-in (`TRANSITION_BUDGET_MS`) para correrlo con un build de release en hardware real. El token de desarrollo se ignora en producción, por eso no se midió el export de producción.
- Líneas base de macOS: no se regeneraron (ver PR).
