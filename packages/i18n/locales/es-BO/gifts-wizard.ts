/** R4 · asistente «Agregar regalo» del anfitrión y del organizador (D-10 §5.6). Cuelga de `gifts.host.wizard`. Tuteo; precios en Bs. */
export const giftsWizardEsBO = {
  progress: "Tus pasos", step: "Paso {{n}}", back: "Atrás", next: "Siguiente",
  stepName: { ideas: "Ideas", products: "Productos", summary: "Resumen" },
  ideas: {
    title: "Elige ideas de regalo", intro: "Marca las ideas que quieres en tu lista. Después eliges un producto de un proveedor verificado para cada una.",
    recommended: "Recomendado para tu celebración ({{event}}) en {{city}}", recommendedNoCity: "Recomendado para tu celebración ({{event}})", allIdeas: "Ideas de regalo",
    cityLabel: "Ciudad de entrega", cityAny: "Todas las ciudades", cityHelp: "Mostramos primero los productos que se entregan en esa ciudad.",
    count_one: "{{count}} producto · {{range}}", count_other: "{{count}} productos · {{range}}", range: "{{min}} – {{max}}", rangeSingle: "{{price}}",
    alreadyListed: "Ya en tu lista", choose: "Elegir la idea {{name}}", chooseListed: "{{name}}: ya está en tu lista",
    selected_one: "{{count}} idea elegida", selected_other: "{{count}} ideas elegidas", continue: "Elegir productos", needOne: "Marca al menos una idea para seguir.",
    emptyTitle: "Todavía no hay productos para tu celebración", emptyBody: "Cuando un proveedor verificado publique productos completos, sus ideas aparecerán aquí. Mientras tanto puedes agregar un regalo de una tienda.", emptyStore: "Agregar de una tienda",
    allListed: "Ya tienes un regalo en cada idea disponible. Puedes verlos en tu lista.",
    filterRange: "Mostrando ideas con precios {{range}}", clearFilter: "Quitar filtro", filterNone: "Ninguna idea tiene productos en ese rango de precios.",
    loading: "Cargando ideas de regalo…", error: "No pudimos cargar las ideas de regalo.", offline: "Sin conexión por ahora. Revisa tu internet y vuelve a intentarlo."
  },
  products: {
    title: "Elige un producto por idea", intro: "Un producto por idea. Para cambiarlo, toca otro.",
    ideaGroup: "Productos para {{idea}}", optionsFor: "Opciones de {{title}}", chosen: "Elegido", choose: "Elegir {{title}}, {{price}}", shown: "Mostrando {{shown}} de {{total}} productos, los más recomendados primero.",
    provider: "Proveedor verificado: {{name}}", sponsored: "Patrocinado", photo: "Foto de {{title}}", noPhoto: "Sin foto",
    deliveryHere: "Entrega en tu ciudad", deliveryOther: "Entrega en otra ciudad", leadSameDay: "Entrega el mismo día", lead_one: "Entrega en {{count}} día", lead_other: "Entrega en {{count}} días",
    shippingFree: "Envío gratis", shipping: "Envío {{price}}",
    stock: { AVAILABLE: "Disponible", MADE_TO_ORDER: "Se hace por encargo", OUT_OF_STOCK: "Agotado" },
    version: "Versión", versionOption: "{{label}} · {{price}}", versionOut: "{{label}} · agotada",
    quantity: "Cantidad", quantityLess: "Menos", quantityMore: "Más", quantityValue: "Cantidad: {{count}}", quantityHelp: "Entre 1 y {{max}}.",
    group: "Se puede regalar entre varios", groupHelp: "Tus invitados pueden juntarse para regalarlo. Lo sugerimos encendido por encima de {{price}}.", groupSuggested: "Sugerido por el precio",
    emptyIdea: "Esta idea ya no tiene productos con existencias. Desmárcala o elige otra.", missing: "Elige un producto para {{idea}} o quita la idea.",
    currencyNote: "Los precios de los proveedores están en bolivianos (Bs)."
  },
  summary: {
    title: "Revisa tu lista", intro: "Estos regalos se agregan juntos: si algo falla, no se agrega ninguno.", disclaimer: "DOne te conecta con el proveedor; no vende ni garantiza el producto. Acuerda precio, entrega y plazos con él.",
    line: "{{idea}}: {{title}}", lineVersion: "{{idea}}: {{title}} ({{version}})", lineQuantity: "{{count}} × {{price}}", group: "Se puede regalar entre varios", total: "Total de la lista nueva: {{price}}",
    change: "Cambiar", currencyNote: "Los precios de los proveedores están en bolivianos (Bs).",
    balance: {
      title: "Equilibrio de precios", intro: "Así se reparten los regalos de tu lista, la que ya tienes y la nueva, según su precio.",
      b1: "Hasta {{max}}", b2: "De {{min}} a {{max}}", b3: "De {{min}} a {{max}}", b4: "Más de {{min}}",
      units_one: "{{count}} regalo", units_other: "{{count}} regalos", guests_one: "{{count}} invitado confirmado o pendiente", guests_other: "{{count}} invitados confirmados o pendientes",
      guestsCount_one: "{{count}} invitado", guestsCount_other: "{{count}} invitados",
      needAffordable_one: "Tienes {{have}} regalo hasta {{max}} y {{guests}}: agrega ideas económicas.", needAffordable_other: "Tienes {{have}} regalos hasta {{max}} y {{guests}}: agrega ideas económicas.",
      needAffordableNone: "No tienes regalos hasta {{max}} y {{guests}}: agrega ideas económicas.",
      seeCheap: "Ver ideas hasta {{max}}", ok: "Tu lista tiene regalos para distintos bolsillos.", noGuests: "Cuando invites personas, comparamos tu lista con ellas.", loadingGuests: "Calculando con tus invitados…", guestsError: "No pudimos leer tus invitados; el equilibrio se muestra sin compararlos."
    },
    delivery: { label: "Indicaciones de entrega (opcional)", help: "Por ejemplo: «Entregar en portería, por la tarde». Las verán tus invitados cuando esta función esté disponible.", warning: "No escribas la dirección exacta.", control: "Quita los caracteres de control: solo se admite texto.", counter: "{{count}} de {{max}} caracteres", tooLong_one: "Quita {{count}} carácter: el máximo es {{max}}.", tooLong_other: "Quita {{count}} caracteres: el máximo es {{max}}." },
    submit_one: "Agregar {{count}} regalo", submit_other: "Agregar {{count}} regalos", submitting: "Agregando…",
    doneTitle_one: "Listo: agregamos {{count}} regalo", doneTitle_other: "Listo: agregamos {{count}} regalos", doneBody: "Ya están en tu lista y tus invitados los verán.", seeList: "Ver mi lista", addMore: "Agregar más"
  },
  errors: {
    codes: {
      GIFT_LISTING_NOT_ELIGIBLE: "Este producto ya no se puede recomendar: el proveedor lo cambió o lo retiró. Elige otro.",
      CATALOG_PRODUCT_UNAVAILABLE: "Este producto ya no está en el catálogo. Elige otro.",
      GIFT_LISTING_NOT_PRODUCT: "Eso es un servicio, no un producto: no se puede agregar como regalo. Elige un producto.",
      INVALID_QUANTITY: "La cantidad no es válida. Elige entre 1 y {{max}}.",
      INVALID_GIFT_IDEA: "Esa idea no corresponde a este producto. Elige otro producto o cambia la idea.",
      INVALID_VARIANT: "Esa versión ya no existe. Elige otra.",
      DUPLICATE_GIFT_IDEA: "Esa idea ya tiene un regalo en tu lista. Quita una de las dos."
    },
    entryFallback: "No pudimos agregar este regalo. Elige otro.",
    failedTitle_one: "No se agregó ningún regalo: {{count}} necesita un cambio", failedTitle_other: "No se agregó ningún regalo: {{count}} necesitan un cambio",
    failedHelp: "Corrige lo marcado y vuelve a tocar «Agregar». Lo demás se conserva.", fix: "Corregir",
    invalidNotes: "Revisa las indicaciones de entrega: admiten hasta {{max}} caracteres y no deben llevar la dirección exacta.",
    retryHint: "Puedes volver a tocar «Agregar»: no se agregará dos veces.", offline: "Sin conexión por ahora. Tu selección sigue aquí; reintenta cuando vuelva internet.",
    notesUnsavedTitle_one: "Agregamos {{count}} regalo, pero no pudimos guardar tus indicaciones", notesUnsavedTitle_other: "Agregamos {{count}} regalos, pero no pudimos guardar tus indicaciones",
    notesSaving: "Guardando…", notesEdit: "Editar indicaciones de entrega", notesSave: "Guardar indicaciones",
    notesUnsaved: "No se perdió nada: tus regalos ya están en la lista. Reintenta para guardar las indicaciones de entrega.", generic: "No pudimos completar el envío. Tu selección sigue aquí; vuelve a tocar «Agregar».",
    listUnreadable: "No pudimos leer tu lista de regalos. Sin ella no podemos saber qué ya agregaste.", listRetry: "Reintentar"
  },
  list: { quantity: "Cantidad: {{count}}", group: "Se puede regalar entre varios", delivery: "Indicaciones de entrega: {{notes}}" }
} as const;
