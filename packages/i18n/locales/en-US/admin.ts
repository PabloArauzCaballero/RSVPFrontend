import type { DeepStrings } from "../types.js";
import type { adminEsBO } from "../es-BO/admin.js";

/** Platform administration (F14, screens E1–E12). */
export const adminEnUS: DeepStrings<typeof adminEsBO> = {
  title: "Platform administration",
  denied: "Access denied: this area is for platform administrators only.",
  nav: { label: "Administration modules", dashboard: "Overview", templates: "Templates", eventTypes: "Event types", categories: "Categories", geography: "Geography", verification: "Verification", moderation: "Moderation", users: "Users", organizations: "Organizations", partners: "Partners", metrics: "Metrics", operations: "Operations" },
  dest: { review: "Review", catalog: "Catalog", people: "People", operation: "Operations" },
  unavailable: "This module uses the {{service}} API, which is not available yet. Its data will show here once it is published.",
  sample: { title: "Ana & Luis", story: "We met in La Paz and today we celebrate with the people we love.", venue: "Hacienda El Prado", dressCode: "Formal", question: "Is there parking?", answer: "Yes, at the venue.", ceremony: "Ceremony", party: "Party" },
  saved: "Saved.",
  dashboard: { activityTitle: "Activity", title: "Overview", intro: "How the platform is doing today.", templatesDown: "Templates are not responding for now. The rest of the overview is still available.", more: "Other actions", less: "Hide", showMore: "Show more ({{count}} left)", eventTypes: "Active event types", templates: "Published templates", drafts: "Draft templates", count: "{{label}}: {{count}}",
    platform: "Platform", providersTitle: "Providers and offers", accountsTitle: "Accounts and organizations",
    statuses: { DRAFT: "Draft", PENDING_VERIFICATION: "Pending verification", VERIFIED: "Verified", SUSPENDED: "Suspended", REJECTED: "Rejected" },
    listingsPublished: "Published offers", leadsValid: "Valid leads", leadsInvalid: "Discarded leads", leadsRecent: "Valid leads (30 days)", quotes: "Quotes", bookings: "Confirmed bookings",
    users: "Accounts", usersByRole: "Accounts with role {{role}}", organizations: "Organizations" },
  templates: {
    title: "Invitation templates", intro: "The designs hosts choose for their invitation.", new: "New template", edit: "Edit {{name}}", name: "Name", description: "Description", tags: "Event type tags", tagsHelp: "Comma separated, for example: wedding, anniversary.",
    layout: "Layout", layouts: { classic: "Classic", minimal: "Minimal", editorial: "Editorial", festive: "Festive", corporate: "Corporate" },
    palette: "Palette", colors: { canvas: "Background", surface: "Surface", text: "Text", accent: "Accent", muted: "Secondary" }, colorHelp: "Hex color, for example #865E36.",
    headingFont: "Heading font", bodyFont: "Body font", sectionStyle: "Section style", styles: { plain: "Plain", cards: "Cards", bands: "Bands" },
    sectionOrder: "Sections and order", include: "Include {{section}}",
    publish: "Publish", archive: "Archive", archiveConfirm: "Archiving is final: the template is no longer offered.",
    status: { DRAFT: "Draft", PUBLISHED: "Published", ARCHIVED: "Archived" }, version: "Version {{version}}", preview: "Preview"
  },
  eventTypes: {
    title: "Event types", intro: "The celebrations a host can create.", new: "New event type", edit: "Edit {{code}}", code: "Code", codeHelp: "Uppercase with underscores, for example GRADUATION.",
    status: "Status", statuses: { ACTIVE: "Active", RETIRED: "Retired" }, defaultLocale: "Default language",
    hostRoles: "Host roles", hostRolesHelp: "Comma separated, for example GRADUATE, PARENT.", sections: "Enabled sections",
    requiredFields: "Fields required to publish", requiredFieldsHelp: "Comma separated, for example title, eventDate, hosts.GRADUATE.",
    templateTags: "Compatible template tags", translations: "Translations", name: "Name ({{locale}})", description: "Description ({{locale}})", roleLabel: "{{role}} ({{locale}})",
    problems: { code: "The code uses upper case letters and underscores, 2 to 40 characters, starting with a letter.", roles: "Enter at least one host role.", sections: "Choose at least one section.", tags: "Enter at least one compatible template tag.", name: "Enter the name in the default language." },
    save: "Save event type", savedHelp: "It can be used in new celebrations right away, with no deploy."
  },
  errors: { state: { network: "No connection right now", unavailable: "Under maintenance", server: "Something failed on our side" }, code: { INVALID_PARENT: "That parent location does not fit: a city hangs from a region or country, and a region from a country.", INVALID_TRANSITION: "This item changed state already and that action no longer applies. Reload the list.", OUTSIDE_AVAILABILITY: "That time is outside the working hours. Pick a time within the provider hours.", CODE_TAKEN: "That code already exists. Pick another." }, unauthorized: "Your session ended. Sign in again.", forbidden: "Your account is not allowed to do this.", notFound: "This module is not available on the server yet, or the item no longer exists. Try again later.", conflict: "Someone else already resolved this item. Reload the list to see the current state.", invalid: "The server rejected the data. Check it and try again.", generic: "The action could not be completed. Check your connection and try again.", network: "Cannot reach the server. Check your internet and try again.", rateLimited: "Too many requests in a row. Wait {{seconds}} seconds and try again.", rateLimitedNoWait: "Too many requests in a row. Wait a moment and try again.", unavailable: "The service is unavailable for now. Try again in a few minutes.", server: "The server had a problem. Try again in a few minutes.", transition: "The vendor's status already changed and that action no longer applies. Reload the list.", notOwner: "Only the owner or an administrator can do this.", planAdmin: "Only an administrator can change the plan.", storage: "Storage is not active in this environment.", other: "The action could not be completed." },
  common: { search: "Search", noMatches: "Nothing matches your search.", codeFixed: "The code identifies the entry and does not change.", allClearTitle: "All caught up", emptyTitle: "Nothing here", reason: "Reason", reasonRequired: "Write the reason: it is recorded and the vendor can see it.", reasonOn: "Reason: {{reason}}", filter: "Show", name: "Name in {{locale}}", nameRequired: "Write at least one name.", code: "Code", codeHelp: "Uppercase letters, digits and underscores, for example PHOTOGRAPHY.", codeInvalid: "Use 2 to 40 characters: uppercase letters, digits or underscore, starting with a letter.", state: "Status", active: "Active", inactive: "Inactive", save: "Save", close: "Close", editItem: "Edit {{name}}" },
  categories: { count_one: "{{count}} category", count_other: "{{count}} categories", title: "Vendor categories", intro: "Vendors are sorted with these categories.", new: "New category", edit: "Edit {{code}}", list: "Existing categories", empty: "There are no categories yet. Create the first one with the form." },
  geography: { count_one: "{{count}} location", count_other: "{{count}} locations", parentChoose: "Choose a location", inside: "in {{parent}}", title: "Geography", intro: "Countries, regions and cities where vendors are.", new: "New location", edit: "Edit {{code}}", list: "Countries, regions and cities", empty: "There are no locations yet. Create the first one with “New location”.", kind: "Type", kinds: { COUNTRY: "Country", REGION: "Region", CITY: "City" }, parent: "Belongs to", parentHelp: "A city belongs to a region or country; a region, to a country.", parentRequired: "Say which location it belongs to.", codeHelpCity: "Cities: lowercase letters, digits and hyphens, for example santa-cruz. Countries and regions: uppercase.", codeInvalidCity: "Use 2 to 40 lowercase characters, digits or hyphens, starting with a letter.", latitude: "Latitude", longitude: "Longitude", coordsRequired: "A new city needs a valid latitude and longitude.", countryReadOnly: "The country cannot be modified." },
  verification: {
    title: "Vendor verification", intro: "Vendors asking to appear in the directory. Pending goes first.", statuses: { PENDING: "Pending", VERIFIED: "Verified", REJECTED: "Rejected", SUSPENDED: "Suspended" },
    state: { PENDING: "Pending", VERIFIED: "Verified", REJECTED: "Rejected", SUSPENDED: "Suspended" }, submitted: "Submitted {{when}}", verify: "Verify", reject: "Reject", suspend: "Suspend",
    verifyNamed: "Verify {{name}}", rejectNamed: "Reject {{name}}", suspendNamed: "Suspend {{name}}",
    rejectTitle: "Reject {{name}}", rejectBody: "The vendor will not appear in search. Write the reason so they can fix their application.",
    suspendTitle: "Suspend {{name}}", suspendBody: "The vendor stops appearing in search and gets no new leads. The platform cannot reinstate a vendor today: confirm only if you are sure.", noActionRejected: "Waiting for the vendor to fix the profile and resubmit.", noActionSuspended: "Suspended. The platform cannot reinstate vendors yet.",
    empty: "No vendors are \"{{status}}\".", done: "Vendor updated."
  },
  moderation: {
    title: "Moderation", intro: "Pages and gifts people propose, before anyone sees them.", statuses: { PENDING: "Pending", APPROVED: "Approved", REJECTED: "Rejected" }, state: { PENDING: "Pending", APPROVED: "Approved", REJECTED: "Rejected" }, kinds: { MICROSITE: "Microsite", EXTERNAL_GIFT: "External gift" },
    empty: "No submissions are \"{{status}}\".", done: "Decision recorded.", open: "Open {{name}}", approveNamed: "Approve {{name}}", rejectNamed: "Reject {{name}}",
    approve: "Approve", reject: "Reject", rejectTitle: "Reject {{name}}", rejectBody: "Whoever submitted it will see the reason. Make it clear."
  },
  users: { title: "Users and roles", intro: "Find an account and give it the role it needs.", search: "Search users", searchHelp: "By email address. Leave empty to see everyone.", searchAction: "Search", empty: "No users match.", noRoles: "No roles", statuses: { ACTIVE: "Active", SUSPENDED: "Suspended" }, grant: "Grant {{role}} role", grantNamed: "Grant {{role}} to {{email}}", grantTitle: "Grant {{role}} to {{email}}?", grantBody: "The role applies at their next sign-in and cannot be removed from here. The change is recorded.", granted: "Role granted.", hasRole: "Already has the {{role}} role.", page: "Page {{page}} of {{pages}}", prev: "Previous", next: "Next", total: "{{count}} accounts" },
  organizations: { title: "Organizations", intro: "Who is behind each organization.", lookup: "Look up an organization", id: "Organization identifier", idHelp: "The organization's full identifier (UUID).", lookupAction: "Look up", empty: "There are no registered organizations yet.", owner: "Owner: {{id}}", members: "Members: {{count}}" },
  metrics: {
    title: "Requests by period", intro: "How many requests each partner and category generated.", groupBy: "Group by", groups: { partner: "Partner", category: "Category" }, from: "From", to: "To", dateHelp: "Days are counted in UTC.", invalidRange: "Check the dates: make sure \"From\" is not after \"To\".",
    empty: "There are no leads in this period.", total: "Leads in the period: {{count}}", columns: { name: "Name", leads: "Leads", quotes: "Quotes", bookings: "Booked" }
  },
  operations: {
    title: "Operational status", intro: "If something stops answering, you see it here first.", services: "Services", allUpTitle: "Everything works", allUpBody: "All services are responding normally.", someDownTitle: "Something is not responding", someDownBody: "Check the services listed below; the rest is still available.", healthy: "Available", down: "Not responding",
    replay: "Rebuild the public projection", replayConfirm: "It will be dropped and rebuilt from the event history. Sites stay available meanwhile.",
    replayDone: "Projection rebuilt: {{count}} events applied.", grafana: "Open Grafana", rabbit: "Open RabbitMQ"
  },
  table: {
    pagination: "Result pages", range: "{{from}}–{{to}} of {{total}}", page: "Page {{page}} of {{pages}}", prev: "Previous", next: "Next",
    actions: "Actions", sortBy: "Sort by", sortAction: "Sort by {{column}}", sortOption: { ascending: "{{column}} (A-Z)", descending: "{{column}} (newest first)" }, updating: "Updating the list…"
  },
  stepper: { progress: "Form progress", step: "Step {{step}} of {{total}}" },
  partners: {
    title: "Partners", intro: "The platform's providers. They are created here, with a complete KYP, and managed.", create: "Create partner",
    total_one: "{{count}} partner", total_other: "{{count}} partners", unknownUser: "Account not found", noSlug: "No microsite", ciDue: "ID card expires {{date}}", choose: "Choose an option",
    columns: { partner: "Partner", owner: "Owner", status: "Status", kyp: "KYP", categoryCity: "Category and city", created: "Created", updated: "Last change", origin: "Origin", listings: "Published offers" },
    statuses: { DRAFT: "Draft", PENDING_VERIFICATION: "In verification", VERIFIED: "Verified", SUSPENDED: "Suspended", REJECTED: "Rejected" },
    kypStatuses: { COMPLETE: "KYP complete", PENDING: "KYP pending", EXPIRING: "KYP expiring", EXPIRED: "KYP expired" },
    origins: { ADMIN: "Admin", SELF_SERVICE: "Self-service" },
    plans: { FREE: "Free", FEATURED: "Featured", PREMIUM: "Premium" },
    personTypes: { NATURAL: "Individual", UNIPERSONAL: "Sole proprietorship", JURIDICA: "Company" },
    personTypeHelp: { NATURAL: "Works under their own name, with a NIT and no trade registration.", UNIPERSONAL: "One-person business with a SEPREC registration.", JURIDICA: "Company (SRL, SA…) with a SEPREC registration and a legal representative." },
    extensions: { LP: "La Paz", CB: "Cochabamba", SC: "Santa Cruz", OR: "Oruro", PT: "Potosí", CH: "Chuquisaca", TJ: "Tarija", BE: "Beni", PD: "Pando" },
    review: { PENDING: "Not reviewed", ACCEPTED: "Accepted", REJECTED: "Rejected" },
    filters: {
      label: "Filter partners", q: "Search", qHelp: "Name, slug, NIT, legal name or owner id.", search: "Search", category: "Category", city: "City",
      expiring: "KYP expiring within {{days}} days", more: "More filters", less: "Fewer filters", clear: "Clear ({{count}})", listings: "Published offers", withListings: "With published offers", withoutListings: "Without published offers", from: "Created from", to: "Created until"
    },
    empty: { title: "No partners yet", body: "Create the first one with “Create partner”.", filteredTitle: "No partner matches", filtered: "Change or clear the filters to see more." },
    drafts: { title_one: "You have {{count}} unfinished partner", title_other: "You have {{count}} unfinished partners", item: "{{name}} · saved {{when}}", unnamed: "No name yet", continue: "Continue draft" },
    actions: {
      menu: "Actions for {{name}}", view: "View details", viewNamed: "View details of {{name}}", edit: "Edit", suspend: "Suspend", reactivate: "Reactivate", completeKyp: "Complete KYP", reviewDocuments: "Review documents",
      microsite: "View microsite", micrositeNamed: "View the microsite of {{name}}", copyId: "Copy ID", changeOwnerBlocked: "Change owner · Available once role revocation exists (F4)"
    },
    suspend: { title: "Suspend {{name}}", body: "Their offers are unpublished and they get no new requests. The reason is recorded and sent to the provider." },
    reactivate: { title: "Reactivate {{name}}", body: "They become verified again if their KYP is complete or expiring. The reason is recorded." },
    done: { created: "Partner created and verified.", saved: "Changes saved.", kyp: "KYP complete: the partner is up to date.", suspended: "Partner suspended.", reactivated: "Partner reactivated.", copied: "ID copied: {{id}}", copyFailed: "Could not copy. The ID is {{id}}" },
    steps: { owner: "Owner", identity: "Identity", contact: "Contact", coverage: "Coverage", kyp: "KYP", summary: "Summary" },
    owner: {
      intro: "The partner is linked to an account that already exists. Search its exact e-mail.", email: "Owner account e-mail", search: "Find account",
      notFound: "There is no account with that e-mail: ask the provider to sign up.", found: "Account found: {{email}}", since: "Account created", roles: "Current roles",
      roleNote: "When the partner is created this account gets the PROVIDER role.", required: "Find and confirm the owner's account to continue."
    },
    fields: {
      name: "Business name", slug: "Microsite address", slugHelp: "It will be /p/{{slug}}. Lowercase letters, numbers and hyphens.", categories: "Categories", categoriesHelp: "Choose one to ten.", description: "Description", plan: "Plan",
      whatsapp: "WhatsApp", phone: "Phone", phoneHelp: "With the country code if it is not Bolivian, e.g. +591 70000000.", publicEmail: "Public e-mail", website: "Website", websiteHelp: "The full address, with https://.", social: "Social networks", instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok",
      department: "Department", city: "City", cityFirst: "Choose the department first.", zones: "Cities served", zonesHelp: "Only cities of the platform's geography.",
      personType: "Person type", legalName: "Legal name", legalNameNatural: "Full name", nit: "NIT", nitHelp: "Digits only, 7 to 12.", seprec: "SEPREC registration", seprecDate: "Registration date",
      companyType: "Company type", companyTypeHelp: "For example SRL or SA.", addressLine: "Legal address",
      repFullName: "Full name", ci: "Identity card", ciNumber: "ID card number", ciNumberHelp: "Digits only.", ciExtension: "Extension", ciComplement: "Complement", ciComplementHelp: "Optional, 1 or 2 characters.", ciExpiresOn: "ID card expiry",
      inRegistration: "The representative is listed in the registration", poaNumber: "Power of attorney number", poaNotary: "Notary", poaDate: "Power of attorney date",
      hasBank: "Add a bank account", hasBankHelp: "Optional. If you add it, the bank certificate is required too.", bank: "Bank", accountNumber: "Account number", holder: "Account holder", currency: "Currency", noBank: "No bank account"
    },
    kyp: {
      chooseType: "Choose the person type to see what is needed.", business: "Legal data", address: "Legal address", holder: "Holder", representative: "Legal representative", powerOfAttorney: "Representative's power of attorney",
      poaRequired: "The power of attorney is required because the representative is not listed in the registration.", poaOptional: "The power of attorney is optional here."
    },
    documents: {
      title: "KYP documents", help: "PDF, JPG, PNG or WebP up to 10 MB. The required ones depend on the person type.", choose: "Upload file", replace: "Upload another", remove: "Remove", uploading: "Uploading", uploaded: "Received", missing: "Missing",
      putFailed: "The file could not be sent. Try again.", others: "Other documents: {{names}}", pendingUpload: "upload not finished", download: "Download", accept: "Accept", reject: "Reject",
      rejectTitle: "Reject {{name}}", rejectBody: "The provider will see the reason. Say what they need to fix.", unknownKind: "Document ({{kind}})",
      kinds: { IDENTITY: "Identity card", BUSINESS_REGISTRATION: "Trade registration (SEPREC)", TAX_ID: "NIT certificate", ADDRESS_PROOF: "Proof of address", POWER_OF_ATTORNEY: "Representative's power of attorney", BANK_CERTIFICATE: "Bank certificate", OTHER: "Other document" }
    },
    codes: {
      REQUIRED: "This is missing.", TOO_LONG: "It is too long.", INVALID_SLUG: "Use 3 to 60 characters: lowercase letters, numbers and single hyphens.", SLUG_TAKEN: "Another partner already uses that address. Choose another one.", TOO_MANY: "Choose ten at most.",
      UNKNOWN_CATEGORY: "That category no longer exists. Choose another one.", INVALID_PLAN: "Choose a plan from the list.", INVALID_PHONE: "Use digits only (7 to 20), with an optional leading +.", INVALID_EMAIL: "Enter a valid e-mail, e.g. name@domain.bo.",
      INVALID_URL: "Enter the full address, starting with https://.", UNKNOWN_DEPARTMENT: "Choose a department from the list.", UNKNOWN_CITY: "Choose a city from the list.", CITY_NOT_IN_DEPARTMENT: "That city is not in that department.",
      UNKNOWN_ZONE: "A chosen city no longer exists. Check them.", INVALID_PERSON_TYPE: "Choose the person type.", INVALID_NIT: "The NIT has digits only, 7 to 12.", INVALID_SEPREC: "Use letters, numbers and hyphens (up to 40).",
      INVALID_DATE: "Choose a valid date.", DATE_IN_FUTURE: "The date cannot be in the future.", INVALID_CI: "The ID card number has digits only, 4 to 10.", INVALID_CI_EXTENSION: "Choose the extension from the list.", INVALID_CI_COMPLEMENT: "The complement has 1 or 2 letters or digits.",
      CI_EXPIRED: "The ID card has expired: ask for a valid one to create the partner.", INVALID_ACCOUNT: "The account number has digits only, 6 to 20.", INVALID_CURRENCY: "Choose BOB or USD.",
      MISSING: "Missing or not valid: check it.", MISSING_DOCUMENT: "This document still has to be uploaded.", INVALID: "Check this value."
    },
    detail: {
      title: "Partner", audit: "Audit history", noAudit: "No recorded changes yet.", auditLine: "{{action}} · {{who}} · {{when}}", noKyp: "This partner has no KYP yet. Use “Complete KYP”.", noDocuments: "No documents.",
      revealCi: "Show ID card", revealAudited: "Viewing the full ID card number is recorded in the audit log.", kypDue: "ID card expiry", yes: "Yes", no: "No"
    },
    wizard: {
      createTitle: "Create partner", editTitle: "Edit {{name}}", kypTitle: "Complete the KYP of {{name}}", next: "Next", save: "Save changes", completeKyp: "Complete KYP", create: "Create partner", saveAndClose: "Save and close",
      confirmReviewed: "I confirm I reviewed the KYP documents", confirmRequired: "Tick the box to confirm you reviewed the documents.",
      fixErrors_one: "{{count}} value needs fixing. We took you to its step.", fixErrors_other: "{{count}} values need fixing. We took you to the first step that has them.",
      grantFailed: "The owner could not get the PROVIDER role, so the partner was not created. Try again.", alreadyCommitted: "This draft already created its partner. Close it and find it in the list.",
      created: "{{name}} is now a partner", reloginNote: "The owner has to sign in again to see their portal."
    }
  }
};
