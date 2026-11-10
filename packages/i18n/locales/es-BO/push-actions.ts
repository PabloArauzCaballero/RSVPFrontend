export const pushActionsEsBO = {
  title: "Solicitud de reserva",
  approve: "Aprobar reserva", reject: "Rechazar reserva", inbox: "Ver bandeja de regalos", retry: "Consultar estado actualizado", signIn: "Iniciar sesión para continuar",
  gift: "Reserva de regalo", requester: "Solicitó: {{name}}", hidden: "Identidad oculta", anonymous: "Invitado", requestedAt: "Solicitada el {{date}}",
  giftUnavailable: "El nombre del regalo no se pudo cargar. Puedes consultar el estado de la reserva.",
  applied: "Tu decisión se guardó. El estado de la reserva está actualizado.",
  resolved: "Esta solicitud ya fue resuelta. Te mostramos el estado actual.",
  changed: "La solicitud cambió mientras respondías. Consulta el estado antes de volver a decidir.",
  sessionExpired: "Tu sesión venció. Inicia sesión para revisar esta misma solicitud; no se enviará una decisión automáticamente.",
  forbidden: "No tienes permiso para decidir esta reserva. Consulta con el anfitrión de la celebración.",
  missing: "Esta solicitud no está disponible. Revisa las solicitudes actuales en la bandeja de regalos.",
  invalid: "No se pudo procesar esta decisión. Consulta el estado de la solicitud antes de intentarlo otra vez.",
  failed: "No pudimos confirmar el resultado. Consulta el estado antes de volver a intentarlo.",
  busy: "Ya estamos procesando una decisión para esta solicitud.",
  status: { PENDING_REVIEW: "Pendiente de tu decisión", COMMITTED: "Reserva aprobada", REJECTED: "Reserva rechazada" }
} as const;
