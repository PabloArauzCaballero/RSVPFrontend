/** Lista de regalos pública (F22) y gestión del anfitrión (F23). */
export const giftsEsBO = {
  meta: { title: "Regalos · {{name}}", description: "Elige un regalo para {{name}}. Los productos de nuestros aliados aparecen primero." },
  title: "Lista de regalos",
  intro: "Elige qué regalar. Reservar un regalo evita que otra persona regale lo mismo.",
  back: "Volver a la celebración",
  loading: "Cargando los regalos…",
  filters: { label: "Filtrar regalos", maxPrice: "Precio máximo", source: "Origen", sourceAll: "Todos", sourcePartner: "De nuestros aliados", sourceOther: "Otras tiendas", onlyAvailable: "Solo disponibles", clear: "Quitar filtros", count: "{{count}} regalos" },
  group: { partner: "Productos de nuestros aliados", other: "Otras ideas de los anfitriones" },
  status: { AVAILABLE: "Disponible", PENDING_REVIEW: "Pendiente de aprobación", COMMITTED: "Ya reservado" },
  price: "Precio",
  card: { reservedBy: "Reservado por {{name}}", open: "Ver detalle de {{title}}", reserve: "Reservar", reserveFor: "Reservar {{title}}", viaPartner: "Ver en la tienda del aliado", viaOther: "Ver en la tienda" },
  detail: { title: "{{title}} · Regalos", back: "Volver a la lista", notFound: "Este regalo ya no está en la lista.", partnerNote: "Este producto lo ofrece un aliado de DOne. Al abrir el enlace saldrás de DOne." },
  reserve: { title: "Reservar este regalo", intro: "Te pedimos tu nombre para que los anfitriones sepan quién regala.", name: "Tu nombre", nameHelp: "Opcional. Los anfitriones verán este nombre junto a tu reserva.", message: "Mensaje para los anfitriones", messageHelp: "Opcional, hasta 500 caracteres.", submit: "Reservar regalo", submitting: "Reservando…", cancel: "Cancelar", close: "Cerrar" },
  outcome: {
    confirmedTitle: "¡Regalo reservado!", confirmedBody: "Reservaste «{{title}}». Los anfitriones ya saben que lo regalas tú.",
    pendingTitle: "Solicitud enviada", pendingBody: "Los anfitriones aprueban cada reserva. Te avisaremos cuando confirmen «{{title}}»; mientras tanto nadie más puede reservarlo.",
    takenTitle: "Alguien se adelantó", takenBody: "«{{title}}» ya fue tomado por otra persona. No pasa nada: la lista se actualizó y te mostramos otras opciones.",
    takenAlternatives: "Otros regalos disponibles",
    takenNone: "Ya no quedan regalos disponibles en esta lista. Gracias por querer acompañarlos.",
    seeList: "Ver la lista de regalos", reserveAnother: "Elegir otro regalo"
  },
  error: {
    otherTitle: "Este enlace es de otra celebración", otherBody: "El enlace que abriste no corresponde a esta lista de regalos. Abre el enlace que te enviaron los anfitriones de esta celebración.",
    busyTitle: "Hay mucha gente ahora mismo", busyBody: "Recibimos demasiadas solicitudes seguidas. Espera unos segundos e inténtalo otra vez.",
    limit: "Ya tienes el máximo de regalos reservados. Espera a que los anfitriones confirmen alguno antes de reservar otro.",
    needLinkTitle: "Abre tu enlace de invitación", needLinkBody: "Para ver y reservar regalos usamos el enlace personal de tu invitación; no necesitas crear una cuenta. Ábrelo desde el mensaje que te enviaron los anfitriones.",
    needLinkAction: "Ir a mi invitación",
    forbiddenTitle: "No puedes reservar regalos aquí", forbiddenBody: "Tu invitación no tiene permiso para esta lista. Pide a los anfitriones un enlace nuevo.",
    expiredTitle: "Tu enlace venció", expiredBody: "El enlace personal ya no es válido. Pide a los anfitriones que te envíen uno nuevo.",
    unavailableTitle: "No pudimos cargar los regalos", unavailableBody: "El servicio de regalos no responde ahora mismo. No se perdió nada: inténtalo otra vez.",
    retry: "Reintentar", validation: "Revisa los datos: el nombre o el mensaje son demasiado largos.", generic: "No pudimos reservar el regalo. Inténtalo de nuevo."
  },
  empty: { title: "Aún no hay regalos", body: "Los anfitriones todavía no agregaron regalos. Vuelve pronto.", filtered: "Ningún regalo coincide con estos filtros." },
  notFound: { title: "No encontramos esta celebración", body: "La página no existe o los anfitriones aún no la han publicado." },
  host: {
    title: "Regalos", intro: "Arma la lista que verán tus invitados. Los productos de aliados aparecen primero.", nav: "Regalos",
    list: { title: "Estado de cada regalo", empty: "Todavía no agregaste regalos.", emptyAction: "Agregar desde el catálogo", fromPartner: "De un aliado", external: "Externo", reservedBy: "Reservado por {{name}}" },
    status: { AVAILABLE: "Disponible", PROPOSED: "Propuesto, por revisar", PENDING_REVIEW: "Reserva pendiente", COMMITTED: "Comprometido", REJECTED: "Rechazado" },
    visibility: { title: "Quién ve quién reservó", intro: "Decide si los nombres de quienes reservan aparecen en tu panel y en la lista de tus invitados.", host: "Ver el nombre en mi panel", hostHelp: "Si lo apagas, verás las reservas sin el nombre.", guests: "Mostrar el nombre a otros invitados", guestsHelp: "Apagado por defecto: los invitados solo ven que el regalo está reservado.", saved: "Preferencia guardada. Aplica desde ahora." },
    approveProposal: "Aprobar propuesta", approvingProposal: "Aprobando…",
    inbox: { title: "Reservas pendientes", intro: "Aprueba o rechaza las reservas de tus invitados.", empty: "No hay reservas pendientes.", requester: "Solicitó: {{name}}", hidden: "Nombre oculto por tu ajuste", hiddenHelp: "Puedes volver a mostrar los nombres en Regalos, «Quién ve quién reservó».", anonymous: "Un invitado", approve: "Aprobar", reject: "Rechazar", approved: "Reserva aprobada.", rejected: "Reserva rechazada.", stale: "Esta reserva ya no estaba pendiente; actualizamos la lista.", gift: "Regalo: {{title}}", requestedAt: "Solicitada el {{date}}" },
    providers: {
      title: "Descubrir proveedores", intro: "Explora proveedores verificados con su oferta, cobertura y horario. Agrega a tu lista el producto que te guste.",
      category: "Categoría", allCategories: "Todas", city: "Ciudad", cityHelp: "Opcional. Por ejemplo: la-paz o santa-cruz.", maxPrice: "Precio máximo (Bs.)", search: "Buscar proveedores",
      by: "De {{name}}", leadTime: "Plazo: {{days}} días", coverage: "Cobertura: {{zones}}", transport: "Traslado desde {{price}}", address: "Dirección: {{address}}", hours: "Horario: {{hours}}",
      disclaimer: "DOne te conecta con el proveedor; no presta ni garantiza el servicio. Acuerda precio, entrega y plazos con él.", none: "Ningún proveedor coincide con estos filtros.", count: "{{count}} resultados", page: "Página {{page}} de {{pages}}"
    },
    catalog: { title: "Agregar desde el catálogo", intro: "Busca productos de proveedores verificados y añádelos a tu lista.", search: "Buscar productos", searchPlaceholder: "Torta, vajilla, flores…", add: "Agregar a la lista", adding: "Agregando…", added: "Agregado: {{title}}", none: "No encontramos productos con esa búsqueda.", fallbackNote: "El buscador de productos aún no está disponible; mostramos el catálogo público de proveedores.", unavailable: "Producto no disponible", unavailableBody: "Ese producto ya no está disponible en el catálogo. Elige otro.", priceFrom: "Desde {{price}}" },
    external: {
      title: "Agregar un regalo externo", intro: "Un regalo de otra tienda no cuenta con el respaldo de un aliado de DOne. Antes de agregarlo, revisa si un aliado ofrece algo parecido.",
      modeLabel: "Quién puede agregar regalos externos", modeAuto: "Se publican al instante", modeRestricted: "Los reviso antes de publicarlos", modeSaved: "Modo guardado.",
      priorityLabel: "Mostrar primero a los aliados", priorityHelp: "Si lo activas, te sugerimos productos de aliados antes de permitir un regalo externo.",
      name: "Nombre del regalo", url: "Enlace de la tienda", price: "Precio (Bs.)", priceHelp: "Solo números, por ejemplo 150.50", submit: "Agregar regalo externo", submitAnyway: "Agregar de todos modos",
      suggestionsTitle: "Antes de continuar, mira estos productos de aliados", suggestionsBody: "Tu lista prioriza los productos de aliados. Puedes agregar uno de estos o continuar con tu regalo externo.", useSuggestion: "Agregar este",
      added: "Regalo externo agregado.", proposed: "Regalo propuesto: queda pendiente de tu aprobación.", invalidUrl: "Escribe un enlace válido que empiece con http:// o https://.", invalidMoney: "Escribe un precio válido, por ejemplo 150.50.", required: "Completa el nombre, el enlace y el precio."
    },
    errors: { forbidden: "Solo los anfitriones de esta celebración pueden administrar los regalos.", conflict: "Esta lista cambió mientras la editabas. La actualizamos.", validation: "Revisa los datos del regalo.", retry: "Reintentar" }
  }
} as const;
