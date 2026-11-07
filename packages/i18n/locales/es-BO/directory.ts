/** Public provider directory (F24). */
export const directoryEsBO = {
  title: "Proveedores para tu celebración en Bolivia",
  description: "Salones, catering, fotografía y más. Compara, mira precios desde y pide cotización directo al proveedor.",
  lead: "Elige una categoría o afina por ciudad, precio y fecha. Cuando alguien te guste, pídele su cotización desde su ficha.",
  categoriesHeading: "¿Qué necesitas?",
  citiesHeading: "O busca por ciudad",
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
  emptyHint: "Prueba con otra ciudad o categoría, o quita algún filtro.",
  emptyAction: "Ver todas las categorías",
  unavailable: "No pudimos cargar los proveedores en este momento, y no fue por algo que hiciste. Prueba otra vez en unos minutos.",
  retry: "Reintentar",
  results_one: "{{count}} resultado",
  results_other: "{{count}} resultados",
  pagination: { label: "Páginas de resultados", previous: "Anterior", next: "Siguiente", page: "Página {{page}} de {{pages}}" },
  filters: { legend: "Afina tu búsqueda", category: "Categoría", city: "Ciudad", any: "Cualquiera", verifiedOnly: "Solo verificados", maxPrice: "Precio máximo (Bs)", date: "Disponible el", submit: "Buscar" },
  searchTitle: "Buscar proveedores",
  searchDescription: "Filtra proveedores por ciudad, precio, verificación y disponibilidad.",
  steps: {
    title: "Así se pide una cotización",
    chooseTitle: "Elige un proveedor",
    chooseBody: "Mira sus servicios, sus precios y los días que tiene libres.",
    tellTitle: "Cuéntale tu evento",
    tellBody: "Fecha, invitados y lo que te interesa, en un solo formulario.",
    replyTitle: "Recibe su respuesta",
    replyBody: "El proveedor te responde al correo que indicaste."
  },
  trust: "«Verificado» quiere decir que el proveedor pasó la verificación de DOne. DOne no presta ni garantiza el servicio: precio, cobertura y plazos los acuerdas con el proveedor.",
  breadcrumb: { label: "Ruta de navegación", home: "Inicio", directory: "Proveedores" }
} as const;
