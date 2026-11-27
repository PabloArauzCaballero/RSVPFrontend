/** Moderación (F7): denuncia pública, aviso y apelación del anfitrión, cola y vista previa del administrador. */
export const moderationEsBO = {
  reasons: {
    SEXUAL_CONTENT: "Contenido sexual", VIOLENCE_OR_HATE: "Violencia u odio", SCAM_OR_IMPERSONATION: "Estafa o suplantación", COPYRIGHT: "Derechos de autor",
    PERSONAL_DATA: "Datos personales", SPAM: "Spam", OTHER: "Otro motivo"
  },
  report: {
    open: "Denunciar esta invitación", openMusic: "Denunciar la música", openMusicDescribed: "Denunciar la música de esta invitación",
    titlePage: "Denunciar esta invitación", titleMusic: "Denunciar la música",
    introPage: "Cuéntanos qué pasa con esta invitación. Un moderador revisa cada denuncia. No te pedimos tus datos y no guardamos tu dirección.",
    introMusic: "Cuéntanos qué pasa con la música de esta invitación. Solo se revisa la música: la invitación y sus fotos siguen visibles mientras tanto. No te pedimos tus datos y no guardamos tu dirección.",
    reasonPlaceholder: "Elige un motivo", reason: "Motivo", comment: "Comentario", commentOptional: "opcional", commentRequiredHint: "obligatorio con este motivo", commentHelp: "Texto plano, hasta {{max}} caracteres.",
    counter: "{{count}} de {{max}}", send: "Enviar denuncia", sending: "Enviando…", cancel: "Cancelar", close: "Cerrar",
    doneTitle: "Recibimos tu denuncia", doneBody: "Gracias por avisarnos. Un moderador la revisará.",
    errors: {
      reasonRequired: "Elige un motivo.", commentRequired: "Con este motivo cuéntanos qué pasa en el comentario.", commentTooLong: "El comentario puede tener hasta {{max}} caracteres.",
      invalidText: "El comentario tiene caracteres que no podemos aceptar. Quita los símbolos raros e inténtalo de nuevo.",
      notFound: "Esta invitación ya no está disponible, así que no hace falta denunciarla.", elementGone: "Esta invitación ya no tiene esa música.",
      tooMany: "Se enviaron demasiadas denuncias desde tu conexión. Inténtalo de nuevo en {{minutes}} min.", tooManyLater: "Se enviaron demasiadas denuncias desde tu conexión. Inténtalo de nuevo más tarde.",
      offline: "No pudimos enviar la denuncia. Revisa tu conexión e inténtalo de nuevo. Tu texto sigue aquí.", generic: "No pudimos enviar la denuncia. Inténtalo de nuevo. Tu texto sigue aquí."
    }
  },
  host: {
    title: "Moderación", intro: "Aquí ves lo que un moderador ocultó de tu invitación, por qué y cómo corregirlo.", loadFailed: "No pudimos cargar la moderación de esta invitación.",
    emptyTitle: "No hay nada oculto", emptyBody: "Tu invitación se ve completa. Si un moderador oculta algo, lo verás aquí y te avisaremos por correo.",
    hiddenBadge: "Oculto por moderación", historyTitle: "Decisiones anteriores", activeTitle: "Oculto ahora",
    scope: { PAGE: "Toda la invitación", MUSIC: "Solo la música", ELEMENT: "Un elemento de la invitación" },
    effect: {
      PAGE: "Por ahora nadie puede ver tu invitación.", MUSIC: "Solo la música está oculta. Tu invitación y sus fotos se siguen viendo, sin esa música.",
      ELEMENT: "Ese elemento no se muestra a tus invitados. El resto de tu invitación sigue visible."
    },
    element: "Elemento: {{element}}", reason: "Motivo: {{reason}}", guidance: "Cómo corregirlo: {{guidance}}", noGuidance: "El moderador no dejó indicaciones. Puedes preguntar al soporte.",
    hiddenOn: "Oculto el {{when}}", restoredOn: "Restaurado el {{when}}",
    stillHidden: "Corregir el contenido y publicar de nuevo no levanta el ocultamiento: solo lo levanta un administrador, al aceptar tu apelación o al restaurarlo.",
    restored: "Este contenido ya se muestra de nuevo.",
    appeal: {
      cta: "Apelar esta decisión", title: "Apelar la decisión", help: "Puedes apelar una sola vez por decisión. Explica por qué crees que fue un error. Un administrador la revisa.",
      label: "Tu mensaje", counter: "{{count}} de {{max}}", send: "Enviar apelación", sending: "Enviando…", cancel: "Cancelar", sent: "Enviamos tu apelación. Un administrador la revisará y te avisaremos por correo.",
      status: { PENDING: "Apelación en revisión", ACCEPTED: "Apelación aceptada", REJECTED: "Apelación rechazada" },
      yours: "Tu apelación: {{message}}", decisionNote: "Nota del administrador: {{note}}", decidedOn: "Decidida el {{when}}",
      rejectedFinal: "No puedes apelar de nuevo esta decisión.", unavailable: "Ya no se puede apelar esta decisión.",
      errors: {
        empty: "Escribe tu mensaje.", tooLong: "El mensaje puede tener hasta {{max}} caracteres.", used: "Ya apelaste esta decisión. Recarga para ver su estado.", notActive: "Este contenido ya no está oculto. Recarga para verlo.",
        readOnly: "Solo los anfitriones de la invitación pueden apelar.", generic: "No pudimos enviar la apelación. Inténtalo de nuevo. Tu mensaje sigue aquí."
      }
    },
    publish: { hiddenTitle: "Tu invitación está oculta por moderación", hiddenBody: "Publicarla de nuevo no la vuelve a mostrar. Mira el motivo y cómo apelar.", open: "Ver moderación" }
  },
  admin: {
    title: "Denuncias", intro: "Denuncias de las invitaciones públicas. Abre una para ver el detalle y mirar los archivos ocultos.",
    statuses: { OPEN: "Abiertas", DISMISSED: "Descartadas", ACTIONED: "Con decisión" }, state: { OPEN: "Abierta", DISMISSED: "Descartada", ACTIONED: "Con decisión" },
    empty: "No hay denuncias {{status}}.", open: "Abrir denuncia {{slug}}", back: "Volver a las denuncias",
    row: "{{slug}} · {{reason}} · {{when}}", target: { page: "Toda la invitación", element: "Elemento {{kind}} {{id}}", music: "La música" },
    detailTitle: "Denuncia de {{slug}}", comment: "Comentario de quien denunció", noComment: "Sin comentario.", reporter: "Denunciante (referencia anónima): {{ref}}",
    counts: "{{open}} denuncias abiertas de {{reporters}} denunciantes distintos para esta invitación.", celebrationStatus: "Estado de la celebración: {{status}}",
    takedowns: "Decisiones sobre esta invitación", noTakedowns: "Todavía no se ocultó nada.", takedownLine: "{{scope}} · {{when}} · {{state}}", active: "Oculto", lifted: "Restaurado",
    audit: "Historial", auditLine: "{{action}} · {{when}}",
    auditActions: { REPORT_RECEIVED: "Denuncia recibida", REPORT_DISMISSED: "Denuncia descartada", ELEMENT_HIDDEN: "Elemento ocultado", PAGE_HIDDEN: "Invitación ocultada", APPEAL_FILED: "Apelación enviada", APPEAL_ACCEPTED: "Apelación aceptada", APPEAL_REJECTED: "Apelación rechazada" },
    files: { title: "Archivos ocultos", help: "Los archivos que moderación oculta no se ven en la invitación. Para decidir, mira uno con un enlace que sirve una sola vez.", none: "Esta invitación no tiene archivos ocultos.", loadFailed: "No pudimos cargar los archivos de esta invitación.", fileLine: "{{name}} · {{kind}}", photo: "Foto", music: "Música" },
    preview: {
      cta: "Ver archivo oculto", ctaNamed: "Ver el archivo oculto {{name}}", title: "Vista previa de un archivo oculto", loading: "Pidiendo el enlace…",
      notice: "Este enlace sirve una sola vez y vence en 5 minutos. No lo copies ni lo compartas: queda registrado en la auditoría quién lo pidió y cuándo se abrió.",
      used: "El enlace ya se usó. Para volver a mirar el archivo pide otro.", expired: "El enlace venció. Pide otro para mirar el archivo.", brokenOrUsed: "No se pudo abrir el archivo. El enlace sirve una sola vez: pide otro.",
      again: "Pedir otro enlace", close: "Cerrar vista previa", imageAlt: "Archivo oculto por moderación: {{name}}", audioLabel: "Música oculta por moderación: {{name}}",
      errors: {
        notHidden: "Este archivo se ve con normalidad, así que no hay nada que previsualizar.", notQuarantined: "El archivo aún se está moviendo a cuarentena. Inténtalo de nuevo en un minuto.",
        notFound: "El archivo ya no existe.", forbidden: "Solo los administradores pueden mirar archivos ocultos.", generic: "No pudimos pedir el enlace. Inténtalo de nuevo."
      }
    }
  }
} as const;
