import type { DeepStrings } from "../types.js";
import type { celebrationEsBO } from "../es-BO/celebration.js";

/** Public celebration site (F08, F10) and theme engine (F09). Same keys as es-BO, checked by type and by test. */
export const celebrationEnUS: DeepStrings<typeof celebrationEsBO> = {
  sections: { story: "Our story", schedule: "Schedule", venues: "Venues", gallery: "Gallery", dressCode: "Dress code", faq: "FAQ", recommendations: "Recommendations", gifts: "Gifts", rsvp: "RSVP" },
  hero: { countdown_one: "{{count}} day to go", countdown_other: "{{count}} days to go", today: "It's today!" },
  nav: { label: "Celebration sections", home: "Home" },
  schedule: { zoneNote: "Times are in the event's local time ({{zone}})." },
  venues: { howToGetThere: "Get directions", kind: { ceremony: "Ceremony", reception: "Reception", other: "Venue" } },
  recommendations: { view: "See option", kind: { lodging: "Lodging", transport: "Transport", other: "Recommendation" } },
  gallery: { photo: "Photo {{n}} of {{total}}", open: "Open {{label}} full size" },
  rsvp: { body: "Reply from the personal link you received with your invitation.", cta: "Reply now" },
  notFound: { title: "This celebration is not available", body: "The link may be mistyped, or the hosts have not published it yet.", home: "Go to the home page" },
  meta: { description: "{{eventType}} · {{date}} · {{venue}}", fallbackDescription: "Everything about the celebration in one place.", sectionTitle: "{{section}} · {{title}}" },
  language: { label: "Language", "es-BO": "Español", "en-US": "English" },
  site: { title: "DOne · Celebrations that feel personal", description: "Sites for weddings, quinceañeras, baptisms and more, with RSVP and gift lists.", tagline: "Memorable celebrations, organised in one place.", directory: "Find vendors for your event" },
  errors: { unavailable: "We could not load this page. Please try again in a few minutes." }
};
