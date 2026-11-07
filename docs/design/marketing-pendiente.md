# Marketing: claims pendientes de validar (sitio público)

Regla (`product-marketing`, `copywriting`): el sitio solo afirma lo que el producto hace hoy. Lo de abajo **no se dice** hasta tener el dato indicado. Contexto base: `.agents/product-marketing.md` (`draft-0.1`, sin validar).

| Claim que no se publica | Por qué | Dato que lo desbloquea |
|---|---|---|
| Prueba social: número de celebraciones, invitados, proveedores, testimonios, logos, premios, prensa | No existe ninguna cifra ni cliente validado | Export real de métricas del backend con fecha de corte, y consentimiento escrito de cada testimonio o logo |
| Precio, «gratis», «sin costo», plan de prueba | No hay modelo de precios definido | Decisión de precios y condiciones publicadas |
| «DOne manda los recordatorios por ti» (estaba en el hero anterior; se retiró) | No hay evidencia de recordatorios automáticos a invitados | Confirmación de backend de qué avisos reciben los invitados y cuándo |
| Tiempo para publicar («en 5 minutos») | No medido | Prueba cronometrada con anfitriones reales del alta guiada |
| Criterios de la marca «Verificado» (documentos, visita, identidad) | Solo se afirma que el proveedor «pasó la verificación de DOne» | Lista oficial de qué revisa Verificación y moderación |
| Tiempo de respuesta del proveedor, calificaciones, reseñas | No hay datos | Métrica real de respuesta y un sistema de reseñas verificadas (entonces `aggregateRating` en JSON-LD) |
| Cuotas de proveedores («últimos cupos») / urgencia | Solo es válida si es verdadera | Datos de capacidad reales por proveedor (la agenda ya muestra cupos libres: eso sí es real y se muestra tal cual) |
| «Cotización gratis» (en-US lo decía; se cambió a «sin compromiso») | Si es gratis para el anfitrión no está confirmado | Confirmación de negocio |
| Redes sociales y contacto de DOne (`sameAs`, `contactPoint` del Organization) | No hay perfiles oficiales confirmados | URLs oficiales y canal de contacto |
| Cobertura «toda Bolivia» | Solo hay lo que los proveedores publican | Conteo de proveedores verificados por ciudad |
| Competidores / comparativas | Sin investigación | Lista de competidores y fuentes (`competitors`) |
| Idiomas de cada celebración | El sitio está en es-BO y en-US; cada celebración publica los que configure | Confirmar el alcance de idiomas por celebración |

## Qué sí se dice hoy y de dónde sale

- Los invitados responden sin cuenta: `rsvp.guest.intro` y el flujo `/rsvp`.
- Pueden cambiar la respuesta mientras el plazo siga abierto: `rsvp.confirmed.editHint`.
- Cada regalo se reserva una sola vez; el anfitrión elige reserva automática o aprobada: copy previo de la landing y módulo de regalos.
- La marca «Verificado» se muestra solo en proveedores verificados; categoría y ciudad listan solo verificados y la ficha responde 404 si no lo está (`lib/partner.ts`).
- DOne no presta ni garantiza el servicio del proveedor: `partner.disclaimer` (ya existía).

## Medición pendiente (para validar con datos, no con opinión)

Clic en «Crear mi celebración» desde hero, roles y cierre; envío de cotización; apertura de /rsvp a respuesta enviada. Hipótesis a probar con `ab-testing` cuando haya tráfico: orden de roles; titular del cierre.
