import type { DeepStrings } from "../types.js";
import type { partnerEsBO } from "../es-BO/partner.js";

/** Partner microsite (F25) and outbound redirector (F27). */
export const partnerEnUS: DeepStrings<typeof partnerEsBO> = {
  meta: { title: "{{name}} · {{category}} in {{city}}", description: "{{name}}: verified {{category}} in {{city}}. See their services and coverage area, and contact them directly." },
  about: "About the vendor",
  factLead_one: "{{name}} is a {{category}} vendor in {{city}}, verified by DOne. It lists {{count}} service.",
  factLead_other: "{{name}} is a {{category}} vendor in {{city}}, verified by DOne. It lists {{count}} services.",
  factLeadNone: "{{name}} is a {{category}} vendor in {{city}}, verified by DOne.",
  imageAlt: "{{name}}, {{category}} in {{city}}",
  noSummary: "This vendor has not added a description yet.",
  coverage: "Coverage area",
  noCoverage: "Serves {{city}}. Ask the vendor whether they reach other areas.",
  services: "What they offer",
  catalogLink: "See the full catalogue",
  verifiedHint: "Passed DOne’s verification",
  noServices: "This vendor has not published services yet. Message them to ask what they offer.",
  contact: "Talk to the vendor directly",
  fineprint: "Before you hire",
  disclaimer: "DOne connects you with {{name}} but does not provide or guarantee the service. The vendor alone is responsible for their offer, prices, coverage, travel costs and lead times: agree on them with the vendor before you book.",
  noContact: "This vendor has no contact methods enabled yet.",
  destination: { WHATSAPP: "Message on WhatsApp", PHONE: "Call", EMAIL: "Send an email", INSTAGRAM: "View Instagram", OFFICIAL_SITE: "Visit their website" },
  backToDirectory: "Back to vendors",
  notFound: { title: "We could not find this vendor", body: "The page does not exist or the vendor is no longer available. Browse other verified vendors." },
  unavailable: { title: "We could not load this vendor", body: "The catalogue did not respond. Try again in a few minutes." },
  redirect: {
    back: "Go back",
    invalid: { title: "This link is not valid", body: "We could not read the vendor link. Go back to the previous page and try again." },
    "not-found": { title: "This vendor is no longer available", body: "The link does not match an active vendor, or that contact method is no longer enabled." },
    unavailable: { title: "We could not open the link", body: "The vendor service is not responding right now. Nothing was lost: go back and try again in a few minutes." }
  }
};
