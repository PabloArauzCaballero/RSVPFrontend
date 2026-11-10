/** Public provider directory (F24). */
export const directoryEsBO = {
  title: "Proveedores para tu celebración",
  description: "Salones, catering, fotografía y más en toda Bolivia, con proveedores verificados.",
  categoriesHeading: "Categorías",
  citiesHeading: "Ciudades destacadas",
  category: {
    VENUE: "Salones de eventos", CATERING: "Catering", PHOTOGRAPHY: "Fotografía", MUSIC: "Música", DECORATION: "Decoración", MAKEUP: "Maquillaje",
    TRANSPORT: "Transporte", INVITATIONS: "Invitaciones", WEDDING_PLANNER: "Wedding planners", ACCOMMODATION: "Hospedaje", HONEYMOON: "Luna de miel"
  },
  categoryTitle: "{{category}} en Bolivia",
  categoryDescription: "Compara {{category}} verificados para tu boda, quinceaños o evento, y pide cotización sin compromiso.",
  cityTitle: "{{category}} en {{city}}",
  cityDescription: "{{category}} en {{city}}: proveedores verificados, precios de referencia y disponibilidad.",
  verified: "Verificado",
  priceFrom: "Desde {{price}}",
  viewProvider: "Ver {{name}}",
  empty: "Todavía no hay proveedores publicados aquí.",
  unavailable: "El catálogo de proveedores no está disponible en este momento. Vuelve a intentarlo más tarde.",
  results_one: "{{count}} resultado",
  results_other: "{{count}} resultados",
  pagination: { label: "Páginas de resultados", previous: "Anterior", next: "Siguiente", page: "Página {{page}} de {{pages}}" },
  filters: { legend: "Filtros", category: "Categoría", city: "Ciudad", any: "Cualquiera", verifiedOnly: "Solo verificados", maxPrice: "Precio máximo (Bs)", date: "Disponible el", submit: "Buscar" },
  searchTitle: "Buscar proveedores",
  searchDescription: "Filtra proveedores por ciudad, precio, verificación y disponibilidad.",
  breadcrumb: { label: "Ruta de navegación", home: "Inicio", directory: "Proveedores" }
} as const;
