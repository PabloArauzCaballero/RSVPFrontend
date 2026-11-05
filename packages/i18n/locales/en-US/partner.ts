import type { DeepStrings } from "../types.js";
import type { partnerEsBO } from "../es-BO/partner.js";

/** Partner microsite (F25) and outbound redirector (F27). */
export const partnerEnUS: DeepStrings<typeof partnerEsBO> = {
  meta: { title: "{{name}} · {{category}} in {{city}}", description: "{{name}}: verified {{category}} in {{city}}. See their services and coverage area, and contact them directly." },
  about: "About the provider",
  noSummary: "This provider has not added a description yet.",
  coverage: "Coverage area",
  noCoverage: "Serves {{city}}. Ask the provider whether they reach other areas.",
  services: "Services",
  noServices: "This provider has not published services yet.",
  contact: "Contact",
  disclaimer: "DOne connects you with {{name}} but does not provide or guarantee the service. The provider alone is responsible for their offer, prices, coverage, travel costs and lead times: agree on them with the provider before you book.",
  noContact: "This provider has no contact methods enabled yet.",
  destination: { WHATSAPP: "Message on WhatsApp", PHONE: "Call", EMAIL: "Send an email", INSTAGRAM: "View Instagram", OFFICIAL_SITE: "Visit their website" },
  backToDirectory: "Back to providers",
  notFound: { title: "We could not find this provider", body: "The page does not exist or the provider is not available. Explore other verified providers." },
  unavailable: { title: "We could not load this provider", body: "The provider catalogue is not available right now. Please try again in a few minutes." },
  redirect: {
    back: "Go back",
    invalid: { title: "This link is not valid", body: "We could not read the provider link. Go back to the previous page and try again." },
    "not-found": { title: "This provider is no longer available", body: "The link does not match an active provider, or that contact method is no longer enabled." },
    unavailable: { title: "We could not open the link", body: "The provider service is not responding right now. Nothing was lost: go back and try again in a few minutes." }
  }
};
