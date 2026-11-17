/** Host workspace: onboarding, editor, templates, preview, publishing and settings (F11–F13). */
export const hostEsBO = {
  common: {
    save: "Guardar", saving: "Guardando…", saved: "Cambios guardados.", retry: "Reintentar", reload: "Ver la versión nueva", cancel: "Cancelar", confirm: "Confirmar",
    back: "Atrás", next: "Siguiente", loading: "Cargando…", add: "Agregar", remove: "Quitar", moveUp: "Subir", moveDown: "Bajar",
    error: "Algo no salió como esperábamos. Revisa tu conexión y vuelve a intentarlo; lo que escribiste sigue aquí.",
    conflict: "Alguien guardó cambios mientras editabas. Lo que escribiste sigue aquí: abre la versión nueva y guarda de nuevo lo que necesites.",
    forbidden: "Puedes ver esta celebración, pero solo los anfitriones o el planner de la organización pueden cambiarla.",
    notFound: "No encontramos esta celebración o no tienes acceso a ella.",
    accessDenied: "Esta sección es solo para anfitriones y planners.",
    invalid: "Revisa este dato: {{detail}}",
    noCelebration: "Elige una celebración para continuar.",
    chooseCelebration: "Elegir celebración",
    noCelebrationTitle: "Elige una celebración", noCelebrationBody: "Tus invitados, regalos y avisos viven dentro de cada celebración.", archivedTitle: "Esta celebración está archivada", archivedBody: "Solo se puede consultar. Para seguir editando, crea una celebración nueva.",
    archivedReadOnly: "Esta celebración está archivada: solo se puede consultar. Para seguir editando, crea una celebración nueva."
  },
  errors: {
    slugTaken: "Ese enlace ya lo usa otra celebración. Prueba con otro.",
    slugImmutable: "El enlace ya no se puede cambiar porque la invitación se publicó o se archivó.",
    archived: "Esta celebración está archivada: ya no admite cambios.",
    invalidTransition: "Eso ya no aplica al estado actual de la celebración. Actualiza la página para ver cómo está.",
    rateLimited: "Vas muy rápido. Espera {{seconds}} segundos y vuelve a intentarlo; lo que escribiste sigue aquí.",
    rateLimitedNoWait: "Vas muy rápido. Espera un momento y vuelve a intentarlo; lo que escribiste sigue aquí.",
    server: "El servidor no respondió como esperábamos. Inténtalo de nuevo en unos minutos; tus cambios siguen aquí.",
    network: "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo; tus cambios siguen aquí.",
    serverLoad: "El servidor no respondió como esperábamos. Inténtalo de nuevo en unos minutos.",
    networkLoad: "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo."
  },
  location: { linkPlaceholder: "https://maps.app.goo.gl/…", mark: "Marcar en el mapa", change: "Cambiar el punto", marked: "Punto marcado. Tus invitados lo abrirán con «Cómo llegar».", link: "Enlace del mapa", linkHelp: "Opcional. Se completa al marcar el punto; también puedes pegar el enlace que te da Google Maps al compartir el lugar.", linkHelpNative: "Opcional. Pega el enlace que te da Google Maps al compartir el lugar; tus invitados lo abrirán con «Cómo llegar».", linkInvalid: "Pega un enlace de Google Maps, Apple Maps, Waze u OpenStreetMap que empiece con https://.", pickerTitle: "Marca el lugar en el mapa", search: "Buscar un lugar o dirección", searchPlaceholder: "Salón Las Palmas, Santa Cruz", searchButton: "Buscar", results: "Resultados de la búsqueda", noResults: "No encontramos ese lugar. Prueba con la calle o la zona y termina de ubicarlo moviendo el mapa.", searchError: "No pudimos buscar ahora. Mueve el mapa hasta el lugar o inténtalo de nuevo.", locationError: "No pudimos obtener tu ubicación. Revisa el permiso del navegador o busca el lugar por su nombre.", mapLabel: "Mapa: muévelo hasta que el pin quede sobre el lugar", hint: "Mueve el mapa hasta que el pin quede justo sobre el lugar.", myLocation: "Usar mi ubicación", use: "Listo" },
  limits: {
    requiredMissing: "Para guardar falta: {{fields}}.", fieldsTooLong: "Hay textos demasiado largos. Acórtalos para poder guardar.",
    tooLong_one: "Quita {{count}} carácter: el máximo es {{max}}.",
    tooLong_other: "Quita {{count}} caracteres: el máximo es {{max}}.",
    slugLength: "El enlace debe tener entre 3 y 80 caracteres.",
    slugPattern: "Usa solo minúsculas, números y guiones sueltos, sin guion al inicio ni al final.",
    userId: "Escribe un identificador de usuario válido (formato UUID)."
  },
  nav: { label: "Secciones del panel" },
  dest: { home: "Inicio", guests: "Invitados", gifts: "Regalos", invitation: "Mi invitación", alerts: "Avisos", settings: "Ajustes" },
  tabs: { summary: "Resumen", guests: "Quién viene", report: "Respuestas", requests: "Acompañantes", gifts: "Mi lista", giftInbox: "Reservas", editor: "Contenido", gallery: "Galería", translations: "Idiomas", templates: "Estilo", preview: "Vista previa", notifications: "Bandeja", preferences: "Preferencias", publish: "Publicar", settings: "Configuración", modes: "Modos de control", celebrations: "Mis celebraciones", organizations: "Equipo", label: "Pestañas de la sección" },
  picker: { title: "Mis celebraciones", intro: "Cada celebración tiene su invitación, sus invitados y sus regalos.", emptyTitle: "Aquí vivirán tus celebraciones", emptyBody: "Crea la primera en tres pasos y mira cómo se ve antes de compartirla.", create: "Crear celebración", open: "Abrir {{title}}", untitled: "Sin título", noDate: "Sin fecha todavía", status: { DRAFT: "Borrador", PUBLISHED: "Publicada", ARCHIVED: "Archivada" } },
  onboarding: {
    joinNames: "{{first}} y {{second}}",
    title: "Crea tu invitación", intro: "Tres pasos cortos y tu invitación ya tiene su enlace.",
    step: "Paso {{step}} de 3", stepLabels: { type: "Qué celebras", who: "Quién, cuándo y dónde", name: "Nombre y enlace" }, progress: "Tus pasos",
    typeLabel: "Elige una opción",
    typeTitle: "¿Qué vas a celebrar?", typeHelp: "Con esto preparamos los textos y las secciones que mejor le quedan.",
    whoTitle: "¿Quiénes son, cuándo y dónde es?", hostsHelp: "Escribe los nombres como quieres que se lean en la invitación.",
    dateLabel: "Fecha", timeLabel: "Hora", venuePlaceholder: "Salón Las Palmas", dateHelp: "Con estos datos tu invitación queda lista para publicar. Podrás cambiarlos cuando quieras.",
    nameTitle: "Ponle nombre y enlace", titleLabel: "Nombre de la celebración", titlePlaceholder: "Ana y Luis", titleHelp: "Es lo primero que verán tus invitados.",
    slugLabel: "Enlace de tu invitación", slugHelp: "Así lo recibirán tus invitados: {{url}}. Solo minúsculas, números y guiones.",
    defaultsSummary: "Ya lo dejamos listo: hora de {{timeZone}}, {{language}} y {{currency}}.",
    timeZoneLabel: "Zona horaria del evento", timeZoneHelp: "Tus invitados verán las horas en esta zona, estén donde estén.", languageLabel: "Idioma principal", currencyLabel: "Moneda",
    titleRequired: "Escribe el nombre de tu celebración.", dateInvalid: "Elige la fecha.", timeInvalid: "Elige la hora.", required: "Completa este campo.", requiredNotice: "Completa los datos marcados para continuar.", slugRequired: "Escribe el enlace de tu invitación.",
    previewTitle: "Así va quedando", previewHint: "Cambia mientras escribes.", previewShow: "Ver cómo queda", previewHide: "Ocultar", previewFallbackTitle: "Tu celebración",
    create: "Crear mi invitación", readyTitle: "Tu invitación está lista", readyBody: "Por ahora es un borrador: solo tú la ves. Completa lo que falta y publícala cuando quieras.",
    finish: "Completar mi invitación", chooseStyle: "Elegir otro estilo"
  },
  editor: {
    title: "Tu invitación", intro: "Completa cada parte a tu ritmo y mira cómo queda sin salir de aquí.",
    progress: "{{done}} de {{total}} partes listas", list: "Partes de tu invitación", status: { ready: "Lista", missing: "Falta algo", optional: "Opcional" },
    save: "Guardar cambios", dirty: "Tienes cambios sin guardar.", viewPreview: "Ver cómo queda", previewTitle: "Así la ven tus invitados", closePreview: "Cerrar vista previa", previewDraftNote: "Incluye lo que escribiste, aunque aún no lo hayas guardado.",
    sections: { general: "Lo básico", hosts: "Quiénes", venues: "Dónde", story: "Historia", schedule: "Programa", sections: "Más detalles" },
    about: { general: "Lo primero que ven tus invitados.", anfitriones: "Los nombres que aparecen en la invitación.", lugares: "Dónde será: ceremonia, recepción u otro lugar.", historia: "Cuenta cómo empezó todo.", itinerario: "Qué pasa y a qué hora.", secciones: "Vestimenta, preguntas frecuentes y recomendaciones." },
    general: { slug: "Enlace de tu invitación", slugLocked: "El enlace ya no se puede cambiar porque la invitación se publicó o se archivó.", title: "Nombre de la celebración", subtitle: "Frase de bienvenida", eventDate: "Fecha", eventTime: "Hora", venueName: "Ubicación", extraField: "Dato adicional: {{field}}" },
    hosts: { help: "Los roles salen del tipo de evento: {{eventType}}." },
    venues: { name: "Nombre del lugar", address: "Dirección", kind: "Tipo", kinds: { ceremony: "Ceremonia", reception: "Recepción", other: "Otro" }, add: "Agregar lugar", item: "Lugar {{n}}" },
    story: { label: "Su historia", help: "Separa los párrafos con una línea en blanco." },
    schedule: { title: "Actividad", date: "Fecha", time: "Hora", description: "Detalle", add: "Agregar actividad", item: "Actividad {{n}}", zoneHelp: "Es la hora local del evento ({{timeZone}})." },
    extra: { dressCode: "Código de vestimenta", faq: "Preguntas frecuentes", question: "Pregunta", answer: "Respuesta", addFaq: "Agregar pregunta", recommendations: "Recomendaciones", recommendationName: "Nombre", recommendationDescription: "Descripción", recommendationKind: "Tipo", kinds: { lodging: "Hospedaje", transport: "Transporte", other: "Otra" }, listingId: "Código de partner (opcional)", listingHelp: "Si es un partner, su enlace pasa por nuestro redirector.", addRecommendation: "Agregar recomendación", item: "Elemento {{n}}" }
  },
  gallery: {
    title: "Tus fotos", intro: "La primera es la portada. Puedes cambiarla cuando quieras.", help: "JPG, PNG o WebP, de hasta 10 MB cada una.",
    add: "Agregar foto", uploading: "Subiendo {{name}}… {{percent}} %", cover: "Portada", makeCover: "Usar como portada", delete: "Eliminar",
    emptyTitle: "Aquí van las fotos de su historia", emptyBody: "Sube la primera y será la portada de tu invitación.", loadFailedTitle: "No pudimos cargar tus fotos",
    deleteTitle: "¿Eliminar esta foto?", deleteBody: "Se quita de tu invitación y no se puede deshacer.", deleted: "Foto eliminada.", orderSaved: "Orden guardado.",
    photo: "Foto {{n}}", invalidType: "Ese archivo no es una imagen JPG, PNG o WebP.", tooLarge: "La imagen supera los 10 MB. Prueba con una más liviana.", failed: "No pudimos subir {{name}}. Inténtalo de nuevo."
  },
  translations: {
    title: "Idiomas", intro: "Escribe tu invitación en cada idioma. Lo que no traduzcas se muestra en el idioma principal.",
    language: "Idioma", addLanguage: "Agregar idioma", emptyTitle: "Tu invitación habla un solo idioma", emptyBody: "Agrega otro y escribe aquí cómo se lee en él.", loadFailedTitle: "No pudimos cargar tus idiomas",
    progress: "{{done}} de {{total}} textos traducidos", original: "Original: {{text}}",
    fields: { title: "Nombre", subtitle: "Frase de bienvenida", story: "Historia", dressCode: "Código de vestimenta" }, faqItem: "Pregunta {{n}}", scheduleItem: "Actividad {{n}}"
  },
  templates: {
    title: "Elige el estilo", intro: "Toca uno y míralo al instante con tus datos.", current: "En uso", apply: "Usar este estilo",
    applied: "Listo, tu invitación ahora usa {{name}}.", preserved: "Cambiar de estilo no borra nada de lo que escribiste.", emptyTitle: "Aún no hay estilos para este tipo de evento", emptyBody: "Mientras tanto tu invitación usa el diseño básico. Vuelve en unos días.",
    loadFailedTitle: "No pudimos cargar los estilos", preview: "Vista previa de {{name}}", list: "Estilos disponibles", seeFull: "Verlo a tamaño real"
  },
  preview: {
    title: "Vista previa", intro: "Así ven tu invitación en cada pantalla.", devices: { mobile: "Móvil", tablet: "Tableta", desktop: "Escritorio" }, device: "Tamaño", frame: "Vista previa de tu invitación",
    openPublic: "Abrir mi invitación publicada", templateFallback: "Mientras tanto usamos el diseño básico, no el estilo que elegiste.", notPublished: "Aún no está publicada: así la verán cuando la publiques.", changeStyle: "Cambiar estilo"
  },
  publish: {
    title: "Publicar", intro: "Completa lo que falta, publica y comparte el enlace.", ready: "Tu celebración está lista para publicar.", readyBody: "Todo lo necesario está completo. Publícala cuando quieras.", missing: "Antes de publicar, completa:", pending: "Datos pendientes: {{count}}",
    fields: { title: "El nombre de la celebración", subtitle: "La frase de bienvenida", eventDate: "La fecha del evento", venueName: "La ubicación", childName: "El nombre de quien se bautiza", companyName: "El nombre de la empresa", celebrantName: "El nombre de la celebrante", host: "El nombre de: {{role}}", other: "El dato «{{field}}»" },
    goTo: "Completar", publish: "Publicar celebración", publishConfirm: "Tu invitación será visible para cualquiera que tenga el enlace. ¿Publicar ahora?",
    done: { title: "Tu invitación ya está publicada", body: "Comparte el enlace y mañana sabrás quién viene." },
    unpublish: "Despublicar", unpublishConfirm: "El sitio dejará de verse hasta que lo publiques otra vez. El enlace no cambia.", reasonLabel: "Motivo (opcional)",
    archive: "Archivar", archiveConfirm: "Archivar es definitivo: la celebración ya no se podrá publicar ni editar.", more: "Más opciones",
    status: { DRAFT: "Borrador: solo tú la ves.", PUBLISHED: "Publicada: cualquiera con el enlace la ve.", ARCHIVED: "Archivada." },
    share: "Comparte el enlace", link: "Enlace público", copy: "Copiar enlace", copied: "Enlace copiado.", whatsappPreview: "Así se verá en WhatsApp"
  },
  settings: {
    title: "Configuración", intro: "Idiomas y fecha límite de tu celebración.", general: "Idiomas", saved: "Configuración guardada.", languages: "Idiomas del sitio", defaultLanguage: "Idioma principal", timeZone: "Zona horaria", currency: "Moneda", more: "Más opciones", format: "Hora y moneda", formatHelp: "Ya vienen con lo habitual de tu zona. Cámbialas solo si tu celebración es en otro lugar.",
    deadline: { label: "Fecha límite para confirmar", date: "Fecha", time: "Hora", help: "Hora local del evento ({{timeZone}}).", none: "Sin fecha límite: tus invitados responden cuando quieran.", clear: "Quitar fecha límite",
      past: "Esa fecha ya pasó: tus invitados ya no podrán responder ni cambiar su respuesta.", effect: "Tus invitados podrán responder hasta el {{date}} ({{zone}})." }
  },
  settingsExtra: {
    eventType: { label: "Tipo de celebración", help: "Cambiarlo cambia los anfitriones y los datos que se piden para publicar. Tu contenido se conserva.", locked: "El tipo solo se puede cambiar mientras la celebración es un borrador.", save: "Cambiar tipo" },
    team: { title: "Equipo", help: "Personas con acceso a esta celebración. Un coanfitrión puede editar; quien tiene solo lectura únicamente consulta.", empty: "Por ahora solo tú tienes acceso.",
      roles: { CO_HOST: "Coanfitrión", VIEWER: "Solo lectura" }, userId: "Identificador de la persona (UUID)", role: "Permiso", add: "Dar acceso", remove: "Quitar acceso", removeTitle: "Quitar acceso", removeBody: "Esta persona dejará de ver tu celebración.", added: "Acceso guardado.", removed: "Acceso quitado." },
    audit: { title: "Historial de cambios", empty: "Todavía no hay cambios registrados.", item: "{{action}} · {{at}}",
      actions: { CREATED: "Creaste la celebración", TYPE_ASSIGNED: "Cambió el tipo de celebración", CONFIGURED: "Se actualizó el contenido", SETTINGS_UPDATED: "Se actualizó la configuración", PUBLISHED: "Se publicó", UNPUBLISHED: "Se despublicó", ARCHIVED: "Se archivó", TEMPLATE_SELECTED: "Se eligió una plantilla", other: "Cambio en la celebración" } }
  },
  modes: {
    title: "Modos de control", intro: "Elige qué se aprueba solo y qué pasa por ti.", help: "Puedes cambiarlo cuando quieras.",
    nonRetroactive: "El cambio aplica a lo nuevo. Lo que ya espera tu respuesta sigue esperando.",
    values: { AUTO_ACCEPT: "Automático", RESTRICTED: "Con mi revisión" }, current: "Ahora: {{value}}",
    confirmTitle: "Cambiar a «{{value}}»", confirm: "Sí, cambiar", change: "Cambiar a «{{value}}»",
    switches: {
      giftReservationMode: { label: "Reservas de regalos", AUTO_ACCEPT: "Cuando un invitado reserve un regalo, quedará comprometido al instante y nadie más podrá elegirlo.", RESTRICTED: "Cada reserva te llegará a Reservas y el regalo quedará apartado hasta que la apruebes o rechaces." },
      unregisteredRsvpMode: { label: "Confirmaciones de personas sin invitación", AUTO_ACCEPT: "Cualquier persona con el enlace podrá confirmar su asistencia sin estar en tu lista.", RESTRICTED: "Solo podrán confirmar las personas de tu lista de invitados." },
      extraCompanionMode: { label: "Acompañantes de más", AUTO_ACCEPT: "Si un invitado pide más acompañantes de los que le diste, se aprobarán solos.", RESTRICTED: "Los acompañantes de más quedarán pendientes hasta que los apruebes." },
      externalGiftMode: { label: "Regalos de tienda", AUTO_ACCEPT: "Los regalos de tienda que se propongan aparecerán en la lista sin revisión.", RESTRICTED: "Los regalos de tienda que se propongan esperarán tu aprobación antes de aparecer." }
    },
    saved: "Modo actualizado.",
    partnerPriority: { enable: "Activar", disable: "Desactivar", label: "Primero los aliados", help: "Los regalos de proveedores verificados se muestran primero en tu lista, y al agregar un regalo de tienda te sugerimos opciones de aliados.", on: "Activado", off: "Desactivado" }
  }
} as const;
