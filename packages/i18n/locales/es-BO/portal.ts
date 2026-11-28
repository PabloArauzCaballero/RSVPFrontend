/** Portal del proveedor (F28): alta, verificación, ofertas, destinos, agenda, leads y métricas. */
export const portalEsBO = {
  label: "Portal del proveedor",
  nav: { label: "Secciones del portal", home: "Resumen", services: "Ofertas", products: "Productos", delivery: "Entrega", microsite: "Perfil público", documents: "Documentos", destinations: "Contacto", agenda: "Agenda", quotes: "Cotizaciones", leads: "Solicitudes", metrics: "Resultados" },
  dest: { overview: "Resumen", offers: "Ofertas", agenda: "Agenda", clients: "Clientes", profile: "Perfil" },
  microsite: {
    moderationRejected: "El equipo rechazó tu perfil público y dejó de mostrarse. Motivo: {{reason}}. Corrígelo y guárdalo: volverá a publicarse cuando lo aprobemos.", moderationHeld: "Tus cambios esperan la revisión del equipo. Hasta que los aprobemos, tu perfil público no se muestra.",
    title: "Perfil público", intro: "Así te ven las parejas en tu página. Se guarda completo; si alguien más lo cambió, te avisamos antes de pisarlo.",
    descEs: "Descripción (español)", descEn: "Descripción (inglés)", descHelp: "Hasta 2000 caracteres.", website: "Sitio web", instagram: "Instagram", facebook: "Facebook", whatsapp: "WhatsApp (con código de país)",
    address: "Dirección", addressHelp: "Calle y número.", reference: "Referencia", hours: "Horario de atención", hoursOpens: "Abre", hoursCloses: "Cierra", hoursDays: "Días (0 = domingo, ej. 1,2,3,4,5)", hoursNote: "Nota del horario",
    save: "Guardar perfil", saving: "Guardando…", saved: "Perfil guardado (versión {{version}}).", conflict: "Alguien guardó una versión más reciente. Recargamos el perfil; revisa y vuelve a guardar.", invalid: "Revisa los campos marcados.", invalidUrl: "Escribe una dirección completa que empiece por https://.", invalidHour: "Elige las dos horas, y que abra antes de cerrar.", invalidDays: "Escribe días entre 0 y 6 separados por comas.", invalidPhone: "Solo dígitos, con + opcional (6 a 15).", tooLong: "La descripción admite hasta 2000 caracteres.", version: "Versión {{version}}", reload: "Recargar"
  },
  documents: {
    title: "Documentos", intro: "Sube lo que respalda tu negocio. Son privados: solo tú y el equipo de verificación los ven. PDF, JPG, PNG o WebP de hasta 10 MB.", emptyTitle: "Aquí van tus documentos",
    kind: "Tipo de documento", kinds: { IDENTITY: "Documento de identidad", BUSINESS_REGISTRATION: "Registro del negocio", TAX_ID: "Identificación tributaria", ADDRESS_PROOF: "Comprobante de domicilio", POWER_OF_ATTORNEY: "Poder del representante", BANK_CERTIFICATE: "Certificado bancario", OTHER: "Otro" }, kindUnknown: "Documento ({{kind}})",
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
    reason: "Motivo del equipo: {{reason}}",
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
    title: "Ofertas", intro: "Tus servicios y productos, con su precio y cómo los entregas. Publica los que quieras mostrar.", publishedNote: "Tu oferta ya está publicada", publishedDetail: "Las parejas la ven en el directorio y en tu página.", emptyTitle: "Aquí viven tus ofertas", empty: "Crea la primera con su precio y sus condiciones de entrega. La publicas cuando quieras.", add: "Nueva oferta", rowMenu: "Más opciones de {{title}}", type: { SERVICE: "Servicio", PRODUCT: "Producto" }, published: "Publicado", draft: "Borrador", publish: "Publicar", publishing: "Publicando…", hiddenChip: "Oculto", hidden: { CATEGORY_TYPE_MISMATCH: "Oculto: el tipo no coincide con la categoría. No se muestra a los clientes ni se puede publicar. Vuelve a crear la oferta en una categoría de su mismo tipo." }, needsTerms: "Para publicarla, primero declara sus condiciones de entrega.", published_ok: "Oferta publicada.",
    new: { productName: "Nombre del producto", productCategory: "Categoría del producto", productPrice: "Precio del producto (Bs.)", imageUrl: "URL de la foto (opcional)", imageHelp: "Pega el enlace HTTPS directo a una foto pública del producto.", loadingCategories: "Cargando categorías…", emptyCategories: "Aún no hay categorías disponibles para este tipo de oferta.", title: "Nueva oferta", cancel: "Cancelar", kind: "Qué ofreces", name: "Nombre", price: "Precio desde (Bs.)", priceHelp: "Opcional, por ejemplo 450.", category: "Categoría", city: "Ciudad", whatsapp: "WhatsApp (enlace https://wa.me/…)", site: "Sitio web (https://…)", destinationsHelp: "Adónde llevamos a las parejas cuando tocan «Contactar». Puedes sumar un sitio web en Más opciones.", fulfillmentTitle: "Cómo la entregas", responsible: "Responsable de la entrega", responsibleProvider: "Yo (el proveedor)", responsibleCustomer: "El cliente", coverage: "Zonas de cobertura", coverageHelp: "Toca las ciudades donde entregas.", transport: "Costo de traslado (Bs.)", lead: "Plazo (días de anticipación)", conditions: "Condiciones", submit: "Crear oferta", creating: "Creando…", created: "Oferta creada como borrador." },
    errors: { imageUrl: "Escribe un enlace HTTPS válido de hasta 500 caracteres.",
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
    utmTitle: "Seguimiento de campañas", utmSource: "Origen de la campaña", utmMedium: "Medio", utmCampaign: "Nombre de la campaña (opcional)", utmHelp: "Solo letras, números, punto, guion y guion bajo.", utmInvalid: "Usa solo letras, números, punto, guion o guion bajo (máx. 64).", dedupe: "Minutos para no contar dos clics del mismo visitante", cap: "Tope mensual de leads (0 = sin tope)", billing: "Modelo de cobro", save: "Guardar destinos", saving: "Guardando…", saved: "Destinos guardados.", numberInvalid: "Escribe enteros válidos: minutos entre 1 y 1440 y tope entre 0 y 1000000.",
    template: {
      title: "Mensaje de WhatsApp del negocio", intro: "Es el mensaje que le llega a tu WhatsApp cuando alguien pide un producto que no tiene mensaje propio.", useOwn: "Escribir un mensaje para mi negocio",
      save: "Guardar mensaje", saving: "Guardando…", saved: "Mensaje guardado. Lo usan tus productos sin mensaje propio.", cleared: "Listo. Tus productos usan el mensaje de DOne.",
      empty: "Escribe el mensaje o desactiva el mensaje propio.", long: "El mensaje admite hasta 600 caracteres.", sampleProduct: "Juego de 6 copas", sampleVersion: "Dorado"
    }
  },
  agenda: {
    title: "Agenda", scheduleTitle: "Tu horario", intro: "Responde las fechas que te piden y define cuándo atiendes ({{zone}}).", bookingsPending_one: "{{count}} fecha por confirmar", bookingsPending_other: "{{count}} fechas por confirmar", bookingsPendingAtLeast_one: "Al menos {{count}} fecha por confirmar", bookingsPendingAtLeast_other: "Al menos {{count}} fechas por confirmar", bookingsMore: "Ver más fechas", bookingsEmptyTitle: "Sin fechas por responder", capacity: "Cupos por día", weekdays: "Días de atención", weekday: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"], start: "Desde", end: "Hasta", timeInvalid: "Elige la hora de apertura y la de cierre.", rangeInvalid: "La hora de cierre debe ser posterior a la de apertura.",
    blackouts: "Días bloqueados", blackoutDate: "Fecha", blackoutReason: "Motivo (opcional)", addBlackout: "Bloquear día", removeBlackout: "Quitar", dateInvalid: "Elige la fecha.", save: "Guardar agenda", saving: "Guardando…", saved: "Agenda guardada.", capacityInvalid: "Escribe un número entero de cupos entre 1 y 1000.", blackoutEnd: "Hasta (opcional)", dateReal: "Esa fecha no existe en el calendario.", blackoutDuplicate: "Ese día ya está bloqueado.", endBefore: "La fecha final no puede ser anterior a la inicial.", rejectTitle: "¿Rechazar esta solicitud?", rejectBody: "La pareja verá que no puedes atender esa fecha. No se puede deshacer.", cancelTitle: "¿Cancelar esta reserva?", cancelBody: "La pareja será avisada de que la fecha queda libre. No se puede deshacer.", keep: "Volver", rowMenu: "Más opciones de la solicitud del {{date}}",
    bookings: "Fechas pedidas", bookingsEmpty: "Cuando una pareja pida una fecha, la verás aquí para confirmarla con un toque.", status: { REQUESTED: "Pendiente", CONFIRMED: "Confirmada", REJECTED: "Rechazada", CANCELLED: "Cancelada", EXPIRED: "Vencida" }, confirm: "Confirmar", reject: "Rechazar", cancel: "Cancelar reserva", decided: "Solicitud actualizada.", stale: "Esa solicitud ya cambió de estado; actualizamos la lista.", date: "{{date}}", expires: "Vence {{when}}"
  },
  quotes: {
    title: "Cotizaciones", intro: "Pedidos de cotización que recibiste. Abre uno para ver cómo contactar a quien lo envió y respóndele directamente.", emptyTitle: "Aún no tienes cotizaciones", empty: "Cuando alguien te pida una cotización desde tu ficha, aparecerá aquí con sus datos de contacto.",
    received: "Recibida el {{date}}", event: "Evento: {{date}}", guests: "{{count}} invitados", budget: "Presupuesto: {{amount}}", noBudget: "Sin presupuesto indicado", city: "Zona: {{city}}", withMessage: "Incluye un mensaje",
    open: "Ver contacto", close: "Ocultar contacto", contactTitle: "Contacto de {{name}}", email: "Correo", phone: "Teléfono", noPhone: "No dejó teléfono", message: "Mensaje", writeEmail: "Escribir a {{email}}", call: "Llamar al {{phone}}",
    loadingContact: "Cargando el contacto…", contactError: "No pudimos cargar el contacto de esta cotización.", more: "Cargar más", shown: "{{shown}} cotizaciones", status: { REQUESTED: "Nueva" }
  },
  leads: {
    title: "Solicitudes", intro: "Parejas que te escribieron o pidieron una cotización.", emptyTitle: "Aún no te han escrito", empty: "Cuando una pareja toque tu contacto o pida una cotización, aparecerá aquí.", clicksEmpty: "Nadie ha tocado tus contactos todavía.", more: "Cargar más", shown: "Mostrando {{shown}} de {{total}}", filter: "Mostrar", filters: { all: "Todas", quote: "Cotizaciones", click: "Toques" }, quotesEmpty: "Aún no recibes cotizaciones.",
    surfaces: { SEARCH: "Búsqueda", DIRECTORY: "Directorio", MICROSITE: "Tu página", PROFILE: "Tu ficha", LISTING: "Una oferta" }, kind: { REDIRECT: "Toque en tu contacto", FORM: "Cotización" }, valid: "Válido", invalid: { dup: "Duplicado", bot: "Descartado (bot)" }, destination: "Destino: {{destination}}", surface: "Origen: {{surface}}", when: "{{when}}", billable: "Facturable", event: "Fecha del evento: {{date}}", guests: "{{count}} invitados"
  },
  metrics: {
    title: "Resultados", intro: "Cuántas parejas te vieron y cuántas te buscaron.", emptyTitle: "Sin movimiento en estas fechas", noData: "Aún no hay datos en este periodo. Cuando las parejas vean y toquen tu ficha, aparecerán aquí.", field: { day: "Día", category: "Categoría", destination: "Contacto", impressions: "Veces que te vieron", clicks: "Toques", validLeads: "Solicitudes válidas", invalidLeads: "Descartadas", leads: "Solicitudes" }, period: "Período", periods: { d7: "Últimos 7 días", d30: "Últimos 30 días", d90: "Últimos 90 días", custom: "Personalizado" }, from: "Desde", to: "Hasta", apply: "Ver resultados", dateInvalid: "Elige las dos fechas y un período válido.", empty: "Prueba con otro rango de fechas.",
    impressions: "Veces que te vieron", clicks: "Toques en tus contactos", ctr: "Toques por cada vista", validLeads: "Solicitudes válidas", invalidLeads: "Solicitudes descartadas", groupBy: "Agrupar por", group: { day: "Día", category: "Categoría", destination: "Destino" }, groupsTitle: "Detalle por {{group}}"
  },
  errors: {
    forbidden: "Esta cuenta no puede gestionar este negocio.", generic: "No pudimos guardarlo. Inténtalo de nuevo.", retry: "Reintentar", noProvider: "Primero registra tu negocio para ver esta sección.", goOnboarding: "Registrar mi negocio",
    network: "No hay conexión con el servidor. Revisa tu internet y vuelve a intentarlo; lo que escribiste sigue aquí.", rateLimited: "Fueron muchos toques seguidos. Espera {{seconds}} segundos y reintenta.", rateLimitedNoWait: "Fueron muchos toques seguidos. Espera un momento y reintenta.",
    unavailable: "El servicio no está disponible por ahora. Reintenta en unos minutos.", server: "Algo falló de nuestro lado. Lo que escribiste sigue aquí: reintenta en unos minutos.", storage: "Los documentos no están disponibles por ahora. No se guardó nada; inténtalo más tarde.",
    transition: "El estado de tu ficha ya cambió y esa acción no aplica. Recarga para ver el estado actual.", notOwner: "Solo el titular de la ficha o un administrador puede hacer esto.", planAdmin: "Solo un administrador puede cambiar el plan."
  },
  product: {
    newTitle: "Nuevo producto", editTitle: "Ficha del producto", loading: "Cargando la ficha…",
    intro: "Completa la ficha paso a paso. Cuando no falte nada la publicas, y los anfitriones pueden agregarla a su lista de regalos.",
    steps: { label: "Pasos de la ficha", position: "Paso {{n}} de {{total}}: {{name}}", missingHint: "{{name}}, falta información", doneHint: "{{name}}, completo", basic: "Básico", ideas: "Ideas", photos: "Fotos", price: "Precio y versiones", delivery: "Entrega", contact: "Contacto", summary: "Resumen" },
    actions: { next: "Guardar y seguir", saving: "Guardando…", back: "Atrás", create: "Crear borrador y seguir", creating: "Creando…", edit: "Editar", duplicate: "Duplicar", duplicating: "Duplicando…", publish: "Publicar", publishing: "Publicando…", rowMenu: "Más opciones de {{title}}", reload: "Recargar el producto", backToOffers: "Volver a ofertas", openCopy: "Abrir la copia" },
    basic: {
      title: "Nombre del producto", titleHelp: "De 3 a 120 caracteres, por ejemplo «Juego de 6 copas de cristal».", category: "Categoría", loadingCategories: "Cargando categorías…", emptyCategories: "Todavía no hay categorías de productos.",
      description: "Descripción", descriptionHelp: "Qué incluye, material y medidas, de 30 a 2000 caracteres. Sin teléfonos ni enlaces.", count: "{{count}} de {{max}} caracteres",
      city: "Ciudad desde donde vendes", whatsapp: "Tu WhatsApp para pedidos", whatsappHelp: "Con código de país, por ejemplo +591 70012345. Lo pedimos para crear el borrador; en Contacto puedes cambiarlo.",
      more: "Más detalles (opcional)", less: "Menos detalles", dimensions: "Medidas", dimensionsHelp: "Por ejemplo «30 × 20 cm».", weight: "Peso", weightHelp: "Por ejemplo «2 kg».", care: "Cuidados", warranty: "Garantía", personalizable: "Se puede personalizar", personalizationNote: "Cómo se personaliza", personalizationHelp: "Por ejemplo: se graba el nombre."
    },
    ideas: { intro: "¿Para qué regalo sirve? Elige hasta 10 ideas: los anfitriones buscan por idea.", group: "Ideas de regalo", categoryUnsaved: "Cambiaste la categoría en Básico y aún no la guardaste. Estas son las ideas de la categoría guardada; se ajustarán al guardar Básico.", pickCategory: "Primero elige la categoría en el paso Básico.", empty: "Esta categoría todavía no tiene ideas de regalo, así que el producto no se puede recomendar. Prueba con otra categoría.", loading: "Cargando ideas…", count: "{{count}} de {{max}} elegidas" },
    photos: {
      intro: "De 1 a 5 fotos tuyas: JPG, PNG o WebP de hasta 5 MB. La primera lista es la portada.", add: "Agregar foto", zone: "Subir foto del producto", dropHint: "Arrastra una foto aquí o usa «Agregar foto».", alt: "Qué muestra la foto (opcional)", altHelp: "Lo lee quien usa lector de pantalla.", cover: "Portada", makeCover: "Usar como portada", delete: "Quitar foto {{n}}", empty: "Todavía no hay fotos.", photo: "Foto {{n}}", count: "{{count}} de {{max}} fotos",
      status: { PENDING_UPLOAD: "Subiendo", QUEUED: "En cola", PROCESSING: "Procesando", READY: "Lista", REJECTED: "Rechazada", DELETING: "Quitando" },
      stage: { requesting: "Preparando la subida…", uploading: "Subiendo la foto…", processing: "Procesando la foto…" }, ready: "Foto lista.",
      reject: { UNREADABLE: "No pudimos leer la imagen. Prueba con otro archivo.", HEIC_UNSUPPORTED: "Las fotos HEIC no se pueden usar. Expórtala como JPG y súbela de nuevo.", TOO_MANY_PIXELS: "La foto es demasiado grande (más de 60 megapíxeles).", PROCESSING_FAILED: "No pudimos procesar la foto. Súbela de nuevo." },
      openSettings: "Abrir ajustes", openSettingsFailed: "No pudimos abrir los ajustes. Ábrelos tú desde tu dispositivo y permite el acceso a tus fotos.",
      permissionDenied: "No tenemos permiso para ver tus fotos. Actívalo en los ajustes de tu dispositivo, en los permisos de esta app, y vuelve a intentarlo.",
      typeError: "Solo JPG, PNG o WebP. Si tu foto es HEIC, expórtala como JPG.", sizeError: "Cada foto puede pesar hasta 5 MB.", putFailed: "No se pudo enviar la foto. Revisa tu conexión e inténtalo de nuevo.", timeout: "La foto sigue procesándose. Aparecerá aquí apenas esté lista.", limit: "Ya tienes 5 fotos. Quita una para agregar otra.",
      shows: "Versión de la foto", showsHelp: "Si la foto muestra solo una versión, elígela; si no, déjala en «Todo el producto».", wholeProduct: "Todo el producto", variantLimit: "«{{variant}}» ya tiene {{max}} fotos. Elige otra versión o quita una de sus fotos."
    },
    price: {
      mode: "Precio", single: "Un solo precio", variants: "Varias versiones", modeHelp: "Las versiones son tamaño, color o sabor, cada una con su precio.", price: "Precio (Bs.)", priceHelp: "Precio exacto, por ejemplo 350 o 350.50.", stock: "Disponibilidad",
      variant: "Versión {{n}}", variantLabel: "Nombre de la versión", variantLabelHelp: "Por ejemplo «Talla M» o «Dorado».", variantDefault: "Se muestra primero", addVariant: "Agregar versión", removeVariant: "Quitar versión {{n}}", maxVariants: "Hasta 20 versiones.", variantsList: "Versiones del producto", variantPhotosHint: "Después de guardar las versiones puedes darle a cada una su foto en el paso Fotos."
    },
    stock: { AVAILABLE: "Disponible", MADE_TO_ORDER: "Bajo pedido", OUT_OF_STOCK: "Agotado" },
    delivery: { coverage: "Ciudades donde entregas", coverageHelp: "Toca las ciudades donde entregas.", lead: "Días que necesitas para entregar", leadHelp: "De 0 a 90 días.", shipping: "Costo de envío (Bs.)", shippingHelp: "Escribe 0 si el envío es gratis.", pickup: "También se puede recoger en tu tienda", conditions: "Condiciones de entrega (opcional)", conditionsHelp: "Hasta 500 caracteres." },
    contact: {
      intro: "Adónde va el invitado cuando toca un botón del regalo. Puedes tener uno o los dos.", whatsapp: "WhatsApp para pedidos", whatsappHelp: "Con código de país, por ejemplo +591 70012345.", productPage: "Página del producto en tu tienda", productPageHelp: "Enlace completo que empiece con https://.",
      saved: "Ya guardaste: {{list}}. Déjalos vacíos para conservarlos.", replaceNote: "Si escribes alguno, los contactos del producto pasan a ser solo los que escribas aquí.", none: "Agrega al menos un WhatsApp o la página del producto."
    },
    whatsapp: {
      title: "Mensaje de WhatsApp", useOwn: "Escribir un mensaje propio para este producto", usesProvider: "Por ahora usa el mensaje general de tu negocio.", usesDefault: "Por ahora usa el mensaje de DOne.", field: "Mensaje", help: "Hasta 600 caracteres, sin teléfonos ni enlaces. Toca una variable para agregarla al final.", variables: "Variables", insert: "Agregar {{variable}}",
      unknown: "Estas variables no existen: {{list}}.", count: "{{count}} de {{max}} caracteres", previewTitle: "Vista previa con datos de ejemplo", previewNote: "Así llega el mensaje. Los datos son ficticios: nunca incluimos los del invitado.",
      sample: { celebracion: "la boda de Ana y Luis", fecha: "14 de febrero", ciudad: "La Paz", entrega: "Entregar en la recepción del salón.", cantidad: "1" }
    },
    summary: {
      intro: "Así ve el invitado tu producto en la lista de regalos.", previewLabel: "Vista previa de la tarjeta del invitado", from: "Desde {{price}}", deliversIn: "Entrega en {{cities}}", moreCities: "{{first}} y {{count}} ciudades más", leadDays: "En {{count}} días", leadToday: "Entrega el mismo día", freeShipping: "Envío gratis", shipping: "Envío {{price}}", pickup: "Retiro en tienda",
      ctaStore: "Ver en la tienda", ctaWhatsapp: "Pedir por WhatsApp", noPhoto: "Sin foto todavía", ready: "La ficha está completa. Ya puedes publicarla.", published: "Producto publicado", publishedDetail: "Los anfitriones ya pueden elegirlo para su lista.", isPublished: "Publicado y visible para los anfitriones.",
      hidden: "El equipo ocultó este producto. Motivo: {{reason}}", hiddenNoReason: "El equipo ocultó este producto.", duplicated: "Copia creada como borrador. Le faltan las fotos."
    },
    completeness: { COMPLETE: "Completo", INCOMPLETE: "Incompleto", HIDDEN_BY_ADMIN: "Oculto" },
    notGift: "Completa tu ficha para aparecer como regalo",
    missing: {
      title: "Te falta para publicar", go: "{{item}}. Ir al paso {{step}}", short: "Falta: {{list}}",
      TITLE: "El nombre (3 a 120 caracteres)", DESCRIPTION: "La descripción (30 a 2000 caracteres)", CATEGORY: "Una categoría de productos", GIFT_IDEA: "Al menos una idea de regalo", PHOTO: "Al menos una foto lista", PRICE: "El precio", STOCK: "La disponibilidad", COVERAGE: "Las ciudades donde entregas", DELIVERY: "El plazo y el costo de envío", DESTINATION: "Un WhatsApp o la página del producto"
    },
    errors: {
      CONTACT_IN_TEXT_AT: "Quita el teléfono o el enlace del campo {{where}}: «{{fragment}}».",
      contactFields: { titles: "Nombre", descriptions: "Descripción", details: "Detalles", variants: "Nombre de la versión", delivery: "Condiciones de entrega", template: "Mensaje de WhatsApp", altText: "Texto de la foto" },
      ideasLoad: "No pudimos leer las ideas de la categoría nueva, así que no se guardó nada. Revisa tu conexión e inténtalo de nuevo.",
      noVersion: "No tenemos la versión actual de la ficha, así que no podemos guardar sin riesgo. Recárgala y vuelve a intentarlo.",
      notFound: "No encontramos este producto. Puede que sea de otro negocio o que ya no exista.", forbidden: "Este producto es de otro negocio.", notProduct: "Esta oferta es un servicio: solo los productos tienen ficha.",
      LISTING_INCOMPLETE: "Todavía falta información para publicar. Revisa la lista de lo que falta.", CONTACT_IN_TEXT: "Quita el teléfono o el enlace del texto: «{{fragment}}».", DESCRIPTION_REPEATS_TITLE: "La descripción debe contar qué incluye el producto, no repetir el nombre.",
      PRICE_OUT_OF_RANGE: "El precio debe ser mayor que cero y menor que el máximo permitido (Bs 200.000).", GIFT_IDEA_NOT_ALLOWED: "Algunas ideas no corresponden a la categoría. Revísalas en el paso Ideas.", UNKNOWN_CITY: "Alguna ciudad ya no está en el catálogo. Vuelve a elegirlas.",
      UNKNOWN_TEMPLATE_VARIABLE: "La variable {{variable}} no existe.", CATEGORY_TYPE_MISMATCH: "Esa categoría es de servicios. Elige una de productos.",
      VERSION_CONFLICT: "El producto cambió desde que lo abriste, quizá en otra pestaña. Recárgalo: lo que escribiste en este paso se mantiene.", IF_MATCH_REQUIRED: "Recarga el producto antes de guardar.", LISTING_HIDDEN: "El equipo ocultó este producto: no se puede publicar ni duplicar.", LISTING_NOT_EDITABLE: "Este producto no se puede editar desde el portal.",
      IDEMPOTENCY_KEY_REUSED: "Ese pedido ya se envió con otros datos. Recarga e inténtalo de nuevo.", PHOTO_LIMIT_REACHED: "Llegaste al máximo de fotos: 5 por producto y 3 por versión.", MEDIA_QUOTA_EXCEEDED: "Ya no tienes espacio para fotos. Quita alguna para subir otra.",
      UNSUPPORTED_MEDIA_TYPE: "La foto debe ser JPG, PNG o WebP.", PHOTO_TOO_LARGE: "Cada foto puede pesar hasta 5 MB.", PHOTO_MISMATCH: "El archivo no es una imagen válida o cambió durante la subida; se descartó. Prueba de nuevo.", MEDIA_STORAGE_NOT_CONFIGURED: "Las fotos no están disponibles por ahora. No se subió nada; inténtalo más tarde.",
      UPLOAD_NOT_FOUND: "La foto no llegó a guardarse. Súbela de nuevo.", INVALID_DESTINATION: "Revisa el WhatsApp o el enlace de tu tienda.", DESTINATION_REQUIRED: "Agrega al menos un WhatsApp o la página del producto.", IMAGE_URL_NOT_ALLOWED: "Los productos llevan fotos subidas, no enlaces a imágenes.", INVALID_LISTING: "Revisa los datos de este paso.",
      local: {
        title: "Escribe un nombre de 3 a 120 caracteres.", description: "La descripción debe tener de 30 a 2000 caracteres.", category: "Elige una categoría.", ideas: "Elige al menos una idea de regalo.", ideasMax: "Puedes elegir hasta 10 ideas.", price: "Escribe un precio mayor que cero y menor que Bs 200.000, por ejemplo 350.50.", stock: "Elige la disponibilidad.",
        variantLabel: "Cada versión necesita un nombre de hasta 60 caracteres.", variantPrice: "Cada versión necesita un precio mayor que cero y menor que Bs 200.000.", variantsMax: "Hasta 20 versiones.", coverage: "Elige al menos una ciudad.", lead: "Escribe un plazo de 0 a 90 días.", shipping: "Escribe el costo de envío; 0 si es gratis.",
        conditions: "Las condiciones admiten hasta 500 caracteres.", whatsapp: "Escribe el número con código de país, por ejemplo +591 70012345.", productPage: "Escribe un enlace completo que empiece con https://.", destination: "Agrega al menos un WhatsApp o la página del producto.",
        template: "Escribe el mensaje o desactiva el mensaje propio.", templateLong: "El mensaje admite hasta 600 caracteres.", templateVariables: "El mensaje usa variables que no existen."
      }
    },
    newOffer: { productHint: "Los productos se cargan paso a paso, con fotos, precio y entrega, para que se puedan recomendar como regalo.", productStart: "Crear el producto paso a paso" }
  },
  rename: { action: "Cambiar el nombre", field: "Nombre del negocio", save: "Guardar nombre", saving: "Guardando…", saved: "Nombre actualizado.", cancel: "Cancelar", required: "Escribe el nombre de tu negocio.", tooLong: "El nombre admite hasta 120 caracteres." }
} as const;
