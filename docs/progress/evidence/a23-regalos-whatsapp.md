# A23 · Contacto con el aliado desde la ficha del regalo

Base revisada `947a9b6459ef109bd59af920ff4bf25a7c7f43f8` de la integración FE 06. [RSVPFrontend #79](https://github.com/PabloArauzCaballero/RSVPFrontend/pull/79)

La lista y el detalle muestran tienda, WhatsApp o ambos según `destinationTypes` del catálogo. Las acciones pasan por `/r`. Si la oferta dejó de estar disponible, el invitado todavía puede reservar desde su lista.

| Comprobación local | Resultado |
| --- | --- |
| Universal, pruebas de lista de regalos y reglas | 20 aprobadas. |
| SEO web, pruebas de ficha y redirector | 43 aprobadas. |
| Expo, exportación web | Salida 0. |
| Chromium sobre la exportación, con PostgreSQL y Provider Catalog real | Controles de las cuatro variantes de oferta en 360, 768 y 1280 px. Un clic en WhatsApp pasó por el código de `/r` y devolvió 302 con el mensaje intacto. |

Para esa prueba de Chromium, la celebración y los regalos fueron datos de prueba y la credencial del invitado ya estaba en sesión. La matriz completa de plataformas y el stack con Kong siguen pendientes. La comprobación de tipos de la base de integración tiene errores en los contratos vigentes de Guest RSVP. La entrada directa con una credencial en la ruta de regalos falló durante el arranque de Expo, mientras que la lista de la sesión cargó.

Publicar después del backend que entrega los tipos disponibles. La reversión del frontend restaura la ficha anterior.
