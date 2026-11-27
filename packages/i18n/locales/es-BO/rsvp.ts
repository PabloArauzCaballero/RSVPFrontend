/** RSVP del invitado por enlace personal (F15 web, F21 app). Mismo texto en Next.js y en Expo. */
export const rsvpEsBO = {
  page: { title: "Tu respuesta" },
  status: { PENDING: "Sin responder", CONFIRMED: "Asistirás", DECLINED: "No asistirás" },
  /** Recorrido del invitado en la app y en la web pública (Persuade): invitación, respuesta y, si quiere, regalo. La web pública (seo-web) usa las mismas claves desde M21. */
  invite: {
    loading: "Abriendo tu invitación…",
    hostedBy: "Te invitan {{hosts}}",
    question: "¿Nos acompañas?",
    lead: "Un toque para responder. Sin cuenta ni contraseña.",
    yes: "Voy", no: "No puedo", chooseOne: "Elige una opción para continuar.",
    companions: "¿Cuántos te acompañan?", companionsAdd: "Agregar un acompañante", companionsRemove: "Quitar un acompañante", companionsCount: "{{count}} acompañantes",
    companionsIncluded: "Incluidos en tu invitación: {{count}}. Si pides más, quien te invita decide.",
    extrasOpen: "Añadir una restricción alimentaria o un mensaje", extrasClose: "Ocultar restricción y mensaje",
    dietary: "Restricción alimentaria (opcional)", dietaryHelp: "Alergias, vegetariano, sin gluten…", message: "Mensaje para quien te invita (opcional)",
    submitYes: "Confirmar que voy", submitNo: "Avisar que no puedo", submitNone: "Enviar respuesta", submitting: "Enviando…", save: "Guardar cambios", cancelEdit: "Dejarlo como está",
    deadlineOpen: "Puedes cambiar tu respuesta hasta el {{date}} (hora de {{timeZone}}).", deadlineNone: "Puedes cambiar tu respuesta cuando quieras.",
    countdown: "Quedan {{days}} d {{hours}} h {{minutes}} min", countdownLabel: "Tiempo que queda para responder",
    doneTitle: "Listo, estás dentro.", doneBodyUntil: "Quedó tu respuesta. Puedes cambiarla hasta el {{date}}.", doneBodyAnytime: "Quedó tu respuesta. Puedes cambiarla cuando quieras.",
    declinedTitle: "Gracias por avisar.", declinedBody: "Quedó registrado que no podrás venir. Si cambias de idea, puedes cambiar tu respuesta.",
    savedNote: "Cambios guardados.",
    giftsCta: "Ver la lista de regalos", giftsClosedHint: "La lista de regalos está cerrada: ya no se pueden reservar.", giftsHint: "¿Quieres regalar algo? Reserva uno en un toque.",
    againTitleYes: "Tu asistencia está confirmada", againTitleNo: "Quedó registrado que no podrás venir", edit: "Cambiar mi respuesta", editHint: "Puedes cambiarla hasta que cierre el plazo.",
    summaryLabel: "Tu respuesta", summaryCompanions: "Acompañantes aprobados: {{count}}", summaryPending: "{{count}} por aprobar: lo decide quien te invita", summaryDietary: "Restricción alimentaria: {{value}}", summaryMessage: "Tu mensaje: {{value}}", summaryUpdated: "Actualizada el {{date}}",
    closedTitle: "El plazo para responder terminó", closedOn: "Las respuestas cerraron el {{date}} (hora de {{timeZone}}).", closedGeneric: "Quien te invitó cerró las respuestas.",
    closedHelp: "Ya no se puede cambiar desde aquí, pero quien te invitó puede ayudarte.", contact: "¿Necesitas cambiar algo? Escríbele a {{hosts}}.", contactGeneric: "¿Necesitas cambiar algo? Escríbele a quien te invitó.", contactEmail: "Correo:", contactPhone: "Teléfono:", yourAnswer: "Tu última respuesta:",
    invalidTitle: "Este enlace ya no funciona", invalidBody: "Puede que haya vencido o que le falte un pedazo. No pasó nada grave.", invalidAction: "Pídele un nuevo enlace a quien te invitó.",
    offlineTitle: "Sin conexión por ahora", offlineBody: "Revisa tu internet y vuelve a intentarlo.", unavailableTitle: "No pudimos abrir tu invitación", unavailableBody: "Inténtalo de nuevo en unos minutos.", retry: "Reintentar",
    kept: "Tu respuesta sigue aquí.",
    errors: {
      summary: "Revisa los campos marcados.", companions: "Escribe un número de 0 en adelante.", tooLong: "Es demasiado largo.", required: "Falta este dato.", email: "Revisa el correo: debe verse como nombre@correo.com.", consent: "Necesitamos tu permiso para guardar tu respuesta.",
      offline: "Sin conexión por ahora. Cuando vuelva internet, reintenta.", unavailable: "No pudimos enviar tu respuesta ahora. Reintenta en unos minutos.",
      rateLimited: "Hubo muchos intentos seguidos. Espera {{seconds}} s y reintenta.", rateLimitedNoWait: "Hubo muchos intentos seguidos. Espera un momento y reintenta.",
      rateLimitedMinutes: "Hubo muchos intentos. Podrás volver a intentarlo en unos {{minutes}} min. Si es urgente, escríbele a quien te invitó.",
      restricted: "Con este enlace ya no se puede responder. Pídele uno nuevo a quien te invitó.",
      validation: "Algunos datos no se aceptaron. Revísalos e inténtalo de nuevo.", conflict: "Tu respuesta cambió mientras la editabas. Recarga para ver la versión actual.", unknown: "Algo no salió como esperábamos. Inténtalo de nuevo."
    },
    open: {
      title: "Confirma que vienes", lead: "Esta invitación está abierta. Deja tu nombre y tu correo y quedas en la lista.",
      name: "Tu nombre", email: "Tu correo", emailHelp: "Solo lo ven quienes te invitan.", consent: "Acepto que quienes me invitan guarden mi nombre y mi correo y me contacten sobre este evento, según la política de privacidad.", submit: "Confirmar que voy",
      checkFailed: "No pudimos comprobar si puedes registrarte. Inténtalo de nuevo.",
      restrictedTitle: "Esta celebración solo recibe respuestas con enlace personal", restrictedBody: "Pídele el tuyo a quien te invitó. Si ya lo tienes, ábrelo desde el mensaje original.",
      doneTitle: "Listo, estás dentro.", doneBody: "Guarda tu enlace personal: es la única forma de cambiar tu respuesta después. No lo guardamos en tu navegador.",
      replayBody: "Ya teníamos tu respuesta. Si perdiste tu enlace, pídele uno nuevo a quien te invitó.", linkLabel: "Tu enlace personal", copyLink: "Copiar enlace", copied: "Enlace copiado.",
      emailNotice: "Quizá no llegue un correo de confirmación. Tu enlace es tu constancia: guárdalo."
    }
  }
} as const;
