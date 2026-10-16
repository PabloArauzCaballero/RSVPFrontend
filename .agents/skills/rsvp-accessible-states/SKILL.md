---
name: rsvp-accessible-states
description: Diseña y comprueba estados de UI y accesibilidad para Expo Router y Next.js en RSVP.
---

# Estados y accesibilidad de interfaz

Usa esta skill para componentes, pantallas, formularios y navegación. Adapta a RSVP los métodos de `frontend-ux-states` y `frontend-accessibility` de AtlasPromptManager.

1. Enumera estados pertinentes antes de construir: carga inicial y en segundo plano, vacío, éxito, error recuperable, sin permiso, sin conexión y dato parcial. Cada estado debe comunicar qué ocurrió y ofrecer una acción cuando sea útil. Conserva los datos ingresados después de un error recuperable.
2. Usa elementos semánticos en Next.js y roles, etiquetas y estados accesibles equivalentes en React Native. Mantén foco visible, orden de teclado lógico, retorno del foco al cerrar diálogos, targets táctiles adecuados y mensajes de error asociados al campo.
3. Mide contraste y revisa la UI con movimiento reducido. El color y la animación no pueden ser el único medio para expresar estado. No expongas detalles internos del backend en mensajes visibles.
4. Verifica teclado y lector de pantalla en las plataformas afectadas; combina pruebas automáticas con inspección manual. Una ejecución web no acredita iOS ni Android. Documenta vista, plataforma, estado y resultado en la prueba visual o evidencia del carril.

Objetivo web: WCAG 2.2 AA donde aplique. Usa `rsvp-frontend-visual-proof` para capturas y `rsvp-motion-design` si hay movimiento.
