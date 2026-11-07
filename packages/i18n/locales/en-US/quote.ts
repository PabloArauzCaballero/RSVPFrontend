import type { DeepStrings } from "../types.js";
import type { quoteEsBO } from "../es-BO/quote.js";

/** Catalog, fulfillment sheet, quote and schedule of the partner (F25 and F26). */
export const quoteEnUS: DeepStrings<typeof quoteEsBO> = {
  catalog: { title: "{{name}}'s catalog", meta: "Services and products from {{name}} with price and delivery terms.", intro: "Every offer shows who is responsible for delivery.", empty: "This vendor has not published services or products yet.", open: "See terms and price", back: "Back to the vendor", type: { SERVICE: "Service", PRODUCT: "Product" } },
  fulfillment: {
    title: "Delivery and terms", responsible: "Responsible for delivery", responsibleValue: { PROVIDER: "The vendor", CUSTOMER: "You (pick-up on your own)" },
    coverage: "Coverage", transport: "Transport cost", transportNone: "No transport cost reported", leadTime: "Lead time", leadTimeValue: "{{days}} days in advance", conditions: "Terms", missing: "The vendor has not reported delivery terms yet. Ask them before you hire."
  },
  detail: { notFound: "We could not find this offer.", quote: "Request a quote", agenda: "See availability", priceFrom: "From {{price}}" },
  quote: {
    title: "Request a quote from {{name}}", meta: "Get a quote from {{name}}: pick services, date and guests.", intro: "Choose what interests you and tell us how your event will be. {{name}} gets it all together and replies by email.",
    items: "What do you want quoted?", itemsHelp: "Choose at least one offer.", eventDate: "Event date", guests: "Number of guests", budget: "Approximate budget (Bs.)", budgetHelp: "Optional.",
    city: "Event city", name: "Your name", email: "Your email", phone: "Phone", message: "Message", submit: "Send request", submitting: "Sending…",
    summary: "Your selection", noneSelected: "You have not chosen an offer yet.", fulfillmentFor: "Delivery of {{title}}",
    anonymousNote: "You do not need an account: the vendor replies to the email you give. Requesting a date does require signing in.", honeypot: "Website (leave empty)",
    captcha: { label: "Anti-bot check", required: "Complete the check before sending." },
    errors: { rateLimited: "You sent many requests in a row. Wait a moment and try again.", rateLimitedWait: "You sent many requests in a row. Try again in about {{minutes}} minutes.", limitContact: "You already sent the maximum number of requests today to this vendor with that email. Wait for a reply or try tomorrow.", captcha: "We could not verify you are a person. Complete the check again and retry.", rejected: "We could not accept the request. Check the details and try again.", items: "Choose at least one offer.", date: "Choose a future date.", guests: "Say how many guests (at least 1).", name: "Enter your name.", email: "Enter a valid email.", budget: "Enter a valid budget, for example 5000.", validation: "The vendor could not accept the request: check the data.", generic: "We could not send your request. What you wrote is still here: try again.", notFound: "This vendor is no longer available." },
    signIn: { title: "Sign in to send your request", body: "So the vendor can answer you we need your account. Your data stays on this screen.", action: "Sign in" },
    sent: { title: "Request sent", body: "{{name}} received your request and will answer at the email you gave. Request number: {{id}}.", copy: "Keep this number in case you need to follow up on your request.", another: "Request another quote", back: "Back to the vendor" },
    unavailable: "We could not load this vendor. Try again in a few minutes."
  },
  agenda: {
    title: "{{name}}'s availability", meta: "Free days of {{name}}, in {{zone}} time.", intro: "Free days are in {{zone}} time, the vendor's zone.", legend: "Free, blocked or full days",
    prev: "Previous month", next: "Next month", month: "Calendar for {{month}}", free: "Free", blocked: "Unavailable", full: "Full", remaining: "{{count}} slot",
    dayLabel: "{{date}}: {{state}}", select: "Choose a free day to request the date.", selected: "Chosen date: {{date}}", request: "Request this date", requesting: "Requesting…", loading: "Loading the calendar…", error: "We could not load the calendar.", retry: "Try again",
    reason: { BLACKOUT: "The vendor blocked this day", NO_RULE: "The vendor does not work this day", OUTSIDE_HOURS: "Outside business hours", FULL: "No slots left" },
    outcome: { requestedTitle: "Date requested", requestedBody: "We asked {{name}} for {{date}}. They will confirm soon; the request expires {{expires}}.", blocked: "This date is unavailable: the vendor blocked it. Choose another free day.", noCapacity: "Someone took the last slot for this date. Choose another free day; the calendar was refreshed.", signIn: "Sign in to request a date.", generic: "We could not request the date. Try again." }
  }
};
