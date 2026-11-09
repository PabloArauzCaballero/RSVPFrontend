/** Microsite del partner (F25) y redirector de salida (F27). */
export const partnerEsBO = {
  meta: { title: "{{name}} · {{category}} en {{city}}", description: "{{name}}: {{category}} verificado en {{city}}. Conoce sus servicios, su zona de cobertura y contáctalo directamente." },
  about: "Sobre el proveedor",
  factLead_one: "{{name}} es un proveedor de {{category}} en {{city}}, verificado por DOne. Publica {{count}} servicio.",
  factLead_other: "{{name}} es un proveedor de {{category}} en {{city}}, verificado por DOne. Publica {{count}} servicios.",
  factLeadNone: "{{name}} es un proveedor de {{category}} en {{city}}, verificado por DOne.",
  imageAlt: "{{name}}, {{category}} en {{city}}",
  noSummary: "Este proveedor todavía no ha agregado una descripción.",
  coverage: "Zona de cobertura",
  noCoverage: "Atiende en {{city}}. Consulta con el proveedor si llega a otras zonas.",
  services: "Lo que ofrece",
  catalogLink: "Ver el catálogo completo",
  verifiedHint: "Pasó la verificación de DOne",
  noServices: "Este proveedor aún no publica servicios. Escríbele para saber qué ofrece.",
  contact: "Hablar directo con el proveedor",
  fineprint: "Antes de contratar",
  disclaimer: "DOne te conecta con {{name}}, pero no presta ni garantiza el servicio. El proveedor es el único responsable de su oferta, sus precios, su cobertura, los costos de traslado y los plazos: acuérdalos con él antes de contratar.",
  noContact: "Este proveedor todavía no tiene medios de contacto habilitados.",
  destination: { WHATSAPP: "Escribir por WhatsApp", PHONE: "Llamar", EMAIL: "Enviar correo", INSTAGRAM: "Ver Instagram", OFFICIAL_SITE: "Visitar su sitio web" },
  backToDirectory: "Volver a proveedores",
  notFound: { title: "No encontramos a este proveedor", body: "La página no existe o el proveedor ya no está disponible. Mira otros proveedores verificados." },
  unavailable: { title: "No pudimos cargar al proveedor", body: "El catálogo no respondió. Prueba otra vez en unos minutos." },
  redirect: {
    back: "Volver",
    invalid: { title: "Este enlace no es válido", body: "No pudimos interpretar el enlace del proveedor. Vuelve a la página anterior e inténtalo de nuevo." },
    "not-found": { title: "Este proveedor ya no está disponible", body: "El enlace no corresponde a un proveedor activo o ese medio de contacto ya no está habilitado." },
    unavailable: { title: "No pudimos abrir el enlace", body: "El servicio de proveedores no responde ahora mismo. No se perdió nada: vuelve y prueba otra vez en unos minutos." }
  }
} as const;
