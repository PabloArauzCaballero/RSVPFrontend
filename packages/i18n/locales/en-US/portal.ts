import type { DeepStrings } from "../types.js";
import type { portalEsBO } from "../es-BO/portal.js";

/** Provider portal (F28). */
export const portalEnUS: DeepStrings<typeof portalEsBO> = {
  label: "Provider portal",
  nav: { label: "Portal sections", home: "Overview", services: "Offers", products: "Products", delivery: "Delivery", microsite: "Public profile", documents: "Documents", destinations: "Contact", agenda: "Schedule", leads: "Requests", metrics: "Results" },
  dest: { overview: "Overview", offers: "Offers", agenda: "Schedule", clients: "Clients", profile: "Profile" },
  microsite: {
    title: "Public profile", intro: "This is how couples see you on your page. It saves as a whole; if someone else changed it, we warn you before overwriting.",
    descEs: "Description (Spanish)", descEn: "Description (English)", descHelp: "Up to 2000 characters.", website: "Website", instagram: "Instagram", facebook: "Facebook", whatsapp: "WhatsApp (with country code)",
    address: "Address", addressHelp: "Street and number.", reference: "Landmark", hours: "Opening hours", hoursOpens: "Opens (HH:MM)", hoursCloses: "Closes (HH:MM)", hoursDays: "Days (0 = Sunday, e.g. 1,2,3,4,5)", hoursNote: "Hours note",
    save: "Save profile", saving: "Saving…", saved: "Profile saved (version {{version}}).", conflict: "Someone saved a newer version. We reloaded the profile; review it and save again.", invalid: "Check the highlighted fields.", invalidUrl: "Enter a full address starting with https://.", invalidHour: "Use HH:MM, opening before closing.", invalidDays: "Enter days 0-6 separated by commas.", invalidPhone: "Digits only, optional + (6 to 15).", tooLong: "The description allows up to 2000 characters.", version: "Version {{version}}", reload: "Reload"
  },
  documents: {
    title: "Documents", intro: "Upload what backs your business. They are private: only you and the verification team see them. PDF, JPG, PNG or WebP up to 10 MB.", emptyTitle: "Your documents go here",
    kind: "Document type", kinds: { IDENTITY: "ID document", BUSINESS_REGISTRATION: "Business registration", TAX_ID: "Tax ID", ADDRESS_PROOF: "Proof of address", OTHER: "Other" },
    choose: "Choose file", upload: "Upload document", uploading: "Uploading…", uploaded: "Document uploaded.", delete: "Delete", deleteTitle: "Delete this document?", deleteBody: "The file and its record are removed. To get verified you will have to upload it again.", deleted: "Document deleted.", opening: "Opening…", empty: "Upload the first one so the team can review it with your profile.", status: { PENDING_UPLOAD: "Upload pending", UPLOADED: "Received" },
    tooBig: "The file is larger than 10 MB.", badType: "Only PDF, JPG, PNG or WebP.", none: "Choose a file first.", putFailed: "The file could not be sent. Try again.", download: "View", size: "{{kb}} KB", webOnly: "In this version file upload works in the browser."
  },
  loading: "Loading your portal…",
  onboarding: {
    title: "Register your business", intro: "Create your profile in a minute. Then add your first offer and send it for verification.",
    name: "Business name", nameHelp: "This is the name couples will see.", submit: "Create my profile", creating: "Creating…", required: "Enter your business name.", tooLong: "The name allows up to 120 characters.",
    existingTitle: "Already have a profile?", existingBody: "Connect it with its provider code.", existingId: "Provider code", connect: "Connect profile", invalidId: "The code must be a valid identifier.", notFound: "We found no provider with that code.", notOwner: "That profile belongs to another account."
  },
  status: {
    title: "Your profile status",
    DRAFT: { label: "Draft", body: "It is not public yet. Finish the steps and send it for verification." },
    PENDING_VERIFICATION: { label: "Under verification", body: "The team is reviewing your profile. Meanwhile it does not appear in the directory." },
    VERIFIED: { label: "Verified", body: "Your profile is public. Your published offers appear in the directory and on your page." },
    REJECTED: { label: "Rejected", body: "The team did not approve your profile. Fix what they pointed out and send it again." },
    SUSPENDED: { label: "Suspended", body: "Your profile is suspended and does not appear in the directory. Write to the team to resolve it." },
    submit: "Submit for verification", submitting: "Submitting…", submitted: "You sent your profile for verification.", needsListing: "Create an offer to be able to send it.",
    documentsNote: "You can upload your documents in Profile. The team reviews them with your profile.",
    publicPage: "See my microsite"
  },
  home: {
    title: "Your business", intro: "Everything you need for couples to find you.", more: "More options", less: "Fewer options",
    journey: {
      title: "Ready to sell", progress: "{{done}} of {{total}} steps",
      profile: { title: "Your profile", done: "{{name}} has a profile." },
      offer: { title: "Your first offer", todo: "Say what you offer, from what price and how you deliver it.", done: "You already created an offer.", action: "Create my first offer" },
      verify: { title: "Send for verification", todo: "The team reviews your profile. Only verified profiles show in the directory.", done: "Your profile is with the team." }
    },
    milestone: {
      offer: { title: "You have your first offer", body: "One step left: send your profile for verification." },
      PENDING_VERIFICATION: { title: "Profile sent", body: "The team is reviewing it. You will see the result here." },
      VERIFIED: { title: "Your profile is public", body: "The offers you publish appear in the directory." }
    }, slug: "Public address: /p/{{slug}}", plan: "{{plan}} plan", zone: "Time zone: {{zone}}", last30: "Last 30 days" },
  services: {
    title: "Offers", intro: "Your services and products, with their price and how you deliver them. Publish the ones you want to show.", emptyTitle: "Your offers live here", empty: "Create the first one with its price and delivery terms. Publish it whenever you want.", emptyAction: "Create my first offer", add: "New offer", listTitle_one: "{{count}} offer", listTitle_other: "{{count}} offers", type: { SERVICE: "Service", PRODUCT: "Product" }, published: "Published", draft: "Draft", publish: "Publish", publishing: "Publishing…", needsTerms: "To publish it, first declare its delivery terms.", published_ok: "Offer published.",
    new: { title: "New offer", cancel: "Cancel", kind: "What you offer", name: "Name", price: "Price from (Bs.)", priceHelp: "Optional, for example 450.", category: "Category", city: "City", whatsapp: "WhatsApp (link https://wa.me/…)", site: "Website (https://…)", destinationsHelp: "Where we take couples when they tap Contact. You can add a website under More options.", fulfillmentTitle: "How you deliver it", responsible: "Responsible for delivery", responsibleProvider: "Me (the provider)", responsibleCustomer: "The customer", coverage: "Coverage zones", coverageHelp: "Comma separated, for example la-paz, el-alto.", transport: "Transport cost (Bs.)", lead: "Lead time (days in advance)", conditions: "Terms", submit: "Create offer", creating: "Creating…", created: "Offer created as a draft." },
    errors: { nameLong: "The name allows up to 120 characters.", name: "Enter the offer name.", destination: "Add at least one contact destination.", coverage: "Enter at least one coverage zone.", price: "Enter a valid price, for example 450.50.", url: "Enter a valid link starting with https://.", conditions: "Enter the delivery terms.", lead: "Enter a lead time in days (0 or more)." }
  },
  products: {
    title: "Offers", intro: "Products are what hosts can add to their gift list.", empty: "You have not created products yet."
  },
  delivery: {
    title: "Delivery", intro: "This is how hosts read how you deliver each offer.", fixedNote: "The terms are set when the offer is created; the server cannot edit them yet. To change them, create the offer again.", empty: "When you create an offer, you will see how you deliver it here.", responsible: "Delivery handled by: {{who}}", coverage: "Coverage: {{zones}}", transport: "Transport: {{price}}", noTransport: "no transport charge", lead: "Lead time: {{days}} days ahead", missing: "This offer declares no delivery terms."
  },
  destinations: {
    title: "How they reach you", intro: "Choose where we take couples when they tap a contact button. Every tap is recorded as a request.", enabled: "Enabled destinations", atLeastOne: "Choose at least one destination.",
    destination: { OFFICIAL_SITE: "Website", LANDING: "Landing page", WHATSAPP: "WhatsApp", PHONE: "Phone", EMAIL: "Email", INSTAGRAM: "Instagram", PRODUCT_PAGE: "Product page" },
    utmTitle: "Campaign tracking", utmSource: "Campaign source", utmMedium: "Medium", utmCampaign: "Campaign name (optional)", utmHelp: "Letters, numbers, dot, hyphen and underscore only.", utmInvalid: "Use only letters, numbers, dot, hyphen or underscore (max 64).", dedupe: "Minutes before counting two clicks of the same visitor", cap: "Monthly lead cap (0 = no cap)", billing: "Billing model", save: "Save destinations", saving: "Saving…", saved: "Destinations saved.", numberInvalid: "Enter valid whole numbers: minutes between 1 and 1440 and a cap between 0 and 1000000."
  },
  agenda: {
    title: "Schedule", scheduleTitle: "Your hours", intro: "Answer the dates couples ask for and set when you work ({{zone}}).", bookingsPending_one: "{{count}} date to confirm", bookingsPending_other: "{{count}} dates to confirm", bookingsEmptyTitle: "No dates to answer", capacity: "Slots per day", weekdays: "Working days", weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], start: "From", end: "To", timeInvalid: "Use the HH:MM format, for example 08:00.", rangeInvalid: "The closing time must be after the opening time.",
    blackouts: "Blocked days", blackoutDate: "Date (YYYY-MM-DD)", blackoutReason: "Reason (optional)", addBlackout: "Block day", removeBlackout: "Remove", dateInvalid: "Use the YYYY-MM-DD format.", save: "Save schedule", saving: "Saving…", saved: "Schedule saved.", capacityInvalid: "Enter a whole number of slots between 1 and 1000.", blackoutEnd: "Until (optional, YYYY-MM-DD)", dateReal: "That date does not exist on the calendar.", blackoutDuplicate: "That day is already blocked.", endBefore: "The end date cannot be before the start date.", rejectTitle: "Reject this request?", rejectBody: "The couple will see that you cannot take that date. This cannot be undone.", cancelTitle: "Cancel this booking?", cancelBody: "The couple will be told the date is free again. This cannot be undone.", keep: "Go back",
    bookings: "Requested dates", bookingsEmpty: "When a couple asks for a date, you will see it here to confirm with a tap.", status: { REQUESTED: "Pending", CONFIRMED: "Confirmed", REJECTED: "Rejected", CANCELLED: "Cancelled", EXPIRED: "Expired" }, confirm: "Confirm", reject: "Reject", cancel: "Cancel booking", decided: "Request updated.", stale: "That request already changed state; we refreshed the list.", date: "Date: {{date}}", expires: "Expires {{when}}"
  },
  leads: {
    title: "Requests", intro: "Couples who wrote to you or asked for a quote.", emptyTitle: "Nobody has written yet", empty: "When a couple taps your contact or asks for a quote, it shows up here.", clicksEmpty: "Nobody has tapped your contacts yet.", more: "Load more", shown: "Showing {{shown}} of {{total}}", quotesTitle: "Quotes they asked for", quotesEmpty: "You have not received quotes yet.", clicksTitle: "Taps on your contacts",
    kind: { REDIRECT: "Click", FORM: "Quote" }, valid: "Valid", invalid: { dup: "Duplicate", bot: "Discarded (bot)" }, destination: "Destination: {{destination}}", surface: "Source: {{surface}}", when: "{{when}}", billable: "Billable", event: "Event date: {{date}}", guests: "{{count}} guests"
  },
  metrics: {
    title: "Results", intro: "How many couples saw you and how many reached out.", emptyTitle: "No activity on these dates", noData: "There is no data in this period yet. When couples see and tap your profile, it will show here.", field: { day: "Day", category: "Category", destination: "Contact", impressions: "Times seen", clicks: "Taps", validLeads: "Valid requests", invalidLeads: "Discarded", leads: "Requests" }, from: "From (YYYY-MM-DD)", to: "To (YYYY-MM-DD)", apply: "See results", dateInvalid: "Use the YYYY-MM-DD format and a valid period.", empty: "Try another date range.",
    impressions: "Times seen", clicks: "Taps on your contacts", ctr: "Taps per view", validLeads: "Valid requests", invalidLeads: "Discarded requests", groupBy: "Group by", group: { day: "Day", category: "Category", destination: "Destination" }, groupsTitle: "Detail by {{group}}"
  },
  errors: {
    forbidden: "This account cannot manage this business.", generic: "We could not save it. Try again.", retry: "Try again", noProvider: "Register your business first to see this section.", goOnboarding: "Register my business",
    network: "Cannot reach the server. Check your internet and try again; what you typed is still here.", rateLimited: "Too many taps in a row. Wait {{seconds}} seconds and try again.", rateLimitedNoWait: "Too many taps in a row. Wait a moment and try again.",
    unavailable: "The service is unavailable for now. Try again in a few minutes.", server: "Something failed on our side. What you typed is still here: try again in a few minutes.", storage: "Documents are not available right now. Nothing was saved; try again later.",
    transition: "Your profile's status already changed and that action no longer applies. Reload to see the current status.", notOwner: "Only the profile owner or an administrator can do this.", planAdmin: "Only an administrator can change the plan."
  },
  rename: { action: "Change the name", field: "Business name", save: "Save name", saving: "Saving…", saved: "Name updated.", cancel: "Cancel", required: "Enter your business name.", tooLong: "The name allows up to 120 characters." }
};
