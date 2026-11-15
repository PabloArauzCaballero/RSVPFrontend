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
    offline: "Sin conexión. Revisa tu internet e inténtalo de nuevo; tu mensaje sigue aquí.", nameTooLong: "El nombre admite hasta {{max}} caracteres.", messageTooLong: "El mensaje admite hasta {{max}} caracteres.", busyWait: "Recibimos demasiadas solicitudes seguidas. Espera {{seconds}} segundos e inténtalo otra vez.", retryHint: "Puedes volver a pulsar Reservar: no se reservará dos veces.",
    retry: "Reintentar", validation: "Revisa los datos: el nombre o el mensaje son demasiado largos.", generic: "No pudimos reservar el regalo. Inténtalo de nuevo."
  },
  empty: { title: "Aún no hay regalos", body: "Los anfitriones todavía no agregaron regalos. Vuelve pronto.", filtered: "Ningún regalo coincide con estos filtros." },
  notFound: { title: "No encontramos esta celebración", body: "La página no existe o los anfitriones aún no la han publicado." },
  /** Lista de regalos del invitado en la app (Persuade). La web de seo-web sigue con las claves de arriba. */
  guest: {
    title: "Regalos", intro: "Reserva un regalo en un toque y nadie más regalará lo mismo.", rule: "Cada persona puede tener un máximo de regalos reservados a la vez.", backToRsvp: "Volver a mi respuesta", loading: "Abriendo la lista…",
    groupPartner: "De nuestros aliados", groupOther: "Ideas de quienes te invitan",
    status: { AVAILABLE: "Disponible", PENDING_REVIEW: "Esperando aprobación", COMMITTED: "Reservado" },
    reserve: "Reservar", reserveFor: "Reservar {{title}}", viaPartner: "Ver en la tienda del aliado", partnerNote: "Lo ofrece un aliado de DOne. Al abrir el enlace sales de DOne.", reservedBy: "Reservado por {{name}}",
    form: { title: "Reservar «{{title}}»", lead: "Si quieres, deja tu nombre y un mensaje para quienes te invitan. Los dos son opcionales.", name: "Tu nombre (opcional)", nameHelp: "Lo ven quienes te invitan junto a tu reserva.", message: "Mensaje (opcional)", messageHelp: "Hasta 500 caracteres.", submit: "Confirmar reserva", submitting: "Reservando…", cancel: "Ahora no" },
    done: { confirmedTitle: "Regalo reservado", confirmedBody: "«{{title}}» es tuyo. Quienes te invitan lo verán en su lista en un momento.", pendingTitle: "Reserva enviada", pendingBody: "Quienes te invitan aprueban cada reserva. Mientras tanto, nadie más puede reservar «{{title}}»." },
    taken: { title: "Alguien se adelantó", body: "«{{title}}» ya lo reservó otra persona. Pasa a veces. Te mostramos otras opciones.", alternatives: "Otros regalos disponibles", none: "Ya no quedan regalos disponibles. Gracias por querer acompañarlos." },
    empty: { title: "Aún no hay regalos", body: "Quienes te invitan todavía no agregaron ninguno. Vuelve en unos días." },
    error: {
      expiredTitle: "Tu enlace ya no funciona", expiredBody: "Pídele uno nuevo a quien te invitó.",
      otherTitle: "Este enlace es de otra celebración", otherBody: "Abre el enlace que te enviaron para esta celebración. Si no lo encuentras, pídele uno nuevo a quien te invitó.",
      forbiddenTitle: "Con este enlace no se pueden reservar regalos", forbiddenBody: "Pídele a quien te invitó un enlace nuevo.",
      busyTitle: "Hay mucha gente ahora", busyBody: "Espera unos segundos y vuelve a intentarlo.", busyMinutes: "Podrás volver a abrir la lista en unos {{minutes}} min. Si es urgente, escríbele a quien te invitó.",
      unavailableTitle: "No pudimos cargar los regalos", unavailableBody: "No se perdió nada. Inténtalo otra vez.",
      offlineTitle: "Sin conexión por ahora", offlineBody: "Revisa tu internet y vuelve a intentarlo.", retry: "Reintentar",
      notFoundTitle: "No encontramos esta celebración", notFoundBody: "Puede que el enlace esté incompleto o que aún no se haya publicado."
    },
    reserveError: {
      limit: "Llegaste al máximo de regalos que una persona puede reservar. Si quienes te invitan rechazan alguna reserva, podrás elegir otro.",
      expired: "Tu enlace ya no funciona. Pídele uno nuevo a quien te invitó.", forbidden: "Con este enlace no se pueden reservar regalos. Pídele uno nuevo a quien te invitó.", notFound: "Este enlace es de otra celebración. Abre el que te enviaron para esta.",
      busy: "Hubo muchas solicitudes seguidas. Espera un momento y vuelve a intentarlo.", busyWait: "Hubo muchas solicitudes seguidas. Espera {{seconds}} s y vuelve a intentarlo.", busyMinutes: "Hubo muchas solicitudes. Podrás volver a intentarlo en unos {{minutes}} min. Tu mensaje sigue aquí.",
      validation: "El nombre o el mensaje son demasiado largos. Acórtalos y vuelve a intentarlo.", offline: "Sin conexión por ahora. Tu mensaje sigue aquí; reintenta cuando vuelva internet.", generic: "No pudimos reservar el regalo. Inténtalo de nuevo.",
      retryHint: "Puedes volver a tocar «Confirmar reserva»: no se reservará dos veces.", nameTooLong: "El nombre admite hasta {{max}} caracteres.", messageTooLong: "El mensaje admite hasta {{max}} caracteres."
    }
  },
  host: {
    title: "Regalos", intro: "Lo que agregues aquí lo ven tus invitados y lo reservan con un toque.", nav: "Regalos",
    figures: { gifts: "Regalos", available: "Disponibles", reserved: "Reservados", review: "Por revisar" }, list: {
      emptyTitle: "Tu lista empieza con un regalo", emptyBody: "Elige productos de nuestros aliados o enlaza uno de tu tienda favorita. Tus invitados lo reservan y nadie regala lo mismo dos veces.",
      add: "Agregar regalo", fromPartner: "De un aliado", external: "De una tienda", reservedBy: "Reservado por {{name}}",
      more: "Más opciones", pending: "Reservas por revisar: {{count}}", pendingBody: "Tus invitados esperan tu respuesta.", pendingAction: "Revisar reservas"
    },
    status: { AVAILABLE: "Disponible", PROPOSED: "Por revisar", PENDING_REVIEW: "Reserva por revisar", COMMITTED: "Reservado", REJECTED: "Rechazado" },
    visibility: { title: "Quién ve quién reservó", intro: "Tú decides si los nombres salen en tu panel y en la lista de tus invitados.", host: "Ver el nombre en mi panel", hostHelp: "Si lo apagas, verás las reservas sin nombre.", guests: "Mostrar el nombre a otros invitados", guestsHelp: "Apagado: los invitados solo ven que el regalo ya está reservado.", saved: "Preferencia guardada. Aplica desde ahora." },
    approveProposal: "Aprobar propuesta", approvingProposal: "Aprobando…",
    rejectProposal: "Rechazar propuesta", rejectingProposal: "Rechazando…", proposalRejected: "Propuesta rechazada: {{title}}.", rejectConfirm: { title: "¿Rechazar esta propuesta?", body: "“{{title}}” no se mostrará a tus invitados. No podrás deshacerlo desde aquí." },
    inbox: { title: "Reservas por revisar", intro: "Tus invitados quieren estos regalos. Tú decides.", emptyTitle: "No hay reservas pendientes", emptyBody: "Cuando un invitado reserve un regalo y necesites aprobarlo, lo verás aquí.", emptyAction: "Volver a mi lista", signedAs: "Se anotó como: {{name}}", group: "Grupo: {{group}}", requester: "Solicitó: {{name}}", hidden: "Nombre oculto por tu ajuste", hiddenHelp: "Puedes volver a mostrar los nombres en Mi lista, «Más opciones».", anonymous: "Un invitado", approve: "Aprobar", reject: "Rechazar", approved: "Reserva aprobada.", rejected: "Reserva rechazada.", stale: "Esta reserva ya no estaba pendiente. Actualizamos la lista.", gift: "Regalo: {{title}}", requestedAt: "Solicitada el {{date}}" },
    add: {
      title: "Agregar regalo", intro: "Elige de dónde viene el regalo. Los aliados van primero.", originLabel: "¿De dónde viene el regalo?",
      origin: { catalog: "Del catálogo", provider: "De un proveedor", store: "De una tienda" },
      hint: { catalog: "Productos de proveedores verificados, listos para agregar.", provider: "Explora proveedores por categoría y ciudad, y agrega lo que ofrecen.", store: "Un enlace de cualquier tienda. Antes te mostramos opciones de aliados." },
      seeList: "Ver mi lista"
    },
    providers: {
      category: "Categoría", allCategories: "Todas", city: "Ciudad", cityHelp: "Opcional. Por ejemplo: la-paz o santa-cruz.", maxPrice: "Precio máximo (Bs.)", search: "Buscar proveedores", moreFilters: "Más filtros",
      by: "De {{name}}", leadTime: "Plazo: {{days}} días", coverage: "Cobertura: {{zones}}", transport: "Traslado desde {{price}}", address: "Dirección: {{address}}", hours: "Horario: {{hours}}", details: "Ver detalles",
      disclaimer: "DOne te conecta con el proveedor; no presta ni garantiza el servicio. Acuerda precio, entrega y plazos con él.", none: "Ningún proveedor coincide con estos filtros. Prueba con otra categoría.", count: "{{count}} resultados", page: "Página {{page}} de {{pages}}"
    },
    catalog: { alreadyListed: "Ya está en tu lista.", prompt: "Escribe qué buscas, por ejemplo una torta o una vajilla.", search: "Buscar", searchLabel: "Buscar en el catálogo", searchPlaceholder: "Torta, vajilla, flores…", add: "Agregar a mi lista", adding: "Agregando…", added: "Agregado: {{title}}", none: "No encontramos productos con esa búsqueda. Prueba con otra palabra.", fallbackNote: "El buscador de productos aún no está disponible; mostramos el catálogo público de proveedores.", unavailable: "Producto no disponible", unavailableBody: "Ese producto ya no está en el catálogo. Elige otro.", priceFrom: "Desde {{price}}" },
    store: {
      ruleTitle: "Primero los aliados", ruleOn: "Antes de agregar un regalo de tienda te mostramos productos parecidos de aliados. Si ninguno te sirve, lo agregas igual.", ruleOff: "Puedes agregar regalos de cualquier tienda sin pasos previos.", ruleChange: "Cambiar en Modos de control",
      modeAUTO_ACCEPT: "Tus regalos de tienda aparecen en la lista al instante.", modeRESTRICTED: "Tus regalos de tienda quedan por revisar: los apruebas desde Mi lista.",
      name: "Nombre del regalo", url: "Enlace de la tienda", price: "Precio ({{currency}})", priceHelp: "Solo números, por ejemplo 150.50", submit: "Agregar regalo", submitAnyway: "Agregar de todos modos",
      suggestionsTitle: "Antes de seguir, mira estas opciones de aliados", suggestionsBody: "Tu lista pone primero a los aliados. Elige una de estas o agrega tu regalo igual.", useSuggestion: "Agregar este",
      added: "Regalo de tienda agregado.", proposed: "Regalo propuesto: queda por revisar en Mi lista.", invalidUrl: "Escribe un enlace válido que empiece con http:// o https://.", titleTooLong: "El nombre admite hasta {{max}} caracteres.", invalidMoney: "Escribe un precio válido, por ejemplo 150.50.", required: "Completa el nombre, el enlace y el precio."
    },
    errors: { codes: { notAvailable: "Alguien se te adelantó: ese regalo ya no está disponible. Actualizamos la lista.", alreadyAnswered: "Ese regalo ya tiene otra respuesta y la lista cambió. La actualizamos.", reservationAnswered: "Esa reserva ya tiene respuesta. Actualizamos la lista.", requestReused: "Esa solicitud ya se envió con otros datos. Vuelve a empezar desde la lista.", validation: "Revisa los datos del regalo e inténtalo otra vez.", invalidUrl: "Ese enlace no es válido. Debe empezar con http:// o https://.", invalidMoney: "Ese precio no es válido. Usa solo números, por ejemplo 150.50.", invalidTitle: "Revisa el nombre del regalo: no puede estar vacío ni ser demasiado largo.", invalidCurrency: "La moneda del regalo no es válida para esta celebración.", giftGone: "Ese regalo ya no está en la lista. La actualizamos.", listMissing: "La lista de regalos no está disponible. Vuelve a intentarlo.", reservationGone: "No encontramos esa reserva. Actualizamos la lista.", forbidden: "Solo los anfitriones de esta celebración pueden administrar los regalos." }, forbidden: "Solo los anfitriones de esta celebración pueden administrar los regalos.", conflict: "Esta lista cambió mientras la editabas. La actualizamos.", validation: "Revisa los datos del regalo.", retry: "Reintentar" }
  }
} as const;
