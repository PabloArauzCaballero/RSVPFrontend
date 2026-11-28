# Proveedores para mi evento: integración con la oficial y decisiones del 28-11-2026

Rama `feat/req-proveedores-evento-fe`; también contenida en la rama apilada `feat/req-apilada-fe`.

## Decisiones del dueño aplicadas
- **6 · Miniaturas 3D y E1 a E7:** aprobadas (DESIGN.md ya no dice «provisional»). Los 120 WebP de `apps/seo-web/public/marketplace/v1` son idénticos (mismo blob) a `wip/respaldo-20261128/archivos:sueltos/marketplace-muestras/webp`. Legibilidad revisada en Chromium a 72 y 80 px, claro y oscuro: `docs/progress/evidencia-integracion/miniaturas-legibilidad-72-80.png`. Catering (campana azul sobre fuente), Salones (fachada con arcos y banderas) y Recuerdos (bolsa, frasco y regalo) se reconocen en ambos tamaños y temas. Sigue abierto, sin inventar: probar en un teléfono real, y la miniatura de una categoría creada por el administrador (usa la baldosa genérica con inicial).
- **7 · Pestaña:** interruptor global `GUEST_MARKETPLACE` (BE y FE). TEST: `on` en ambos; producción: `off` (valor por defecto de compose). No hay interruptor por celebración.
- **8 · Cotización anónima:** prueba de trabajo (`PROVIDER_ANON_QUOTES=proof`) en TEST; el cliente resuelve el reto en `lib/quote-proof.ts`.
- **9 · Clics anónimos de anfitriones:** no se facturan. Un anfitrión con sesión se reconoce por el ctx firmado de R6a (`HOST_OR_PLANNER`, no facturable). Un anfitrión sin sesión es indistinguible de un invitado: no se puede excluir por código; no existe cobro hoy (no hay tarifa ni saldo), así que no se factura nada. Queda registrado como límite, no como corrección.
- **10 · Textos legales:** se publican en TEST (`directory.guestMarketplace.trust`, sección «Mapas y búsqueda de lugares» de la política). **Pendientes de revisión legal antes de producción**; producción no los muestra mientras la pestaña esté apagada y el documento legal lleva su banner de borrador. No encender `GUEST_MARKETPLACE` en producción sin esa revisión.
- **11 · Fotos de servicio y logo del proveedor:** se mantiene lo aplicado (carril de imágenes).
