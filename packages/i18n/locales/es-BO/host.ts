/** Host workspace: onboarding, editor, templates, preview, publishing and settings (F11–F13). */
export const hostEsBO = {
  common: {
    save: "Guardar", saving: "Guardando…", saved: "Cambios guardados.", retry: "Reintentar", reload: "Ver la versión nueva", cancel: "Cancelar", confirm: "Confirmar",
    back: "Atrás", next: "Siguiente", loading: "Cargando…", add: "Agregar", remove: "Quitar", moveUp: "Subir", moveDown: "Bajar",
    error: "No se pudo completar la acción. Revisa tu conexión e inténtalo de nuevo; tus cambios siguen aquí.",
    conflict: "Alguien guardó cambios mientras editabas. Tus cambios siguen en el formulario: abre la versión nueva y vuelve a guardar lo que necesites.",
    forbidden: "Puedes ver esta celebración, pero solo los anfitriones o el planner de la organización pueden cambiarla.",
    notFound: "No encontramos esta celebración o no tienes acceso a ella.",
    accessDenied: "Esta sección es solo para anfitriones y planners.",
    invalid: "Revisa este dato: {{detail}}",
    noCelebration: "Elige una celebración para continuar.",
    chooseCelebration: "Elegir celebración"
  },
  navGroups: { guests: "Invitados", gifts: "Regalos", celebration: "Mi celebración", account: "Cuenta" },
  nav: { label: "Secciones del panel", celebrations: "Mis celebraciones", editor: "Contenido", gallery: "Galería", translations: "Traducciones", templates: "Templates", preview: "Vista previa", publish: "Publicar", settings: "Configuración", modes: "Modos de control" },
  picker: { title: "Mis celebraciones", empty: "Todavía no tienes celebraciones. Crea la primera en tres pasos.", create: "Crear celebración", open: "Abrir {{title}}", untitled: "Sin título", status: { DRAFT: "Borrador", PUBLISHED: "Publicada", ARCHIVED: "Archivada" } },
  onboarding: {
    title: "Crear celebración", step: "Paso {{step}} de 3",
    typeTitle: "¿Qué vas a celebrar?", typeHelp: "El tipo define quiénes son los anfitriones, qué secciones tiene el sitio y qué templates puedes usar.",
    detailsTitle: "Datos básicos", titleLabel: "Nombre de la celebración", titlePlaceholder: "Ana y Luis",
    slugLabel: "Dirección del sitio", slugHelp: "Así quedará el enlace: {{url}}. Solo minúsculas, números y guiones.",
    dateLabel: "Fecha (AAAA-MM-DD)", timeLabel: "Hora (HH:MM)", timeZoneLabel: "Zona horaria del evento", timeZoneHelp: "Todas las horas se muestran a los invitados en esta zona, estén donde estén.",
    languageLabel: "Idioma principal", currencyLabel: "Moneda", hostsTitle: "Anfitriones",
    templateTitle: "Elige cómo se verá", templateHelp: "Puedes cambiarlo cuando quieras sin perder contenido.",
    create: "Crear borrador", finish: "Ir al panel", skipTemplate: "Elegir después"
  },
  editor: {
    title: "Contenido", unsavedHint: "Los cambios no guardados se mantienen si falla la conexión.",
    sections: { general: "Datos generales", hosts: "Anfitriones", venues: "Lugares", story: "Historia", schedule: "Itinerario", sections: "Otras secciones" },
    general: { title: "Nombre de la celebración", subtitle: "Frase de bienvenida", eventDate: "Fecha", eventTime: "Hora", venueName: "Lugar principal", extraField: "Dato adicional: {{field}}" },
    hosts: { help: "Los roles salen del tipo de evento: {{eventType}}." },
    venues: { name: "Nombre del lugar", address: "Dirección", kind: "Tipo", kinds: { ceremony: "Ceremonia", reception: "Recepción", other: "Otro" }, add: "Agregar lugar", item: "Lugar {{n}}" },
    story: { label: "Su historia", help: "Separa los párrafos con una línea en blanco." },
    schedule: { title: "Actividad", date: "Fecha", time: "Hora", description: "Detalle", add: "Agregar actividad", item: "Actividad {{n}}", zoneHelp: "Escribe la hora local del evento ({{timeZone}})." },
    extra: { dressCode: "Código de vestimenta", faq: "Preguntas frecuentes", question: "Pregunta", answer: "Respuesta", addFaq: "Agregar pregunta", recommendations: "Recomendaciones", recommendationName: "Nombre", recommendationDescription: "Descripción", recommendationKind: "Tipo", kinds: { lodging: "Hospedaje", transport: "Transporte", other: "Otra" }, listingId: "Código de partner (opcional)", listingHelp: "Si es un partner, su enlace pasará por nuestro redirector.", addRecommendation: "Agregar recomendación", item: "Elemento {{n}}" }
  },
  gallery: {
    title: "Galería", help: "Las fotos se suben directo al almacenamiento y se generan versiones optimizadas. Formatos JPG, PNG o WebP de hasta 10 MB.",
    add: "Agregar foto", uploading: "Subiendo {{name}}… {{percent}} %", cover: "Portada", makeCover: "Usar como portada", delete: "Eliminar", empty: "Todavía no hay fotos.",
    photo: "Foto {{n}}", invalidType: "Ese archivo no es una imagen JPG, PNG o WebP.", tooLarge: "La imagen supera los 10 MB.", failed: "No se pudo subir {{name}}. Inténtalo de nuevo.",
    unsupportedPlatform: "La subida de fotos está disponible en la versión web y en la app con permiso de galería.", reorderFailed: "No se pudo guardar el nuevo orden."
  },
  translations: {
    title: "Traducciones", help: "Escribe el contenido en cada idioma del sitio. Lo que no traduzcas se muestra en el idioma principal.",
    language: "Idioma", addLanguage: "Agregar idioma", noLanguages: "Tu celebración tiene un solo idioma. Agrega otro para traducir.", original: "Original: {{text}}",
    fields: { title: "Nombre", subtitle: "Frase de bienvenida", story: "Historia", dressCode: "Código de vestimenta" }, faqItem: "Pregunta {{n}}", scheduleItem: "Actividad {{n}}"
  },
  templates: { title: "Templates", help: "Solo aparecen los compatibles con {{eventType}}.", current: "En uso", apply: "Usar este template", preserved: "Tu contenido se conserva al cambiar de template.", empty: "No hay templates compatibles todavía.", preview: "Vista previa de {{name}}" },
  preview: { title: "Vista previa", devices: { mobile: "Móvil", tablet: "Tableta", desktop: "Escritorio" }, device: "Tamaño", openPublic: "Abrir el sitio público", notPublished: "Así verán tu sitio cuando lo publiques." },
  publish: {
    title: "Publicar", ready: "Todo listo para publicar.", missing: "Antes de publicar, completa:",
    fields: { title: "El nombre de la celebración", subtitle: "La frase de bienvenida", eventDate: "La fecha del evento", venueName: "El lugar principal", childName: "El nombre de quien se bautiza", companyName: "El nombre de la empresa", celebrantName: "El nombre de la celebrante", host: "El nombre de: {{role}}", other: "El dato «{{field}}»" },
    goTo: "Completar", publish: "Publicar celebración", publishConfirm: "Tu sitio será visible para cualquier persona con el enlace. ¿Publicar ahora?",
    unpublish: "Despublicar", unpublishConfirm: "El sitio dejará de verse hasta que lo publiques otra vez. El enlace no cambia.", reasonLabel: "Motivo (opcional)",
    archive: "Archivar", archiveConfirm: "Archivar es definitivo: la celebración ya no se podrá publicar ni editar.",
    status: { DRAFT: "Borrador: solo tú la ves.", PUBLISHED: "Publicada: cualquiera con el enlace la ve.", ARCHIVED: "Archivada." },
    share: "Compartir", link: "Enlace público", copy: "Copiar enlace", copied: "Enlace copiado.", whatsappPreview: "Así se verá en WhatsApp"
  },
  settings: {
    title: "Configuración", languages: "Idiomas del sitio", defaultLanguage: "Idioma principal", timeZone: "Zona horaria", currency: "Moneda",
    deadline: { label: "Fecha límite para confirmar", date: "Fecha (AAAA-MM-DD)", time: "Hora (HH:MM)", help: "Hora local del evento ({{timeZone}}).", none: "Sin fecha límite.", clear: "Quitar fecha límite",
      past: "Esa fecha ya pasó: los invitados ya no podrán responder ni cambiar su respuesta.", effect: "Los invitados podrán responder hasta el {{date}} ({{zone}})." }
  },
  modes: {
    title: "Modos de control", help: "Decide qué se aprueba solo y qué pasa por tu revisión. Puedes cambiarlo cuando quieras.",
    nonRetroactive: "Las solicitudes que ya están pendientes seguirán pendientes: el cambio solo se aplica a las nuevas.",
    values: { AUTO_ACCEPT: "Automático", RESTRICTED: "Con mi revisión" }, current: "Ahora: {{value}}",
    confirmTitle: "Cambiar a «{{value}}»", confirm: "Sí, cambiar", change: "Cambiar a {{value}}",
    switches: {
      giftReservationMode: { label: "Reservas de regalos", AUTO_ACCEPT: "Cuando un invitado reserve un regalo, quedará comprometido al instante y nadie más podrá elegirlo.", RESTRICTED: "Cada reserva te llegará a la bandeja y el regalo quedará apartado hasta que la apruebes o rechaces." },
      unregisteredRsvpMode: { label: "Confirmaciones de personas sin invitación", AUTO_ACCEPT: "Cualquier persona con el enlace podrá confirmar su asistencia sin estar en tu lista.", RESTRICTED: "Solo podrán confirmar las personas de tu lista de invitados." },
      extraCompanionMode: { label: "Acompañantes extra", AUTO_ACCEPT: "Si un invitado pide más acompañantes de los que le diste, se aprobarán solos.", RESTRICTED: "Los acompañantes de más quedarán pendientes hasta que los apruebes." },
      externalGiftMode: { label: "Regalos fuera del catálogo", AUTO_ACCEPT: "Los regalos externos que se propongan aparecerán en la lista sin revisión.", RESTRICTED: "Los regalos externos propuestos esperarán tu aprobación antes de aparecer." }
    },
    partnerPriority: { label: "Destacar regalos de partners", help: "Los regalos de proveedores verificados se muestran primero en tu lista." }
  }
} as const;
