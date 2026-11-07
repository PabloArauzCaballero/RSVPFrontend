import type { DeepStrings } from "../types.js";
import type { directoryEsBO } from "../es-BO/directory.js";

/** Public provider directory (F24). */
export const directoryEnUS: DeepStrings<typeof directoryEsBO> = {
  title: "Vendors for your celebration in Bolivia",
  description: "Venues, catering, photography and more. Compare, see starting prices and request a quote straight from the vendor.",
  lead: "Pick a category or narrow by city, price and date. When someone looks right, ask for their quote from their page.",
  categoriesHeading: "What do you need?",
  citiesHeading: "Or search by city",
  category: {
    VENUE: "Event venues", CATERING: "Catering", PHOTOGRAPHY: "Photography", MUSIC: "Music", DECORATION: "Decoration", MAKEUP: "Makeup",
    TRANSPORT: "Transport", INVITATIONS: "Invitations", WEDDING_PLANNER: "Wedding planners", ACCOMMODATION: "Accommodation", HONEYMOON: "Honeymoon"
  },
  categoryTitle: "{{category}} in Bolivia",
  categoryDescription: "Compare verified {{category}} for your wedding, quinceañera or event, and request a quote, no commitment.",
  cityTitle: "{{category}} in {{city}}",
  cityDescription: "{{category}} in {{city}}: verified vendors, reference prices and availability.",
  verified: "Verified",
  priceFrom: "From {{price}}",
  viewProvider: "View {{name}}",
  empty: "No vendors are published here yet.",
  emptyHint: "Try another city or category, or remove a filter.",
  emptyAction: "See all categories",
  unavailable: "We could not load vendors right now, and it was not something you did. Try again in a few minutes.",
  retry: "Try again",
  results_one: "{{count}} result",
  results_other: "{{count}} results",
  pagination: { label: "Result pages", previous: "Previous", next: "Next", page: "Page {{page}} of {{pages}}" },
  filters: { legend: "Narrow your search", category: "Category", city: "City", any: "Any", verifiedOnly: "Verified only", maxPrice: "Maximum price (Bs)", date: "Available on", submit: "Search" },
  searchTitle: "Search vendors",
  searchDescription: "Filter vendors by city, price, verification and availability.",
  steps: {
    title: "How to ask for a quote",
    chooseTitle: "Pick a vendor",
    chooseBody: "See their services, their prices and the days they have free.",
    tellTitle: "Tell them about your event",
    tellBody: "Date, guests and what you are interested in, in a single form.",
    replyTitle: "Get their reply",
    replyBody: "The vendor answers at the email you gave."
  },
  trust: "“Verified” means the vendor has passed DOne’s verification. DOne does not provide or guarantee the service: you agree price, coverage and timing with the vendor.",
  breadcrumb: { label: "Breadcrumb", home: "Home", directory: "Vendors" }
};
