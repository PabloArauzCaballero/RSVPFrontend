export const esBO = {
  common: { loading: "Cargando…", retry: "Reintentar", cancel: "Cancelar", save: "Guardar", signOut: "Cerrar sesión", more: "Más", close: "Cerrar", empty: "No hay resultados." },
  auth: {
    email: "Correo electrónico", password: "Contraseña", signIn: "Iniciar sesión", register: "Crear cuenta", forgotPassword: "¿Olvidaste tu contraseña?",
    signInTitle: "Entra a tu cuenta", signInIntro: "Organiza tu celebración o gestiona tus servicios para eventos.",
    registerTitle: "Crea tu cuenta", registerIntro: "Elige cómo vas a usar DOne. Solo tardas un minuto.",
    recoverTitle: "Recupera tu contraseña", recoverIntro: "Escribe el correo de tu cuenta y te enviaremos las instrucciones.",
    recoverSend: "Enviar instrucciones", recoverSent: "Si existe una cuenta con ese correo, recibirás las instrucciones para crear una contraseña nueva.",
    signingIn: "Entrando…", creating: "Creando cuenta…",
    backToSignIn: "Volver a iniciar sesión", noAccount: "¿Aún no tienes cuenta?", haveAccount: "¿Ya tienes una cuenta?",
    role: "Quiero usar DOne como", roleHost: "Anfitrión", roleHostHint: "Organizo mi propia celebración", rolePlanner: "Organizador de eventos", rolePlannerHint: "Gestiono celebraciones de otras personas", roleProvider: "Proveedor", roleProviderHint: "Ofrezco servicios para celebraciones",
    passwordHint: "Al menos 12 caracteres.", showPassword: "Mostrar contraseña", hidePassword: "Ocultar contraseña", brandPitch: "Invitas hoy. Mañana sabes quién viene.", brandBody: "Confirmación de asistencia para bodas, fiestas y eventos. El invitado responde en un toque y tú ves la lista al día.",
    sessionEnded: "Tu sesión terminó. Inicia sesión para continuar.",
    validation: { required: "Este campo es obligatorio.", invalidEmail: "Escribe un correo válido, por ejemplo nombre@correo.com.", passwordShort: "La contraseña debe tener al menos 12 caracteres.", passwordBytes: "La contraseña es demasiado larga. Usa una más corta.", tooLong: "El texto es demasiado largo." },
    failure: { invalidCredentials: "El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo.", emailTaken: "Ya existe una cuenta con este correo. Inicia sesión o recupera tu contraseña.", validation: "Revisa los datos marcados e inténtalo de nuevo.", offline: "No hay conexión con el servidor. Revisa tu internet y vuelve a intentarlo.", unavailable: "El servicio de cuentas no responde por ahora. Inténtalo en unos minutos.", unknown: "No pudimos completar la acción. Inténtalo de nuevo.", forbidden: "Tu cuenta no puede realizar esta acción. Si crees que es un error, escribe a soporte.", rateLimited: "Demasiados intentos. Espera {{seconds}} s e inténtalo de nuevo.", rateLimitedNoWait: "Demasiados intentos. Espera un momento e inténtalo de nuevo." },
    guard: { checking: "Verificando tu sesión…", forbiddenTitle: "No tienes acceso a esta sección", forbiddenBody: "Tu cuenta no tiene permisos para esta área. Entra con otra cuenta o vuelve a tu espacio.", goHome: "Ir a mi espacio", noRole: "Tu cuenta aún no tiene un rol asignado." }
  },
  language: { label: "Idioma", "es-BO": "Español", "en-US": "English" },
  invitation: {
    title: "Abre tu invitación", body: "Este enlace está pensado para la app de DOne. Si la tienes instalada, ábrela desde aquí; si no, puedes continuar en el navegador.", openApp: "Abrir en la app de DOne",
    pendingTitle: "Este enlace usa un formato anterior", pendingBody: "Falta el nombre de la celebración en el enlace. Pide a quien te invitó que te envíe el enlace actualizado o ábrelo desde la app de DOne, que sí puede resolverlo.", appTitle: "Tu invitación", appBody: "Este enlace usa un formato anterior y no dice a qué celebración pertenece. Pide a quien te invitó el enlace actualizado.", invalidTitle: "Este enlace no es válido", invalidBody: "Revisa que hayas abierto el enlace completo que te compartieron.", home: "Ir al inicio"
  },
  stubs: { host: { title: "Panel del anfitrión", description: "Gestiona tu celebración desde un solo lugar." }, provider: { title: "Portal del proveedor", description: "Revisa y responde tus solicitudes." }, guest: { title: "Tu invitación", description: "Confirma tu asistencia y descubre los detalles." } },
  ui: {
    partnerDisclaimer: "Enlace patrocinado: al abrirlo sales de DOne. DOne conecta, pero no presta ni garantiza el servicio del proveedor.", action: "Acción", loading: "Cargando…", empty: "No hay información disponible.", genericError: "No se pudo completar la acción.", close: "Cerrar", emptyTable: "No hay registros.", chooseFile: "Seleccionar archivo", dismiss: "Descartar aviso",
    datePlaceholder: "AAAA-MM-DD", confirmChange: "Confirmar cambio", cancel: "Cancelar",
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
  }
} as const;
