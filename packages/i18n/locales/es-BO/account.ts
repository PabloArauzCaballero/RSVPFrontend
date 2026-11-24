/** Pages of any signed-in account (the (account) group): the partner request of DPA-10. */
export const accountEsBO = {
  partnerRequest: {
    title: "Solicita ser partner",
    intro: "Cuéntanos de tu negocio de eventos. El equipo de DOne revisa cada solicitud y te contacta por el medio que elijas.",
    backHome: "Volver a mi espacio",
    loading: "Cargando tu solicitud…",
    loadError: "No pudimos cargar tus solicitudes. Inténtalo de nuevo en unos minutos.",
    loadErrorNetwork: "No pudimos cargar tus solicitudes. Revisa tu conexión e inténtalo de nuevo.",
    referenceError: "No pudimos cargar las categorías o las ciudades, y sin ellas no se puede completar el formulario.",
    retry: "Reintentar",
    steps: {
      title: "Cómo funciona",
      send: "Nos envías esta solicitud con los datos de tu negocio.",
      call: "El equipo la revisa y te contacta por WhatsApp o por teléfono.",
      kyp: "Después te pedimos los documentos KYP (NIT, carnet de identidad y comprobante de domicilio) para verificar tu negocio y crear tu cuenta de partner."
    },
    noEmail: "Por ahora no enviamos avisos por correo: vuelve a esta página para ver cómo va tu solicitud.",
    formLabel: "Solicitud para ser partner",
    formTitle: "Datos de tu negocio",
    againTitle: "Enviar una nueva solicitud",
    choose: "Elige una opción",
    fields: {
      businessName: "Nombre comercial", businessNameHelp: "Como te conocen tus clientes. Hasta 120 caracteres.",
      category: "Categoría", department: "Departamento", city: "Ciudad", cityFirst: "Elige primero el departamento.",
      channel: "¿Cómo te contactamos?", whatsapp: "Número de WhatsApp", phone: "Número de teléfono",
      phoneHelp: "Con código de país si no es de Bolivia, por ejemplo +591 70000000.",
      message: "Mensaje (opcional)", messageHelp: "Qué ofreces, desde cuándo y dónde trabajas. {{count}} de {{max}} caracteres.",
      consent: "Acepto que el equipo de DOne me contacte a este número por mi solicitud."
    },
    channels: { WHATSAPP: "WhatsApp", PHONE: "Llamada" },
    channelNames: { WHATSAPP: "WhatsApp", PHONE: "teléfono" },
    codes: {
      REQUIRED: "Falta este dato.", TOO_LONG: "Es demasiado largo.", UNKNOWN_CATEGORY: "Esa categoría ya no está disponible. Elige otra.", UNKNOWN_DEPARTMENT: "Elige un departamento de la lista.",
      UNKNOWN_CITY: "Elige una ciudad de la lista.", CITY_NOT_IN_DEPARTMENT: "Esa ciudad no es de ese departamento. Elige otra.", INVALID_PHONE: "Escribe solo el número, de 7 a 20 dígitos, con + opcional al inicio.",
      INVALID_CHANNEL: "Elige WhatsApp o llamada.", CONSENT_REQUIRED: "Marca la casilla para que podamos contactarte.", INVALID: "Revisa este dato."
    },
    tooLong: { businessName: "Usa hasta 120 caracteres.", contactPhone: "Es demasiado largo: escribe solo el número.", message: "Usa hasta 1000 caracteres." },
    fixErrors_one: "Revisa el dato marcado para enviar la solicitud.", fixErrors_other: "Revisa los {{count}} datos marcados para enviar la solicitud.",
    submit: "Enviar solicitud", submitting: "Enviando…",
    sent: "Recibimos tu solicitud. Por ahora no enviamos avisos por correo: vuelve a esta página para ver cómo va.",
    goToPortal: "Ir a mi portal",
    errors: {
      REQUEST_LIMIT: "Ya enviaste {{limit}} solicitudes en los últimos {{days}} días. Podrás enviar otra cuando pase ese plazo.",
      ALREADY_PARTNER_OWNER: "Tu cuenta ya es dueña de un partner, así que no hace falta otra solicitud. Adminístralo desde tu portal.",
      REQUEST_ALREADY_OPEN: "Ya tienes una solicitud en curso. Te mostramos cómo va.",
      VALIDATION_FAILED: "Revisa los datos marcados y vuelve a enviar la solicitud.",
      network: "No pudimos enviar tu solicitud. Revisa tu conexión e inténtalo de nuevo: tus datos siguen aquí.",
      rateLimited: "Hiciste muchos intentos seguidos. Espera un momento y vuelve a enviar: tus datos siguen aquí.",
      server: "No pudimos enviar tu solicitud por un problema nuestro. Inténtalo de nuevo en unos minutos: tus datos siguen aquí.",
      generic: "No pudimos enviar tu solicitud. Inténtalo de nuevo: tus datos siguen aquí.",
      INVALID_REQUEST_TRANSITION: "El equipo ya tomó tu solicitud, así que ya no se puede retirar. Te mostramos su estado actual.",
      PARTNER_REQUEST_VERSION_CONFLICT: "Tu solicitud cambió hace un momento. Te mostramos su estado actual.",
      PARTNER_REQUEST_NOT_FOUND: "Ya no encontramos esa solicitud. Te mostramos la lista actualizada.",
      withdrawGeneric: "No pudimos retirar tu solicitud. Inténtalo de nuevo en unos minutos."
    },
    statuses: { OPEN: "Recibida", IN_REVIEW: "En revisión", CONVERTED: "Aprobada", REJECTED: "No aprobada", WITHDRAWN: "Retirada" },
    summary: "{{category}} · {{city}} · enviada el {{date}}",
    statusBody: {
      OPEN: "La recibimos el {{date}}. El equipo la revisará y te contactará por {{channel}} al {{phone}}.",
      IN_REVIEW: "El equipo ya la está revisando y te contactará por {{channel}} al {{phone}}.",
      CONVERTED: "El equipo aprobó tu solicitud y está preparando tu cuenta de partner. Te pedirá los documentos KYP para terminar; cuando esté lista, vuelve a iniciar sesión para ver tu portal.",
      REJECTED: "El equipo no pudo aprobarla. Motivo: {{reason}}",
      WITHDRAWN: "La retiraste el {{date}}."
    },
    comeBack: "Vuelve a esta página para ver cómo va: por ahora no enviamos avisos por correo.",
    withdraw: {
      action: "Retirar solicitud", title: "¿Retirar la solicitud de {{name}}?",
      body: "El equipo dejará de revisarla. Podrás enviar otra, pero esta cuenta para el límite de {{limit}} solicitudes en {{days}} días.",
      confirm: "Retirar solicitud", done: "Retiraste tu solicitud."
    },
    history: "Solicitudes anteriores",
    historyItem: "{{name}} · {{status}} · {{date}}"
  }
} as const;
