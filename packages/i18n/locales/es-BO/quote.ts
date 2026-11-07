/** Catálogo, ficha con entrega, cotización y agenda del partner (F25 y F26). */
export const quoteEsBO = {
  catalog: { title: "Catálogo de {{name}}", meta: "Servicios y productos de {{name}} con su precio y condiciones de entrega.", intro: "Cada oferta muestra quién se responsabiliza de la entrega.", empty: "Este proveedor aún no ha publicado servicios ni productos.", open: "Ver condiciones y precio", back: "Volver al proveedor", type: { SERVICE: "Servicio", PRODUCT: "Producto" } },
  fulfillment: {
    title: "Entrega y condiciones", responsible: "Responsable de la entrega", responsibleValue: { PROVIDER: "El proveedor", CUSTOMER: "Tú (retiro por tu cuenta)" },
    coverage: "Cobertura", transport: "Costo de traslado", transportNone: "Sin costo de traslado informado", leadTime: "Plazo", leadTimeValue: "{{days}} días de anticipación", conditions: "Condiciones", missing: "El proveedor aún no informó sus condiciones de entrega. Pídeselas antes de contratar."
  },
  detail: { notFound: "No encontramos esta oferta.", quote: "Pedir cotización", agenda: "Ver disponibilidad", priceFrom: "Desde {{price}}" },
  quote: {
    title: "Pedir cotización a {{name}}", meta: "Cotiza con {{name}}: elige servicios, fecha e invitados.", intro: "Elige lo que te interesa y cuenta cómo será tu evento. {{name}} recibe todo junto y te responde por correo.",
    items: "¿Qué quieres cotizar?", itemsHelp: "Elige al menos una oferta.", eventDate: "Fecha del evento", guests: "Cantidad de invitados", budget: "Presupuesto aproximado (Bs.)", budgetHelp: "Opcional.",
    city: "Ciudad del evento", name: "Tu nombre", email: "Tu correo", phone: "Teléfono", message: "Mensaje", submit: "Enviar solicitud", submitting: "Enviando…",
    summary: "Tu selección", noneSelected: "Aún no elegiste ninguna oferta.", fulfillmentFor: "Entrega de {{title}}",
    anonymousNote: "No necesitas una cuenta: el proveedor te responde al correo que indiques. Para solicitar una fecha sí necesitas iniciar sesión.", honeypot: "Sitio web (déjalo vacío)",
    captcha: { label: "Verificación anti robots", required: "Completa la verificación antes de enviar." },
    errors: { rateLimited: "Enviaste muchas solicitudes seguidas. Espera un momento e inténtalo de nuevo.", rateLimitedWait: "Enviaste muchas solicitudes seguidas. Inténtalo de nuevo en unos {{minutes}} minutos.", limitContact: "Ya enviaste el máximo de solicitudes hoy a este proveedor con ese correo. Espera a que te responda o inténtalo mañana.", captcha: "No pudimos verificar que eres una persona. Vuelve a completar la verificación e inténtalo otra vez.", rejected: "No pudimos aceptar la solicitud. Revisa los datos e inténtalo de nuevo.", items: "Elige al menos una oferta.", date: "Elige una fecha futura.", guests: "Indica cuántos invitados serán (mínimo 1).", name: "Escribe tu nombre.", email: "Escribe un correo válido.", budget: "Escribe un presupuesto válido, por ejemplo 5000.", validation: "El proveedor no pudo aceptar la solicitud: revisa los datos.", generic: "No pudimos enviar tu solicitud. Lo que escribiste sigue aquí: inténtalo de nuevo.", notFound: "Este proveedor ya no está disponible." },
    signIn: { title: "Inicia sesión para enviar tu solicitud", body: "Para que el proveedor pueda responderte necesitamos tu cuenta. Tus datos se conservan en esta pantalla.", action: "Iniciar sesión" },
    sent: { title: "Solicitud enviada", body: "{{name}} recibió tu solicitud y te responderá al correo que indicaste. Número de solicitud: {{id}}.", copy: "Guarda este número por si necesitas consultar tu solicitud.", another: "Pedir otra cotización", back: "Volver al proveedor" },
    unavailable: "No pudimos cargar a este proveedor. Vuelve a intentarlo en unos minutos."
  },
  agenda: {
    title: "Disponibilidad de {{name}}", meta: "Días libres de {{name}}, en la hora de {{zone}}.", intro: "Los días libres están en hora de {{zone}}, la zona del proveedor.", legend: "Días libres, bloqueados o sin cupo",
    prev: "Mes anterior", next: "Mes siguiente", month: "Calendario de {{month}}", free: "Libre", blocked: "No disponible", full: "Sin cupo", remaining: "{{count}} cupo",
    dayLabel: "{{date}}: {{state}}", select: "Elige un día libre para solicitar la fecha.", selected: "Fecha elegida: {{date}}", request: "Solicitar esta fecha", requesting: "Solicitando…", loading: "Cargando el calendario…", error: "No pudimos cargar el calendario.", retry: "Reintentar",
    reason: { BLACKOUT: "El proveedor bloqueó este día", NO_RULE: "El proveedor no atiende este día", OUTSIDE_HOURS: "Fuera del horario de atención", FULL: "Ya no quedan cupos" },
    outcome: { requestedTitle: "Fecha solicitada", requestedBody: "Pedimos {{date}} a {{name}}. Te confirmará pronto; la solicitud vence {{expires}}.", blocked: "Esta fecha no está disponible: el proveedor la bloqueó. Elige otro día libre.", noCapacity: "Alguien tomó el último cupo de esta fecha. Elige otro día libre; el calendario se actualizó.", signIn: "Inicia sesión para solicitar una fecha.", generic: "No pudimos solicitar la fecha. Inténtalo de nuevo." }
  }
} as const;
