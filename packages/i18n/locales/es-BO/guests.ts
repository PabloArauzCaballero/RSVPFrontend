/** Gestión de invitados, resumen RSVP, solicitudes de acompañantes y avisos del anfitrión (F16–F18). */
export const guestsEsBO = {
  errors: {
    rateLimited: "Hay demasiadas solicitudes seguidas. Espera un momento e inténtalo de nuevo.",
    rateLimitedWait: "Hay demasiadas solicitudes seguidas. Vuelve a intentarlo en {{seconds}} s.",
    unavailable: "El servicio no está disponible por ahora. Tus datos siguen aquí: inténtalo de nuevo en unos minutos.",
    offline: "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo; tus datos siguen aquí."
  },
  nav: { summary: "Resumen", guests: "Invitados", report: "Reporte RSVP", requests: "Acompañantes", notifications: "Avisos", preferences: "Preferencias de avisos" },
  status: { PENDING: "Sin responder", CONFIRMED: "Confirmó", DECLINED: "No asistirá" },
  fresh: {
    updated: "Actualizado {{date}}", never: "Aún no hay datos procesados.",
    lag: "Los datos pueden tardar unos segundos en reflejar los últimos cambios ({{count}} pendientes de procesar).",
    stale: "Hay cambios sin reflejar desde hace {{seconds}} s. Los números se pondrán al día solos.", refresh: "Actualizar"
  },
  list: {
    title: "Invitados", search: "Buscar por nombre o correo", filterLabel: "Filtrar por respuesta", all: "Todos",
    empty: "Todavía no hay invitados. Agrega el primero o importa tu lista desde un CSV.", emptyFiltered: "Ningún invitado coincide con esta búsqueda.",
    add: "Agregar invitado", import: "Importar CSV", groups: "Grupos", page: "Mostrando {{from}}–{{to}} de {{total}}", prev: "Anterior", next: "Siguiente",
    companions: "Acompañantes permitidos: {{count}}", open: "Abrir a {{name}}", retry: "Reintentar", settings: "Ajustes de invitados", groupFilter: "Filtrar por grupo", allGroups: "Todos los grupos"
  },
  form: {
    title: "Agregar invitado", name: "Nombre", email: "Correo electrónico", emailHelp: "Se usa para enviarle su invitación.", companions: "Acompañantes permitidos", companionsHelp: "Cuántas personas más puede traer sin pedir aprobación.",
    duplicateTitle: "¿Agregar de todos modos?", duplicateBody: "Ya hay un invitado con este mismo contacto: {{name}}. Si lo agregas, tendrás dos fichas y dos enlaces distintos.", duplicateConfirm: "Agregar de todos modos",
    group: "Grupo familiar", noGroup: "Sin grupo", save: "Guardar invitado", saving: "Guardando…", saved: "Invitado agregado.", another: "Agregar otro", back: "Volver a la lista",
    phone: "Teléfono (WhatsApp)", phoneHelp: "Opcional si escribes un correo. Con código de país.",
    errors: { contact: "Escribe un correo o un teléfono.", phone: "Escribe el teléfono con código de país, por ejemplo +59171234567.", companions: "Escribe un número entero, de 0 en adelante.", tooLong: "El texto es demasiado largo.", required: "Este campo es obligatorio.", email: "Escribe un correo válido, por ejemplo nombre@correo.com." }
  },
  import: {
    title: "Importar invitados", intro: "Pega el contenido de tu CSV o elige el archivo. La primera fila debe ser:", header: "name,email,phone,locale,allowedCompanions,groupId",
    headerNote: "groupId es opcional. Escribe al menos un correo o un teléfono (con código de país) por fila. Hasta 1000 filas. Las filas válidas se importan aunque otras tengan errores.", csvLabel: "Contenido del CSV", chooseFile: "Elegir archivo CSV",
    run: "Importar", running: "Importando…", empty: "Pega o elige un CSV primero.", fileTooBig: "El archivo supera 1 MB.", tooManyRows: "El CSV tiene más de 1000 filas. Divídelo en archivos más pequeños.", result: "Resultado de la importación",
    summary: "{{imported}} importados, {{failed}} con error, de {{total}} filas.", errorsTitle: "Filas con error", line: "Línea {{line}}", field: "Campo: {{field}}", none: "Todas las filas se importaron.", again: "Importar otro archivo", viewList: "Ver invitados"
  },
  groups: {
    title: "Grupos familiares", intro: "Agrupa a quienes viven juntos. Asigna el grupo al agregar a cada invitado.", name: "Nombre del grupo", create: "Crear grupo", creating: "Creando…", created: "Grupo «{{name}}» creado.",
    empty: "Todavía no hay grupos. Crea uno y asígnalo al agregar invitados.", members: "{{count}} integrantes", limit: "Para mover a un invitado de grupo, abre su ficha."
  },
  detail: {
    title: "Invitado", groupTitle: "Grupo familiar", groupNone: "Sin grupo", groupSaved: "Grupo actualizado.", phone: "Teléfono", email: "Correo", companions: "Acompañantes permitidos", locale: "Idioma", group: "Grupo", consent: "Consentimiento dado el {{date}}", missing: "No encontramos a este invitado.",
    erase: {
      title: "Eliminar invitado", intro: "Borra a este invitado, su enlace y sus respuestas de esta celebración. No se puede deshacer.",
      action: "Eliminar invitado", confirmTitle: "¿Eliminar a {{name}}?", confirmBody: "Se borran sus datos personales, su enlace y sus respuestas. Los avisos y reportes dejarán de incluirlo. Esta acción no se puede deshacer.", confirm: "Eliminar para siempre"
    },
    link: {
      title: "Enlace personal", intro: "Cada invitado tiene un enlace único. Cópialo o compártelo: no se muestra completo para que nadie lo vea en una pantalla compartida.",
      none: "Aún no generaste un enlace para este invitado.", issue: "Generar enlace", reissue: "Reemitir enlace", revoke: "Revocar enlace", copy: "Copiar enlace", copied: "Enlace copiado.", copyFailed: "No pudimos copiar. Usa Compartir.",
      share: "Compartir", shareTitle: "Tu invitación", shareText: "Te invitamos a {{title}}. Confirma tu asistencia aquí:", masked: "Enlace: {{value}}", expires: "Vence el {{date}}",
      once: "Por seguridad, el enlace completo solo existe en esta pantalla mientras no la cierres. Si lo pierdes, reemítelo.",
      revokeTitle: "¿Revocar este enlace?", revokeBody: "El invitado dejará de poder abrirlo de inmediato. Puedes generar uno nuevo cuando quieras.", reissueTitle: "¿Reemitir el enlace?", reissueBody: "El enlace anterior dejará de funcionar y se generará uno nuevo.", revoked: "Enlace revocado.", working: "Un momento…"
    }
  },
  settings: {
    title: "Ajustes de invitados", save: "Guardar",
    defaultsTitle: "Acompañantes por defecto", defaultsIntro: "Cuántos acompañantes se permiten a cada invitado nuevo. Puedes cambiarlo en cada ficha al agregar.", defaultCompanions: "Acompañantes por defecto", defaultCompanionsHelp: "Un número entero, de 0 en adelante.", defaultsSaved: "Guardado: {{count}} acompañantes por defecto.",
    retentionTitle: "Conservación de datos", retentionIntro: "Después de este plazo, contado desde el registro de cada invitado, sus datos personales se eliminan.", retentionCurrent: "Los datos se conservan {{count}} días desde el registro.", retentionNone: "Sin plazo definido: los datos se conservan hasta que los elimines.",
    retentionDays: "Días de conservación", retentionHelp: "De 1 a 36500. Déjalo vacío para no definir un plazo.", retentionInvalid: "Escribe un número entero entre 1 y 36500.", retentionSaved: "Plazo de conservación guardado.", retentionClear: "Quitar el plazo",
    retentionConfirmTitle: "¿Guardar este plazo?", retentionConfirmBody: "Los datos de cada invitado se eliminarán {{count}} días después de su registro. Esto no se puede deshacer.", clearTitle: "¿Quitar el plazo?", clearBody: "Los datos de los invitados se conservarán hasta que los elimines tú."
  },
  summary: {
    title: "Resumen de invitados", headline: "{{confirmed}} de {{total}} confirmaron", confirmed: "Confirmados", pending: "Sin responder", declined: "No asisten", companions: "Acompañantes", total: "Invitados",
    daysToDeadline: "{{count}} días para cerrar las respuestas", deadlineToday: "Las respuestas cierran hoy", deadlinePassed: "Las respuestas ya cerraron", noDeadline: "Sin fecha límite de respuesta",
    openRequests: "{{count}} solicitudes de acompañantes por revisar", noRequests: "Sin solicitudes de acompañantes pendientes", reviewRequests: "Revisar solicitudes", viewReport: "Ver reporte", viewGuests: "Ver invitados", empty: "Cuando agregues invitados verás aquí cuántos confirmaron."
  },
  report: {
    title: "Reporte de RSVP", intro: "Respuestas, acompañantes, dietas y mensajes.", filterLabel: "Filtrar por respuesta", export: "Exportar CSV", exporting: "Preparando…", exported: "Archivo {{name}} listo.", exportFailed: "No pudimos preparar el archivo. Inténtalo de nuevo.", exportCatering: "Exportar para el catering", exportCateringNote: "El archivo del catering no lleva nombres ni contactos, solo dietas y número de personas.",
    empty: "Todavía no hay respuestas para mostrar.", dietary: "Dieta: {{value}}", message: "Mensaje: {{value}}", requested: "Pidió {{requested}} · aprobados {{approved}}",
    columns: { name: "Nombre", email: "Correo", phone: "Teléfono", guestKey: "Clave del invitado", group: "Grupo", partySize: "Personas", status: "Respuesta", allowed: "Acompañantes permitidos", requested: "Acompañantes pedidos", approved: "Acompañantes aprobados", dietary: "Restricciones alimentarias", message: "Mensaje" }
  },
  requests: {
    title: "Solicitudes de acompañantes", intro: "Invitados que pidieron traer más personas de las permitidas.", empty: "No hay solicitudes pendientes.",
    ask: "Pidió {{requested}} acompañantes (permitidos: {{allowed}})", guest: "Invitado", approve: "Aprobar", reject: "Rechazar", approving: "Aprobando…", rejecting: "Rechazando…",
    approved: "Solicitud aprobada.", rejected: "Solicitud rechazada.", stale: "Esta solicitud ya estaba resuelta o cambió. Actualizamos la lista.", open: "Abrir invitado"
  },
  notifications: {
    title: "Avisos", intro: "Mensajes que el sistema te envió o intentó enviarte sobre esta celebración.", empty: "Todavía no tienes avisos.", unread: "Sin leer", read: "Leído",
    markRead: "Marcar como leído", markAll: "Marcar todos como leídos", unreadCount: "{{count}} sin leer", open: "Abrir", refresh: "Actualizar", markFailed: "No se pudo marcar como leído; volvimos al estado anterior.",
    channel: { EMAIL: "Correo", SMS: "SMS", WHATSAPP: "WhatsApp", PUSH: "Notificación push", INBOX: "Bandeja" },
    delivery: { PENDING: "En cola", SENDING: "Enviando", SENT: "Enviado", DEFERRED: "Pospuesto", SUPPRESSED: "Omitido según tus preferencias", FAILED: "No se pudo enviar", UNCERTAIN: "Sin confirmar", CANCELLED: "Cancelado", RETRY: "Reintentando" },
    templates: {
      companionRequested: { subject: "Solicitud de acompañantes", text: "Tienes una solicitud de acompañantes pendiente de revisión en tu panel." },
      giftRequested: { subject: "Solicitud de regalo", text: "Tienes una reserva de regalo pendiente de revisión en tu panel." },
      leadCapReached: { subject: "Límite de contactos alcanzado", text: "Alcanzaste el límite de contactos configurado. Revisa los detalles en tu panel." },
      celebrationPublished: { subject: "Celebración publicada", text: "Tu celebración ya está publicada. Puedes consultar su estado en tu panel." },
      pushTest: { subject: "Prueba de notificación", text: "Se está comprobando la configuración de notificaciones de este dispositivo." },
      hostRsvpConfirmed: { subject: "Un invitado confirmó su asistencia", text: "Un invitado confirmó su asistencia. Revisa el detalle en tu panel de invitados." },
      hostRsvpDeclined: { subject: "Un invitado no podrá asistir", text: "Un invitado respondió que no asistirá. Revisa el detalle en tu panel de invitados." },
      hostRsvpChanged: { subject: "Un invitado cambió su respuesta", text: "Un invitado actualizó su respuesta de asistencia. Revisa el detalle en tu panel de invitados." }
    },
    via: "Por {{channel}} · {{status}} · {{date}}"
  },
  preferences: {
    title: "Preferencias de avisos", intro: "Elige por qué canal quieres recibir los avisos de esta celebración. El servicio respeta tu elección al enviar.", channelsTitle: "Canales",
    EMAIL: "Correo electrónico", SMS: "SMS", WHATSAPP: "WhatsApp", PUSH: "Notificaciones push", saved: "Preferencia guardada.", saveFailed: "No se pudo guardar; volvimos al valor anterior.", on: "Activado", off: "Desactivado",
    quietTitle: "Horario de silencio", quietIntro: "Durante este horario, en la hora de tu celebración, los avisos se posponen y llegan al terminar; no se pierden.", quietStart: "Desde (hora, 0–23)", quietEnd: "Hasta (hora, 0–23)", quietSave: "Guardar horario", quietDefault: "Usar el horario del servicio", quietCurrent: "Silencio de {{start}}:00 a {{end}}:00", quietOff: "Sin horario de silencio", quietSourceDefault: "Horario del servicio", quietSourceMine: "Horario tuyo", quietInvalid: "Escribe horas enteras entre 0 y 23.", eventsTitle: "Tipos de aviso", eventsIntro: "Elige qué avisos quieres recibir. Los que no cambies siguen activados.", event: { celebrationPublished: "Mi celebración se publicó", companionRequested: "Un invitado pide más acompañantes", giftRequested: "Alguien pide reservar un regalo", leadCapReached: "Un proveedor alcanzó su tope de consultas" }, pushSetup: "Configurar avisos en este dispositivo"
  },
  push: {
    title: "Avisos push en este dispositivo", intro: "Te avisamos cuando alguien confirme o pida acompañantes. Puedes desactivarlos cuando quieras desde Preferencias de avisos.",
    enable: "Activar avisos push", registering: "Activando…", enabled: "Este dispositivo recibirá avisos push.", denied: "Los avisos están bloqueados. Actívalos en los ajustes del sistema para este app.", openSettings: "Abrir ajustes",
    unsupported: "Los avisos push necesitan un teléfono real con la app instalada. Este entorno no los admite.", failed: "No pudimos activar los avisos. Inténtalo de nuevo.", noProject: "Falta configurar el proyecto de notificaciones de la app.", disable: "Quitar este dispositivo", removed: "Dispositivo quitado.", preferences: "Preferencias de avisos",
    devicesTitle: "Dispositivos registrados", devicesEmpty: "Todavía no hay dispositivos registrados para recibir avisos push.", platform: { ios: "iPhone", android: "Android" },
    deviceStatus: { ACTIVE: "Activo", REVOKED: "Quitado", INVALID: "Inválido" }, registeredOn: "registrado el {{date}}", inactiveReason: "Este dispositivo ya no recibe avisos; vuelve a activarlo desde el teléfono.",
    test: "Enviar aviso de prueba", testQueued: "Aviso de prueba en camino.", removeTitle: "¿Quitar este dispositivo?", removeBody: "Dejará de recibir avisos push de esta celebración. Puedes activarlo otra vez desde el teléfono.",
    deliveriesTitle: "Envíos recientes", deliveriesIntro: "Qué pasó con cada aviso push enviado a tus dispositivos.", deliveriesEmpty: "Todavía no se envió ningún aviso push.",
    delivery: { PENDING: "En cola", SENDING: "Enviando", TICKETED: "Entregado al servicio de push", ACCEPTED: "Aceptado por el dispositivo", RETRY: "Reintentando", FAILED: "No se pudo enviar", UNCERTAIN: "Sin confirmar", DEFERRED: "Pospuesto", SUPPRESSED: "Omitido según tus preferencias", CANCELLED: "Cancelado" },
    attempts: "{{count}} intentos · disponible desde {{date}}", lastError: "Detalle: {{detail}}"
  }
} as const;
