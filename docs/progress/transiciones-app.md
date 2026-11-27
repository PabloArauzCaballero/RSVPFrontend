# Transiciones suaves de la app (Expo Router)

Rama `fix/app-transiciones-suaves`, contra `chore/deploy-contabo-coolify` (ya integrada: 0 commits de retraso al 2026-11-27, base `ad6dd0ac`). Skills: `rsvp-motion-design`, `impeccable`, `ui-ux-pro-max`, `rsvp-accessible-states`, `rsvp-frontend-visual-proof`, `rsvp-pr-gate`.

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

## No probado / límites
- iOS y Android nativos: no se ejecutaron (sin simulador/dispositivo). El empuje de plataforma, el gesto de volver y `useReducedMotion` nativo quedan sin verificar.
- Backend real: el recorrido usa el mock de contratos (como el gate visual), no el gateway Docker.
- Rendimiento: medido con el bundle de desarrollo (React en modo dev, sin minificar) en 4 núcleos compartidos: valores absolutos no representan un dispositivo. Sirve solo de comparación relativa con la oficial (ver PR). El gate absoluto es opt-in (`TRANSITION_BUDGET_MS`) para correrlo con un build de release en hardware real. El token de desarrollo se ignora en producción, por eso no se midió el export de producción.
- Líneas base de macOS: no se regeneraron (ver PR).
