/** Portal del proveedor (F28): alta, verificación, ofertas, destinos, agenda, leads y métricas. */
export const portalEsBO = {
  label: "Portal del proveedor",
  nav: { label: "Secciones del portal", home: "Resumen", services: "Servicios y productos", products: "Productos", delivery: "Condiciones de entrega", microsite: "Perfil público", documents: "Documentos de verificación", destinations: "Destinos de contacto", agenda: "Agenda y reservas", leads: "Leads y cotizaciones", metrics: "Métricas" },
  microsite: {
    title: "Perfil público", intro: "Lo que ven tus clientes en tu página. Se guarda completo cada vez; si alguien más lo cambió, te avisamos antes de pisarlo.",
    descEs: "Descripción (español)", descEn: "Descripción (inglés)", descHelp: "Hasta 2000 caracteres.", website: "Sitio web", instagram: "Instagram", facebook: "Facebook", whatsapp: "WhatsApp (con código de país)",
    address: "Dirección", addressHelp: "Calle y número.", reference: "Referencia", hours: "Horario de atención", hoursOpens: "Abre (HH:MM)", hoursCloses: "Cierra (HH:MM)", hoursDays: "Días (0 = domingo, ej. 1,2,3,4,5)", hoursNote: "Nota del horario",
    save: "Guardar perfil", saving: "Guardando…", saved: "Perfil guardado (versión {{version}}).", conflict: "Alguien guardó una versión más reciente. Recargamos el perfil; revisa y vuelve a guardar.", invalid: "Revisa los campos marcados.", invalidUrl: "Escribe una dirección completa que empiece por https://.", invalidHour: "Usa el formato HH:MM, y que abra antes de cerrar.", invalidDays: "Escribe días entre 0 y 6 separados por comas.", invalidPhone: "Solo dígitos, con + opcional (6 a 15).", tooLong: "La descripción admite hasta 2000 caracteres.", version: "Versión {{version}}", reload: "Recargar"
  },
  documents: {
    title: "Documentos de verificación", intro: "Sube los documentos que respaldan tu negocio. Son privados: solo tú y el equipo de verificación pueden verlos. PDF, JPG, PNG o WebP de hasta 10 MB.",
    kind: "Tipo de documento", kinds: { IDENTITY: "Documento de identidad", BUSINESS_REGISTRATION: "Registro del negocio", TAX_ID: "Identificación tributaria", ADDRESS_PROOF: "Comprobante de domicilio", OTHER: "Otro" },
    choose: "Elegir archivo", upload: "Subir documento", uploading: "Subiendo…", uploaded: "Documento subido.", delete: "Eliminar", deleteTitle: "¿Eliminar este documento?", deleteBody: "Se borra el archivo y su registro. Para verificarte tendrás que subirlo de nuevo.", deleted: "Documento eliminado.", opening: "Abriendo…", empty: "Todavía no subiste documentos.", status: { PENDING_UPLOAD: "Subida pendiente", UPLOADED: "Recibido" },
    tooBig: "El archivo supera los 10 MB.", badType: "Solo PDF, JPG, PNG o WebP.", none: "Elige un archivo primero.", putFailed: "No se pudo enviar el archivo. Inténtalo de nuevo.", download: "Ver", size: "{{kb}} KB", webOnly: "En esta versión la carga de archivos funciona en el navegador."
  },
  loading: "Cargando tu portal…",
  onboarding: {
    title: "Registra tu negocio", intro: "Crea tu ficha de proveedor. Después la enviarás a verificación: solo los proveedores verificados aparecen en el directorio.",
    name: "Nombre del negocio", nameHelp: "Es el nombre que verán las parejas.", submit: "Crear mi ficha", creating: "Creando…", required: "Escribe el nombre de tu negocio.", tooLong: "El nombre admite hasta 120 caracteres.",
    existingTitle: "¿Ya tienes una ficha?", existingBody: "Conéctala con su código de proveedor. (El servicio todavía no permite buscar tus fichas por cuenta.)", existingId: "Código de proveedor", connect: "Conectar ficha", invalidId: "El código debe ser un identificador válido.", notFound: "No encontramos un proveedor con ese código.", notOwner: "Esa ficha pertenece a otra cuenta."
  },
  status: {
    title: "Estado de verificación",
    DRAFT: { label: "Borrador", body: "Completa tus ofertas y destinos de contacto, y envía la ficha a verificación." },
    PENDING_VERIFICATION: { label: "En verificación", body: "Un administrador está revisando tu ficha. Mientras tanto no aparece en el directorio." },
    VERIFIED: { label: "Verificado", body: "Tu ficha es pública. Las ofertas publicadas aparecen en el directorio y en tu microsite." },
    REJECTED: { label: "Rechazada", body: "El equipo no aprobó tu ficha. Corrige lo que te indicaron y envíala de nuevo a verificación." },
    SUSPENDED: { label: "Suspendido", body: "Tu ficha está suspendida y no aparece en el directorio. Contacta al equipo para resolverlo." },
    submit: "Enviar a verificación", submitting: "Enviando…", submitted: "Ficha enviada a verificación.", needsListing: "Antes de enviar, crea al menos una oferta.",
    documentsNote: "Sube tus documentos en la sección Documentos de verificación; el equipo los revisa junto con tu ficha.",
    publicPage: "Ver mi microsite"
  },
  home: { title: "Resumen del proveedor", intro: "Aquí ves cómo te encuentran las parejas y qué te piden.", slug: "Dirección pública: /p/{{slug}}", plan: "Plan {{plan}}", zone: "Zona horaria: {{zone}}", last30: "Últimos 30 días" },
  services: {
    title: "Servicios", intro: "Cada oferta tiene su precio y sus condiciones de entrega. Publica las que quieras mostrar.", empty: "Aún no creaste ofertas.", type: { SERVICE: "Servicio", PRODUCT: "Producto" }, published: "Publicado", draft: "Borrador", publish: "Publicar", publishing: "Publicando…", needsTerms: "Para publicar esta oferta primero debe declarar sus condiciones de entrega.", published_ok: "Oferta publicada.",
    new: { title: "Nueva oferta", kind: "Tipo", name: "Nombre", price: "Precio desde (Bs.)", priceHelp: "Opcional, por ejemplo 450.", category: "Categoría", city: "Ciudad", whatsapp: "WhatsApp (enlace https://wa.me/…)", site: "Sitio web (https://…)", destinationsHelp: "Al menos un destino de contacto.", fulfillmentTitle: "Condiciones de entrega", responsible: "Responsable de la entrega", responsibleProvider: "Yo (el proveedor)", responsibleCustomer: "El cliente", coverage: "Zonas de cobertura", coverageHelp: "Separadas por coma, por ejemplo la-paz, el-alto.", transport: "Costo de traslado (Bs.)", lead: "Plazo (días de anticipación)", conditions: "Condiciones", submit: "Crear oferta", creating: "Creando…", created: "Oferta creada como borrador." },
    errors: { nameLong: "El nombre admite hasta 120 caracteres.", name: "Escribe el nombre de la oferta.", destination: "Agrega al menos un destino de contacto.", coverage: "Indica al menos una zona de cobertura.", price: "Escribe un precio válido, por ejemplo 450.50.", url: "Escribe un enlace válido que empiece con https://.", conditions: "Escribe las condiciones de entrega.", lead: "Escribe un plazo en días (0 o más)." }
  },
  products: {
    title: "Productos", intro: "Los productos son lo que los anfitriones pueden agregar a su lista de regalos. Cada uno lleva su precio y sus condiciones de entrega.", empty: "Aún no creaste productos."
  },
  delivery: {
    title: "Condiciones de entrega", intro: "Así leen los anfitriones y los invitados cómo entregas cada oferta: quién se encarga, dónde llegas, cuánto cuesta el traslado y con cuántos días de anticipación.", fixedNote: "Las condiciones se fijan al crear la oferta; el servidor todavía no permite editarlas. Si necesitas cambiarlas, crea la oferta de nuevo.", empty: "Aún no tienes ofertas con condiciones de entrega.", responsible: "Entrega a cargo de: {{who}}", coverage: "Cobertura: {{zones}}", transport: "Traslado: {{price}}", noTransport: "no cobras traslado", lead: "Plazo: {{days}} días de anticipación", missing: "Esta oferta no declara condiciones de entrega."
  },
  destinations: {
    title: "Destinos de contacto y UTM", intro: "Elige a dónde llevamos a las parejas cuando tocan un botón de contacto. Siempre salen por el redirector, que registra el lead.", enabled: "Destinos habilitados", atLeastOne: "Elige al menos un destino.",
    destination: { OFFICIAL_SITE: "Sitio web", LANDING: "Página de aterrizaje", WHATSAPP: "WhatsApp", PHONE: "Teléfono", EMAIL: "Correo", INSTAGRAM: "Instagram", PRODUCT_PAGE: "Página del producto" },
    utmTitle: "UTM y atribución", utmSource: "utm_source", utmMedium: "utm_medium", utmCampaign: "utm_campaign (opcional)", utmHelp: "Solo letras, números, punto, guion y guion bajo.", utmInvalid: "Usa solo letras, números, punto, guion o guion bajo (máx. 64).", dedupe: "Minutos para no contar dos clics del mismo visitante", cap: "Tope mensual de leads (0 = sin tope)", billing: "Modelo de cobro", save: "Guardar destinos", saving: "Guardando…", saved: "Destinos guardados.", numberInvalid: "Escribe enteros válidos: minutos entre 1 y 1440 y tope entre 0 y 1000000."
  },
  agenda: {
    title: "Agenda y reservas", intro: "Define cuándo atiendes. Las parejas ven tus días libres en tu zona horaria ({{zone}}).", capacity: "Cupos por día", weekdays: "Días de atención", weekday: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"], start: "Desde", end: "Hasta", timeInvalid: "Usa el formato HH:MM, por ejemplo 08:00.", rangeInvalid: "La hora de cierre debe ser posterior a la de apertura.",
    blackouts: "Días bloqueados", blackoutDate: "Fecha (AAAA-MM-DD)", blackoutReason: "Motivo (opcional)", addBlackout: "Bloquear día", removeBlackout: "Quitar", dateInvalid: "Usa el formato AAAA-MM-DD.", save: "Guardar agenda", saving: "Guardando…", saved: "Agenda guardada.", capacityInvalid: "Escribe un número entero de cupos entre 1 y 1000.", blackoutEnd: "Hasta (opcional, AAAA-MM-DD)", dateReal: "Esa fecha no existe en el calendario.", blackoutDuplicate: "Ese día ya está bloqueado.", endBefore: "La fecha final no puede ser anterior a la inicial.", rejectTitle: "¿Rechazar esta solicitud?", rejectBody: "La pareja verá que no puedes atender esa fecha. No se puede deshacer.", cancelTitle: "¿Cancelar esta reserva?", cancelBody: "La pareja será avisada de que la fecha queda libre. No se puede deshacer.", keep: "Volver",
    bookings: "Solicitudes de fecha", bookingsEmpty: "No tienes solicitudes de fecha.", status: { REQUESTED: "Pendiente", CONFIRMED: "Confirmada", REJECTED: "Rechazada", CANCELLED: "Cancelada", EXPIRED: "Vencida" }, confirm: "Confirmar", reject: "Rechazar", cancel: "Cancelar reserva", decided: "Solicitud actualizada.", stale: "Esa solicitud ya cambió de estado; actualizamos la lista.", date: "Fecha: {{date}}", expires: "Vence {{when}}"
  },
  leads: {
    title: "Leads y cotizaciones", intro: "Cada clic en tus contactos y cada cotización que te piden queda aquí.", empty: "Todavía no tienes leads.", more: "Cargar más", shown: "Mostrando {{shown}} de {{total}}", quotesTitle: "Cotizaciones recibidas", quotesEmpty: "Aún no recibes cotizaciones.", clicksTitle: "Clics en tus contactos",
    kind: { REDIRECT: "Clic", FORM: "Cotización" }, valid: "Válido", invalid: { dup: "Duplicado", bot: "Descartado (bot)" }, destination: "Destino: {{destination}}", surface: "Origen: {{surface}}", when: "{{when}}", billable: "Facturable", event: "Fecha del evento: {{date}}", guests: "{{count}} invitados"
  },
  metrics: {
    title: "Métricas de leads", intro: "Impresiones, clics, CTR y leads válidos del período.", from: "Desde (AAAA-MM-DD)", to: "Hasta (AAAA-MM-DD)", apply: "Ver métricas", dateInvalid: "Usa el formato AAAA-MM-DD y un período válido.", empty: "No hay datos en este período.",
    impressions: "Impresiones", clicks: "Clics", ctr: "CTR", validLeads: "Leads válidos", invalidLeads: "Leads descartados", groupBy: "Agrupar por", group: { day: "Día", category: "Categoría", destination: "Destino" }, groupsTitle: "Detalle por {{group}}"
  },
  errors: {
    forbidden: "Esta cuenta no puede gestionar este proveedor.", generic: "No pudimos completar la acción.", retry: "Reintentar", noProvider: "Primero registra tu negocio.", goOnboarding: "Registrar mi negocio",
    network: "No hay conexión con el servidor. Revisa tu internet y vuelve a intentarlo; lo que escribiste sigue aquí.", rateLimited: "Hiciste muchas peticiones seguidas. Espera {{seconds}} segundos y reintenta.", rateLimitedNoWait: "Hiciste muchas peticiones seguidas. Espera un momento y reintenta.",
    unavailable: "El servicio no está disponible por ahora. Reintenta en unos minutos.", server: "El servidor tuvo un problema. No se perdió lo que escribiste: reintenta en unos minutos.", storage: "El almacenamiento de documentos no está activo en este entorno. No se guardó nada; inténtalo más tarde.",
    transition: "El estado de tu ficha ya cambió y esa acción no aplica. Recarga para ver el estado actual.", notOwner: "Solo el titular de la ficha o un administrador puede hacer esto.", planAdmin: "Solo un administrador puede cambiar el plan."
  },
  rename: { action: "Editar nombre", field: "Nombre del negocio", save: "Guardar nombre", saving: "Guardando…", saved: "Nombre actualizado.", cancel: "Cancelar", required: "Escribe el nombre de tu negocio.", tooLong: "El nombre admite hasta 120 caracteres." }
} as const;
