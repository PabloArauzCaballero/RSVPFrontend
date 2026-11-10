import type { DeepStrings } from "../types.js";
import type { adminEsBO } from "../es-BO/admin.js";

/** Platform administration (F14, screens E1–E12). */
export const adminEnUS: DeepStrings<typeof adminEsBO> = {
  title: "Platform administration",
  denied: "Access denied: this area is for platform administrators only.",
  nav: { label: "Administration modules", dashboard: "Overview", templates: "Templates", eventTypes: "Event types", categories: "Categories", geography: "Geography", verification: "Verification", moderation: "Moderation", users: "Users", organizations: "Organizations", metrics: "Metrics", operations: "Operations" },
  unavailable: "This module uses the {{service}} API, which is not available yet. Its data will show here once it is published.",
  sample: { title: "Ana & Luis", story: "We met in La Paz and today we celebrate with the people we love.", venue: "Hacienda El Prado", dressCode: "Formal", question: "Is there parking?", answer: "Yes, at the venue.", ceremony: "Ceremony", party: "Party" },
  saved: "Saved.",
  dashboard: { title: "Overview", eventTypes: "Active event types", templates: "Published templates", drafts: "Draft templates", count: "{{label}}: {{count}}",
    platform: "Platform", providersTitle: "Providers and offers", accountsTitle: "Accounts and organizations",
    statuses: { DRAFT: "Draft", PENDING_VERIFICATION: "Pending verification", VERIFIED: "Verified", SUSPENDED: "Suspended", REJECTED: "Rejected" },
    listingsPublished: "Published offers", leadsValid: "Valid leads", leadsInvalid: "Discarded leads", leadsRecent: "Valid leads (30 days)", quotes: "Quotes", bookings: "Confirmed bookings",
    users: "Accounts", usersByRole: "Accounts with role {{role}}", organizations: "Organizations" },
  templates: {
    title: "Templates", new: "New template", edit: "Edit {{name}}", name: "Name", description: "Description", tags: "Event type tags", tagsHelp: "Comma separated, for example: wedding, anniversary.",
    layout: "Layout", layouts: { classic: "Classic", minimal: "Minimal", editorial: "Editorial", festive: "Festive", corporate: "Corporate" },
    palette: "Palette", colors: { canvas: "Background", surface: "Surface", text: "Text", accent: "Accent", muted: "Secondary" }, colorHelp: "Hex colour, for example #865E36.",
    headingFont: "Heading font", bodyFont: "Body font", sectionStyle: "Section style", styles: { plain: "Plain", cards: "Cards", bands: "Bands" },
    sectionOrder: "Sections and order", include: "Include {{section}}",
    publish: "Publish", archive: "Archive", archiveConfirm: "Archiving is final: the template is no longer offered.",
    status: { DRAFT: "Draft", PUBLISHED: "Published", ARCHIVED: "Archived" }, version: "Version {{version}}", preview: "Preview"
  },
  eventTypes: {
    title: "Event types", new: "New event type", edit: "Edit {{code}}", code: "Code", codeHelp: "Uppercase with underscores, for example GRADUATION.",
    status: "Status", statuses: { ACTIVE: "Active", RETIRED: "Retired" }, defaultLocale: "Default language",
    hostRoles: "Host roles", hostRolesHelp: "Comma separated, for example GRADUATE, PARENT.", sections: "Enabled sections",
    requiredFields: "Fields required to publish", requiredFieldsHelp: "Comma separated, for example title, eventDate, hosts.GRADUATE.",
    templateTags: "Compatible template tags", translations: "Translations", name: "Name ({{locale}})", description: "Description ({{locale}})", roleLabel: "{{role}} ({{locale}})",
    save: "Save event type", savedHelp: "It can be used in new celebrations right away, with no deploy."
  },
  errors: { unauthorized: "Your session ended. Sign in again.", forbidden: "Your account is not allowed to do this.", notFound: "This module is not available on the server yet, or the item no longer exists. Try again later.", conflict: "Someone else already resolved this item. Reload the list to see the current state.", invalid: "The server rejected the data. Check it and try again.", generic: "The action could not be completed. Check your connection and try again." },
  common: { reason: "Reason", reasonRequired: "Write the reason: it is recorded and the vendor can see it.", reasonOn: "Reason: {{reason}}", filter: "Show", name: "Name ({{locale}})", nameRequired: "Write at least one name.", code: "Code", codeHelp: "Uppercase letters, digits and underscores, for example PHOTOGRAPHY.", codeInvalid: "Use 2 to 40 characters: uppercase letters, digits or underscore, starting with a letter.", state: "Status", active: "Active", inactive: "Inactive", save: "Save", editItem: "Edit {{name}}" },
  categories: { title: "Vendor categories", new: "New category", edit: "Edit {{code}}", list: "Existing categories", empty: "There are no categories yet. Create the first one with the form." },
  geography: { title: "Geography", new: "New location", edit: "Edit {{code}}", list: "Countries, regions and cities", empty: "There are no locations yet. Create the first one with the form.", kind: "Type", kinds: { COUNTRY: "Country", REGION: "Region", CITY: "City" }, parent: "Parent location code", parentHelp: "A city belongs to a region or country; a region, to a country.", parentRequired: "Say which location it belongs to." },
  verification: {
    title: "Vendor verification queue", statuses: { PENDING: "Pending", VERIFIED: "Verified", REJECTED: "Rejected", SUSPENDED: "Suspended" },
    submitted: "Submitted {{when}}", verify: "Verify", reject: "Reject", suspend: "Suspend",
    verifyNamed: "Verify {{name}}", rejectNamed: "Reject {{name}}", suspendNamed: "Suspend {{name}}",
    rejectTitle: "Reject {{name}}", rejectBody: "The vendor will not appear in search. Write the reason so they can fix their application.",
    suspendTitle: "Suspend {{name}}", suspendBody: "The vendor stops appearing in search and gets no new leads until you verify them again.",
    empty: "No vendors are \"{{status}}\".", done: "Vendor updated."
  },
  moderation: {
    title: "Moderation of microsites and external gifts", statuses: { PENDING: "Pending", APPROVED: "Approved", REJECTED: "Rejected" }, kinds: { MICROSITE: "Microsite", EXTERNAL_GIFT: "External gift" },
    empty: "No submissions are \"{{status}}\".", done: "Decision recorded.", open: "Open {{name}}", approveNamed: "Approve {{name}}", rejectNamed: "Reject {{name}}",
    reject: "Reject", rejectTitle: "Reject {{name}}", rejectBody: "Whoever submitted it will see the reason. Make it clear."
  },
  users: { title: "Users and roles", search: "Search users", searchHelp: "By email address. Leave empty to see everyone.", searchAction: "Search", empty: "No users match.", noRoles: "No roles", statuses: { ACTIVE: "Active", SUSPENDED: "Suspended" } },
  organizations: { title: "Organizations", lookup: "Look up an organization", id: "Organization identifier", idHelp: "The organization's full identifier (UUID).", lookupAction: "Look up", empty: "There are no registered organizations yet.", owner: "Owner: {{id}}", members: "Members: {{count}}" },
  metrics: {
    title: "Lead metrics", groupBy: "Group by", groups: { partner: "Partner", category: "Category" }, from: "From", to: "To", dateHelp: "Format YYYY-MM-DD, in UTC.", invalidRange: "Check the dates: use YYYY-MM-DD and make sure \"From\" is not after \"To\".",
    empty: "There are no leads in this period.", total: "Leads in the period: {{count}}", columns: { name: "Name", leads: "Leads", quotes: "Quotes", bookings: "Booked" }
  },
  operations: {
    title: "Operational status", services: "Services", healthy: "Available", down: "Not responding",
    replay: "Rebuild the public projection", replayConfirm: "It will be dropped and rebuilt from the event history. Sites stay available meanwhile.",
    replayDone: "Projection rebuilt: {{count}} events applied.", grafana: "Open Grafana", rabbit: "Open RabbitMQ"
  }
};
