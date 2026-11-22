# A23 · Contacto con el aliado desde la ficha del regalo

Base revisada `947a9b6459ef109bd59af920ff4bf25a7c7f43f8` de la integración FE 06. [RSVPFrontend #79](https://github.com/PabloArauzCaballero/RSVPFrontend/pull/79)

La lista y el detalle muestran tienda, WhatsApp o ambos según `destinationTypes` del catálogo. Las acciones pasan por `/r`. Si la oferta dejó de estar disponible, el invitado todavía puede reservar desde su lista.

Las rutas personales de asistencia y regalos esperan a que Expo Router pueda navegar antes de guardar la credencial de sesión y reemplazar la URL. La copia de contratos se regeneró desde `a1446ba813fbeb09d9dde25d79aa71f478b59a3e` de RSVPBackend. Incluye la actualización de contratos de FE 04b y el Provider Catalog 3.3.0 de A23.

| Comprobación local | Resultado |
| --- | --- |
| Contratos, hooks, Universal, SEO web y traducciones | 6 + 103 + 512 + 159 + 15 pruebas aprobadas. Incluye la regresión de las rutas personales en el arranque de Expo. |
| TypeScript de contratos, hooks, Universal y SEO web | Salida 0. |
| Generador de contratos con `--check` y `--verify-source` | Salida 0. Ocho especificaciones verificadas contra el commit fijado del backend. |
| Exportación web de Expo y build de Next.js | Salida 0. |
| Chromium desde un enlace personal con sesión limpia | Entra a la asistencia y de ahí a regalos. Controles en 360, 768 y 1280 px, claro y oscuro, para ofertas con WhatsApp, tienda, ambos o sin destino disponible. Un clic en WhatsApp pasó por `/r`, obtuvo 302 y preservó acentos y emoji del mensaje. |
| Chromium desde el enlace personal directo a regalos en inglés | La pantalla abrió desde cero, mostró `Ask on WhatsApp` y retiró la credencial de la URL. Axe no encontró problemas graves o críticos en la lista en los tres anchos y ambos temas. |

Chromium ejecutó la exportación de Expo, el código del redirector y Provider Catalog con PostgreSQL. Celebración, Guest RSVP y Gift List respondieron con datos de prueba. Las redirecciones externas se interceptaron en el navegador. La repetición integrada, con los servicios reales detrás de Kong, sigue pendiente.

En el stack de prueba, publicar tres ofertas de un proveedor verificado con WhatsApp, tienda y ambos. Agregarlas a la lista del celebrador, abrir el enlace personal del invitado desde cero y confirmar asistencia. Comprobar las acciones de cada ficha, el mensaje del proveedor, la reserva y el estado cuando la oferta deja de estar disponible. Completar la matriz del repositorio y adjuntar sus resultados.

Integrar siguiendo la secuencia de las etapas, con el backend que entrega `destinationTypes` antes de publicar estos botones. La reversión del frontend restaura la ficha anterior.
