import type { DeepStrings } from "../types.js";
import type { accountEsBO } from "../es-BO/account.js";

/** Pages of any signed-in account (the (account) group): the partner request of DPA-10. */
export const accountEnUS: DeepStrings<typeof accountEsBO> = {
  partnerRequest: {
    title: "Become a partner",
    intro: "Tell us about your events business. The DOne team reviews every request and contacts you the way you choose.",
    backHome: "Back to my space",
    loading: "Loading your request…",
    loadError: "We couldn't load your requests. Try again in a few minutes.",
    loadErrorNetwork: "We couldn't load your requests. Check your connection and try again.",
    referenceError: "We couldn't load the categories or the cities, and the form can't be completed without them.",
    retry: "Try again",
    steps: {
      title: "How it works",
      send: "You send us this request with your business details.",
      call: "The team reviews it and contacts you on WhatsApp or by phone.",
      kyp: "Then we ask for the KYP documents (tax ID, identity card and proof of address) to verify your business and create your partner account."
    },
    noEmail: "We don't send e-mail updates yet: come back to this page to see how your request is going.",
    formLabel: "Partner request",
    formTitle: "Your business",
    againTitle: "Send a new request",
    choose: "Choose an option",
    fields: {
      businessName: "Business name", businessNameHelp: "The name your customers know. Up to 120 characters.",
      category: "Category", department: "Department", city: "City", cityFirst: "Choose the department first.",
      channel: "How should we contact you?", whatsapp: "WhatsApp number", phone: "Phone number",
      phoneHelp: "With the country code if it isn't Bolivian, for example +591 70000000.",
      message: "Message (optional)", messageHelp: "What you offer, since when and where you work. {{count}} of {{max}} characters.",
      consent: "I agree that the DOne team may contact me at this number about my request."
    },
    channels: { WHATSAPP: "WhatsApp", PHONE: "Phone call" },
    channelNames: { WHATSAPP: "WhatsApp", PHONE: "phone" },
    codes: {
      REQUIRED: "This is missing.", TOO_LONG: "It's too long.", UNKNOWN_CATEGORY: "That category is no longer available. Choose another one.", UNKNOWN_DEPARTMENT: "Choose a department from the list.",
      UNKNOWN_CITY: "Choose a city from the list.", CITY_NOT_IN_DEPARTMENT: "That city isn't in that department. Choose another one.", INVALID_PHONE: "Type only the number, 7 to 20 digits, with an optional + at the start.",
      INVALID_CHANNEL: "Choose WhatsApp or phone call.", CONSENT_REQUIRED: "Tick the box so we can contact you.", INVALID: "Check this field."
    },
    tooLong: { businessName: "Use up to 120 characters.", contactPhone: "It's too long: type only the number.", message: "Use up to 1000 characters." },
    fixErrors_one: "Check the highlighted field to send the request.", fixErrors_other: "Check the {{count}} highlighted fields to send the request.",
    submit: "Send request", submitting: "Sending…",
    sent: "We got your request. We don't send e-mail updates yet: come back to this page to see how it's going.",
    goToPortal: "Go to my portal",
    errors: {
      REQUEST_LIMIT: "You already sent {{limit}} requests in the last {{days}} days. You can send another one once that period is over.",
      ALREADY_PARTNER_OWNER: "Your account already owns a partner, so there's no need for another request. Manage it from your portal.",
      REQUEST_ALREADY_OPEN: "You already have a request in progress. Here's how it's going.",
      VALIDATION_FAILED: "Check the highlighted fields and send the request again.",
      network: "We couldn't send your request. Check your connection and try again: your details are still here.",
      rateLimited: "Too many attempts in a row. Wait a moment and send it again: your details are still here.",
      server: "We couldn't send your request because of a problem on our side. Try again in a few minutes: your details are still here.",
      generic: "We couldn't send your request. Try again: your details are still here.",
      INVALID_REQUEST_TRANSITION: "The team already took your request, so it can no longer be withdrawn. Here's its current status.",
      PARTNER_REQUEST_VERSION_CONFLICT: "Your request changed a moment ago. Here's its current status.",
      PARTNER_REQUEST_NOT_FOUND: "We can no longer find that request. Here's the updated list.",
      withdrawGeneric: "We couldn't withdraw your request. Try again in a few minutes."
    },
    statuses: { OPEN: "Received", IN_REVIEW: "In review", CONVERTED: "Approved", REJECTED: "Not approved", WITHDRAWN: "Withdrawn" },
    summary: "{{category}} · {{city}} · sent on {{date}}",
    statusBody: {
      OPEN: "We received it on {{date}}. The team will review it and contact you on {{channel}} at {{phone}}.",
      IN_REVIEW: "The team is reviewing it and will contact you on {{channel}} at {{phone}}.",
      CONVERTED: "The team approved your request and is setting up your partner account. They will ask for the KYP documents to finish; once it's ready, sign in again to see your portal.",
      REJECTED: "The team couldn't approve it. Reason: {{reason}}",
      WITHDRAWN: "You withdrew it on {{date}}."
    },
    comeBack: "Come back to this page to see how it's going: we don't send e-mail updates yet.",
    withdraw: {
      action: "Withdraw request", title: "Withdraw the request for {{name}}?",
      body: "The team will stop reviewing it. You can send another one, but this one counts towards the limit of {{limit}} requests in {{days}} days.",
      confirm: "Withdraw request", done: "You withdrew your request."
    },
    history: "Earlier requests",
    historyItem: "{{name}} · {{status}} · {{date}}"
  }
};
