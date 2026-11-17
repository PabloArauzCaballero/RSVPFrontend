export const esBO = {
  common: { loading: "Cargando…", retry: "Reintentar", cancel: "Cancelar", save: "Guardar", signOut: "Cerrar sesión", more: "Más", close: "Cerrar", empty: "No hay resultados." },
  auth: {
    email: "Correo", password: "Contraseña", signIn: "Entrar", register: "Crear mi cuenta", forgotPassword: "Olvidé mi contraseña",
    signInTitle: "Entra a DOne", signInIntro: "Retoma tu invitación o tus servicios donde los dejaste.",
    registerTitle: "Crea tu cuenta", registerIntro: "Dinos qué vas a hacer y entras en un minuto.",
    recoverTitle: "Recupera tu contraseña", recoverIntro: "Escribe tu correo y te enviamos las instrucciones.",
    recoverSend: "Enviar instrucciones", recoverSent: "Listo. Si hay una cuenta con ese correo, te llegarán las instrucciones.",
    signingIn: "Entrando…", creating: "Creando tu cuenta…",
    backToSignIn: "Volver a entrar", noAccount: "¿Aún no tienes cuenta?", haveAccount: "¿Ya tienes cuenta?",
    role: "¿Qué vas a hacer en DOne?", roleHost: "Organizo una celebración", roleHostHint: "Creo mi invitación y veo quién viene.", roleProvider: "Ofrezco servicios", roleProviderHint: "Recibo solicitudes de quienes organizan.", rolePlanner: "Ayudo a organizar", rolePlannerHint: "Llevo las celebraciones de otras personas.",
    passwordHint: "Mínimo 12 caracteres. Una frase que recuerdes sirve.", showPassword: "Mostrar", hidePassword: "Ocultar", brandPitch: "Invitas hoy. Mañana sabes quién viene.", brandBody: "Tus invitados responden en un toque, sin crear cuenta. Tú ves la lista al día.",
    sessionEnded: "Tu sesión terminó. Entra otra vez para seguir.",
    validation: { required: "Falta este dato.", invalidEmail: "Revisa el correo: debe verse como nombre@correo.com.", passwordShort: "Usa al menos 12 caracteres. Una frase corta funciona bien.", passwordBytes: "Esa contraseña es muy larga. Prueba con una más corta.", tooLong: "Es demasiado largo." },
    failure: { invalidCredentials: "Ese correo y esa contraseña no coinciden. Revísalos o recupera tu contraseña.", emailTaken: "No pudimos crear la cuenta con esos datos. Prueba con otro correo, o entra si ya tienes cuenta.", validation: "Algunos datos no son válidos. Revisa los campos marcados.", offline: "Sin conexión por ahora. Revisa tu internet y vuelve a intentarlo.", unavailable: "Las cuentas no responden por ahora. Prueba de nuevo en unos minutos.", unknown: "Algo no salió como esperábamos. Inténtalo de nuevo.", forbidden: "Esta cuenta no puede hacer eso. Si crees que es un error, escríbenos.", rateLimited: "Hubo muchos intentos. Podrás volver a intentarlo en {{seconds}} s.", rateLimitedNoWait: "Hubo muchos intentos. Espera un momento y vuelve a intentarlo." },
    guard: { checking: "Abriendo tu espacio…", forbiddenTitle: "Esta sección es de otra cuenta", forbiddenBody: "Con esta cuenta no se puede abrir. Entra con la que corresponde o vuelve a tu espacio.", goHome: "Ir a mi espacio", noRole: "Tu cuenta todavía no tiene un rol asignado. Quien administra DOne puede asignarlo." }
  },
  notFound: { title: "Esta página no existe", intro: "Puede que el enlace esté incompleto. Vuelve al inicio y seguimos desde ahí.", home: "Ir al inicio" },
  language: { label: "Idioma", "es-BO": "Español", "en-US": "English" },
  invitation: {
    title: "Abre tu invitación", body: "Este enlace está pensado para la app de DOne. Si la tienes instalada, ábrela desde aquí; si no, puedes continuar en el navegador.", openApp: "Abrir en la app de DOne",
    pendingTitle: "Este enlace usa un formato anterior", pendingBody: "Falta el nombre de la celebración en el enlace. Pide a quien te invitó que te envíe el enlace actualizado o ábrelo desde la app de DOne, que sí puede resolverlo.", appTitle: "Abriendo tu invitación", appBody: "Este enlace es de un formato anterior y no dice a qué celebración pertenece. Pídele a quien te invitó el enlace actualizado.", invalidTitle: "Este enlace no abre", invalidBody: "Puede que le falte un pedazo o que ya haya vencido. Pídele uno nuevo a quien te invitó.", home: "Ir al inicio"
  },
  stubs: { host: { title: "Panel del anfitrión", description: "Gestiona tu celebración desde un solo lugar." }, provider: { title: "Portal del proveedor", description: "Revisa y responde tus solicitudes." }, guest: { title: "Tu invitación", description: "Confirma tu asistencia y descubre los detalles." } },
  ui: {
    partnerDisclaimer: "Enlace patrocinado: al abrirlo sales de DOne. DOne conecta, pero no presta ni garantiza el servicio del proveedor.", action: "Acción", loading: "Cargando…", empty: "No hay información disponible.", genericError: "No se pudo completar la acción.", close: "Cerrar", emptyTable: "No hay registros.", chooseFile: "Seleccionar archivo", dismiss: "Descartar aviso", moreOptions: "Más opciones",
    datePlaceholder: "Elegir fecha", timePlaceholder: "Elegir hora", timeAm: "a. m.", timePm: "p. m.", timeHour: "Hora", timeMinute: "Minutos", timePeriod: "Mañana o tarde", timeDone: "Listo", timeClear: "Borrar", confirmChange: "Confirmar cambio", cancel: "Cancelar",
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
    addTitle: "Agregar un miembro", emailLabel: "Correo de la cuenta", emailHelp: "La persona ya debe tener una cuenta en DOne.", roleLabel: "Rol en la organización", add: "Agregar miembro", adding: "Agregando…", added: "Miembro agregado.",
    ownerOnly: "Solo el propietario puede agregar miembros.",
    validation: { nameRequired: "Escribe un nombre para la organización.", nameTooLong: "El nombre admite hasta 120 caracteres.", emailRequired: "Escribe el correo de la cuenta.", emailInvalid: "Escribe un correo válido, por ejemplo nombre@correo.com." },
    errors: { cannotAdd: "No pudimos agregar ese correo. Revisa que esté bien escrito y que la persona ya tenga una cuenta en DOne.", notFound: "No encontramos esta organización. Actualiza la lista e inténtalo de nuevo.", conflict: "Esa persona ya es miembro de esta organización.", forbidden: "No tienes permiso para esta acción en esta organización." }
  },
  theme: {
    title: "Apariencia", label: "Tema de la app", darkMode: "Modo oscuro", system: "Sistema", light: "Claro", dark: "Oscuro",
    help: "«Sistema» sigue el modo de tu dispositivo. La invitación que ven tus invitados no cambia."
  }
} as const;
