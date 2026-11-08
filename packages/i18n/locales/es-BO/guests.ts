/** Inicio, invitados, respuestas, solicitudes de acompañantes y avisos del anfitrión (F16–F18). Voz del brief: tuteo, frases cortas, sin exclamaciones en errores. */
export const guestsEsBO = {
  more: "Más opciones",
  loading: "Cargando…",
  errors: {
    invalid: "Revisa este dato y vuelve a intentarlo.", invalidField: { name: "Revisa este dato: el nombre debe tener entre 1 y 200 caracteres.", email: "Revisa este dato: escribe un correo válido.", phone: "Revisa este dato: escribe el teléfono con código de país.", contact: "Revisa este dato: falta un correo o un teléfono.", allowedCompanions: "Revisa este dato: los acompañantes son un número entero, de 0 en adelante.", groupId: "Revisa este dato: ese grupo ya no existe.", locale: "Revisa este dato: el idioma no es válido.", retentionDays: "Revisa este dato: los días van de 1 a 36500.", csv: "Revisa este dato: el archivo no tiene el formato esperado." },
    rateLimited: "Hay demasiadas solicitudes seguidas. Espera un momento y vuelve a intentarlo.",
    rateLimitedWait: "Hay demasiadas solicitudes seguidas. Vuelve a intentarlo en {{seconds}} s.",
    unavailable: "El servicio no está disponible por ahora. Lo que escribiste sigue aquí: inténtalo de nuevo en unos minutos.",
    offline: "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo; lo que escribiste sigue aquí."
  },
  status: { PENDING: "Sin responder", CONFIRMED: "Confirmó", DECLINED: "No asistirá" },
  fresh: {
    updated: "Actualizado {{date}}", never: "Aún no hay datos procesados.",
    lag_one: "Los últimos cambios pueden tardar unos segundos en verse ({{count}} por procesar).",
    lag_other: "Los últimos cambios pueden tardar unos segundos en verse ({{count}} por procesar).",
    stale: "Hay cambios sin reflejar desde hace {{seconds}} s. Los números se pondrán al día solos.", refresh: "Actualizar"
  },
  summary: {
    title: "Tu celebración", intro: "Invitas hoy. Mañana sabes quién viene.",
    progressTitle: "Cómo vas",
    confirmed: "Confirmados", pending: "Sin responder", declined: "No asisten", companions: "Acompañantes", total: "Invitados",
    steps: {
      published: "Invitación publicada", publishedDone: "Tus invitados ya pueden abrirla", publishedTodo: "Todavía es un borrador",
      guests: "Invitados en tu lista", guestsNone: "Aún no hay nadie", guestsSome: "Ya puedes darles su enlace",
      answers: "Respuestas", answersNone: "Cuando agregues invitados verás aquí quién responde", answersSome: "{{answered}} de {{total}} ya respondieron"
    },
    next: {
      publish: { title: "Publica tu invitación", body: "Sin publicar, tus invitados no pueden abrirla ni responder.", action: "Publicar" },
      finish: { title: "Termina tu invitación", body_one: "Falta completar {{count}} dato para poder publicarla.", body_other: "Faltan completar {{count}} datos para poder publicarla.", action: "Completar" },
      addGuests: { title: "Aquí verás quién viene", body: "Agrega a las primeras personas y mándales su enlace. Sus respuestas aparecen aquí.", action: "Agregar invitados" },
      requests: { title_one: "Revisa {{count}} solicitud", title_other: "Revisa {{count}} solicitudes", body: "Invitados que piden traer a más personas de las permitidas.", action: "Revisar solicitudes" },
      gifts: { title_one: "Revisa {{count}} reserva de regalo", title_other: "Revisa {{count}} reservas de regalo", body: "Alguien quiere regalarte algo y espera tu respuesta.", action: "Ver reservas" },
      pending: { title_one: "Falta {{count}} persona por responder", title_other: "Faltan {{count}} personas por responder", body: "Revisa quién no contestó y dale su enlace de nuevo.", action: "Ver quién falta" },
      done: { title: "Ya respondieron todos", body: "Tu lista está completa. Cuando algo cambie, te avisamos aquí." }
    },
    viewGuests: "Ver quién viene",
    firstReply: { title: "Llegó tu primera respuesta", body: "Así empieza: cada toque de un invitado aparece aquí al instante." },
    welcome: { title: "Aquí verás quién viene", body: "Agrega a tus primeros invitados y comparte su enlace personal. Ellos responden en un toque.", action: "Agregar invitados" },
    allDone: "Todo al día",
    daysToDeadline_one: "Queda {{count}} día para cerrar las respuestas", daysToDeadline_other: "Quedan {{count}} días para cerrar las respuestas",
    deadlineToday: "Las respuestas cierran hoy", deadlinePassed: "Las respuestas ya cerraron", noDeadline: "Sin fecha límite de respuesta",
    openRequests_one: "{{count}} solicitud de acompañantes por revisar", openRequests_other: "{{count}} solicitudes de acompañantes por revisar"
  },
  list: {
    title: "Quién viene", intro: "Tu lista de invitados, con su respuesta al lado.", search: "Buscar por nombre o correo", filterLabel: "Filtrar por respuesta", all: "Todos",
    emptyTitle: "Aquí verás quién viene", empty: "Agrega a las primeras personas y mándales su enlace. Sus respuestas aparecen aquí.", appearing: "Apareciendo…", emptyFilteredTitle: "No hay coincidencias", emptyFiltered: "No encontramos a nadie con esa búsqueda. Prueba con otro nombre o correo.",
    add: "Agregar invitado", import: "Importar CSV", groups: "Grupos", page: "Mostrando {{from}}–{{to}} de {{total}}", prev: "Anterior", next: "Siguiente",
    companions: "Acompañantes permitidos: {{count}}", open: "Abrir a {{name}}", retry: "Reintentar", settings: "Ajustes de invitados", groupFilter: "Filtrar por grupo", allGroups: "Todos los grupos"
  },
  form: {
    title: "Agregar invitado", intro: "Con un correo o un teléfono basta.", name: "Nombre", email: "Correo electrónico", emailHelp: "Se usa para enviarle su invitación.", companions: "Acompañantes permitidos", companionsHelp: "Cuántas personas más puede traer sin pedir aprobación.",
    duplicateTitle: "¿Agregar de todos modos?", duplicateBody: "Ya hay un invitado con este mismo contacto: {{name}}. Si lo agregas, tendrás dos fichas y dos enlaces distintos.", duplicateConfirm: "Agregar de todos modos",
    group: "Grupo familiar", noGroup: "Sin grupo", save: "Agregar a mi lista", saving: "Agregando…", saved: "{{name}} ya está en tu lista.", savedDetail: "Puede tardar unos segundos en verse en la lista. Escribe al siguiente cuando quieras.", back: "Volver a la lista",
    firstTitle: "Ya tienes a tu primer invitado", firstBody: "Ahora dale su enlace personal para que responda en un toque.", firstAction: "Ver mi lista",
    phone: "Teléfono (WhatsApp)", phoneHelp: "Opcional si escribes un correo. Con código de país.",
    errors: { contact: "Escribe un correo o un teléfono.", phone: "Escribe el teléfono con código de país, por ejemplo +59171234567.", companions: "Escribe un número entero, de 0 en adelante.", tooLong: "El texto es demasiado largo.", required: "Este campo es obligatorio.", email: "Escribe un correo válido, por ejemplo nombre@correo.com." }
  },
  import: {
    title: "Importar invitados", intro: "Trae tu lista de una vez desde un archivo CSV.", steps: "La primera fila del archivo debe ser:", header: "name,email,phone,locale,allowedCompanions,groupId",
    headerNote: "groupId es opcional. Cada fila necesita un correo o un teléfono con código de país. Hasta 1000 filas: las filas válidas entran aunque otras tengan errores.", csvLabel: "O pega aquí el contenido del CSV", chooseFile: "Elegir archivo CSV",
    run: "Importar", running: "Importando…", empty: "Pega o elige un CSV primero.", fileTooBig: "El archivo supera 1 MB.", tooManyRows: "El CSV tiene más de 1000 filas. Divídelo en archivos más pequeños.", result: "Resultado de la importación",
    fields: { name: "nombre", email: "correo", phone: "teléfono", contact: "contacto", csv: "archivo", locale: "idioma", allowedCompanions: "acompañantes", groupId: "grupo" }, reasons: { email: "El correo no es válido.", contact: "Falta un correo o un teléfono.", header: "La primera fila no tiene el formato esperado.", name: "Falta el nombre o es demasiado largo (1 a 200 caracteres).", phone: "El teléfono necesita el código de país, por ejemplo +59171234567.", locale: "El idioma no es válido.", companions: "Los acompañantes son un número entero, de 0 en adelante.", group: "Ese grupo no existe.", other: "Revisa esta fila." },
    summary: "{{imported}} importados, {{failed}} con error, de {{total}} filas.", errorsTitle: "Filas que revisar", line: "Línea {{line}}", field: "Campo: {{field}}",
    celebrateTitle: "Tu lista creció", celebrateBody: "Ya puedes darle su enlace a cada invitado.", again: "Importar otro archivo", viewList: "Ver invitados"
  },
  groups: {
    title: "Grupos familiares", intro: "Agrupa a quienes vienen juntos y filtra tu lista por grupo.", name: "Nombre del grupo", create: "Crear grupo", creating: "Creando…", created: "Grupo «{{name}}» creado.",
    emptyTitle: "Aún no hay grupos", empty: "Crea uno y asígnalo al agregar a cada invitado.", members: "{{count}} integrantes", limit: "Para cambiar a alguien de grupo, abre su ficha."
  },
  detail: {
    title: "Invitado", intro: "Su respuesta, su enlace y su grupo.", groupTitle: "Grupo familiar", groupNone: "Sin grupo", groupSaved: "Grupo actualizado.", phone: "Teléfono", email: "Correo", companions: "Acompañantes permitidos", locale: "Idioma", group: "Grupo", consent: "Consentimiento dado el {{date}}", missing: "No encontramos a este invitado.",
    erase: {
      title: "Eliminar invitado", intro: "Borra a este invitado, su enlace y sus respuestas de esta celebración. No se puede deshacer.",
      action: "Eliminar invitado", confirmTitle: "¿Eliminar a {{name}}?", confirmBody: "Se borran sus datos personales, su enlace y sus respuestas. Los avisos y reportes dejarán de incluirlo. Esta acción no se puede deshacer.", confirm: "Eliminar para siempre"
    },
    link: {
      title: "Su enlace personal", intro: "Cada invitado responde con un enlace único. No lo mostramos completo para que nadie lo vea de reojo.",
      none: "Todavía no tiene enlace. Genera uno y envíaselo.", issue: "Generar y copiar enlace", reissue: "Reemitir enlace", revoke: "Revocar enlace", manage: "Reemitir o revocar el enlace", copy: "Copiar enlace", copied: "Enlace copiado.", copyFailed: "No pudimos copiar. Usa Compartir.",
      readyTitle: "Enlace listo para {{name}}", readyBody: "Cópialo o compártelo: con un toque, responde.",
      share: "Compartir", shareTitle: "Tu invitación", shareText: "Te invitamos a {{title}}. Confirma tu asistencia aquí:", masked: "Enlace: {{value}}", expires: "Vence el {{date}}",
      once: "Por seguridad, el enlace completo solo existe en esta pantalla mientras no la cierres. Si lo pierdes, reemítelo.",
      revokeTitle: "¿Revocar este enlace?", revokeBody: "El invitado dejará de poder abrirlo de inmediato. Puedes generar uno nuevo cuando quieras.", reissueTitle: "¿Reemitir el enlace?", reissueBody: "El enlace anterior dejará de funcionar y se generará uno nuevo.", revoked: "Enlace revocado."
    }
  },
  settings: {
    title: "Ajustes de invitados", intro: "Cuántos acompañantes se permiten por defecto y cuánto tiempo guardamos los datos.", save: "Guardar",
    defaultsTitle: "Acompañantes por defecto", defaultsIntro: "Cuántos acompañantes se permiten a cada invitado nuevo. Puedes cambiarlo en cada ficha al agregar.", defaultCompanions: "Acompañantes por defecto", defaultCompanionsHelp: "Un número entero, de 0 en adelante.", defaultsSaved: "Guardado: {{count}} acompañantes por defecto.",
    retentionTitle: "Conservación de datos", retentionIntro: "Después de este plazo, contado desde el registro de cada invitado, sus datos personales se eliminan.", retentionCurrent: "Los datos se conservan {{count}} días desde el registro.", retentionNone: "Sin plazo definido: los datos se conservan hasta que los elimines.",
    retentionDays: "Días de conservación", retentionHelp: "De 1 a 36500. Déjalo vacío para no definir un plazo.", retentionInvalid: "Escribe un número entero entre 1 y 36500.", retentionSaved: "Plazo de conservación guardado.", retentionClear: "Quitar el plazo",
    retentionConfirmTitle: "¿Guardar este plazo?", retentionConfirmBody: "Los datos de cada invitado se eliminarán {{count}} días después de su registro. Esto no se puede deshacer.", clearTitle: "¿Quitar el plazo?", clearBody: "Los datos de los invitados se conservarán hasta que los elimines tú."
  },
  report: {
    title: "Respuestas", intro: "Quién respondió, con cuántos viene y qué necesita.", filterLabel: "Filtrar por respuesta", export: "Exportar CSV", exporting: "Preparando…", exported: "Archivo {{name}} listo.", exportFailed: "No pudimos preparar el archivo. Inténtalo de nuevo.", exportCatering: "Exportar para el catering", exportCateringNote: "El archivo del catering no lleva nombres ni contactos, solo dietas y número de personas.",
    emptyTitle: "Aquí aparecerán las respuestas", empty: "Cuando tus invitados contesten, verás cuántos vienen, sus dietas y sus mensajes.", emptyFiltered: "Nadie ha dado esa respuesta todavía.", dietary: "Dieta: {{value}}", message: "Mensaje: {{value}}", requested: "Pidió {{requested}} · aprobados {{approved}}",
    requestsLink_one: "Tienes {{count}} solicitud de acompañantes por revisar", requestsLink_other: "Tienes {{count}} solicitudes de acompañantes por revisar", requestsAction: "Revisar solicitudes",
    columns: { name: "Nombre", email: "Correo", phone: "Teléfono", guestKey: "Clave del invitado", group: "Grupo", partySize: "Personas", status: "Respuesta", allowed: "Acompañantes permitidos", requested: "Acompañantes pedidos", approved: "Acompañantes aprobados", dietary: "Restricciones alimentarias", message: "Mensaje" }
  },
  requests: {
    title: "Solicitudes de acompañantes", intro: "Invitados que piden traer a más personas de las permitidas.", emptyTitle: "Todo al día", empty: "Cuando alguien pida traer a más gente, aparecerá aquí para que lo apruebes con un toque. Las que ya resolviste no quedan guardadas en una lista.",
    ask: "Pidió {{requested}} acompañantes (permitidos: {{allowed}})", guest: "Invitado", approve: "Aprobar", reject: "Rechazar", approving: "Aprobando…", rejecting: "Rechazando…",
    approved: "Solicitud aprobada.", rejected: "Solicitud rechazada.", stale: "Esta solicitud ya estaba resuelta o cambió. Actualizamos la lista.", open: "Abrir invitado"
  },
  notifications: {
    title: "Bandeja", intro: "Lo que necesita tu atención en esta celebración.", emptyTitle: "Tu bandeja está tranquila", empty: "Aquí llegan las solicitudes y las respuestas que necesitan tu atención.", unread: "Sin leer", read: "Leído",
    markRead: "Marcar como leído", markAll: "Marcar todos como leídos", unreadCount: "{{count}} sin leer", open: "Abrir", refresh: "Actualizar", markFailed: "No se pudo marcar como leído; volvimos al estado anterior.",
    channel: { EMAIL: "Correo", SMS: "SMS", WHATSAPP: "WhatsApp", PUSH: "Notificación push", INBOX: "Bandeja" },
    delivery: { PENDING: "En cola", SENDING: "Enviando", SENT: "Enviado", DEFERRED: "Pospuesto", SUPPRESSED: "Omitido según tus preferencias", FAILED: "No se pudo enviar", UNCERTAIN: "Sin confirmar", CANCELLED: "Cancelado", RETRY: "Reintentando" },
    templates: {
      companionRequested: { subject: "Solicitud de acompañantes", text: "Un invitado pide traer a más personas. Apruébalo o recházalo desde tu panel." },
      giftRequested: { subject: "Solicitud de regalo", text: "Alguien quiere reservar un regalo. Revísalo desde tu panel." },
      leadCapReached: { subject: "Límite de contactos alcanzado", text: "Alcanzaste el límite de contactos configurado. Revisa los detalles en tu panel." },
      celebrationPublished: { subject: "Celebración publicada", text: "Tu invitación ya está publicada. Puedes ver su estado en tu panel." },
      pushTest: { subject: "Prueba de aviso", text: "Estamos comprobando que este dispositivo recibe avisos." },
      hostRsvpConfirmed: { subject: "Un invitado confirmó", text: "Alguien confirmó que viene. Mira el detalle en Respuestas." },
      hostRsvpDeclined: { subject: "Un invitado no podrá asistir", text: "Alguien respondió que no asistirá. Mira el detalle en Respuestas." },
      hostRsvpChanged: { subject: "Un invitado cambió su respuesta", text: "Alguien actualizó su respuesta. Mira el detalle en Respuestas." }
    },
    via: "Por {{channel}} · {{status}} · {{date}}", viewedAt: "{{date}}"
  },
  preferences: {
    title: "Cómo quieres enterarte", intro: "Elige por dónde llegan los avisos. Los respetamos al enviarlos.", channelsTitle: "Canales",
    EMAIL: "Correo electrónico", SMS: "SMS", WHATSAPP: "WhatsApp", PUSH: "Notificaciones push", saved: "Preferencia guardada.", saveFailed: "No se pudo guardar; volvimos al valor anterior.", on: "Activado", off: "Desactivado",
    quietTitle: "Horario de silencio", quietIntro: "Durante este horario, en la hora de tu celebración, los avisos esperan y llegan al terminar. No se pierden.", quietStart: "Desde (hora, 0–23)", quietEnd: "Hasta (hora, 0–23)", quietSave: "Guardar horario", quietDefault: "Usar el horario del servicio", quietCurrent: "Silencio de {{start}}:00 a {{end}}:00", quietOff: "Sin horario de silencio", quietSourceDefault: "Horario del servicio", quietSourceMine: "Horario tuyo", quietInvalid: "Escribe horas enteras entre 0 y 23.", eventsTitle: "Qué avisos quieres", eventsIntro: "Los que no cambies siguen activados.", event: { celebrationPublished: "Mi celebración se publicó", companionRequested: "Un invitado pide más acompañantes", giftRequested: "Alguien pide reservar un regalo", leadCapReached: "Un proveedor alcanzó su tope de consultas" }, pushSetup: "Configurar avisos en este dispositivo"
  },
  push: {
    title: "Avisos en este dispositivo", intro: "Te avisamos cuando alguien confirme o pida acompañantes. Puedes apagarlos cuando quieras en Preferencias.",
    enable: "Activar avisos push", registering: "Activando…", enabled: "Este dispositivo recibirá avisos push.", denied: "Los avisos están bloqueados. Actívalos en los ajustes del sistema para esta app.", openSettings: "Abrir ajustes",
    unsupported: "Los avisos push necesitan un teléfono real con la app instalada. Este entorno no los admite.", failed: "No pudimos activar los avisos. Inténtalo de nuevo.", noProject: "Falta configurar el proyecto de notificaciones de la app.", disable: "Quitar este dispositivo", preferences: "Preferencias de avisos",
    advanced: "Dispositivos y envíos",
    state: { ready: "Avisos al instante", enabled: "Este teléfono ya recibe avisos", denied: "Los avisos están apagados", unsupported: "Aquí no hay avisos push" },
    devicesTitle: "Dispositivos registrados", devicesEmpty: "Todavía no hay dispositivos registrados para recibir avisos push.", platform: { ios: "iPhone", android: "Android" },
    deviceStatus: { ACTIVE: "Activo", REVOKED: "Quitado", INVALID: "Inválido" }, registeredOn: "registrado el {{date}}", inactiveReason: "Este dispositivo ya no recibe avisos; vuelve a activarlo desde el teléfono.",
    test: "Enviar aviso de prueba", testQueued: "Aviso de prueba en camino.", removeTitle: "¿Quitar este dispositivo?", removeBody: "Dejará de recibir avisos push de esta celebración. Puedes activarlo otra vez desde el teléfono.",
    deliveriesTitle: "Envíos recientes", deliveriesIntro: "Qué pasó con cada aviso push enviado a tus dispositivos.", deliveriesEmpty: "Todavía no se envió ningún aviso push.",
    delivery: { PENDING: "En cola", SENDING: "Enviando", TICKETED: "Entregado al servicio de push", ACCEPTED: "Aceptado por el dispositivo", RETRY: "Reintentando", FAILED: "No se pudo enviar", UNCERTAIN: "Sin confirmar", DEFERRED: "Pospuesto", SUPPRESSED: "Omitido según tus preferencias", CANCELLED: "Cancelado" },
    attempts: "{{count}} intentos · disponible desde {{date}}", lastError: "Detalle: {{detail}}"
  }
} as const;
