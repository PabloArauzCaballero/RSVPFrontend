# MV-A2 / MV-D1 · acción fija abajo en el teléfono

Fecha: 2026-11-27. Base: `chore/deploy-contabo-coolify` @ dea93c4.

## Qué cambia
- `packages/ui`: `ActionDock` (nativo: caja que pinta la barra bajo el scroll y sube con el teclado; web: transparente) y `StickyActions` que, bajo un dock en nativo, publica su barra (en un layout effect) en lugar de dibujarla en el flujo. `Sheet` y `Modal` cortan el dock para su contenido.
- Contenedores de scroll envueltos: `Screen` móvil (`host/shell.tsx`, inset 20), `AuthLayout` (inset 24; en ancho el dock lleva el ancho de 560 y el `ScrollView` conserva flex:1 en nativo), `GuestFrame` (inset 16).
- `provider/parts.tsx`: se elimina su `StickyActions` propio. `NewOffer` usa el compartido y lo coloca fuera de la `Section`.
- `guest/rsvp-screen.tsx` (respuesta de quien ya contestó): el aviso de fallo pasa a `summary` de la barra.

## Verificado (salida real, Linux)
- `packages/ui`: `npx vitest run` → 21 archivos, 346 pruebas verdes (`action-dock.native.test.tsx`: 12; cubre prioridad, republicación, toque real, inset, Modal, teclado Android, rama iOS `keyboardWillChangeFrame` con `Platform.OS='ios'`, y teclado ya abierto al montar).
- `apps/universal`: `yarn test` → 62 archivos, 730 pruebas verdes (`test/action-dock-screens.test.tsx` monta `Screen`, `AuthLayout` y `GuestFrame` con el dock nativo y comprueba que la barra queda fuera y después del scroll, y la prioridad cabecera/formulario).
- `yarn lint` y `yarn typecheck`: salida 0 con el árbol limpio (sin `apps/universal/.expo`). Aviso: tras ejecutar `expo start` se genera `apps/universal/.expo` (ignorado por git) con rutas tipadas y `@rsvp/universal` falla en `src/push/lifecycle.tsx(73,17)` TS2345. Es ajeno a este diff (el revisor lo reprodujo también en dea93c4); yo solo lo vi aparecer al generarse `.expo`, no lo comprobé en la base. Se borró `.expo` antes de repetir lint/typecheck.
- Web (Chrome real, 390x844, claro y oscuro, contra el contrato mock): la barra sigue visible, dentro del viewport y `position: sticky` en reposo y con el scroll al fondo en `/onboarding/1`, `/invitados/nuevo`, `/registro`, la RSVP del invitado y la pantalla `NewOffer` (`/portal/servicios` → «Nueva oferta»: barra top 658 / bottom 779 sobre la barra de pestañas, la acción de cabecera es reemplazada por Crear/Cancelar). Capturas en esta carpeta.

## NO verificado
- iPhone/Android reales o simuladores: no hay en este entorno. La barra docked, el safe area, el ascenso con el teclado (iOS `keyboardWillChangeFrame`, Android `keyboardDidShow`) y la medición `measureInWindow` solo se ejercitaron con pruebas de componente sobre react-native-web.
- **Scroll al campo enfocado: no implementado.** Con el teclado abierto el área de scroll se acorta; un campo bajo puede quedar fuera de la parte visible hasta que la persona desplace. Se evaluó `automaticallyAdjustKeyboardInsets` (solo iOS): no ayuda con este diseño, porque el área de scroll ya no se solapa con el teclado; un scroll explícito al campo enfocado necesita la referencia del `ScrollView` y no se puede validar sin dispositivo. Queda como seguimiento tras la prueba en iPhone.
- gitleaks (no instalado) y la suite visual de baselines (el código web no cambia, salvo `NewOffer`).
- `status` de `Screen` en móvil: mientras un formulario ocupa la barra no se muestra (documentado en `docs/design/primitives.md`).
