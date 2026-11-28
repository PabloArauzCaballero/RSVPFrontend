import { giftsReplacementsEsBO } from "./gifts-replacements.js";
import { giftsWizardEsBO } from "./gifts-wizard.js";
/** Lista de regalos pública (F22) y gestión del anfitrión (F23). */
export const giftsEsBO = {
  meta: { title: "Regalos · {{name}}", description: "Lista de regalos para {{name}}. Los productos de nuestros aliados aparecen primero." },
  back: "Volver a la celebración",
  filters: { label: "Filtrar regalos", maxPrice: "Precio máximo", source: "Origen", sourceAll: "Todos", sourcePartner: "De nuestros aliados", sourceOther: "Otras tiendas", onlyAvailable: "Solo disponibles", clear: "Quitar filtros", count_one: "{{count}} regalo", count_other: "{{count}} regalos" },
  card: { photo: "Foto de {{title}}", open: "Ver detalle de {{title}}", viaWhatsApp: "Pedir por WhatsApp", viaOther: "Ver en la tienda" },
  detail: { title: "{{title}} · Regalos", back: "Volver a la lista", notFound: "Este regalo ya no está en la lista.", notFoundBody: "Puede que los anfitriones lo hayan quitado. La lista completa sigue abierta para ti.", notFoundBodyClosed: "Puede que los anfitriones lo hayan quitado. Puedes volver a la lista para ver los demás.", partnerNote: "Este producto lo ofrece un aliado de DOne. Al abrir el enlace saldrás de DOne." },
  outcome: { cancelledTitle: "Reserva cancelada", cancelledBody: "Esta reserva se canceló al cambiar tu asistencia. Si volvés a asistir, confirmá tu respuesta y elegí un regalo disponible." },
  error: {
    attendanceBody: "Para reservar un regalo, volvé a tu respuesta y confirmá que asistirás.",
    needLinkTitle: "Abre tu enlace de invitación", needLinkBody: "Para ver y reservar regalos usamos el enlace personal de tu invitación; no necesitas crear una cuenta. Ábrelo desde el mensaje que te enviaron los anfitriones.",
    needLinkAction: "Ir a mi invitación" },
  empty: { filtered: "Ningún regalo coincide con estos filtros.", filteredBody: "Prueba con otro precio u origen, o quita los filtros." },
  notFound: { title: "No encontramos esta celebración", body: "La página no existe o los anfitriones aún no la han publicado." },
  /** Lista de regalos del invitado en la app (Persuade). La web pública (seo-web) usa las mismas claves desde M21. */
  guest: {
    title: "Regalos", intro: "Reserva un regalo en un toque y nadie más regalará lo mismo.", rule: "Cada persona puede tener un máximo de regalos reservados a la vez.", backToRsvp: "Volver a mi respuesta", loading: "Abriendo la lista…",
    groupPartner: "De nuestros aliados", groupOther: "Ideas de quienes te invitan",
    status: { AVAILABLE: "Disponible", PENDING_REVIEW: "Esperando aprobación", COMMITTED: "Reservado" },
    /** R5 · tarjeta del invitado: cantidad por unidades, aporte coordinado, precio vigente y «¿lo compraste?». */
    units: { left_one: "Falta {{count}} de {{total}}", left_other: "Faltan {{count}} de {{total}}", choose: "Cuántos quieres regalar", less: "Menos unidades", more: "Más unidades", value_one: "{{count}} unidad", value_other: "{{count}} unidades", help_one: "Queda {{count}}. Reservas solo las que vas a regalar.", help_other: "Quedan {{count}}. Reservas solo las que vas a regalar.", mine_one: "Reservaste {{count}} unidad", mine_other: "Reservaste {{count}} unidades" },
    group: {
      badge: "Entre varios", contributorsNone: "Todavía nadie se sumó", contributors_one: "1 persona aporta", contributors_other: "{{count}} personas aportan",
      noCoordinator: "Sé quien coordina: reservas el regalo y compras en la tienda; los demás se suman con su parte.",
      coordinatorNamed: "{{name}} lo comprará", coordinatorAnonymous: "Alguien del grupo lo comprará",
      join: "Sumarme", joinFor: "Sumarme a {{title}}", start: "Coordinar este regalo", startFor: "Coordinar {{title}}",
      youCoordinate: "Tú coordinas este regalo", youCoordinateHelp: "Eres quien compra. Usa los botones de abajo y los demás aportan su parte.", namesShown: "Se sumaron: {{names}}",
      youContribute: "Te sumaste a este regalo", youContributeHelp: "Otra persona lo compra; tú aportas tu parte con ella.", leave: "Salirme del regalo", leaveFor: "Salirme del regalo {{title}}",
      leaveTitle: "¿Salirte del regalo?", leaveBody: "Dejas de aportar a «{{title}}». Si cambias de idea, podrás sumarte otra vez mientras siga libre.", leaveBodyClosed: "La lista está cerrada: si sales de «{{title}}», no podrás volver a sumarte mientras siga cerrada.", leaveConfirm: "Sí, salirme", leaveKeep: "No, quedarme", leaveBusy: "Saliendo…", leaveDone: "Saliste del regalo «{{title}}». Ya no aportas a él.",
      lead: "Este regalo se compra entre varios. Quien se anota primero lo coordina y compra; la app no cobra ni mueve dinero.", leadContributor: "Te sumas a la compra de otra persona. La app no cobra: acuerden el aporte entre ustedes."
    },
    prompt: {
      title: "¿Compraste {{title}}?", titleUnits: "¿Compraste {{units}} × {{title}}?", body: "Cuéntanos para reservarlo y que nadie más lo regale. Tu respuesta no sale de este dispositivo hasta que lo reserves.", reminder: "Te lo recordamos una sola vez.",
      yes: "Sí, ya lo compré", later: "Todavía no", no: "No", yesCoordinator: "Gracias. Tu reserva sigue activa.", dismissed: "Listo. No te lo volveremos a preguntar.",
      bodyClosed: "La lista está cerrada y ya no se pueden reservar regalos, así que no podemos anotar tu compra aquí. Si ya lo compraste, avísale a quienes te invitan para que nadie lo repita.", ack: "Entendido", ackFor: "Entendido: {{title}}", yesClosed: "Gracias por avisar. La lista está cerrada, así que no podemos anotar tu compra. Si ya lo compraste, avísale a quienes te invitan.", laterDone: "Te lo recordaremos una vez cuando abras la lista.",
      yesFor: "Sí, ya lo compré: {{title}}", laterFor: "Todavía no compré {{title}}", noFor: "No compré {{title}}"
    },
    reserve: "Reservar", reserveFor: "Reservar {{title}}", viaPartner: "Ver en la tienda", partnerNote: "Lo ofrece un aliado de DOne. Al abrir el enlace sales de DOne.", reservedBy: "Reservado por {{name}}",
    form: { title: "Reservar «{{title}}»", lead: "Si quieres, deja tu nombre y un mensaje para quienes te invitan. Los dos son opcionales.", name: "Tu nombre (opcional)", nameHelp: "Lo ven quienes te invitan junto a tu reserva.", message: "Mensaje (opcional)", messageHelp: "Hasta 500 caracteres.", submit: "Confirmar reserva", submitting: "Reservando…", cancel: "Ahora no", showName: "Mostrar mi nombre a los demás invitados", showNameHelp: "Solo si escribiste tu nombre arriba. Tu teléfono y tu correo nunca se muestran.", coordinatorNote: "Quedarás como quien coordina la compra de todo el regalo." },
    done: { confirmedTitle: "Regalo reservado", confirmedBody: "«{{title}}» es tuyo. Quienes te invitan lo verán en su lista en un momento.", pendingTitle: "Reserva enviada", pendingBody: "Quienes te invitan aprueban cada reserva. Mientras tanto, nadie más puede reservar «{{title}}»." },
    taken: { title: "Alguien se adelantó", body: "«{{title}}» ya lo reservó otra persona. Pasa a veces. Te mostramos otras opciones.", alternatives: "Otros regalos disponibles", none: "Ya no quedan regalos disponibles. Gracias por querer acompañarlos." },
    empty: { title: "Aún no hay regalos", body: "Quienes te invitan todavía no agregaron ninguno. Vuelve en unos días." },
    /** R8a · botón de regalos en la invitación según `GET /gifts/public/celebrations/{slug}/gifts/summary` (OPEN | EMPTY | CLOSED). */
    cta: { open: "Ver regalos", empty: "Lista de regalos (pronto)", closed: "Ver regalos" },
    error: {
      expiredTitle: "Tu enlace ya no funciona", expiredBody: "Pídele uno nuevo a quien te invitó.",
      otherTitle: "Este enlace es de otra celebración", otherBody: "Abre el enlace que te enviaron para esta celebración. Si no lo encuentras, pídele uno nuevo a quien te invitó.",
      forbiddenTitle: "Con este enlace no se pueden reservar regalos", forbiddenBody: "Pídele a quien te invitó un enlace nuevo.",
      busyTitle: "Hay mucha gente ahora", busyBody: "Espera unos segundos y vuelve a intentarlo.", busyMinutes: "Podrás volver a abrir la lista en unos {{minutes}} min. Si es urgente, escríbele a quien te invitó.",
      unavailableTitle: "No pudimos cargar los regalos", unavailableBody: "No se perdió nada. Inténtalo otra vez.",
      offlineTitle: "Sin conexión por ahora", offlineBody: "Revisa tu internet y vuelve a intentarlo.", retry: "Reintentar",
      notFoundTitle: "No encontramos esta celebración", notFoundBody: "Puede que el enlace esté incompleto o que aún no se haya publicado."
    },
    /** R8a (REG-01) · lista cerrada a mano: se avisa y no se ofrece reservar. */
    closed: { title: "La lista de regalos está cerrada", body: "Quienes te invitan la cerraron: ya no se pueden reservar regalos.", keepsMine: "Lo que ya reservaste se mantiene. Si quieres, puedes cancelarlo." },
    /** D-3 · el invitado cancela su propia reserva (app). */
    mine: { label: "Tu reserva", pendingLabel: "Tu reserva, esperando aprobación", cancel: "Cancelar mi reserva", cancelFor: "Cancelar mi reserva de {{title}}", confirmTitle: "¿Cancelar tu reserva?", confirmBody: "«{{title}}» vuelve a estar disponible para los demás invitados. Si cambias de idea, podrás reservarlo otra vez mientras siga libre.", confirm: "Sí, cancelar la reserva", keep: "No, mantenerla", confirmBodyClosed: "La lista está cerrada: si cancelas tu reserva de «{{title}}», no podrás volver a reservarlo mientras siga cerrada.", cancelling: "Cancelando…", done: "Cancelaste tu reserva de «{{title}}». El regalo volvió a la lista.", notActive: "Esta reserva ya no estaba activa. Actualizamos la lista.", error: "No pudimos cancelar la reserva. Inténtalo de nuevo: no se cancelará dos veces.", expired: "Tu enlace ya no funciona. Pídele uno nuevo a quien te invitó.", offline: "Sin conexión por ahora. Tu reserva sigue igual; reintenta cuando vuelva internet.", released: "Quienes te invitan liberaron «{{title}}». Puedes elegir otro regalo." },
    reserveError: {
      closed: "La lista está cerrada: ya no se pueden reservar regalos.",
      limit: "Llegaste al máximo de regalos que una persona puede reservar. Si quienes te invitan rechazan alguna reserva, podrás elegir otro.",
      expired: "Tu enlace ya no funciona. Pídele uno nuevo a quien te invitó.", forbidden: "Con este enlace no se pueden reservar regalos. Pídele uno nuevo a quien te invitó.", notFound: "Este enlace es de otra celebración. Abre el que te enviaron para esta.",
      busy: "Hubo muchas solicitudes seguidas. Espera un momento y vuelve a intentarlo.", busyWait: "Hubo muchas solicitudes seguidas. Espera {{seconds}} s y vuelve a intentarlo.", busyMinutes: "Hubo muchas solicitudes. Podrás volver a intentarlo en unos {{minutes}} min. Tu mensaje sigue aquí.",
      validation: "El nombre o el mensaje son demasiado largos. Acórtalos y vuelve a intentarlo.", offline: "Sin conexión por ahora. Tu mensaje sigue aquí; reintenta cuando vuelva internet.", generic: "No pudimos reservar el regalo. Inténtalo de nuevo.",
      units_one: "Ya solo queda {{count}} unidad. Elige 1 y vuelve a intentarlo.", units_other: "Ya solo quedan {{count}} unidades. Elige una cantidad menor y vuelve a intentarlo.", unitsNone: "Ya no quedan unidades de este regalo. Actualizamos la lista.", already: "Ya tienes una reserva de este regalo. Cancélala primero si quieres cambiarla.",
      retryHint: "Puedes volver a tocar «Confirmar reserva»: no se reservará dos veces.", nameTooLong: "El nombre admite hasta {{max}} caracteres.", messageTooLong: "El mensaje admite hasta {{max}} caracteres."
    }
  },
  host: {
    title: "Regalos", intro: "Lo que agregues aquí lo ven tus invitados y lo reservan con un toque.", nav: "Regalos",
    figures: { gifts: "Regalos", available: "Disponibles", reserved: "Reservados", review: "Por revisar" }, list: {
      emptyTitle: "Tu lista empieza con un regalo", emptyBody: "Elige productos de nuestros aliados o enlaza uno de tu tienda favorita. Tus invitados lo reservan y nadie regala lo mismo dos veces.",
      add: "Agregar regalo", fromPartner: "De un aliado", external: "De una tienda", reservedBy: "Reservado por {{name}}",
      more: "Más opciones", pending: "Reservas por revisar: {{count}}", pendingBody: "Tus invitados esperan tu respuesta.", pendingAction: "Revisar reservas",
      unavailableNote: "Tus invitados ya no lo ven: este regalo dejó de estar disponible en el catálogo."
    },
    unavailable: { title: "No disponibles ({{count}})", body: "Estos regalos ya no se pueden dar y tus invitados no los ven. No cuentan en el total de tu lista." },
    /** Cerrar o reabrir la lista a mano (gift-list 1.13.0, putGiftListClosure). */
    closure: { title: "Lista de regalos", statusOpen: "Abierta", statusClosed: "Cerrada", openBody: "Tus invitados pueden reservar regalos. Ciérrala cuando ya no quieras recibir más reservas.", closedBody: "Tus invitados ya no pueden reservar regalos. Las reservas que ya existen se mantienen y puedes seguir agregando regalos.", close: "Cerrar la lista", reopen: "Reabrir la lista", reopening: "Reabriendo…", confirmTitle: "¿Cerrar la lista de regalos?", confirmBody: "Tus invitados ya no podrán reservar regalos. Las reservas que ya existen se mantienen y quienes reservaron pueden cancelarlas. Puedes reabrir la lista cuando quieras.", confirm: "Cerrar la lista", keep: "Mantenerla abierta", doneClosed: "Cerraste la lista de regalos: tus invitados ya no pueden reservar.", doneOpen: "Reabriste la lista de regalos: tus invitados pueden volver a reservar." },
    status: { AVAILABLE: "Disponible", PROPOSED: "Por revisar", PENDING_REVIEW: "Reserva por revisar", COMMITTED: "Reservado", REJECTED: "Rechazado", UNAVAILABLE: "No disponible" },
    visibility: { title: "Quién ve quién reservó", intro: "Tú decides si los nombres salen en tu panel y en la lista de tus invitados.", host: "Ver el nombre en mi panel", hostHelp: "Si lo apagas, verás las reservas sin nombre.", guests: "Mostrar el nombre a otros invitados", guestsHelp: "Apagado: los invitados solo ven que el regalo ya está reservado.", saved: "Preferencia guardada. Aplica desde ahora." },
    approveProposal: "Aprobar propuesta", approvingProposal: "Aprobando…",
    rejectProposal: "Rechazar propuesta", rejectingProposal: "Rechazando…", proposalRejected: "Propuesta rechazada: {{title}}.", rejectConfirm: { title: "¿Rechazar esta propuesta?", body: "“{{title}}” no se mostrará a tus invitados. No podrás deshacerlo desde aquí." },
    /** D-3 · el anfitrión libera un regalo reservado. */
    remove: { action: "Quitar de la lista", actionFor: "Quitar «{{title}}» de la lista", confirmTitle: "¿Quitar este regalo de la lista?", confirmBody: "«{{title}}» ya no está disponible. Lo quitamos de tu lista y deja de aparecer.", confirm: "Sí, quitarlo", keep: "No, dejarlo", done: "Quitaste «{{title}}» de la lista." },
    release: { action: "Liberar regalo", confirmTitle: "¿Liberar este regalo?", confirmBody: "Se cancela la reserva de «{{title}}» y el regalo vuelve a estar disponible para tus invitados. Quien lo reservó verá su reserva como cancelada.", confirm: "Sí, liberar", keep: "No, mantener la reserva", done: "Liberaste «{{title}}». Ya está disponible otra vez.", confirmBodyUnavailable: "Se cancela la reserva de «{{title}}». El regalo sigue como no disponible: tus invitados no lo ven.", doneUnavailable: "Liberaste «{{title}}». Sigue como no disponible: tus invitados no lo ven." },
    inbox: { title: "Reservas por revisar", intro: "Tus invitados quieren estos regalos. Tú decides.", emptyTitle: "No hay reservas pendientes", emptyBody: "Cuando un invitado reserve un regalo y necesites aprobarlo, lo verás aquí.", emptyAction: "Volver a mi lista", signedAs: "Se anotó como: {{name}}", group: "Grupo: {{group}}", requester: "Solicitó: {{name}}", hidden: "Nombre oculto por tu ajuste", hiddenHelp: "Puedes volver a mostrar los nombres en Mi lista, «Más opciones».", anonymous: "Un invitado", approve: "Aprobar", reject: "Rechazar", approved: "Reserva aprobada.", rejected: "Reserva rechazada.", stale: "Esta reserva ya no estaba pendiente. Actualizamos la lista.", gift: "Regalo: {{title}}", requestedAt: "Solicitada el {{date}}" },
    add: {
      title: "Agregar regalo", intro: "Elige de dónde viene el regalo. Los aliados van primero.", originLabel: "¿De dónde viene el regalo?",
      origin: { catalog: "Del catálogo", store: "De una tienda" },
      hint: { catalog: "Productos de proveedores verificados, listos para agregar.", store: "Un enlace de cualquier tienda. Antes te mostramos opciones de aliados." },
      seeList: "Ver mi lista"
    },
    catalog: { added: "Agregado: {{title}}" },
    store: {
      ruleTitle: "Primero los aliados", ruleOn: "Antes de agregar un regalo de tienda te mostramos productos parecidos de aliados. Si ninguno te sirve, lo agregas igual.", ruleOff: "Puedes agregar regalos de cualquier tienda sin pasos previos.", ruleChange: "Cambiar en Modos de control",
      modeAUTO_ACCEPT: "Tus regalos de tienda aparecen en la lista al instante.", modeRESTRICTED: "Tus regalos de tienda quedan por revisar: los apruebas desde Mi lista.",
      name: "Nombre del regalo", url: "Enlace de la tienda", price: "Precio ({{currency}})", priceHelp: "Solo números, por ejemplo 150.50", submit: "Agregar regalo", submitAnyway: "Agregar de todos modos",
      suggestionsTitle: "Antes de seguir, mira estas opciones de aliados", suggestionsBody: "Tu lista pone primero a los aliados. Elige una de estas o agrega tu regalo igual.", useSuggestion: "Agregar este",
      added: "Regalo de tienda agregado.", proposed: "Regalo propuesto: queda por revisar en Mi lista.", invalidUrl: "Escribe un enlace válido que empiece con http:// o https://.", titleTooLong: "El nombre admite hasta {{max}} caracteres.", invalidMoney: "Escribe un precio válido, por ejemplo 150.50.", required: "Completa el nombre, el enlace y el precio."
    },
    replacements: giftsReplacementsEsBO,
    wizard: giftsWizardEsBO,
    errors: { codes: { notAvailable: "Alguien se te adelantó: ese regalo ya no está disponible. Actualizamos la lista.", alreadyAnswered: "Ese regalo ya tiene otra respuesta y la lista cambió. La actualizamos.", reservationAnswered: "Esa reserva ya tiene respuesta. Actualizamos la lista.", requestReused: "Esa solicitud ya se envió con otros datos. Vuelve a empezar desde la lista.", validation: "Revisa los datos del regalo e inténtalo otra vez.", invalidUrl: "Ese enlace no es válido. Debe empezar con http:// o https://.", invalidMoney: "Ese precio no es válido. Usa solo números, por ejemplo 150.50.", invalidTitle: "Revisa el nombre del regalo: no puede estar vacío ni ser demasiado largo.", invalidCurrency: "La moneda del regalo no es válida para esta celebración.", giftGone: "Ese regalo ya no está en la lista. La actualizamos.", listMissing: "La lista de regalos no está disponible. Vuelve a intentarlo.", reservationNotActive: "Esa reserva ya no estaba activa. Actualizamos la lista.", reservationGone: "No encontramos esa reserva. Actualizamos la lista.", forbidden: "Solo los anfitriones u organizadores de esta celebración pueden administrar los regalos.", notProduct: "Eso es un servicio, no un producto: no se puede agregar como regalo. Elige un producto del catálogo.", notRemovable: "Solo se puede quitar un regalo que ya no está disponible. Actualizamos la lista.", hasReservations: "Ese regalo todavía tiene una reserva. Libérala primero y luego quítalo." }, forbidden: "Solo los anfitriones u organizadores de esta celebración pueden administrar los regalos.", conflict: "Esta lista cambió mientras la editabas. La actualizamos.", validation: "Revisa los datos del regalo.", retry: "Reintentar" }
  }
} as const;
