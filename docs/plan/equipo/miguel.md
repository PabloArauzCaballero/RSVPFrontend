# Miguel · Invitados, avisos y móvil

> Tenés la pantalla con más usuarios de todo el producto —el RSVP, que abren cientos de invitados por celebración— y la exigencia dura del cliente, que es el push real en iOS y Android. Tres de tus carriles no se pueden demostrar con un test: necesitan dos teléfonos en la mano.

---

## Lo que te pertenece

| | |
|---|---|
| **Superficies** | A9–A13 (RSVP público), C6, C19–C26 y C31 (invitados, resumen, bandejas y avisos), C25 y C27–C30 (regalos del anfitrión), F1–F6 (todo lo específico de móvil) |
| **Conceptos** | Magic link, deep links, push, device tokens, preferencias de canal |

---

## Tu calendario

| Semana | Fechas | Carriles | Foco |
|---|---|---|---|
| 07 | 30 nov – 4 dic | — | Buffer, handlers MSW y pantallas estáticas sin datos |
| 08 | 7–11 dic | [F15](../carriles/lane-F15-rsvp-publico-magic-link.md) · [F16](../carriles/lane-F16-gestion-de-invitados.md) | RSVP público y gestión de invitados |
| 09 | 14–18 dic | [F17](../carriles/lane-F17-resumen-y-bandejas-rsvp.md) · [F18](../carriles/lane-F18-notificaciones-in-app.md) | Resumen, bandejas y notificaciones in-app |
| 10 🎄 | 21–25 dic | [F19](../carriles/lane-F19-push-ios-android.md) | Push: permisos y recepción en los tres estados |
| 11 🎄 | 28 dic – 1 ene | [F20](../carriles/lane-F20-acciones-desde-push.md) | Aprobar una reserva desde la notificación |
| 12 | 4–8 ene | [F21](../carriles/lane-F21-app-movil-del-invitado.md) | App móvil del invitado por deep link |
| 13 | 11–15 ene | [F23](../carriles/lane-F23-gestion-de-regalos-anfitrion.md) | Gestión de regalos del anfitrión y estabilización |

Antes de la semana 7 estás en backend: carriles 17 a 24. Tu calendario completo está en [`RSVPBackend/docs/plan/equipo/miguel.md`](../../../../RSVPBackend/docs/plan/equipo/miguel.md).

---

## Tus carriles

| # | Carril | Entregable que lo cierra |
|---|---|---|
| [F15](../carriles/lane-F15-rsvp-publico-magic-link.md) | RSVP público | Los cinco estados con pantalla propia y mensaje accionable |
| [F16](../carriles/lane-F16-gestion-de-invitados.md) | Gestión de invitados | **Un CSV real de 200 filas se importa y los errores se entienden** |
| [F17](../carriles/lane-F17-resumen-y-bandejas-rsvp.md) | Resumen y bandejas | Los totales son los del backend, sin recálculo en el cliente |
| [F18](../carriles/lane-F18-notificaciones-in-app.md) | Notificaciones in-app | Desactivar un canal se refleja de verdad en el backend |
| [F19](../carriles/lane-F19-push-ios-android.md) | Push | **Recepción en los tres estados, en un iPhone y un Android físicos** |
| [F20](../carriles/lane-F20-acciones-desde-push.md) | Acciones desde push | **Aprobar una reserva sin abrir la app**, probado en ambas plataformas |
| [F21](../carriles/lane-F21-app-movil-del-invitado.md) | App del invitado | El magic link abre la app si está instalada, el web si no |
| [F23](../carriles/lane-F23-gestion-de-regalos-anfitrion.md) | Regalos del anfitrión | Añadir un regalo de partner es más fácil que uno externo, medible en pasos |

---

## Lo que esperás de los demás

| De quién | Qué | Para cuándo |
|---|---|---|
| Pablo | F04 y F05 | fin semana 07 — te bloquea F15 |
| Pablo | **F05 con deep links verificados en dispositivo** | fin semana 07 — te bloquea F19, F20 y F21 |
| Pablo | F07 con EAS Build funcionando | fin semana 08 — te bloquea F19 |
| Leo | F09 (motor de templates) | fin semana 08 — lo necesitás para encajar el RSVP en el sitio |
| Fabio | F22 (lista de regalos pública) | fin semana 09 — te bloquea F23 |

---

## Riesgos de tu eje

- **Pedir el permiso de push en el primer arranque sin contexto quema la única oportunidad.** Si el usuario lo rechaza, recuperarlo exige que vaya a los ajustes del sistema. Por eso `F19` empieza con una pantalla que explica para qué sirve.
- **Las acciones en notificación se configuran distinto en iOS y en Android.** Es fácil que funcionen en una plataforma y no en la otra sin que nadie lo note hasta la demo.
- **El RSVP es la pantalla con más usuarios y menos tolerancia.** Un error genérico se traduce en llamadas al anfitrión. Los cinco estados tienen pantalla propia por eso.
- **Un reporte de errores de CSV que dice solo «archivo inválido»** hace que el anfitrión abandone la importación y cargue 200 invitados a mano. El número de línea y el motivo no son un lujo.
- **Tus carriles de Navidad son los de push.** Dependen del bloqueo externo del dominio y las cuentas de tienda: si eso no se resolvió en la semana 6, llegás a Navidad bloqueado. Confirmalo con Pablo el lunes 23 de noviembre.
