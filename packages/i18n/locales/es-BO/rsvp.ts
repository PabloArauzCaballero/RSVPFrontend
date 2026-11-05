/** RSVP del invitado por enlace personal (F15 web, F21 app). Mismo texto en Next.js y en Expo. */
export const rsvpEsBO = {
  page: { title: "Tu respuesta", invitationTo: "Invitación a {{title}}" },
  loading: "Abriendo tu invitación…",
  invalid: {
    title: "Este enlace no está disponible",
    body: "Puede haber vencido, haberse revocado o estar incompleto. Pide a quien te invitó que te envíe uno nuevo.",
    hint: "Revisa que hayas copiado el enlace completo."
  },
  guest: { title: "¿Podrás acompañarnos?", intro: "Responde con tu enlace personal. No necesitas crear una cuenta." },
  deadline: { open: "Puedes responder o cambiar tu respuesta hasta el {{date}} (hora de {{timeZone}}).", none: "Puedes cambiar tu respuesta cuando quieras." },
  countdown: { value: "Quedan {{days}} d {{hours}} h {{minutes}} min para responder", label: "Tiempo restante para responder" },
  form: {
    statusLegend: "¿Asistirás?", confirm: "Sí, asistiré", decline: "No podré asistir",
    companions: "Acompañantes", companionsHelp: "Tu invitación incluye hasta {{count}}. Si pides más, el anfitrión debe aprobarlo.",
    dietary: "Restricciones alimentarias", dietaryHelp: "Alergias, vegetariano, sin gluten…",
    message: "Mensaje para los anfitriones (opcional)",
    name: "Tu nombre", email: "Tu correo electrónico", emailHelp: "Solo lo verán los anfitriones.",
    consent: "Doy mi consentimiento para que los anfitriones guarden mi nombre y correo y me contacten sobre este evento.",
    submit: "Enviar respuesta", submitting: "Enviando…", save: "Guardar cambios", cancelEdit: "Cancelar", register: "Confirmar mi asistencia"
  },
  errors: {
    summary: "Revisa los campos marcados.",
    companions: "Escribe un número entero, de 0 en adelante.", tooLong: "El texto es demasiado largo.", required: "Este campo es obligatorio.", email: "Escribe un correo válido, por ejemplo nombre@correo.com.", consent: "Necesitamos tu consentimiento para guardar tu respuesta.",
    offline: "No hay conexión. Tu respuesta sigue aquí y no se perdió: reintenta cuando vuelva internet.",
    unavailable: "El servicio no responde por ahora. Tu respuesta sigue aquí: reintenta en unos minutos.",
    rateLimited: "Demasiados intentos seguidos. Espera {{seconds}} segundos y reintenta; tu respuesta sigue aquí.",
    rateLimitedNoWait: "Demasiados intentos seguidos. Espera un momento y reintenta; tu respuesta sigue aquí.",
    validation: "El servicio no aceptó algunos datos. Revísalos e inténtalo de nuevo.",
    conflict: "Esta respuesta ya se envió con otros datos. Recarga para ver la versión actual.",
    unknown: "No pudimos guardar tu respuesta. Inténtalo de nuevo; lo que escribiste sigue aquí.",
    celebrationMissing: "No encontramos esta celebración."
  },
  actions: { retry: "Reintentar", reload: "Recargar", copyLink: "Copiar enlace", copied: "Enlace copiado." },
  draft: { kept: "Tu borrador se guarda solo en este dispositivo hasta que el envío se confirme." },
  success: { confirmed: "Listo: confirmamos tu asistencia.", declined: "Gracias por avisarnos. Registramos que no podrás asistir.", saved: "Cambios guardados." },
  status: { PENDING: "Sin responder", CONFIRMED: "Asistirás", DECLINED: "No asistirás" },
  confirmed: { title: "Tu asistencia está confirmada", titleDeclined: "Registramos que no podrás asistir", edit: "Cambiar mi respuesta", editHint: "Puedes cambiarla hasta que cierre el plazo." },
  summary: {
    label: "Tu respuesta", companions: "Acompañantes aprobados: {{count}}", pendingCompanions: "{{count}} esperando aprobación del anfitrión", dietary: "Restricciones: {{value}}", message: "Tu mensaje: {{value}}", updated: "Última actualización: {{date}}", none: "Sin detalles adicionales."
  },
  closed: {
    contactEmail: "Correo de contacto:", contactPhone: "Teléfono de contacto:",
    title: "El plazo para responder terminó",
    closedOn: "Cerró el {{date}} (hora de {{timeZone}}).", closedGeneric: "Los anfitriones cerraron las respuestas.",
    contact: "Si necesitas cambiar tu respuesta, escribe a {{hosts}}.", contactGeneric: "Si necesitas cambiar tu respuesta, escribe a quien te invitó.",
    yourAnswer: "Tu última respuesta: {{status}}"
  },
  unregistered: {
    checking: "Comprobando si esta celebración admite registro…", unavailable: "No pudimos comprobar si puedes registrarte. Inténtalo de nuevo.",
    title: "Confirma tu asistencia", intro: "Si no recibiste un enlace personal, puedes registrarte aquí cuando los anfitriones lo permiten.",
    restrictedTitle: "Esta celebración solo admite invitados con enlace personal",
    restrictedBody: "Pide a quien te invitó que te envíe tu enlace. Si ya lo tienes, ábrelo desde el mensaje original.",
    doneTitle: "Listo: confirmamos tu asistencia", doneBody: "Guarda tu enlace personal. Es la única forma de cambiar tu respuesta más adelante; no lo guardamos en tu navegador.",
    replayBody: "Ya habíamos registrado tu respuesta. Si perdiste tu enlace, pide a los anfitriones que te envíen uno nuevo.", linkLabel: "Tu enlace personal"
  },
  app: { title: "Tu invitación", openApp: "Abrir en la app de DOne", openAppHint: "Si tienes la app instalada, ábrela desde aquí." }
} as const;
