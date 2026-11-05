import type { DeepStrings } from "../types.js";
import type { portalEsBO } from "../es-BO/portal.js";

/** Provider portal (F28). */
export const portalEnUS: DeepStrings<typeof portalEsBO> = {
  label: "Provider portal",
  nav: { label: "Portal sections", home: "Overview", services: "Services and products", products: "Products", delivery: "Delivery terms", microsite: "Public profile", documents: "Verification documents", destinations: "Contact destinations", agenda: "Schedule and bookings", leads: "Leads and quotes", metrics: "Metrics" },
  microsite: {
    title: "Public profile", intro: "What your customers see on your page. The whole profile is saved each time; if someone else changed it, we warn you before overwriting.",
    descEs: "Description (Spanish)", descEn: "Description (English)", descHelp: "Up to 2000 characters.", website: "Website", instagram: "Instagram", facebook: "Facebook", whatsapp: "WhatsApp (with country code)",
    address: "Address", addressHelp: "Street and number.", reference: "Landmark", hours: "Opening hours", hoursOpens: "Opens (HH:MM)", hoursCloses: "Closes (HH:MM)", hoursDays: "Days (0 = Sunday, e.g. 1,2,3,4,5)", hoursNote: "Hours note",
    save: "Save profile", saving: "Saving…", saved: "Profile saved (version {{version}}).", conflict: "Someone saved a newer version. We reloaded the profile; review it and save again.", invalid: "Check the highlighted fields.", invalidUrl: "Enter a full address starting with https://.", invalidHour: "Use HH:MM, opening before closing.", invalidDays: "Enter days 0-6 separated by commas.", invalidPhone: "Digits only, optional + (6 to 15).", version: "Version {{version}}", reload: "Reload"
  },
  documents: {
    title: "Verification documents", intro: "Upload the documents that back your business. They are private: only you and the verification team can see them. PDF, JPG, PNG or WebP up to 10 MB.",
    kind: "Document type", kinds: { IDENTITY: "ID document", BUSINESS_REGISTRATION: "Business registration", TAX_ID: "Tax ID", ADDRESS_PROOF: "Proof of address", OTHER: "Other" },
    choose: "Choose file", upload: "Upload document", uploading: "Uploading…", uploaded: "Document uploaded.", empty: "You have not uploaded documents yet.", status: { PENDING_UPLOAD: "Upload pending", UPLOADED: "Received" },
    tooBig: "The file is larger than 10 MB.", badType: "Only PDF, JPG, PNG or WebP.", none: "Choose a file first.", putFailed: "The file could not be sent. Try again.", download: "View", size: "{{kb}} KB", webOnly: "In this version file upload works in the browser."
  },
  loading: "Loading your portal…",
  onboarding: {
    title: "Register your business", intro: "Create your provider profile. Then you will submit it for verification: only verified providers appear in the directory.",
    name: "Business name", nameHelp: "This is the name couples will see.", submit: "Create my profile", creating: "Creating…", required: "Enter your business name.",
    existingTitle: "Already have a profile?", existingBody: "Connect it with its provider code. (The service cannot yet look up your profiles by account.)", existingId: "Provider code", connect: "Connect profile", invalidId: "The code must be a valid identifier.", notFound: "We found no provider with that code.", notOwner: "That profile belongs to another account."
  },
  status: {
    title: "Verification status",
    DRAFT: { label: "Draft", body: "Complete your offers and contact destinations, and submit the profile for verification." },
    PENDING_VERIFICATION: { label: "Under verification", body: "An administrator is reviewing your profile. Meanwhile it does not appear in the directory." },
    VERIFIED: { label: "Verified", body: "Your profile is public. Published offers appear in the directory and on your microsite." },
    SUSPENDED: { label: "Suspended", body: "Your profile is suspended and does not appear in the directory. Contact the team to resolve it." },
    submit: "Submit for verification", submitting: "Submitting…", submitted: "Profile submitted for verification.", needsListing: "Before submitting, create at least one offer.",
    documentsNote: "Upload your documents in Verification documents; the team reviews them with your profile.",
    publicPage: "See my microsite"
  },
  home: { title: "Provider overview", intro: "See how couples find you and what they ask of you.", slug: "Public address: /p/{{slug}}", plan: "{{plan}} plan", zone: "Time zone: {{zone}}", last30: "Last 30 days" },
  services: {
    title: "Services", intro: "Each offer has its price and delivery terms. Publish the ones you want to show.", empty: "You have not created offers yet.", type: { SERVICE: "Service", PRODUCT: "Product" }, published: "Published", draft: "Draft", publish: "Publish", publishing: "Publishing…", published_ok: "Offer published.",
    new: { title: "New offer", kind: "Type", name: "Name", price: "Price from (Bs.)", priceHelp: "Optional, for example 450.", category: "Category", city: "City", whatsapp: "WhatsApp (link https://wa.me/…)", site: "Website (https://…)", destinationsHelp: "At least one contact destination.", fulfillmentTitle: "Delivery terms", responsible: "Responsible for delivery", responsibleProvider: "Me (the provider)", responsibleCustomer: "The customer", coverage: "Coverage zones", coverageHelp: "Comma separated, for example la-paz, el-alto.", transport: "Transport cost (Bs.)", lead: "Lead time (days in advance)", conditions: "Terms", submit: "Create offer", creating: "Creating…", created: "Offer created as a draft." },
    errors: { name: "Enter the offer name.", destination: "Add at least one contact destination.", coverage: "Enter at least one coverage zone.", price: "Enter a valid price, for example 450.50.", url: "Enter a valid link starting with https://.", conditions: "Enter the delivery terms.", lead: "Enter a lead time in days (0 or more)." }
  },
  products: {
    title: "Products", intro: "Products are what hosts can add to their gift list. Each carries its price and delivery terms.", empty: "You have not created products yet."
  },
  delivery: {
    title: "Delivery terms", intro: "This is how hosts and guests read how you deliver each offer: who takes care of it, where you reach, what transport costs and how many days ahead.", editNote: "Terms are set when the offer is created (Services or Products). To change them, create the offer again with the new terms.", empty: "You have no offers with delivery terms yet.", responsible: "Delivery handled by: {{who}}", coverage: "Coverage: {{zones}}", transport: "Transport: {{price}}", noTransport: "no transport charge", lead: "Lead time: {{days}} days ahead", missing: "This offer declares no delivery terms."
  },
  destinations: {
    title: "Contact destinations and UTM", intro: "Choose where we take couples when they tap a contact button. They always go through the redirector, which records the lead.", enabled: "Enabled destinations", atLeastOne: "Choose at least one destination.",
    destination: { OFFICIAL_SITE: "Website", LANDING: "Landing page", WHATSAPP: "WhatsApp", PHONE: "Phone", EMAIL: "Email", INSTAGRAM: "Instagram", PRODUCT_PAGE: "Product page" },
    utmTitle: "UTM and attribution", utmSource: "utm_source", utmMedium: "utm_medium", utmCampaign: "utm_campaign (optional)", utmHelp: "Letters, numbers, dot, hyphen and underscore only.", utmInvalid: "Use only letters, numbers, dot, hyphen or underscore (max 64).", dedupe: "Minutes before counting two clicks of the same visitor", cap: "Monthly lead cap (0 = no cap)", billing: "Billing model", save: "Save destinations", saving: "Saving…", saved: "Destinations saved.", numberInvalid: "Enter a valid whole number."
  },
  agenda: {
    title: "Schedule and bookings", intro: "Set when you work. Couples see your free days in your time zone ({{zone}}).", capacity: "Slots per day", weekdays: "Working days", weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], start: "From", end: "To", timeInvalid: "Use the HH:MM format, for example 08:00.", rangeInvalid: "The closing time must be after the opening time.",
    blackouts: "Blocked days", blackoutDate: "Date (YYYY-MM-DD)", blackoutReason: "Reason (optional)", addBlackout: "Block day", removeBlackout: "Remove", dateInvalid: "Use the YYYY-MM-DD format.", save: "Save schedule", saving: "Saving…", saved: "Schedule saved.", capacityInvalid: "Enter 1 or more slots.",
    bookings: "Date requests", bookingsEmpty: "You have no date requests.", status: { REQUESTED: "Pending", CONFIRMED: "Confirmed", REJECTED: "Rejected", CANCELLED: "Cancelled", EXPIRED: "Expired" }, confirm: "Confirm", reject: "Reject", cancel: "Cancel booking", decided: "Request updated.", stale: "That request already changed state; we refreshed the list.", date: "Date: {{date}}", expires: "Expires {{when}}"
  },
  leads: {
    title: "Leads and quotes", intro: "Every click on your contacts and every quote requested is recorded here.", empty: "You have no leads yet.", quotesTitle: "Quotes received", quotesEmpty: "You have not received quotes yet.", clicksTitle: "Clicks on your contacts",
    kind: { REDIRECT: "Click", FORM: "Quote" }, valid: "Valid", invalid: { dup: "Duplicate", bot: "Discarded (bot)" }, destination: "Destination: {{destination}}", surface: "Source: {{surface}}", when: "{{when}}", billable: "Billable", event: "Event date: {{date}}", guests: "{{count}} guests"
  },
  metrics: {
    title: "Lead metrics", intro: "Impressions, clicks, CTR and valid leads of the period.", from: "From (YYYY-MM-DD)", to: "To (YYYY-MM-DD)", apply: "See metrics", dateInvalid: "Use the YYYY-MM-DD format and a valid period.", empty: "There is no data in this period.",
    impressions: "Impressions", clicks: "Clicks", ctr: "CTR", validLeads: "Valid leads", invalidLeads: "Discarded leads", groupBy: "Group by", group: { day: "Day", category: "Category", destination: "Destination" }, groupsTitle: "Detail by {{group}}"
  },
  errors: { forbidden: "This account cannot manage this provider.", generic: "We could not complete the action.", retry: "Try again", noProvider: "Register your business first.", goOnboarding: "Register my business" }
};
