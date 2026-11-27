/** R7 · regalo «No disponible» y reemplazos (plan §5.7 y §5.10). Cuelga de `gifts.host.replacements` (anfitrión y organizador). Tuteo; precios en Bs. */
export const giftsReplacementsEsBO = {
  reason: {
    HIDDEN_BY_ADMIN: "DOne ocultó este producto.", PROVIDER_SUSPENDED: "El proveedor está suspendido.", PROVIDER_REJECTED: "El proveedor ya no está en DOne.",
    PROVIDER_NOT_VERIFIED: "El proveedor ya no está verificado.", UNPUBLISHED: "El proveedor lo despublicó.", INCOMPLETE: "La ficha del producto quedó incompleta.",
    OUT_OF_STOCK: "Se agotó.", VARIANT_OUT_OF_STOCK: "Se agotó la versión que elegiste.", LISTING_NOT_PRODUCT: "Dejó de ser un producto del catálogo.",
    unknown: "El proveedor ya no lo ofrece."
  },
  open: "Ver 3 reemplazos de la misma idea", openLabel: "Ver reemplazos de {{title}}", close: "Ocultar reemplazos", closeLabel: "Ocultar reemplazos de {{title}}",
  title: "Reemplazos de la misma idea", intro: "Son productos de proveedores verificados para la misma idea de regalo. Cambiarlo toma un toque: el nuevo queda en tu lista con la misma cantidad.",
  loading: "Buscando reemplazos…",
  empty: "Por ahora no hay reemplazos para esta idea.", emptyHint: "Cuando un proveedor publique uno lo verás aquí. También puedes elegir otro producto del catálogo.", emptyAction: "Buscar en el catálogo",
  noIdea: "Este regalo no viene del asistente, así que no tiene una idea para buscar reemplazos. Puedes elegir otro producto del catálogo.",
  swap: "Cambiar por este", swapLabel: "Cambiar {{old}} por {{new}}", swapping: "Cambiando…",
  done: "Cambiaste «{{old}}» por «{{new}}». Ya está en tu lista.",
  price: "Precio vigente: {{price}}",
  error: {
    forbidden: "Solo los anfitriones u organizadores de esta celebración pueden cambiar los regalos.",
    notFound: "Ese regalo ya no está en tu lista. Actualizamos la lista.",
    unavailable: "El catálogo no responde por ahora. No se cambió nada.",
    offline: "Sin conexión por ahora. No se cambió nada; reintenta cuando vuelva internet.",
    unknown: "No pudimos buscar los reemplazos. No se cambió nada.",
    retry: "Reintentar",
    swap: {
      CATALOG_PRODUCT_UNAVAILABLE: "Ese producto acaba de dejar de estar disponible. Elige otro.",
      GIFT_LISTING_NOT_ELIGIBLE: "Ese producto ya no cumple lo necesario para ser regalo. Elige otro.",
      GIFT_LISTING_NOT_PRODUCT: "Eso es un servicio, no un producto. Elige otro.",
      DUPLICATE_GIFT_IDEA: "Esa idea ya tiene otro regalo en tu lista. Actualizamos la lista.",
      INVALID_QUANTITY: "La cantidad de este regalo no es válida para el nuevo producto.",
      INVALID_GIFT_IDEA: "Esa idea de regalo ya no existe.",
      unknown: "No pudimos cambiar el regalo. No se cambió nada: puedes intentarlo otra vez."
    }
  }
} as const;
