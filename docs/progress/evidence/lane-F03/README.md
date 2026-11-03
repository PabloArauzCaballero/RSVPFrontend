# Evidencia F03 · Primitivas universales (2026-11-03)

| REQ | Estado | Comando / artefacto | Resultado |
|---|---|---|---|
| REQ-F03-01 | PASS | `ui` 14 tests, `ui-web` 12 tests | Las 11 primitivas en ambos paquetes. Variantes nuevas: Button primary/secondary/ghost/danger, Toast neutral/success/error. DatePicker nativo sigue siendo campo ISO (sin selector de plataforma): limite declarado. |
| REQ-F03-02 | PASS (jsdom / react-native-web) | tests por matriz primitiva x 5 estados en ambos paquetes | loading/error/empty/disabled/default aseverados (progressbar/status, alert + aria-invalid + aria-describedby, vacio, disabled/readOnly). Foco y gestos nativos reales sin probar. |
| REQ-F03-03 | PASS (web) / PARTIAL (nativo) | roles RN asertados en react-native-web; axe-core en jsdom + `@axe-core/playwright` sobre :3100/catalogo 360/768/1280 | Web: 0 violaciones axe (incl. contraste) en claro y oscuro. Radix Dialog da foco atrapado y Escape. VoiceOver/TalkBack no probados. |
| REQ-F03-04 | PARTIAL | `ui` test de paridad (mismos nombres, `componentStates`, `defaultStrings`, Button con `onPress`/variant en ambos) | `ui-web` ahora es estilo shadcn/ui (cva + clsx + tailwind-merge + Radix Dialog, utilidades Tailwind con tokens). No se uso el CLI shadcn y quedan diferencias de plataforma (File en web, Toast `durationMs`). |
| REQ-F03-05 | PASS (web) | `/catalogo` en :3100 y :8100; capturas `screens/` | Catalogo muestra cada primitiva en los 5 estados + variantes + Modal/Sheet/Toast. |
| REQ-F03-06 | PASS (web) | Playwright 360/768/1280, claro/oscuro, `scrollWidth<=innerWidth` | Sin desborde en ningun ancho en seo-web ni Expo web; capturas en `screens/`. Snapshots no comparados contra linea base aprobada. |

## Cambios de comportamiento
Textos por defecto salen de `UiProvider strings` (es-BO por defecto): las apps pueden inyectar i18n; no se toco `packages/i18n`. Se quitaron las clases `.rsvp-*` sin uso de globals.css (se conserva `.rsvp-button`, usado por provider-directory).

## No cubierto
Sheet/Modal nativos con foco real, animaciones (no se agregaron), pantallas del anfitrion siguen con `apps/universal/src/host/ui.tsx` propio (no migradas).
