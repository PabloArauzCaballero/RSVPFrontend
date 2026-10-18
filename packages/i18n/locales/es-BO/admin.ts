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
  categories: { title: "Categorías de proveedor" },
  geography: { title: "Geografía" },
  verification: { title: "Cola de verificación de proveedores", providerId: "Identificador del proveedor", verify: "Verificar", reject: "Rechazar", suspend: "Suspender", done: "Proveedor actualizado." },
  moderation: { title: "Moderación de microsites y regalos externos" },
  users: { title: "Usuarios y roles" },
  organizations: { title: "Organizaciones" },
  metrics: { title: "Métricas de leads" },
  operations: {
    title: "Estado operativo", services: "Servicios", healthy: "Disponible", down: "No responde",
    replay: "Reconstruir la proyección pública", replayConfirm: "Se borrará y reconstruirá desde el historial de eventos. Los sitios siguen disponibles durante el proceso.",
    replayDone: "Proyección reconstruida: {{count}} eventos aplicados.", grafana: "Abrir Grafana", rabbit: "Abrir RabbitMQ"
  }
} as const;
