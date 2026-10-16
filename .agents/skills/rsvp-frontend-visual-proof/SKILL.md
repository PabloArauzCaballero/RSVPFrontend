---
name: rsvp-frontend-visual-proof
description: Comprueba cambios de interfaz, responsive, accesibilidad y SEO en las superficies frontend de RSVP.
---

# Prueba visual frontend

Usa esta skill al cambiar pantallas, navegación, estilos, contenido indexable o comportamiento por plataforma.

1. Identifica la superficie y estados afectados: Next.js, Expo web, iOS o Android; carga, vacío, éxito, error y restricciones de permiso. Selecciona los tamaños que exige el carril; para web responsive, normalmente 360, 768 y 1280 px.
2. Renderiza o ejecuta la interfaz con datos representativos y los errores contractuales pertinentes. Inspecciona contenido, desbordes, foco, teclado, etiquetas y contraste. Para móvil, comprueba lector de pantalla, toque y navegación cuando el cambio los afecta.
3. Si la ruta es indexable, revisa HTML servido, metadata, canonical/robots y ausencia de tokens o datos privados. Para enlaces de partner, inspecciona el destino renderizado y su paso por `/r/{listingId}`.
4. Guarda capturas o reportes con plataforma, viewport, estado, comando y fecha. Una captura sola no prueba interacción ni accesibilidad; combina inspección con la prueba dirigida que corresponda. Si un emulador, dispositivo o servicio no está disponible, registra el bloqueo y deja el REQ sin `PASS`.

Si hay transición o animación, aplica también `rsvp-motion-design` y comprueba una secuencia temporal y movimiento reducido. Para foco, teclado, lector de pantalla y estados de red aplica `rsvp-accessible-states`.

No declares iOS o Android verificado a partir de Expo web ni marques un snapshot como aprobado sin inspeccionarlo.
