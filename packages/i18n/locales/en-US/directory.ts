import type { DeepStrings } from "../types.js";
import type { directoryEsBO } from "../es-BO/directory.js";

/** Public provider directory (F24). */
export const directoryEnUS: DeepStrings<typeof directoryEsBO> = {
  title: "Vendors for your celebration",
  description: "Venues, catering, photography and more across Bolivia, from verified vendors.",
  categoriesHeading: "Categories",
  citiesHeading: "Featured cities",
  category: {
    VENUE: "Event venues", CATERING: "Catering", PHOTOGRAPHY: "Photography", MUSIC: "Music", DECORATION: "Decoration", MAKEUP: "Makeup",
    TRANSPORT: "Transport", INVITATIONS: "Invitations", WEDDING_PLANNER: "Wedding planners", ACCOMMODATION: "Accommodation", HONEYMOON: "Honeymoon"
  },
  categoryTitle: "{{category}} in Bolivia",
  categoryDescription: "Compare verified {{category}} for your wedding, quinceañera or event, and request a free quote.",
  cityTitle: "{{category}} in {{city}}",
  cityDescription: "{{category}} in {{city}}: verified vendors, reference prices and availability.",
  verified: "Verified",
  priceFrom: "From {{price}}",
  viewProvider: "View {{name}}",
  empty: "No vendors are published here yet.",
  unavailable: "The vendor catalogue is not available right now. Please try again later.",
  results_one: "{{count}} result",
  results_other: "{{count}} results",
  pagination: { label: "Result pages", previous: "Previous", next: "Next", page: "Page {{page}} of {{pages}}" },
  filters: { legend: "Filters", category: "Category", city: "City", any: "Any", verifiedOnly: "Verified only", maxPrice: "Maximum price (Bs)", date: "Available on", submit: "Search" },
  searchTitle: "Search vendors",
  searchDescription: "Filter vendors by city, price, verification and availability.",
  breadcrumb: { label: "Breadcrumb", home: "Home", directory: "Vendors" }
};
