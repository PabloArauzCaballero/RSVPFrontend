/** Microsite del partner (F25) y redirector de salida (F27). */
export const partnerEsBO = {
  meta: { title: "{{name}} · {{category}} en {{city}}", description: "{{name}}: {{category}} verificado en {{city}}. Conoce sus servicios, su zona de cobertura y contáctalo directamente." },
  about: "Sobre el proveedor",
  noSummary: "Este proveedor todavía no ha agregado una descripción.",
  coverage: "Zona de cobertura",
  noCoverage: "Atiende en {{city}}. Consulta con el proveedor si llega a otras zonas.",
  services: "Servicios",
  noServices: "Este proveedor aún no ha publicado servicios.",
  contact: "Contacto",
  disclaimer: "DOne te conecta con {{name}}, pero no presta ni garantiza el servicio. El proveedor es el único responsable de su oferta, sus precios, su cobertura, los costos de traslado y los plazos: acuérdalos con él antes de contratar.",
  noContact: "Este proveedor todavía no tiene medios de contacto habilitados.",
  destination: { WHATSAPP: "Escribir por WhatsApp", PHONE: "Llamar", EMAIL: "Enviar correo", INSTAGRAM: "Ver Instagram", OFFICIAL_SITE: "Visitar su sitio web" },
  backToDirectory: "Volver a proveedores",
  notFound: { title: "No encontramos este proveedor", body: "La página no existe o el proveedor no está disponible. Explora otros proveedores verificados." },
  unavailable: { title: "No pudimos cargar al proveedor", body: "El catálogo de proveedores no está disponible en este momento. Vuelve a intentarlo en unos minutos." },
  redirect: {
    back: "Volver",
    invalid: { title: "Este enlace no es válido", body: "No pudimos interpretar el enlace del proveedor. Vuelve a la página anterior e inténtalo de nuevo." },
    "not-found": { title: "Este proveedor ya no está disponible", body: "El enlace no corresponde a un proveedor activo o ese medio de contacto ya no está habilitado." },
    unavailable: { title: "No pudimos abrir el enlace", body: "El servicio de proveedores no responde ahora mismo. No se perdió nada: vuelve y prueba otra vez en unos minutos." }
  }
} as const;
