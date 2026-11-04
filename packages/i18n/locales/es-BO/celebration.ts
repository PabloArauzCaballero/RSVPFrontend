/** Public celebration site (F08, F10) and theme engine (F09). */
export const celebrationEsBO = {
  sections: { story: "Nuestra historia", schedule: "Itinerario", venues: "Lugares", gallery: "Galería", dressCode: "Código de vestimenta", faq: "Preguntas frecuentes", recommendations: "Recomendaciones", gifts: "Regalos", rsvp: "Confirma tu asistencia" },
  hero: { countdown_one: "Falta {{count}} día", countdown_other: "Faltan {{count}} días", today: "¡Es hoy!" },
  nav: { label: "Secciones de la celebración", home: "Inicio" },
  schedule: { zoneNote: "Los horarios están en la hora local del evento ({{zone}})." },
  venues: { howToGetThere: "Cómo llegar", kind: { ceremony: "Ceremonia", reception: "Recepción", other: "Lugar" } },
  recommendations: { view: "Ver opción", kind: { lodging: "Hospedaje", transport: "Transporte", other: "Recomendación" } },
  gallery: { photo: "Foto {{n}} de {{total}}", open: "Abrir {{label}} en tamaño completo" },
  rsvp: { body: "Confirma tu asistencia desde el enlace personal que recibiste en tu invitación.", cta: "Confirmar asistencia" },
  notFound: { title: "Esta celebración no está disponible", body: "Puede que el enlace esté mal escrito o que los anfitriones todavía no la hayan publicado.", home: "Ir al inicio" },
  meta: { description: "{{eventType}} · {{date}} · {{venue}}", fallbackDescription: "Toda la información de la celebración en un solo lugar.", sectionTitle: "{{section}} · {{title}}" },
  language: { label: "Idioma", "es-BO": "Español", "en-US": "English" },
  site: { title: "DOne · Celebraciones que se sienten personales", description: "Sitios para bodas, quinceaños, bautizos y más, con confirmación de asistencia y lista de regalos.", tagline: "Celebraciones memorables, organizadas en un solo lugar.", directory: "Encuentra proveedores para tu evento" },
  errors: { unavailable: "No pudimos cargar esta página. Inténtalo de nuevo en unos minutos." }
} as const;
