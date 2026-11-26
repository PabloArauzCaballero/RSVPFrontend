import type { DeepStrings } from "../types.js";
import type { celebrationEsBO } from "../es-BO/celebration.js";

/** Public celebration site (F08, F10) and theme engine (F09). Same keys as es-BO, checked by type and by test. */
export const celebrationEnUS: DeepStrings<typeof celebrationEsBO> = {
  sections: { story: "Our story", schedule: "Schedule", venues: "Venues", gallery: "Gallery", dressCode: "Dress code", faq: "FAQ", recommendations: "Recommendations", gifts: "Gifts", rsvp: "RSVP" },
  hero: { countdown_one: "{{count}} day to go", countdown_other: "{{count}} days to go", today: "It's today" },
  dock: { label: "Invitation actions" },
  nav: { label: "Celebration sections", home: "Home" },
  schedule: { zoneNote: "Times are in the event's local time ({{zone}})." },
  venues: { howToGetThere: "Get directions", kind: { ceremony: "Ceremony", reception: "Reception", other: "Venue" } },
  recommendations: { view: "See option", kind: { lodging: "Lodging", transport: "Transport", other: "Recommendation" } },
  gallery: { photo: "Photo {{n}} of {{total}}", open: "Open {{label}} full size" },
  rsvp: { body: "Reply from the personal link you received with your invitation.", cta: "Reply now", findLink: "Find your personal link" },
  gifts: { intro: "Reserve a gift in one tap and nobody else will give the same one.", cta: "See gifts", ctaEmpty: "Gifts: coming soon", ctaClosed: "Gifts: list closed" },
  media: { playShort: "Play", pauseShort: "Pause", openVideo: "Watch the video", openMusic: "Listen", openMap: "Show the map", retryShort: "Try again", loading: "Loading {{provider}}…", loadFailed: "We could not load {{provider}}. Check your connection and try again.", retry: "Try again: {{title}}", playVideo: "Watch the video: {{title}}", playMusic: "Listen: {{title}}", showMap: "Show the map: {{title}}", privacy: "Tapping loads content from {{provider}}, and that site may receive data about your visit.", play: "Play {{title}}", pause: "Pause {{title}}", progress: "Progress of {{title}}", audioError: "We could not play the music. Try again." },
  app: { invitationFrame: "Invitation", previewFrame: "Invitation preview", loading: "Loading the invitation…", previewLoading: "Loading the preview…", previewError: "We couldn't load the preview. Check your connection and try again.", previewRetry: "Retry preview", misconfiguredTitle: "This invitation can't be opened from here", misconfiguredBody: "Whoever shared it can send you another link. The gift list is still one tap away." },
  notFound: { title: "This celebration is not available", body: "The link may be mistyped, or the hosts have not published it yet.", home: "Go to the home page" },
  meta: { description: "{{eventType}} · {{date}} · {{venue}}", fallbackDescription: "Everything about the celebration in one place.", sectionTitle: "{{section}} · {{title}}" },
  language: { label: "Language", "es-BO": "Español", "en-US": "English" },
  site: { title: "DOne · Celebrations that feel personal", description: "Sites for weddings, quinceañeras, baptisms and more, with RSVP and gift lists.", tagline: "Memorable celebrations, organized in one place.", directory: "Find vendors for your event" },
  errors: { unavailable: "We could not load this page. Please try again in a few minutes." }
};
