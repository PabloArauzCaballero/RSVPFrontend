/** Platform administration (F14, screens E1–E12). */
export const adminEsBO = {
  title: "Administración de la plataforma",
  denied: "Acceso denegado: esta área es solo para administradores de la plataforma.",
  nav: { label: "Módulos de administración", dashboard: "Resumen", templates: "Plantillas", eventTypes: "Tipos de evento", categories: "Categorías", geography: "Geografía", verification: "Verificación", moderation: "Moderación", users: "Usuarios", organizations: "Organizaciones", partners: "Partners", metrics: "Métricas", operations: "Operación" },
  dest: { review: "Revisión", catalog: "Catálogo", people: "Personas", operation: "Operación" },
  unavailable: "Este módulo usa la API de {{service}}, que todavía no está disponible. Cuando se publique, verás aquí sus datos.",
  sample: { title: "Ana y Luis", story: "Nos conocimos en La Paz y hoy celebramos con quienes queremos.", venue: "Hacienda El Prado", dressCode: "Formal", question: "¿Hay estacionamiento?", answer: "Sí, en el mismo lugar.", ceremony: "Ceremonia", party: "Fiesta" },
  saved: "Guardado.",
  dashboard: { activityTitle: "Actividad", title: "Resumen", intro: "Cómo va la plataforma hoy.", templatesDown: "Las plantillas no responden por ahora. El resto del resumen sigue disponible.", more: "Otras acciones", less: "Ocultar", showMore: "Ver más ({{count}} restantes)", eventTypes: "Tipos de evento activos", templates: "Templates publicados", drafts: "Templates en borrador", count: "{{label}}: {{count}}",
    platform: "Plataforma", providersTitle: "Proveedores y ofertas", accountsTitle: "Cuentas y organizaciones",
    statuses: { DRAFT: "Borrador", PENDING_VERIFICATION: "En verificación", VERIFIED: "Verificado", SUSPENDED: "Suspendido", REJECTED: "Rechazado" },
    listingsPublished: "Ofertas publicadas", leadsValid: "Leads válidos", leadsInvalid: "Leads descartados", leadsRecent: "Leads válidos (30 días)", quotes: "Cotizaciones", bookings: "Reservas confirmadas",
    users: "Cuentas", usersByRole: "Cuentas con rol {{role}}", organizations: "Organizaciones" },
  templates: {
    title: "Plantillas de invitación", intro: "Los diseños que los anfitriones eligen para su invitación.", new: "Nuevo template", edit: "Editar {{name}}", name: "Nombre", description: "Descripción", tags: "Etiquetas de tipo de evento", tagsHelp: "Separadas por comas, por ejemplo: wedding, anniversary.",
    layout: "Layout", layouts: { classic: "Clásico", minimal: "Minimalista", editorial: "Editorial", festive: "Festivo", corporate: "Corporativo" },
    palette: "Paleta", colors: { canvas: "Fondo", surface: "Superficie", text: "Texto", accent: "Acento", muted: "Secundario" }, colorHelp: "Color hexadecimal, por ejemplo #865E36.",
    headingFont: "Tipografía de títulos", bodyFont: "Tipografía de texto", sectionStyle: "Estilo de secciones", styles: { plain: "Simple", cards: "Tarjetas", bands: "Bandas" },
    sectionOrder: "Secciones y orden", include: "Incluir {{section}}",
    publish: "Publicar", archive: "Archivar", archiveConfirm: "Archivar es definitivo: el template deja de ofrecerse.",
    status: { DRAFT: "Borrador", PUBLISHED: "Publicado", ARCHIVED: "Archivado" }, version: "Versión {{version}}", preview: "Vista previa"
  },
  eventTypes: {
    title: "Tipos de evento", intro: "Las celebraciones que un anfitrión puede crear.", new: "Nuevo tipo de evento", edit: "Editar {{code}}", code: "Código", codeHelp: "En mayúsculas y guiones bajos, por ejemplo GRADUACION.",
    status: "Estado", statuses: { ACTIVE: "Activo", RETIRED: "Retirado" }, defaultLocale: "Idioma por defecto",
    hostRoles: "Roles de anfitrión", hostRolesHelp: "Separados por comas, por ejemplo GRADUATE, PARENT.", sections: "Secciones habilitadas",
    requiredFields: "Campos obligatorios para publicar", requiredFieldsHelp: "Separados por comas, por ejemplo title, eventDate, hosts.GRADUATE.",
    templateTags: "Etiquetas de templates compatibles", translations: "Traducciones", name: "Nombre ({{locale}})", description: "Descripción ({{locale}})", roleLabel: "{{role}} ({{locale}})",
    problems: { code: "El código va en mayúsculas y guiones bajos, de 2 a 40 caracteres, y empieza con una letra.", roles: "Indica al menos un rol de anfitrión.", sections: "Elige al menos una sección.", tags: "Indica al menos una etiqueta de template compatible.", name: "Escribe el nombre en el idioma por defecto." },
    save: "Guardar tipo de evento", savedHelp: "Ya se puede usar en celebraciones nuevas, sin desplegar."
  },
  errors: { state: { network: "Sin conexión por ahora", unavailable: "Estamos en mantenimiento", server: "Algo falló de nuestro lado" }, code: { INVALID_PARENT: "Esa ubicación superior no encaja: una ciudad cuelga de una región o país, y una región, de un país.", INVALID_TRANSITION: "El estado de este elemento ya cambió y esa acción no aplica. Recarga la lista.", OUTSIDE_AVAILABILITY: "Esa hora queda fuera del horario de atención. Elige una hora dentro del horario del proveedor.", CODE_TAKEN: "Ese código ya existe. Elige otro." }, unauthorized: "Tu sesión terminó. Vuelve a iniciar sesión.", forbidden: "Tu cuenta no tiene permiso para esta operación.", notFound: "Este módulo todavía no está disponible en el servidor o el elemento ya no existe. Inténtalo de nuevo más tarde.", conflict: "Otra persona ya resolvió este elemento. Recarga la lista para ver el estado actual.", invalid: "El servidor rechazó los datos. Revísalos e inténtalo de nuevo.", generic: "No se pudo completar la acción. Revisa tu conexión e inténtalo de nuevo.", network: "No hay conexión con el servidor. Revisa tu internet y reintenta.", rateLimited: "Demasiadas peticiones seguidas. Espera {{seconds}} segundos y reintenta.", rateLimitedNoWait: "Demasiadas peticiones seguidas. Espera un momento y reintenta.", unavailable: "El servicio no está disponible por ahora. Reintenta en unos minutos.", server: "El servidor tuvo un problema. Reintenta en unos minutos.", transition: "El estado del proveedor ya cambió y esa acción no aplica. Recarga la lista.", notOwner: "Solo el titular o un administrador puede hacer esto.", planAdmin: "Solo un administrador puede cambiar el plan.", storage: "El almacenamiento no está activo en este entorno.", other: "No se pudo completar la acción." },
  common: { search: "Buscar", noMatches: "Nada coincide con lo que buscas.", codeFixed: "El código identifica el registro y no se cambia.", allClearTitle: "Todo al día", emptyTitle: "Nada por aquí", reason: "Motivo", reasonRequired: "Escribe el motivo: queda registrado y lo ve el proveedor.", reasonOn: "Motivo: {{reason}}", filter: "Mostrar", name: "Nombre en {{locale}}", nameRequired: "Escribe al menos un nombre.", code: "Código", codeHelp: "Mayúsculas, números y guiones bajos, por ejemplo FOTOGRAFIA.", codeInvalid: "Usa de 2 a 40 caracteres: mayúsculas, números o guion bajo, empezando con una letra.", state: "Estado", active: "Activo", inactive: "Inactivo", save: "Guardar", close: "Cerrar", editItem: "Editar {{name}}" },
  categories: { count_one: "{{count}} categoría", count_other: "{{count}} categorías", title: "Categorías de proveedor", intro: "Con estas categorías se ordenan los proveedores.", new: "Nueva categoría", edit: "Editar {{code}}", list: "Categorías existentes", empty: "Todavía no hay categorías. Crea la primera con el formulario." },
  geography: { count_one: "{{count}} ubicación", count_other: "{{count}} ubicaciones", parentChoose: "Elige una ubicación", inside: "en {{parent}}", title: "Geografía", intro: "Países, regiones y ciudades donde hay proveedores.", new: "Nueva ubicación", edit: "Editar {{code}}", list: "Países, regiones y ciudades", empty: "Todavía no hay ubicaciones. Crea la primera con «Nueva ubicación».", kind: "Tipo", kinds: { COUNTRY: "País", REGION: "Región", CITY: "Ciudad" }, parent: "Pertenece a", parentHelp: "Una ciudad cuelga de una región o país; una región, de un país.", parentRequired: "Indica a qué ubicación pertenece.", codeHelpCity: "Ciudades: minúsculas, números y guiones, por ejemplo santa-cruz. Países y regiones: mayúsculas.", codeInvalidCity: "Usa de 2 a 40 caracteres en minúsculas, números o guiones, empezando con una letra.", latitude: "Latitud", longitude: "Longitud", coordsRequired: "Una ciudad nueva necesita latitud y longitud válidas.", countryReadOnly: "El país no se puede modificar." },
  verification: {
    title: "Verificación de proveedores", intro: "Quienes piden salir en el directorio. Lo pendiente va primero.", statuses: { PENDING: "Pendientes", VERIFIED: "Verificados", REJECTED: "Rechazados", SUSPENDED: "Suspendidos" },
    state: { PENDING: "Pendiente", VERIFIED: "Verificado", REJECTED: "Rechazado", SUSPENDED: "Suspendido" }, submitted: "Enviado el {{when}}", verify: "Verificar", reject: "Rechazar", suspend: "Suspender",
    verifyNamed: "Verificar a {{name}}", rejectNamed: "Rechazar a {{name}}", suspendNamed: "Suspender a {{name}}",
    rejectTitle: "Rechazar a {{name}}", rejectBody: "El proveedor no aparecerá en el buscador. Escribe el motivo para que pueda corregir su solicitud.",
    suspendTitle: "Suspender a {{name}}", suspendBody: "El proveedor deja de aparecer en el buscador y no recibe nuevos leads. Hoy la plataforma no permite reactivarlo: confirma solo si estás seguro.", noActionRejected: "Esperando que el proveedor corrija su ficha y la reenvíe.", noActionSuspended: "Suspendido. La plataforma aún no permite reactivar proveedores.",
    empty: "No hay proveedores en estado «{{status}}».", done: "Proveedor actualizado."
  },
  moderation: {
    title: "Moderación", intro: "Páginas y regalos que propone la gente, antes de que se vean.", statuses: { PENDING: "Pendientes", APPROVED: "Aprobados", REJECTED: "Rechazados" }, state: { PENDING: "Pendiente", APPROVED: "Aprobado", REJECTED: "Rechazado" }, kinds: { MICROSITE: "Página de proveedor", EXTERNAL_GIFT: "Regalo externo" },
    empty: "No hay propuestas en estado «{{status}}».", done: "Decisión registrada.", open: "Abrir {{name}}", approveNamed: "Aprobar {{name}}", rejectNamed: "Rechazar {{name}}",
    approve: "Aprobar", reject: "Rechazar", rejectTitle: "Rechazar {{name}}", rejectBody: "Quien lo propuso verá el motivo. Escríbelo con claridad."
  },
  users: { title: "Usuarios y roles", intro: "Busca una cuenta y dale el rol que necesita.", search: "Buscar usuario", searchHelp: "Por correo electrónico. Déjalo vacío para ver todos.", searchAction: "Buscar", empty: "No hay usuarios que coincidan.", noRoles: "Sin roles", statuses: { ACTIVE: "Activo", SUSPENDED: "Suspendido" }, grant: "Dar rol {{role}}", grantNamed: "Dar rol {{role}} a {{email}}", grantTitle: "¿Dar el rol {{role}} a {{email}}?", grantBody: "El rol se aplica en su próximo inicio de sesión y no se puede quitar desde aquí. El cambio queda registrado.", granted: "Rol otorgado.", hasRole: "Ya tiene el rol {{role}}.", page: "Página {{page}} de {{pages}}", prev: "Anterior", next: "Siguiente", total: "{{count}} cuentas" },
  organizations: { title: "Organizaciones", intro: "Quién está detrás de cada organización.", lookup: "Consultar una organización", id: "Identificador de la organización", idHelp: "El identificador completo (UUID) de la organización.", lookupAction: "Consultar", empty: "Todavía no hay organizaciones registradas.", owner: "Responsable: {{id}}", members: "Miembros: {{count}}" },
  metrics: {
    title: "Solicitudes por periodo", intro: "Cuántas solicitudes generó cada partner y categoría.", groupBy: "Agrupar por", groups: { partner: "Partner", category: "Categoría" }, from: "Desde", to: "Hasta", dateHelp: "Los días se cuentan en UTC.", invalidRange: "Revisa las fechas: «Desde» no puede ser posterior a «Hasta».",
    empty: "No hay leads en este periodo.", total: "Leads en el periodo: {{count}}", columns: { name: "Nombre", leads: "Leads", quotes: "Cotiz.", bookings: "Reserv." }
  },
  operations: {
    title: "Estado operativo", intro: "Si algo no responde, lo ves aquí primero.", services: "Servicios", allUpTitle: "Todo funciona", allUpBody: "Los servicios responden con normalidad.", someDownTitle: "Algo no responde", someDownBody: "Revisa los servicios marcados; el resto sigue disponible.", healthy: "Disponible", down: "No responde",
    replay: "Reconstruir la proyección pública", replayConfirm: "Se borrará y reconstruirá desde el historial de eventos. Los sitios siguen disponibles durante el proceso.",
    replayDone: "Proyección reconstruida: {{count}} eventos aplicados.", grafana: "Abrir Grafana", rabbit: "Abrir RabbitMQ"
  },
  table: {
    pagination: "Páginas de resultados", range: "{{from}}–{{to}} de {{total}}", page: "Página {{page}} de {{pages}}", prev: "Anterior", next: "Siguiente",
    actions: "Acciones", sortBy: "Ordenar por", sortAction: "Ordenar por {{column}}", sortOption: { ascending: "{{column}} (A-Z)", descending: "{{column}} (recientes primero)" }, updating: "Actualizando la lista…"
  },
  stepper: { progress: "Avance del formulario", step: "Paso {{step}} de {{total}}" },
  partners: {
    title: "Partners", intro: "Los proveedores de la plataforma. Aquí se crean, con su KYP completo, y se administran.", create: "Crear partner",
    total_one: "{{count}} partner", total_other: "{{count}} partners", unknownUser: "Cuenta no encontrada", noSlug: "Sin micrositio", ciDue: "CI vence el {{date}}", choose: "Elige una opción",
    columns: { partner: "Partner", owner: "Dueño", status: "Estado", kyp: "KYP", categoryCity: "Categoría y ciudad", created: "Alta", updated: "Última modificación", origin: "Origen", listings: "Ofertas publicadas" },
    statuses: { DRAFT: "Borrador", PENDING_VERIFICATION: "En verificación", VERIFIED: "Verificado", SUSPENDED: "Suspendido", REJECTED: "Rechazado" },
    kypStatuses: { COMPLETE: "KYP completo", PENDING: "KYP pendiente", EXPIRING: "KYP por vencer", EXPIRED: "KYP vencido" },
    origins: { ADMIN: "Admin", SELF_SERVICE: "Autoservicio" },
    plans: { FREE: "Gratis", FEATURED: "Destacado", PREMIUM: "Premium" },
    personTypes: { NATURAL: "Persona natural", UNIPERSONAL: "Empresa unipersonal", JURIDICA: "Persona jurídica" },
    personTypeHelp: { NATURAL: "Trabaja a su nombre, con NIT y sin matrícula de comercio.", UNIPERSONAL: "Negocio de una sola persona con matrícula SEPREC.", JURIDICA: "Sociedad (SRL, SA…) con matrícula SEPREC y representante legal." },
    extensions: { LP: "La Paz", CB: "Cochabamba", SC: "Santa Cruz", OR: "Oruro", PT: "Potosí", CH: "Chuquisaca", TJ: "Tarija", BE: "Beni", PD: "Pando" },
    review: { PENDING: "Sin revisar", ACCEPTED: "Aceptado", REJECTED: "Rechazado" },
    filters: {
      label: "Filtrar partners", q: "Buscar", qHelp: "Nombre, slug, NIT, razón social o id del dueño.", search: "Buscar", category: "Categoría", city: "Ciudad",
      expiring: "KYP por vencer en {{days}} días", more: "Más filtros", less: "Menos filtros", clear: "Limpiar ({{count}})", listings: "Ofertas publicadas", withListings: "Con ofertas publicadas", withoutListings: "Sin ofertas publicadas", from: "Alta desde", to: "Alta hasta"
    },
    empty: { title: "Todavía no hay partners", body: "Crea el primero con «Crear partner».", filteredTitle: "Ningún partner coincide", filtered: "Cambia o limpia los filtros para ver más." },
    drafts: { title_one: "Tienes {{count}} alta sin terminar", title_other: "Tienes {{count}} altas sin terminar", item: "{{name}} · guardado {{when}}", unnamed: "Sin nombre todavía", continue: "Continuar borrador" },
    actions: {
      menu: "Acciones de {{name}}", view: "Ver detalle", viewNamed: "Ver detalle de {{name}}", edit: "Editar", suspend: "Suspender", reactivate: "Reactivar", completeKyp: "Completar KYP", reviewDocuments: "Revisar documentos",
      microsite: "Ver micrositio", micrositeNamed: "Ver el micrositio de {{name}}", copyId: "Copiar ID", changeOwnerBlocked: "Cambiar dueño · Disponible cuando exista la revocación de roles (F4)", changeOwner: "Cambiar dueño"
    },
    suspend: { title: "Suspender a {{name}}", body: "Sus ofertas dejan de publicarse y no recibe solicitudes nuevas. El motivo queda registrado y se lo comunicamos al proveedor." },
    reactivate: { title: "Reactivar a {{name}}", body: "Vuelve a estar verificado si su KYP está completo o por vencer. El motivo queda registrado." },
    done: { created: "Partner creado y verificado.", saved: "Cambios guardados.", kyp: "KYP completo: el partner queda al día.", suspended: "Partner suspendido.", reactivated: "Partner reactivado.", copied: "ID copiado: {{id}}", copyFailed: "No se pudo copiar. El ID es {{id}}", ownerChanged: "Dueño cambiado." },
    steps: { owner: "Dueño", identity: "Identidad", contact: "Contacto", coverage: "Cobertura", kyp: "KYP", summary: "Resumen" },
    owner: {
      intro: "El partner se vincula a una cuenta que ya existe. Busca su correo exacto.", email: "Correo de la cuenta del dueño", search: "Buscar cuenta",
      notFound: "No existe una cuenta con ese correo: pide al proveedor que se registre.", found: "Cuenta encontrada: {{email}}", since: "Cuenta creada", roles: "Roles actuales",
      roleNote: "Al crear el partner esta cuenta recibe el rol PROVIDER.", required: "Busca y confirma la cuenta del dueño para seguir.",
      changeTitle: "Cambiar el dueño de {{name}}", changeIntro: "El partner pasa a otra cuenta que ya existe. Busca su correo exacto y escribe el motivo.", current: "Dueño actual", newEmail: "Correo de la cuenta del nuevo dueño",
      confirm: "Cambiar dueño", reload: "Recargar el partner", reasonRequired: "Escribe el motivo: queda registrado en la auditoría.",
      roleSteps: "El nuevo dueño recibe el rol PROVIDER. El anterior lo pierde si no tiene otros partners.",
      grantFailed: "No se pudo dar el rol PROVIDER al nuevo dueño, así que el dueño no cambió. Vuelve a intentarlo.",
      changed: "El partner ahora es de {{email}}.", revoked: "El dueño anterior ya no tiene el rol PROVIDER.",
      keepsRole_one: "El dueño anterior conserva el rol PROVIDER porque tiene {{count}} partner más.", keepsRole_other: "El dueño anterior conserva el rol PROVIDER porque tiene {{count}} partners más.",
      revokeFailed: "El dueño anterior conserva el rol PROVIDER; revócalo desde Usuarios.", reloginBoth: "Los dos deben volver a iniciar sesión para ver el cambio en su portal.",
      codes: {
        OWNER_CHANGE_UNAVAILABLE: "El cambio de dueño aún no está habilitado en el servidor.", SAME_OWNER: "Esa cuenta ya es la dueña de este partner. Elige otra.",
        REASON_REQUIRED: "El servidor no recibió el motivo. Recarga el partner y escríbelo de nuevo.", PARTNER_VERSION_CONFLICT: "Alguien cambió este partner mientras lo editabas. Recárgalo y vuelve a intentarlo."
      }
    },
    fields: {
      name: "Nombre comercial", slug: "Dirección del micrositio", slugHelp: "Se verá en /p/{{slug}}. Minúsculas, números y guiones.", categories: "Categorías", categoriesHelp: "Elige de una a diez.", description: "Descripción", plan: "Plan",
      whatsapp: "WhatsApp", phone: "Teléfono", phoneHelp: "Con código de país si no es de Bolivia, por ejemplo +591 70000000.", publicEmail: "Correo público", website: "Sitio web", websiteHelp: "La dirección completa, con https://.", social: "Redes sociales", instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok",
      department: "Departamento", city: "Ciudad", cityFirst: "Elige primero el departamento.", zones: "Ciudades que atiende", zonesHelp: "Solo ciudades de la geografía de la plataforma.",
      personType: "Tipo de persona", legalName: "Razón social", legalNameNatural: "Nombre completo", nit: "NIT", nitHelp: "Solo números, de 7 a 12 dígitos.", seprec: "Matrícula SEPREC", seprecDate: "Fecha de la matrícula",
      companyType: "Tipo societario", companyTypeHelp: "Por ejemplo SRL o SA.", addressLine: "Dirección legal",
      repFullName: "Nombre completo", ci: "Carnet de identidad", ciNumber: "Número de CI", ciNumberHelp: "Solo números.", ciExtension: "Extensión", ciComplement: "Complemento", ciComplementHelp: "Opcional, 1 o 2 caracteres.", ciExpiresOn: "Vencimiento del CI",
      inRegistration: "El representante figura en la matrícula", poaNumber: "Número del poder", poaNotary: "Notaría", poaDate: "Fecha del poder",
      hasBank: "Agregar cuenta bancaria", hasBankHelp: "Opcional. Si la agregas, también hace falta el certificado bancario.", bank: "Banco", accountNumber: "Número de cuenta", holder: "Titular de la cuenta", currency: "Moneda", noBank: "Sin cuenta bancaria"
    },
    kyp: {
      chooseType: "Elige el tipo de persona para ver lo que hace falta.", business: "Datos legales", address: "Domicilio legal", holder: "Titular", representative: "Representante legal", powerOfAttorney: "Poder del representante",
      poaRequired: "El poder es obligatorio porque el representante no figura en la matrícula.", poaOptional: "El poder es opcional en este caso."
    },
    documents: {
      title: "Documentos KYP", help: "PDF, JPG, PNG o WebP de hasta 10 MB. Los obligatorios dependen del tipo de persona.", choose: "Subir archivo", replace: "Subir otro", remove: "Quitar", uploading: "Subiendo", uploaded: "Recibido", missing: "Falta",
      putFailed: "No se pudo enviar el archivo. Inténtalo de nuevo.", others: "Otros documentos: {{names}}", pendingUpload: "subida sin terminar", download: "Descargar", accept: "Aceptar", reject: "Rechazar",
      rejectTitle: "Rechazar {{name}}", rejectBody: "El proveedor verá el motivo. Escribe qué tiene que corregir.", unknownKind: "Documento ({{kind}})",
      kinds: { IDENTITY: "Carnet de identidad", BUSINESS_REGISTRATION: "Matrícula de comercio (SEPREC)", TAX_ID: "Certificado de NIT", ADDRESS_PROOF: "Comprobante de domicilio", POWER_OF_ATTORNEY: "Poder del representante", BANK_CERTIFICATE: "Certificado bancario", OTHER: "Otro documento" }
    },
    codes: {
      REQUIRED: "Falta este dato.", TOO_LONG: "Es demasiado largo.", INVALID_SLUG: "Usa de 3 a 60 caracteres: minúsculas, números y guiones sueltos.", SLUG_TAKEN: "Esa dirección ya la usa otro partner. Elige otra.", TOO_MANY: "Elige como máximo diez.",
      UNKNOWN_CATEGORY: "Esa categoría ya no existe. Elige otra.", INVALID_PLAN: "Elige un plan de la lista.", INVALID_PHONE: "Escribe solo números (de 7 a 20), con + opcional al inicio.", INVALID_EMAIL: "Escribe un correo válido, por ejemplo nombre@dominio.bo.",
      INVALID_URL: "Escribe la dirección completa, empezando con https://.", UNKNOWN_DEPARTMENT: "Elige un departamento de la lista.", UNKNOWN_CITY: "Elige una ciudad de la lista.", CITY_NOT_IN_DEPARTMENT: "Esa ciudad no es de ese departamento.",
      UNKNOWN_ZONE: "Alguna ciudad elegida ya no existe. Revísalas.", INVALID_PERSON_TYPE: "Elige el tipo de persona.", INVALID_NIT: "El NIT lleva solo números, de 7 a 12 dígitos.", INVALID_SEPREC: "Usa letras, números y guiones (hasta 40).",
      INVALID_DATE: "Elige una fecha válida.", DATE_IN_FUTURE: "La fecha no puede ser futura.", INVALID_CI: "El CI lleva solo números, de 4 a 10 dígitos.", INVALID_CI_EXTENSION: "Elige la extensión de la lista.", INVALID_CI_COMPLEMENT: "El complemento tiene 1 o 2 letras o números.",
      CI_EXPIRED: "El CI está vencido: pide el carnet vigente para poder crear el partner.", INVALID_ACCOUNT: "El número de cuenta lleva solo números, de 6 a 20 dígitos.", INVALID_CURRENCY: "Elige BOB o USD.",
      MISSING: "Falta o no es válido: revísalo.", MISSING_DOCUMENT: "Falta subir este documento.", INVALID: "Revisa este dato."
    },
    nit: {
      inUse_one: "Este NIT ya lo usa otro partner:", inUse_other: "Este NIT ya lo usan otros {{count}} partners:", inUseHelp: "Puede ser la misma empresa con otra marca. Revisa que el NIT esté bien escrito antes de seguir.",
      acknowledge: "Confirmo que este NIT ya lo usa otro partner y quiero continuar", acknowledgeRequired: "Marca la casilla para continuar con un NIT que ya está en uso."
    },
    detail: {
      title: "Partner", audit: "Historial de auditoría", noAudit: "Sin cambios registrados todavía.", auditLine: "{{action}} · {{who}} · {{when}}", noKyp: "Este partner todavía no tiene KYP. Usa «Completar KYP».", noDocuments: "Sin documentos.",
      revealCi: "Mostrar CI", revealAudited: "Ver el CI completo queda registrado en la auditoría.", kypDue: "Vencimiento del CI", yes: "Sí", no: "No"
    },
    wizard: {
      createTitle: "Crear partner", editTitle: "Editar {{name}}", kypTitle: "Completar KYP de {{name}}", next: "Siguiente", save: "Guardar cambios", completeKyp: "Completar KYP", create: "Crear partner", saveAndClose: "Guardar y cerrar",
      confirmReviewed: "Confirmo que revisé los documentos KYP", confirmRequired: "Marca la casilla para confirmar que revisaste los documentos.",
      fixErrors_one: "Hay {{count}} dato por corregir. Te llevamos al paso donde está.", fixErrors_other: "Hay {{count}} datos por corregir. Te llevamos al primer paso donde están.",
      grantFailed: "No se pudo dar el rol PROVIDER al dueño, así que el partner no se creó. Vuelve a intentarlo.", alreadyCommitted: "Este borrador ya creó su partner. Ciérralo y búscalo en la lista.",
      created: "{{name}} ya es partner", reloginNote: "El dueño debe volver a iniciar sesión para ver su portal."
    }
  }
} as const;
