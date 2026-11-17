import type { DeepStrings } from "../types.js";
import type { adminEsBO } from "../es-BO/admin.js";

/** Platform administration (F14, screens E1–E12). */
export const adminEnUS: DeepStrings<typeof adminEsBO> = {
  title: "Platform administration",
  denied: "Access denied: this area is for platform administrators only.",
  nav: { label: "Administration modules", dashboard: "Overview", templates: "Templates", eventTypes: "Event types", categories: "Categories", geography: "Geography", verification: "Verification", moderation: "Moderation", users: "Users", organizations: "Organizations", metrics: "Metrics", operations: "Operations" },
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
  common: { allClearTitle: "All caught up", emptyTitle: "Nothing here", reason: "Reason", reasonRequired: "Write the reason: it is recorded and the vendor can see it.", reasonOn: "Reason: {{reason}}", filter: "Show", name: "Name ({{locale}})", nameRequired: "Write at least one name.", code: "Code", codeHelp: "Uppercase letters, digits and underscores, for example PHOTOGRAPHY.", codeInvalid: "Use 2 to 40 characters: uppercase letters, digits or underscore, starting with a letter.", state: "Status", active: "Active", inactive: "Inactive", save: "Save", editItem: "Edit {{name}}" },
  categories: { title: "Vendor categories", intro: "Vendors are sorted with these categories.", new: "New category", edit: "Edit {{code}}", list: "Existing categories", empty: "There are no categories yet. Create the first one with the form." },
  geography: { title: "Geography", intro: "Countries, regions and cities where vendors are.", new: "New location", edit: "Edit {{code}}", list: "Countries, regions and cities", empty: "There are no locations yet. Create the first one with the form.", kind: "Type", kinds: { COUNTRY: "Country", REGION: "Region", CITY: "City" }, parent: "Parent location code", parentHelp: "A city belongs to a region or country; a region, to a country.", parentRequired: "Say which location it belongs to.", codeHelpCity: "Cities: lowercase letters, digits and hyphens, for example santa-cruz. Countries and regions: uppercase.", codeInvalidCity: "Use 2 to 40 lowercase characters, digits or hyphens, starting with a letter.", latitude: "Latitude (-90 to 90)", longitude: "Longitude (-180 to 180)", coordsRequired: "A new city needs a valid latitude and longitude.", countryReadOnly: "The country cannot be modified." },
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
  }
};
