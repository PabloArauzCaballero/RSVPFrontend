/** Portal del proveedor (F28): alta, verificación, ofertas, destinos, agenda, leads y métricas. */
export const portalEsBO = {
  label: "Portal del proveedor",
  nav: { label: "Secciones del portal", home: "Resumen", services: "Ofertas", products: "Productos", delivery: "Entrega", microsite: "Perfil público", documents: "Documentos", destinations: "Contacto", agenda: "Agenda", leads: "Solicitudes", metrics: "Resultados" },
  dest: { overview: "Resumen", offers: "Ofertas", agenda: "Agenda", clients: "Clientes", profile: "Perfil" },
  microsite: {
    title: "Perfil público", intro: "Así te ven las parejas en tu página. Se guarda completo; si alguien más lo cambió, te avisamos antes de pisarlo.",
    descEs: "Descripción (español)", descEn: "Descripción (inglés)", descHelp: "Hasta 2000 caracteres.", website: "Sitio web", instagram: "Instagram", facebook: "Facebook", whatsapp: "WhatsApp (con código de país)",
    address: "Dirección", addressHelp: "Calle y número.", reference: "Referencia", hours: "Horario de atención", hoursOpens: "Abre (HH:MM)", hoursCloses: "Cierra (HH:MM)", hoursDays: "Días (0 = domingo, ej. 1,2,3,4,5)", hoursNote: "Nota del horario",
    save: "Guardar perfil", saving: "Guardando…", saved: "Perfil guardado (versión {{version}}).", conflict: "Alguien guardó una versión más reciente. Recargamos el perfil; revisa y vuelve a guardar.", invalid: "Revisa los campos marcados.", invalidUrl: "Escribe una dirección completa que empiece por https://.", invalidHour: "Usa el formato HH:MM, y que abra antes de cerrar.", invalidDays: "Escribe días entre 0 y 6 separados por comas.", invalidPhone: "Solo dígitos, con + opcional (6 a 15).", tooLong: "La descripción admite hasta 2000 caracteres.", version: "Versión {{version}}", reload: "Recargar"
  },
  documents: {
    title: "Documentos", intro: "Sube lo que respalda tu negocio. Son privados: solo tú y el equipo de verificación los ven. PDF, JPG, PNG o WebP de hasta 10 MB.", emptyTitle: "Aquí van tus documentos",
    kind: "Tipo de documento", kinds: { IDENTITY: "Documento de identidad", BUSINESS_REGISTRATION: "Registro del negocio", TAX_ID: "Identificación tributaria", ADDRESS_PROOF: "Comprobante de domicilio", OTHER: "Otro" },
    choose: "Elegir archivo", upload: "Subir documento", uploading: "Subiendo…", uploaded: "Documento subido.", delete: "Eliminar", deleteTitle: "¿Eliminar este documento?", deleteBody: "Se borra el archivo y su registro. Para verificarte tendrás que subirlo de nuevo.", deleted: "Documento eliminado.", opening: "Abriendo…", empty: "Sube el primero para que el equipo lo revise junto con tu ficha.", status: { PENDING_UPLOAD: "Subida pendiente", UPLOADED: "Recibido" },
    tooBig: "El archivo supera los 10 MB.", badType: "Solo PDF, JPG, PNG o WebP.", none: "Elige un archivo primero.", putFailed: "No se pudo enviar el archivo. Inténtalo de nuevo.", download: "Ver", rowMenu: "Más opciones de {{name}}", size: "{{kb}} KB", webOnly: "En esta versión la carga de archivos funciona en el navegador."
  },
  loading: "Cargando tu portal…",
  onboarding: {
    title: "Registra tu negocio", intro: "Crea tu ficha en un minuto. Después subes tu primera oferta y la envías a verificación.",
    name: "Nombre del negocio", nameHelp: "Es el nombre que verán las parejas.", submit: "Crear mi ficha", creating: "Creando…", required: "Escribe el nombre de tu negocio.", tooLong: "El nombre admite hasta 120 caracteres.",
    existingTitle: "¿Ya tienes una ficha?", existingBody: "Conéctala con su código de proveedor.", existingId: "Código de proveedor", connect: "Conectar ficha", invalidId: "El código debe ser un identificador válido.", notFound: "No encontramos un proveedor con ese código.", notOwner: "Esa ficha pertenece a otra cuenta."
  },
  status: {
    title: "Estado de tu ficha",
    DRAFT: { label: "Borrador", body: "Aún no es pública. Completa los pasos y envíala a verificación." },
    PENDING_VERIFICATION: { label: "En verificación", body: "El equipo está revisando tu ficha. Mientras tanto no aparece en el directorio." },
    VERIFIED: { label: "Verificado", body: "Tu ficha es pública. Tus ofertas publicadas aparecen en el directorio y en tu página." },
    REJECTED: { label: "Rechazada", body: "El equipo no aprobó tu ficha. Corrige lo que te indicaron y vuelve a enviarla." },
    SUSPENDED: { label: "Suspendido", body: "Tu ficha está suspendida y no aparece en el directorio. Escribe al equipo para resolverlo." },
    submit: "Enviar a verificación", submitting: "Enviando…", submitted: "Enviaste tu ficha a verificación.", needsListing: "Crea una oferta para poder enviarla.",
    documentsNote: "Puedes subir tus documentos en Perfil. El equipo los revisa junto con tu ficha.",
    publicPage: "Ver mi microsite"
  },
  home: {
    title: "Tu negocio", intro: "Todo lo que necesitas para que las parejas te encuentren.", more: "Más opciones", less: "Menos opciones",
    journey: {
      title: "Listo para vender", progress: "{{done}} de {{total}} pasos",
      profile: { title: "Tu ficha", done: "{{name}} ya tiene ficha." },
      offer: { title: "Tu primera oferta", todo: "Cuenta qué ofreces, desde qué precio y cómo lo entregas.", done: "Ya tienes una oferta creada.", action: "Crear mi primera oferta" },
      verify: { title: "Enviar a verificación", todo: "El equipo revisa tu ficha. Solo las fichas verificadas salen en el directorio.", done: "Tu ficha ya está en manos del equipo." }
    },
    milestone: {
      offer: { title: "Ya tienes tu primera oferta", body: "Falta un paso: enviar tu ficha a verificación." },
      PENDING_VERIFICATION: { title: "Ficha enviada", body: "El equipo la está revisando. Aquí verás el resultado." },
      VERIFIED: { title: "Tu ficha ya es pública", body: "Las ofertas que publiques aparecen en el directorio." }
    }, plan: "Plan {{plan}}", zone: "Zona horaria: {{zone}}", last30Summary: "Últimos 30 días: {{valid}} solicitudes válidas y {{views}} veces que te vieron.", last30Title: "Últimos 30 días", offersCount: "Ofertas", last30Link: "Ver resultados" },
  services: {
    title: "Ofertas", intro: "Tus servicios y productos, con su precio y cómo los entregas. Publica los que quieras mostrar.", publishedNote: "Tu oferta ya está publicada", publishedDetail: "Las parejas la ven en el directorio y en tu página.", emptyTitle: "Aquí viven tus ofertas", empty: "Crea la primera con su precio y sus condiciones de entrega. La publicas cuando quieras.", add: "Nueva oferta", rowMenu: "Más opciones de {{title}}", type: { SERVICE: "Servicio", PRODUCT: "Producto" }, published: "Publicado", draft: "Borrador", publish: "Publicar", publishing: "Publicando…", needsTerms: "Para publicarla, primero declara sus condiciones de entrega.", published_ok: "Oferta publicada.",
    new: { title: "Nueva oferta", cancel: "Cancelar", kind: "Qué ofreces", name: "Nombre", price: "Precio desde (Bs.)", priceHelp: "Opcional, por ejemplo 450.", category: "Categoría", city: "Ciudad", whatsapp: "WhatsApp (enlace https://wa.me/…)", site: "Sitio web (https://…)", destinationsHelp: "Adónde llevamos a las parejas cuando tocan «Contactar». Puedes sumar un sitio web en Más opciones.", fulfillmentTitle: "Cómo la entregas", responsible: "Responsable de la entrega", responsibleProvider: "Yo (el proveedor)", responsibleCustomer: "El cliente", coverage: "Zonas de cobertura", coverageHelp: "Toca las ciudades donde entregas.", transport: "Costo de traslado (Bs.)", lead: "Plazo (días de anticipación)", conditions: "Condiciones", submit: "Crear oferta", creating: "Creando…", created: "Oferta creada como borrador." },
    errors: {
    state: { network: "Sin conexión por ahora", unavailable: "Estamos arreglando algo", storage: "Los documentos no están disponibles", server: "Algo falló de nuestro lado" }, nameLong: "El nombre admite hasta 120 caracteres.", name: "Escribe el nombre de la oferta.", destination: "Agrega al menos un destino de contacto.", coverage: "Elige al menos una ciudad de cobertura.", price: "Escribe un precio válido, por ejemplo 450.50.", url: "Escribe un enlace válido que empiece con https://.", conditions: "Escribe las condiciones de entrega.", lead: "Escribe un plazo en días (0 o más)." }
  },
  products: {
    title: "Ofertas", intro: "Los productos son lo que los anfitriones pueden agregar a su lista de regalos.", empty: "Aún no creaste productos."
  },
  delivery: {
    title: "Entrega", intro: "Así leen los anfitriones cómo entregas cada oferta.", fixedNote: "Las condiciones se fijan al crear la oferta; el servidor todavía no permite editarlas. Si necesitas cambiarlas, crea la oferta de nuevo.", empty: "Cuando crees una oferta, aquí verás cómo la entregas.", responsible: "Entrega a cargo de: {{who}}", coverage: "Cobertura: {{zones}}", transport: "Traslado: {{price}}", noTransport: "no cobras traslado", lead: "Plazo: {{days}} días de anticipación", missing: "Esta oferta no declara condiciones de entrega."
  },
  destinations: {
    title: "Cómo te contactan", intro: "Elige adónde llevamos a las parejas cuando tocan un botón de contacto. Cada toque queda registrado como solicitud.", enabled: "Destinos habilitados", atLeastOne: "Elige al menos un destino.",
    destination: { OFFICIAL_SITE: "Sitio web", LANDING: "Página de aterrizaje", WHATSAPP: "WhatsApp", PHONE: "Teléfono", EMAIL: "Correo", INSTAGRAM: "Instagram", PRODUCT_PAGE: "Página del producto" },
    utmTitle: "Seguimiento de campañas", utmSource: "Origen de la campaña", utmMedium: "Medio", utmCampaign: "Nombre de la campaña (opcional)", utmHelp: "Solo letras, números, punto, guion y guion bajo.", utmInvalid: "Usa solo letras, números, punto, guion o guion bajo (máx. 64).", dedupe: "Minutos para no contar dos clics del mismo visitante", cap: "Tope mensual de leads (0 = sin tope)", billing: "Modelo de cobro", save: "Guardar destinos", saving: "Guardando…", saved: "Destinos guardados.", numberInvalid: "Escribe enteros válidos: minutos entre 1 y 1440 y tope entre 0 y 1000000."
  },
  agenda: {
    title: "Agenda", scheduleTitle: "Tu horario", intro: "Responde las fechas que te piden y define cuándo atiendes ({{zone}}).", bookingsPending_one: "{{count}} fecha por confirmar", bookingsPending_other: "{{count}} fechas por confirmar", bookingsEmptyTitle: "Sin fechas por responder", capacity: "Cupos por día", weekdays: "Días de atención", weekday: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"], start: "Desde", end: "Hasta", timeInvalid: "Usa el formato HH:MM, por ejemplo 08:00.", rangeInvalid: "La hora de cierre debe ser posterior a la de apertura.",
    blackouts: "Días bloqueados", blackoutDate: "Fecha (AAAA-MM-DD)", blackoutReason: "Motivo (opcional)", addBlackout: "Bloquear día", removeBlackout: "Quitar", dateInvalid: "Usa el formato AAAA-MM-DD.", save: "Guardar agenda", saving: "Guardando…", saved: "Agenda guardada.", capacityInvalid: "Escribe un número entero de cupos entre 1 y 1000.", blackoutEnd: "Hasta (opcional, AAAA-MM-DD)", dateReal: "Esa fecha no existe en el calendario.", blackoutDuplicate: "Ese día ya está bloqueado.", endBefore: "La fecha final no puede ser anterior a la inicial.", rejectTitle: "¿Rechazar esta solicitud?", rejectBody: "La pareja verá que no puedes atender esa fecha. No se puede deshacer.", cancelTitle: "¿Cancelar esta reserva?", cancelBody: "La pareja será avisada de que la fecha queda libre. No se puede deshacer.", keep: "Volver", rowMenu: "Más opciones de la solicitud del {{date}}",
    bookings: "Fechas pedidas", bookingsEmpty: "Cuando una pareja pida una fecha, la verás aquí para confirmarla con un toque.", status: { REQUESTED: "Pendiente", CONFIRMED: "Confirmada", REJECTED: "Rechazada", CANCELLED: "Cancelada", EXPIRED: "Vencida" }, confirm: "Confirmar", reject: "Rechazar", cancel: "Cancelar reserva", decided: "Solicitud actualizada.", stale: "Esa solicitud ya cambió de estado; actualizamos la lista.", date: "{{date}}", expires: "Vence {{when}}"
  },
  leads: {
    title: "Solicitudes", intro: "Parejas que te escribieron o pidieron una cotización.", emptyTitle: "Aún no te han escrito", empty: "Cuando una pareja toque tu contacto o pida una cotización, aparecerá aquí.", clicksEmpty: "Nadie ha tocado tus contactos todavía.", more: "Cargar más", shown: "Mostrando {{shown}} de {{total}}", filter: "Mostrar", filters: { all: "Todas", quote: "Cotizaciones", click: "Toques" }, quotesEmpty: "Aún no recibes cotizaciones.",
    surfaces: { SEARCH: "Búsqueda", DIRECTORY: "Directorio", MICROSITE: "Tu página", PROFILE: "Tu ficha", LISTING: "Una oferta" }, kind: { REDIRECT: "Toque en tu contacto", FORM: "Cotización" }, valid: "Válido", invalid: { dup: "Duplicado", bot: "Descartado (bot)" }, destination: "Destino: {{destination}}", surface: "Origen: {{surface}}", when: "{{when}}", billable: "Facturable", event: "Fecha del evento: {{date}}", guests: "{{count}} invitados"
  },
  metrics: {
    title: "Resultados", intro: "Cuántas parejas te vieron y cuántas te buscaron.", emptyTitle: "Sin movimiento en estas fechas", noData: "Aún no hay datos en este periodo. Cuando las parejas vean y toquen tu ficha, aparecerán aquí.", field: { day: "Día", category: "Categoría", destination: "Contacto", impressions: "Veces que te vieron", clicks: "Toques", validLeads: "Solicitudes válidas", invalidLeads: "Descartadas", leads: "Solicitudes" }, period: "Período", periods: { d7: "Últimos 7 días", d30: "Últimos 30 días", d90: "Últimos 90 días", custom: "Personalizado" }, from: "Desde (AAAA-MM-DD)", to: "Hasta (AAAA-MM-DD)", apply: "Ver resultados", dateInvalid: "Usa el formato AAAA-MM-DD y un período válido.", empty: "Prueba con otro rango de fechas.",
    impressions: "Veces que te vieron", clicks: "Toques en tus contactos", ctr: "Toques por cada vista", validLeads: "Solicitudes válidas", invalidLeads: "Solicitudes descartadas", groupBy: "Agrupar por", group: { day: "Día", category: "Categoría", destination: "Destino" }, groupsTitle: "Detalle por {{group}}"
  },
  errors: {
    forbidden: "Esta cuenta no puede gestionar este negocio.", generic: "No pudimos guardarlo. Inténtalo de nuevo.", retry: "Reintentar", noProvider: "Primero registra tu negocio para ver esta sección.", goOnboarding: "Registrar mi negocio",
    network: "No hay conexión con el servidor. Revisa tu internet y vuelve a intentarlo; lo que escribiste sigue aquí.", rateLimited: "Fueron muchos toques seguidos. Espera {{seconds}} segundos y reintenta.", rateLimitedNoWait: "Fueron muchos toques seguidos. Espera un momento y reintenta.",
    unavailable: "El servicio no está disponible por ahora. Reintenta en unos minutos.", server: "Algo falló de nuestro lado. Lo que escribiste sigue aquí: reintenta en unos minutos.", storage: "Los documentos no están disponibles por ahora. No se guardó nada; inténtalo más tarde.",
    transition: "El estado de tu ficha ya cambió y esa acción no aplica. Recarga para ver el estado actual.", notOwner: "Solo el titular de la ficha o un administrador puede hacer esto.", planAdmin: "Solo un administrador puede cambiar el plan."
  },
  rename: { action: "Cambiar el nombre", field: "Nombre del negocio", save: "Guardar nombre", saving: "Guardando…", saved: "Nombre actualizado.", cancel: "Cancelar", required: "Escribe el nombre de tu negocio.", tooLong: "El nombre admite hasta 120 caracteres." }
} as const;
