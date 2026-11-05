/** Platform administration (F14, screens E1–E12). */
export const adminEsBO = {
  title: "Administración de la plataforma",
  denied: "Acceso denegado: esta área es solo para administradores de la plataforma.",
  nav: { label: "Módulos de administración", dashboard: "Resumen", templates: "Templates", eventTypes: "Tipos de evento", categories: "Categorías", geography: "Geografía", verification: "Verificación", moderation: "Moderación", users: "Usuarios", organizations: "Organizaciones", metrics: "Métricas", operations: "Operación" },
  unavailable: "Este módulo usa la API de {{service}}, que todavía no está disponible. Cuando se publique, verás aquí sus datos.",
  sample: { title: "Ana y Luis", story: "Nos conocimos en La Paz y hoy celebramos con quienes queremos.", venue: "Hacienda El Prado", dressCode: "Formal", question: "¿Hay estacionamiento?", answer: "Sí, en el mismo lugar.", ceremony: "Ceremonia", party: "Fiesta" },
  saved: "Guardado.",
  dashboard: { title: "Resumen", eventTypes: "Tipos de evento activos", templates: "Templates publicados", drafts: "Templates en borrador", count: "{{label}}: {{count}}" },
  templates: {
    title: "Templates", new: "Nuevo template", edit: "Editar {{name}}", name: "Nombre", description: "Descripción", tags: "Etiquetas de tipo de evento", tagsHelp: "Separadas por comas, por ejemplo: wedding, anniversary.",
    layout: "Layout", layouts: { classic: "Clásico", minimal: "Minimalista", editorial: "Editorial", festive: "Festivo", corporate: "Corporativo" },
    palette: "Paleta", colors: { canvas: "Fondo", surface: "Superficie", text: "Texto", accent: "Acento", muted: "Secundario" }, colorHelp: "Color hexadecimal, por ejemplo #865E36.",
    headingFont: "Tipografía de títulos", bodyFont: "Tipografía de texto", sectionStyle: "Estilo de secciones", styles: { plain: "Simple", cards: "Tarjetas", bands: "Bandas" },
    sectionOrder: "Secciones y orden", include: "Incluir {{section}}",
    publish: "Publicar", archive: "Archivar", archiveConfirm: "Archivar es definitivo: el template deja de ofrecerse.",
    status: { DRAFT: "Borrador", PUBLISHED: "Publicado", ARCHIVED: "Archivado" }, version: "Versión {{version}}", preview: "Vista previa"
  },
  eventTypes: {
    title: "Tipos de evento", new: "Nuevo tipo de evento", edit: "Editar {{code}}", code: "Código", codeHelp: "En mayúsculas y guiones bajos, por ejemplo GRADUACION.",
    status: "Estado", statuses: { ACTIVE: "Activo", RETIRED: "Retirado" }, defaultLocale: "Idioma por defecto",
    hostRoles: "Roles de anfitrión", hostRolesHelp: "Separados por comas, por ejemplo GRADUATE, PARENT.", sections: "Secciones habilitadas",
    requiredFields: "Campos obligatorios para publicar", requiredFieldsHelp: "Separados por comas, por ejemplo title, eventDate, hosts.GRADUATE.",
    templateTags: "Etiquetas de templates compatibles", translations: "Traducciones", name: "Nombre ({{locale}})", description: "Descripción ({{locale}})", roleLabel: "{{role}} ({{locale}})",
    save: "Guardar tipo de evento", savedHelp: "Ya se puede usar en celebraciones nuevas, sin desplegar."
  },
  errors: { unauthorized: "Tu sesión terminó. Vuelve a iniciar sesión.", forbidden: "Tu cuenta no tiene permiso para esta operación.", notFound: "Este módulo todavía no está disponible en el servidor o el elemento ya no existe. Inténtalo de nuevo más tarde.", conflict: "Otra persona ya resolvió este elemento. Recarga la lista para ver el estado actual.", invalid: "El servidor rechazó los datos. Revísalos e inténtalo de nuevo.", generic: "No se pudo completar la acción. Revisa tu conexión e inténtalo de nuevo." },
  common: { reason: "Motivo", reasonRequired: "Escribe el motivo: queda registrado y lo ve el proveedor.", reasonOn: "Motivo: {{reason}}", filter: "Mostrar", name: "Nombre ({{locale}})", nameRequired: "Escribe al menos un nombre.", code: "Código", codeHelp: "Mayúsculas, números y guiones bajos, por ejemplo FOTOGRAFIA.", codeInvalid: "Usa de 2 a 40 caracteres: mayúsculas, números o guion bajo, empezando con una letra.", state: "Estado", active: "Activo", inactive: "Inactivo", save: "Guardar", editItem: "Editar {{name}}" },
  categories: { title: "Categorías de proveedor", new: "Nueva categoría", edit: "Editar {{code}}", list: "Categorías existentes", empty: "Todavía no hay categorías. Crea la primera con el formulario." },
  geography: { title: "Geografía", new: "Nueva ubicación", edit: "Editar {{code}}", list: "Países, regiones y ciudades", empty: "Todavía no hay ubicaciones. Crea la primera con el formulario.", kind: "Tipo", kinds: { COUNTRY: "País", REGION: "Región", CITY: "Ciudad" }, parent: "Código de la ubicación superior", parentHelp: "Una ciudad cuelga de una región o país; una región, de un país.", parentRequired: "Indica a qué ubicación pertenece." },
  verification: {
    title: "Cola de verificación de proveedores", statuses: { PENDING: "Pendientes", VERIFIED: "Verificados", REJECTED: "Rechazados", SUSPENDED: "Suspendidos" },
    submitted: "Enviado el {{when}}", verify: "Verificar", reject: "Rechazar", suspend: "Suspender",
    verifyNamed: "Verificar a {{name}}", rejectNamed: "Rechazar a {{name}}", suspendNamed: "Suspender a {{name}}",
    rejectTitle: "Rechazar a {{name}}", rejectBody: "El proveedor no aparecerá en el buscador. Escribe el motivo para que pueda corregir su solicitud.",
    suspendTitle: "Suspender a {{name}}", suspendBody: "El proveedor deja de aparecer en el buscador y no recibe nuevos leads hasta que lo verifiques de nuevo.",
    empty: "No hay proveedores en estado «{{status}}».", done: "Proveedor actualizado."
  },
  moderation: {
    title: "Moderación de microsites y regalos externos", statuses: { PENDING: "Pendientes", APPROVED: "Aprobados", REJECTED: "Rechazados" }, kinds: { MICROSITE: "Microsite", EXTERNAL_GIFT: "Regalo externo" },
    empty: "No hay propuestas en estado «{{status}}».", done: "Decisión registrada.", open: "Abrir {{name}}", approveNamed: "Aprobar {{name}}", rejectNamed: "Rechazar {{name}}",
    reject: "Rechazar", rejectTitle: "Rechazar {{name}}", rejectBody: "Quien lo propuso verá el motivo. Escríbelo con claridad."
  },
  users: { title: "Usuarios y roles", search: "Buscar usuario", searchHelp: "Por correo electrónico. Déjalo vacío para ver todos.", searchAction: "Buscar", empty: "No hay usuarios que coincidan.", noRoles: "Sin roles", statuses: { ACTIVE: "Activo", SUSPENDED: "Suspendido" } },
  organizations: { title: "Organizaciones", lookup: "Consultar una organización", id: "Identificador de la organización", idHelp: "El identificador completo (UUID) de la organización.", lookupAction: "Consultar", empty: "Todavía no hay organizaciones registradas.", owner: "Responsable: {{id}}", members: "Miembros: {{count}}" },
  metrics: {
    title: "Métricas de leads", groupBy: "Agrupar por", groups: { partner: "Partner", category: "Categoría" }, from: "Desde", to: "Hasta", dateHelp: "Formato AAAA-MM-DD, en UTC.", invalidRange: "Revisa las fechas: usa AAAA-MM-DD y que «Desde» no sea posterior a «Hasta».",
    empty: "No hay leads en este periodo.", total: "Leads en el periodo: {{count}}", columns: { name: "Nombre", leads: "Leads", quotes: "Cotiz.", bookings: "Reserv." }
  },
  operations: {
    title: "Estado operativo", services: "Servicios", healthy: "Disponible", down: "No responde",
    replay: "Reconstruir la proyección pública", replayConfirm: "Se borrará y reconstruirá desde el historial de eventos. Los sitios siguen disponibles durante el proceso.",
    replayDone: "Proyección reconstruida: {{count}} eventos aplicados.", grafana: "Abrir Grafana", rabbit: "Abrir RabbitMQ"
  }
} as const;
