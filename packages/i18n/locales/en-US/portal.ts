import type { DeepStrings } from "../types.js";
import type { portalEsBO } from "../es-BO/portal.js";

/** Provider portal (F28). */
export const portalEnUS: DeepStrings<typeof portalEsBO> = {
  label: "Provider portal",
  nav: { label: "Portal sections", home: "Overview", services: "Offers", products: "Products", delivery: "Delivery", microsite: "Public profile", documents: "Documents", destinations: "Contact", agenda: "Schedule", quotes: "Quotes", leads: "Requests", metrics: "Results" },
  dest: { overview: "Overview", offers: "Offers", agenda: "Schedule", clients: "Clients", profile: "Profile" },
  microsite: {
    moderationRejected: "The team rejected your public profile and it is no longer shown. Reason: {{reason}}. Fix it and save it: it will be published again once we approve it.", moderationHeld: "Your changes are waiting for the team's review. Until we approve them, your public profile is not shown.",
    title: "Public profile", intro: "This is how couples see you on your page. It saves as a whole; if someone else changed it, we warn you before overwriting.",
    descEs: "Description (Spanish)", descEn: "Description (English)", descHelp: "Up to 2000 characters.", website: "Website", instagram: "Instagram", facebook: "Facebook", whatsapp: "WhatsApp (with country code)",
    address: "Address", addressHelp: "Street and number.", reference: "Landmark", hours: "Opening hours", hoursOpens: "Opens", hoursCloses: "Closes", hoursDays: "Days (0 = Sunday, e.g. 1,2,3,4,5)", hoursNote: "Hours note",
    save: "Save profile", saving: "Saving…", saved: "Profile saved (version {{version}}).", conflict: "Someone saved a newer version. We reloaded the profile; review it and save again.", invalid: "Check the highlighted fields.", invalidUrl: "Enter a full address starting with https://.", invalidHour: "Choose both times, opening before closing.", invalidDays: "Enter days 0-6 separated by commas.", invalidPhone: "Digits only, optional + (6 to 15).", tooLong: "The description allows up to 2000 characters.", version: "Version {{version}}", reload: "Reload"
  },
  documents: {
    title: "Documents", intro: "Upload what backs your business. They are private: only you and the verification team see them. PDF, JPG, PNG or WebP up to 10 MB.", emptyTitle: "Your documents go here",
    kind: "Document type", kinds: { IDENTITY: "ID document", BUSINESS_REGISTRATION: "Business registration", TAX_ID: "Tax ID", ADDRESS_PROOF: "Proof of address", POWER_OF_ATTORNEY: "Representative's power of attorney", BANK_CERTIFICATE: "Bank certificate", OTHER: "Other" }, kindUnknown: "Document ({{kind}})",
    choose: "Choose file", upload: "Upload document", uploading: "Uploading…", uploaded: "Document uploaded.", delete: "Delete", deleteTitle: "Delete this document?", deleteBody: "The file and its record are removed. To get verified you will have to upload it again.", deleted: "Document deleted.", opening: "Opening…", empty: "Upload the first one so the team can review it with your profile.", status: { PENDING_UPLOAD: "Upload pending", UPLOADED: "Received" },
    tooBig: "The file is larger than 10 MB.", badType: "Only PDF, JPG, PNG or WebP.", none: "Choose a file first.", putFailed: "The file could not be sent. Try again.", download: "View", rowMenu: "More options for {{name}}", size: "{{kb}} KB", webOnly: "In this version file upload works in the browser."
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
    reason: "Reason from the team: {{reason}}",
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
    }, plan: "{{plan}} plan", zone: "Time zone: {{zone}}", last30Summary: "Last 30 days: {{valid}} valid requests and {{views}} times you were seen.", last30Title: "Last 30 days", offersCount: "Offers", last30Link: "See results" },
  services: {
    title: "Offers", intro: "Your services and products, with their price and how you deliver them. Publish the ones you want to show.", publishedNote: "Your offer is live", publishedDetail: "Couples can see it in the directory and on your page.", emptyTitle: "Your offers live here", empty: "Create the first one with its price and delivery terms. Publish it whenever you want.", add: "New offer", rowMenu: "More options for {{title}}", type: { SERVICE: "Service", PRODUCT: "Product" }, published: "Published", draft: "Draft", publish: "Publish", publishing: "Publishing…", needsTerms: "To publish it, first declare its delivery terms.", published_ok: "Offer published.",
    new: { productName: "Product name", productCategory: "Product category", productPrice: "Product price (Bs.)", imageUrl: "Photo URL (optional)", imageHelp: "Paste the direct HTTPS link to a public photo of the product.", loadingCategories: "Loading categories…", emptyCategories: "There are no categories available for this offer type yet.", title: "New offer", cancel: "Cancel", kind: "What you offer", name: "Name", price: "Price from (Bs.)", priceHelp: "Optional, for example 450.", category: "Category", city: "City", whatsapp: "WhatsApp (link https://wa.me/…)", site: "Website (https://…)", destinationsHelp: "Where we take couples when they tap Contact. You can add a website under More options.", fulfillmentTitle: "How you deliver it", responsible: "Responsible for delivery", responsibleProvider: "Me (the provider)", responsibleCustomer: "The customer", coverage: "Coverage zones", coverageHelp: "Tap the cities where you deliver.", transport: "Transport cost (Bs.)", lead: "Lead time (days in advance)", conditions: "Terms", submit: "Create offer", creating: "Creating…", created: "Offer created as a draft." },
    errors: { imageUrl: "Enter a valid HTTPS link of up to 500 characters.",
    state: { network: "No connection right now", unavailable: "We are fixing something", storage: "Documents are unavailable", server: "Something failed on our side" }, nameLong: "The name allows up to 120 characters.", name: "Enter the offer name.", destination: "Add at least one contact destination.", coverage: "Pick at least one coverage city.", price: "Enter a valid price, for example 450.50.", url: "Enter a valid link starting with https://.", conditions: "Enter the delivery terms.", lead: "Enter a lead time in days (0 or more)." }
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
    utmTitle: "Campaign tracking", utmSource: "Campaign source", utmMedium: "Medium", utmCampaign: "Campaign name (optional)", utmHelp: "Letters, numbers, dot, hyphen and underscore only.", utmInvalid: "Use only letters, numbers, dot, hyphen or underscore (max 64).", dedupe: "Minutes before counting two clicks of the same visitor", cap: "Monthly lead cap (0 = no cap)", billing: "Billing model", save: "Save destinations", saving: "Saving…", saved: "Destinations saved.", numberInvalid: "Enter valid whole numbers: minutes between 1 and 1440 and a cap between 0 and 1000000.",
    template: {
      title: "Business WhatsApp message", intro: "The message that reaches your WhatsApp when someone orders a product without a message of its own.", useOwn: "Write a message for my business",
      save: "Save message", saving: "Saving…", saved: "Message saved. Your products without their own message use it.", cleared: "Done. Your products use DOne's message.",
      empty: "Write the message or turn off your own message.", long: "The message allows up to 600 characters.", sampleProduct: "Set of 6 glasses", sampleVersion: "Gold"
    }
  },
  agenda: {
    title: "Schedule", scheduleTitle: "Your hours", intro: "Answer the dates couples ask for and set when you work ({{zone}}).", bookingsPending_one: "{{count}} date to confirm", bookingsPending_other: "{{count}} dates to confirm", bookingsPendingAtLeast_one: "At least {{count}} date to confirm", bookingsPendingAtLeast_other: "At least {{count}} dates to confirm", bookingsMore: "Show more dates", bookingsEmptyTitle: "No dates to answer", capacity: "Slots per day", weekdays: "Working days", weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], start: "From", end: "To", timeInvalid: "Choose the opening and the closing time.", rangeInvalid: "The closing time must be after the opening time.",
    blackouts: "Blocked days", blackoutDate: "Date", blackoutReason: "Reason (optional)", addBlackout: "Block day", removeBlackout: "Remove", dateInvalid: "Choose the date.", save: "Save schedule", saving: "Saving…", saved: "Schedule saved.", capacityInvalid: "Enter a whole number of slots between 1 and 1000.", blackoutEnd: "Until (optional)", dateReal: "That date does not exist on the calendar.", blackoutDuplicate: "That day is already blocked.", endBefore: "The end date cannot be before the start date.", rejectTitle: "Reject this request?", rejectBody: "The couple will see that you cannot take that date. This cannot be undone.", cancelTitle: "Cancel this booking?", cancelBody: "The couple will be told the date is free again. This cannot be undone.", keep: "Go back", rowMenu: "More options for the request of {{date}}",
    bookings: "Requested dates", bookingsEmpty: "When a couple asks for a date, you will see it here to confirm with a tap.", status: { REQUESTED: "Pending", CONFIRMED: "Confirmed", REJECTED: "Rejected", CANCELLED: "Canceled", EXPIRED: "Expired" }, confirm: "Confirm", reject: "Reject", cancel: "Cancel booking", decided: "Request updated.", stale: "That request already changed state; we refreshed the list.", date: "{{date}}", expires: "Expires {{when}}"
  },
  quotes: {
    title: "Quotes", intro: "Quote requests you received. Open one to see how to reach the person who sent it and answer them directly.", emptyTitle: "No quotes yet", empty: "When someone asks you for a quote from your listing, it will show up here with their contact details.",
    received: "Received on {{date}}", event: "Event: {{date}}", guests: "{{count}} guests", budget: "Budget: {{amount}}", noBudget: "No budget given", city: "Area: {{city}}", withMessage: "Includes a message",
    open: "Show contact", close: "Hide contact", contactTitle: "How to reach {{name}}", email: "Email", phone: "Phone", noPhone: "No phone given", message: "Message", writeEmail: "Write to {{email}}", call: "Call {{phone}}",
    loadingContact: "Loading the contact…", contactError: "We could not load the contact for this quote.", more: "Load more", shown: "{{shown}} quotes", status: { REQUESTED: "New" }
  },
  leads: {
    title: "Requests", intro: "Couples who wrote to you or asked for a quote.", emptyTitle: "Nobody has written yet", empty: "When a couple taps your contact or asks for a quote, it shows up here.", clicksEmpty: "Nobody has tapped your contacts yet.", more: "Load more", shown: "Showing {{shown}} of {{total}}", filter: "Show", filters: { all: "All", quote: "Quotes", click: "Taps" }, quotesEmpty: "You have not received quotes yet.",
    surfaces: { SEARCH: "Search", DIRECTORY: "Directory", MICROSITE: "Your page", PROFILE: "Your profile", LISTING: "An offer" }, kind: { REDIRECT: "Click", FORM: "Quote" }, valid: "Valid", invalid: { dup: "Duplicate", bot: "Discarded (bot)" }, destination: "Destination: {{destination}}", surface: "Source: {{surface}}", when: "{{when}}", billable: "Billable", event: "Event date: {{date}}", guests: "{{count}} guests"
  },
  metrics: {
    title: "Results", intro: "How many couples saw you and how many reached out.", emptyTitle: "No activity on these dates", noData: "There is no data in this period yet. When couples see and tap your profile, it will show here.", field: { day: "Day", category: "Category", destination: "Contact", impressions: "Times seen", clicks: "Taps", validLeads: "Valid requests", invalidLeads: "Discarded", leads: "Requests" }, period: "Period", periods: { d7: "Last 7 days", d30: "Last 30 days", d90: "Last 90 days", custom: "Custom" }, from: "From", to: "To", apply: "See results", dateInvalid: "Choose both dates and a valid period.", empty: "Try another date range.",
    impressions: "Times seen", clicks: "Taps on your contacts", ctr: "Taps per view", validLeads: "Valid requests", invalidLeads: "Discarded requests", groupBy: "Group by", group: { day: "Day", category: "Category", destination: "Destination" }, groupsTitle: "Detail by {{group}}"
  },
  errors: {
    forbidden: "This account cannot manage this business.", generic: "We could not save it. Try again.", retry: "Try again", noProvider: "Register your business first to see this section.", goOnboarding: "Register my business",
    network: "Cannot reach the server. Check your internet and try again; what you typed is still here.", rateLimited: "Too many taps in a row. Wait {{seconds}} seconds and try again.", rateLimitedNoWait: "Too many taps in a row. Wait a moment and try again.",
    unavailable: "The service is unavailable for now. Try again in a few minutes.", server: "Something failed on our side. What you typed is still here: try again in a few minutes.", storage: "Documents are not available right now. Nothing was saved; try again later.",
    transition: "Your profile's status already changed and that action no longer applies. Reload to see the current status.", notOwner: "Only the profile owner or an administrator can do this.", planAdmin: "Only an administrator can change the plan."
  },
  product: {
    newTitle: "New product", editTitle: "Product sheet", loading: "Loading the sheet…",
    intro: "Fill in the sheet step by step. When nothing is missing you publish it, and hosts can add it to their gift list.",
    steps: { label: "Sheet steps", position: "Step {{n}} of {{total}}: {{name}}", missingHint: "{{name}}, information missing", doneHint: "{{name}}, complete", basic: "Basics", ideas: "Ideas", photos: "Photos", price: "Price and versions", delivery: "Delivery", contact: "Contact", summary: "Summary" },
    actions: { next: "Save and continue", saving: "Saving…", back: "Back", create: "Create draft and continue", creating: "Creating…", edit: "Edit", duplicate: "Duplicate", duplicating: "Duplicating…", publish: "Publish", publishing: "Publishing…", rowMenu: "More options for {{title}}", reload: "Reload the product", backToOffers: "Back to offers", openCopy: "Open the copy" },
    basic: {
      title: "Product name", titleHelp: "3 to 120 characters, for example “Set of 6 crystal glasses”.", category: "Category", loadingCategories: "Loading categories…", emptyCategories: "There are no product categories yet.",
      description: "Description", descriptionHelp: "What it includes, material and size, 30 to 2000 characters. No phone numbers or links.", count: "{{count}} of {{max}} characters",
      city: "City you sell from", whatsapp: "Your WhatsApp for orders", whatsappHelp: "With country code, for example +591 70012345. We need it to create the draft; you can change it in Contact.",
      more: "More details (optional)", less: "Fewer details", dimensions: "Size", dimensionsHelp: "For example “30 × 20 cm”.", weight: "Weight", weightHelp: "For example “2 kg”.", care: "Care", warranty: "Warranty", personalizable: "Can be personalized", personalizationNote: "How it is personalized", personalizationHelp: "For example: the name is engraved."
    },
    ideas: { intro: "What gift is it for? Choose up to 10 ideas: hosts search by idea.", group: "Gift ideas", pickCategory: "First choose the category in the Basics step.", empty: "This category has no gift ideas yet, so the product cannot be recommended. Try another category.", loading: "Loading ideas…", count: "{{count}} of {{max}} chosen" },
    photos: {
      intro: "1 to 5 of your own photos: JPG, PNG or WebP up to 5 MB. The first ready one is the cover.", add: "Add photo", alt: "What the photo shows (optional)", altHelp: "Read aloud to people using a screen reader.", cover: "Cover", makeCover: "Use as cover", delete: "Remove photo {{n}}", empty: "No photos yet.", photo: "Photo {{n}}", count: "{{count}} of {{max}} photos",
      status: { PENDING_UPLOAD: "Uploading", QUEUED: "Queued", PROCESSING: "Processing", READY: "Ready", REJECTED: "Rejected", DELETING: "Removing" },
      stage: { requesting: "Preparing the upload…", uploading: "Uploading the photo…", processing: "Processing the photo…" }, ready: "Photo ready.",
      reject: { UNREADABLE: "We could not read the image. Try another file.", HEIC_UNSUPPORTED: "HEIC photos cannot be used. Export it as JPG and upload it again.", TOO_MANY_PIXELS: "The photo is too large (over 60 megapixels).", PROCESSING_FAILED: "We could not process the photo. Upload it again." },
      permissionDenied: "We do not have permission to see your photos. Turn it on in your device settings (Settings, this app, Photos) and try again.",
      typeError: "Only JPG, PNG or WebP. If your photo is HEIC, export it as JPG.", sizeError: "Each photo may weigh up to 5 MB.", putFailed: "The photo could not be sent. Check your connection and try again.", timeout: "The photo is still processing. It will show up here as soon as it is ready.", limit: "You already have 5 photos. Remove one to add another.",
      shows: "Photo version", showsHelp: "If the photo shows only one version, pick it; otherwise leave it on “The whole product”.", wholeProduct: "The whole product", variantLimit: "“{{variant}}” already has {{max}} photos. Pick another version or remove one of its photos."
    },
    price: {
      mode: "Price", single: "One price", variants: "Several versions", modeHelp: "Versions are size, colour or flavour, each with its own price.", price: "Price (Bs.)", priceHelp: "Exact price, for example 350 or 350.50.", stock: "Availability",
      variant: "Version {{n}}", variantLabel: "Version name", variantLabelHelp: "For example “Size M” or “Gold”.", variantDefault: "Shown first", addVariant: "Add version", removeVariant: "Remove version {{n}}", maxVariants: "Up to 20 versions.", variantsList: "Product versions", variantPhotosHint: "Once the versions are saved you can give each one its photo in the Photos step."
    },
    stock: { AVAILABLE: "Available", MADE_TO_ORDER: "Made to order", OUT_OF_STOCK: "Out of stock" },
    delivery: { coverage: "Cities you deliver to", coverageHelp: "Tap the cities you deliver to.", lead: "Days you need to deliver", leadHelp: "0 to 90 days.", shipping: "Shipping cost (Bs.)", shippingHelp: "Enter 0 for free shipping.", pickup: "Can also be picked up at your shop", conditions: "Delivery conditions (optional)", conditionsHelp: "Up to 500 characters." },
    contact: {
      intro: "Where the guest goes when they tap a button on the gift. You can have one or both.", whatsapp: "WhatsApp for orders", whatsappHelp: "With country code, for example +591 70012345.", productPage: "Product page in your shop", productPageHelp: "Full link starting with https://.",
      saved: "Already saved: {{list}}. Leave the fields empty to keep them.", replaceNote: "If you type any, the product's contacts become only the ones you type here.", none: "Add at least a WhatsApp or the product page."
    },
    whatsapp: {
      title: "WhatsApp message", useOwn: "Write a message of its own for this product", usesProvider: "For now it uses your business's general message.", usesDefault: "For now it uses DOne's message.", field: "Message", help: "Up to 600 characters, no phone numbers or links. Tap a variable to add it at the end.", variables: "Variables", insert: "Add {{variable}}",
      unknown: "These variables do not exist: {{list}}.", count: "{{count}} of {{max}} characters", previewTitle: "Preview with sample data", previewNote: "This is how the message arrives. The data is made up: we never include the guest's.",
      sample: { celebracion: "Ana and Luis's wedding", fecha: "February 14", ciudad: "La Paz", entrega: "Deliver to the venue's reception.", cantidad: "1" }
    },
    summary: {
      intro: "This is how a guest sees your product on the gift list.", previewLabel: "Preview of the guest's card", from: "From {{price}}", deliversIn: "Delivers to {{cities}}", moreCities: "{{first}} and {{count}} more cities", leadDays: "In {{count}} days", leadToday: "Same-day delivery", freeShipping: "Free shipping", shipping: "Shipping {{price}}", pickup: "Shop pickup",
      ctaStore: "View in the shop", ctaWhatsapp: "Order on WhatsApp", noPhoto: "No photo yet", ready: "The sheet is complete. You can publish it now.", published: "Product published", publishedDetail: "Hosts can now choose it for their list.", isPublished: "Published and visible to hosts.",
      hidden: "Our team hid this product. Reason: {{reason}}", hiddenNoReason: "Our team hid this product.", duplicated: "Copy created as a draft. It still needs photos."
    },
    completeness: { COMPLETE: "Complete", INCOMPLETE: "Incomplete", HIDDEN_BY_ADMIN: "Hidden" },
    notGift: "Complete your sheet to show up as a gift",
    missing: {
      title: "Still needed to publish", go: "{{item}}. Go to step {{step}}", short: "Missing: {{list}}",
      TITLE: "The name (3 to 120 characters)", DESCRIPTION: "The description (30 to 2000 characters)", CATEGORY: "A product category", GIFT_IDEA: "At least one gift idea", PHOTO: "At least one ready photo", PRICE: "The price", STOCK: "The availability", COVERAGE: "The cities you deliver to", DELIVERY: "The lead time and shipping cost", DESTINATION: "A WhatsApp or the product page"
    },
    errors: {
      CONTACT_IN_TEXT_AT: "Remove the phone number or link from the {{where}} field: “{{fragment}}”.",
      contactFields: { titles: "Name", descriptions: "Description", details: "Details", variants: "Version name", delivery: "Delivery conditions", template: "WhatsApp message", altText: "Photo text" },
      noVersion: "We do not have the current version of the sheet, so we cannot save it safely. Reload it and try again.",
      notFound: "We could not find this product. It may belong to another business or no longer exist.", forbidden: "This product belongs to another business.", notProduct: "This offer is a service: only products have a sheet.",
      LISTING_INCOMPLETE: "Some information is still missing to publish. Check the missing list.", CONTACT_IN_TEXT: "Remove the phone number or link from the text: “{{fragment}}”.", DESCRIPTION_REPEATS_TITLE: "The description must say what the product includes, not repeat the name.",
      PRICE_OUT_OF_RANGE: "The price must be above zero and below the allowed maximum (Bs 200,000).", GIFT_IDEA_NOT_ALLOWED: "Some ideas do not belong to the category. Review them in the Ideas step.", UNKNOWN_CITY: "A city is no longer in the catalog. Choose them again.",
      UNKNOWN_TEMPLATE_VARIABLE: "The variable {{variable}} does not exist.", CATEGORY_TYPE_MISMATCH: "That category is for services. Choose a product one.",
      VERSION_CONFLICT: "The product changed since you opened it, perhaps in another tab. Reload it: what you typed in this step stays.", IF_MATCH_REQUIRED: "Reload the product before saving.", LISTING_HIDDEN: "Our team hid this product: it cannot be published or duplicated.", LISTING_NOT_EDITABLE: "This product cannot be edited from the portal.",
      IDEMPOTENCY_KEY_REUSED: "That request was already sent with other data. Reload and try again.", PHOTO_LIMIT_REACHED: "Photo limit reached: 5 per product and 3 per version.", MEDIA_QUOTA_EXCEEDED: "You have no photo storage left. Remove a photo to upload another.",
      UNSUPPORTED_MEDIA_TYPE: "Photos must be JPG, PNG or WebP.", PHOTO_TOO_LARGE: "Each photo may weigh up to 5 MB.", PHOTO_MISMATCH: "The file is not a valid image or changed during the upload; it was discarded. Try again.", MEDIA_STORAGE_NOT_CONFIGURED: "Photos are not available right now. Nothing was uploaded; try again later.",
      UPLOAD_NOT_FOUND: "The photo was not saved. Upload it again.", INVALID_DESTINATION: "Check the WhatsApp number or your shop link.", DESTINATION_REQUIRED: "Add at least a WhatsApp or the product page.", IMAGE_URL_NOT_ALLOWED: "Products take uploaded photos, not image links.", INVALID_LISTING: "Check the data in this step.",
      local: {
        title: "Enter a name of 3 to 120 characters.", description: "The description needs 30 to 2000 characters.", category: "Choose a category.", ideas: "Choose at least one gift idea.", ideasMax: "You can choose up to 10 ideas.", price: "Enter a price above zero and below Bs 200,000, for example 350.50.", stock: "Choose the availability.",
        variantLabel: "Each version needs a name of up to 60 characters.", variantPrice: "Each version needs a price above zero and below Bs 200,000.", variantsMax: "Up to 20 versions.", coverage: "Choose at least one city.", lead: "Enter a lead time of 0 to 90 days.", shipping: "Enter the shipping cost; 0 if free.",
        conditions: "Conditions allow up to 500 characters.", whatsapp: "Enter the number with country code, for example +591 70012345.", productPage: "Enter a full link starting with https://.", destination: "Add at least a WhatsApp or the product page.",
        template: "Write the message or turn off the message of its own.", templateLong: "The message allows up to 600 characters.", templateVariables: "The message uses variables that do not exist."
      }
    },
    newOffer: { productHint: "Products are added step by step, with photos, price and delivery, so they can be recommended as gifts.", productStart: "Create the product step by step" }
  },
  rename: { action: "Change the name", field: "Business name", save: "Save name", saving: "Saving…", saved: "Name updated.", cancel: "Cancel", required: "Enter your business name.", tooLong: "The name allows up to 120 characters." }
};
