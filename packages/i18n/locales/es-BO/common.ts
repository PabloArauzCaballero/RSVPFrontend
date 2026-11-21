export const esBO = {
  common: { loading: "Cargando…", retry: "Reintentar", cancel: "Cancelar", save: "Guardar", signOut: "Cerrar sesión", more: "Más", close: "Cerrar", empty: "No hay resultados." },
  auth: {
    signOut: { title: "¿Estás seguro de cerrar sesión?", body: "Puedes cancelar para seguir en tu cuenta." },
    restoreUnavailable: { title: "No pudimos recuperar tu sesión", body: "Revisa tu conexión e inténtalo de nuevo. No hace falta cerrar sesión.", retry: "Reintentar" },
    email: "Correo", password: "Contraseña", signIn: "Entrar", register: "Crear mi cuenta", forgotPassword: "Olvidé mi contraseña",
    signInTitle: "Entra a DOne", signInIntro: "Retoma tu invitación o tus servicios donde los dejaste.",
    registerTitle: "Crea tu cuenta", registerIntro: "Dinos qué vas a hacer y entras en un minuto.",
    recoverTitle: "Recupera tu contraseña", recoverIntro: "Escribe tu correo y te enviamos las instrucciones.",
    recoverSend: "Enviar instrucciones", recoverSent: "Listo. Si hay una cuenta con ese correo, te enviamos un enlace que vence en 30 minutos. Revisa también la carpeta de spam.",
    signingIn: "Entrando…", creating: "Creando tu cuenta…",
    backToSignIn: "Volver a entrar", noAccount: "¿Aún no tienes cuenta?", haveAccount: "¿Ya tienes cuenta?",
    role: "¿Qué vas a hacer en DOne?", roleHost: "Organizo una celebración", roleHostHint: "Creo mi invitación y veo quién viene.", roleProvider: "Ofrezco servicios", roleProviderHint: "Recibo solicitudes de quienes organizan.", rolePlanner: "Ayudo a organizar", rolePlannerHint: "Llevo las celebraciones de otras personas.",
    passwordHint: "Mínimo 12 caracteres. Una frase que recuerdes sirve.", showPassword: "Mostrar", hidePassword: "Ocultar", brandPitch: "Invitas hoy. Mañana sabes quién viene.", brandBody: "Tus invitados responden en un toque, sin crear cuenta. Tú ves la lista al día.",
    sessionEnded: "Tu sesión terminó. Entra otra vez para seguir.",
    reset: { title: "Elige una contraseña nueva", intro: "Al guardarla se cierran todas tus sesiones abiertas, también en otros dispositivos.", newPassword: "Contraseña nueva", submit: "Guardar contraseña", busy: "Guardando…", doneTitle: "Tu contraseña cambió", doneBody: "Cerramos tus sesiones abiertas. Entra con la contraseña nueva.", goSignIn: "Ir a entrar", linkInvalidTitle: "Este enlace ya no sirve", linkInvalidBody: "Puede que ya lo hayas usado, que haya pasado más de media hora o que pidieras uno más nuevo. Pide otro y usa el último que te llegue.", requestNew: "Pedir un enlace nuevo" },
    verify: { title: "Confirmando tu correo", checking: "Un momento, estamos confirmando tu correo…", doneTitle: "Correo confirmado", doneBody: "Gracias. Ya sabemos que este correo es tuyo.", continue: "Continuar", failedBody: "No pudimos confirmarlo ahora. Revisa tu conexión y vuelve a intentarlo.", linkInvalidTitle: "Este enlace ya no sirve", linkInvalidBody: "Puede que ya lo hayas usado o que haya vencido (dura 24 horas). Entra a tu cuenta y te ofrecemos uno nuevo.", linkInvalidSignedIn: "Puede que ya lo hayas usado o que haya vencido (dura 24 horas). Si tu correo sigue sin confirmar, te enviamos uno nuevo.", resend: "Enviar un enlace nuevo", resent: "Listo. Si tu correo aún no estaba confirmado, te llegará un enlace nuevo en unos minutos." },
    validation: { required: "Falta este dato.", invalidEmail: "Revisa el correo: debe verse como nombre@correo.com.", passwordShort: "Usa al menos 12 caracteres. Una frase corta funciona bien.", passwordBytes: "Esa contraseña es muy larga. Prueba con una más corta.", tooLong: "Es demasiado largo.", linkInvalid: "Este enlace ya no sirve." },
    failure: { invalidCredentials: "Ese correo y esa contraseña no coinciden. Revísalos o recupera tu contraseña.", emailTaken: "No pudimos crear la cuenta con esos datos. Prueba con otro correo, o entra si ya tienes cuenta.", validation: "Algunos datos no son válidos. Revisa los campos marcados.", offline: "Sin conexión por ahora. Revisa tu internet y vuelve a intentarlo.", unavailable: "Las cuentas no responden por ahora. Prueba de nuevo en unos minutos.", unknown: "Algo no salió como esperábamos. Inténtalo de nuevo.", forbidden: "Esta cuenta no puede hacer eso. Si crees que es un error, escríbenos.", rateLimited: "Hubo muchos intentos. Podrás volver a intentarlo en {{seconds}} s.", rateLimitedNoWait: "Hubo muchos intentos. Espera un momento y vuelve a intentarlo." },
    guard: { checking: "Abriendo tu espacio…", forbiddenTitle: "Esta sección es de otra cuenta", forbiddenBody: "Con esta cuenta no se puede abrir. Entra con la que corresponde o vuelve a tu espacio.", goHome: "Ir a mi espacio", noRole: "Tu cuenta todavía no tiene un rol asignado. Quien administra DOne puede asignarlo." }
  },
  errorBoundary: { title: "Esta parte no se pudo mostrar", body: "Algo falló al abrir esta pantalla. Tus datos están a salvo. Prueba de nuevo o vuelve al inicio.", retry: "Reintentar", home: "Ir al inicio" },
  notFound: { title: "Esta página no existe", intro: "Puede que el enlace esté incompleto. Vuelve al inicio y seguimos desde ahí.", home: "Ir al inicio" },
  language: { label: "Idioma", "es-BO": "Español", "en-US": "English" },
  invitation: {
    title: "Abre tu invitación", body: "Este enlace está pensado para la app de DOne. Si la tienes instalada, ábrela desde aquí; si no, puedes continuar en el navegador.", openApp: "Abrir en la app de DOne",
    pendingTitle: "Este enlace usa un formato anterior", pendingBody: "Falta el nombre de la celebración en el enlace. Pide a quien te invitó que te envíe el enlace actualizado o ábrelo desde la app de DOne, que sí puede resolverlo.", appTitle: "Abriendo tu invitación", appBody: "Este enlace es de un formato anterior y no dice a qué celebración pertenece. Pídele a quien te invitó el enlace actualizado.", invalidTitle: "Este enlace no abre", invalidBody: "Puede que le falte un pedazo o que ya haya vencido. Pídele uno nuevo a quien te invitó.", home: "Ir al inicio"
  },
  stubs: { host: { title: "Panel del anfitrión", description: "Gestiona tu celebración desde un solo lugar." }, provider: { title: "Portal del proveedor", description: "Revisa y responde tus solicitudes." }, guest: { title: "Tu invitación", description: "Confirma tu asistencia y descubre los detalles." } },
  ui: {
    partnerDisclaimer: "Enlace patrocinado: al abrirlo sales de DOne. DOne conecta, pero no presta ni garantiza el servicio del proveedor.", action: "Acción", loading: "Cargando…", empty: "No hay información disponible.", genericError: "No se pudo completar la acción.", close: "Cerrar", emptyTable: "No hay registros.", chooseFile: "Seleccionar archivo", dismiss: "Descartar aviso", moreOptions: "Más opciones",
    datePlaceholder: "Elegir fecha", datePreviousMonth: "Mes anterior", dateNextMonth: "Mes siguiente", dateToday: "Hoy", dateClear: "Borrar fecha", timePlaceholder: "Elegir hora", timeAm: "a. m.", timePm: "p. m.", timeHour: "Hora", timeMinute: "Minutos", timePeriod: "Mañana o tarde", timeDone: "Listo", timeClear: "Borrar", confirmChange: "Confirmar cambio", cancel: "Cancelar",
    catalogTitle: "Catálogo de componentes", catalogIntro: "Cada bloque es un estado. Mismos tokens en claro y oscuro.", catalogActions: "Acciones", catalogState: "Estado:", catalogSave: "Guardar", catalogBlocked: "Bloqueado",
    catalogOpenDialog: "Abrir diálogo", catalogOpenPanel: "Abrir panel", catalogName: "Nombre", catalogNamePlaceholder: "Escribe tu nombre", catalogNameError: "Escribe tu nombre completo.", catalogOption: "Opción", catalogOptionOne: "Opción uno", catalogOptionTwo: "Opción dos", catalogOptionError: "Elige una opción.",
    catalogTerms: "Acepto los términos", catalogTermsError: "Debes aceptar.", catalogDate: "Fecha", catalogAttachment: "Adjunto", catalogCard: "Contenido de la tarjeta", catalogRowName: "Invitación", catalogRowStatus: "Activa", catalogColName: "Nombre", catalogColStatus: "Estado",
    catalogPanel: "Panel", catalogPanelBody: "Contenido del panel.", catalogDialog: "Confirmación", catalogDialogBody: "Revisa esta acción antes de continuar.", catalogDone: "Acción completada"
  },
  errors: { unauthorized: "Tu sesión expiró.", signInAgain: "Iniciar sesión de nuevo", forbidden: "No tienes permisos para realizar esta acción.", conflict: "Este recurso cambió. Actualiza e inténtalo nuevamente.", validation: "Revisa los datos ingresados.", tooMany: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.", tooManyWait: "Demasiadas solicitudes. Espera {{seconds}} s e inténtalo de nuevo." },
  org: {
    nav: "Organizaciones", title: "Organizaciones", intro: "Agrupa a tu equipo para compartir celebraciones.",
    createTitle: "Nueva organización", nameLabel: "Nombre de la organización", nameHelp: "Hasta 120 caracteres.", create: "Crear organización", creating: "Creando…", created: "Organización creada.",
    plannerOnly: "Solo las cuentas de organizador de eventos pueden crear organizaciones.",
    listTitle: "Tus organizaciones", empty: "Todavía no perteneces a ninguna organización.", open: "Ver {{name}}", owner: "Propietario", retry: "Reintentar",
    membersTitle: "Miembros de {{name}}", noMembers: "Aún no hay miembros.", memberHost: "Anfitrión", memberPlanner: "Organizador de eventos",
    addTitle: "Invitar a una persona", emailLabel: "Correo de la persona", emailHelp: "Le llega una invitación por correo. Entra al equipo solo si la acepta; si aún no tiene cuenta, puede crearla desde el correo.", roleLabel: "Rol en la organización", add: "Enviar invitación", adding: "Enviando…", added: "Invitación enviada a {{email}}. Entra al equipo cuando la acepte.",
    ownerOnly: "Solo el propietario puede invitar a otras personas.",
    pendingTitle: "Invitaciones pendientes", pendingEmpty: "No hay invitaciones pendientes.", pendingRole: "{{role}} · vence el {{date}}", revoke: "Retirar", revoking: "Retirando…", revokeLabel: "Retirar la invitación de {{email}}", revoked: "Invitación retirada. El enlace ya no funciona.",
    myInvitations: "Ver las invitaciones que recibí",
    validation: { nameRequired: "Escribe un nombre para la organización.", nameTooLong: "El nombre admite hasta 120 caracteres.", emailRequired: "Escribe el correo de la persona.", emailInvalid: "Escribe un correo válido, por ejemplo nombre@correo.com." },
    errors: { notFound: "No encontramos esta organización. Actualiza la lista e inténtalo de nuevo.", conflict: "No se pudo invitar: esa persona ya es miembro, o la organización tiene demasiadas invitaciones pendientes. Retira alguna y vuelve a intentarlo.", forbidden: "No tienes permiso para esta acción en esta organización.", revokeGone: "Esa invitación ya no estaba pendiente. Actualizamos la lista." },
    inbox: {
      title: "Invitaciones", intro: "Aquí ves las organizaciones que te invitaron. Solo entras si aceptas.", empty: "No tienes invitaciones pendientes.",
      unverified: "Verifica tu correo para ver aquí tus invitaciones. Mientras tanto, puedes responder desde el enlace que te llegó por correo.",
      card: "{{organization}} te invita como {{role}}.", expires: "Vence el {{date}}.",
      fromLinkTitle: "Te invitaron a una organización", fromLinkBody: "Acepta para unirte al equipo, o rechaza la invitación.",
      accept: "Aceptar", accepting: "Aceptando…", decline: "Rechazar", declining: "Rechazando…",
      acceptLabel: "Aceptar la invitación de {{organization}}", declineLabel: "Rechazar la invitación de {{organization}}", thisOrganization: "esta organización",
      confirmDeclineTitle: "¿Rechazar la invitación?", confirmDeclineBody: "No podrás aceptarla después. Si cambias de idea, pide una invitación nueva.",
      accepted: "Listo, ya eres parte del equipo.", declined: "Rechazaste la invitación.", goToTeams: "Ver mis organizaciones",
      errors: { notFound: "Esta invitación ya no está disponible: venció, ya fue respondida o es para otra cuenta. Entra con la cuenta del correo invitado.", forbidden: "Para responder, abre el enlace del correo de la invitación o verifica tu correo.", conflict: "Ya perteneces a esta organización." }
    }
  },
  theme: {
    title: "Apariencia", label: "Tema de la app", darkMode: "Modo oscuro", system: "Sistema", light: "Claro", dark: "Oscuro",
    help: "«Sistema» sigue el modo de tu dispositivo. La invitación que ven tus invitados no cambia."
  }
} as const;
