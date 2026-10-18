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
  dashboard: { title: "Overview", eventTypes: "Active event types", templates: "Published templates", drafts: "Draft templates", count: "{{label}}: {{count}}" },
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
  categories: { title: "Vendor categories" },
  geography: { title: "Geography" },
  verification: { title: "Vendor verification queue", providerId: "Vendor identifier", verify: "Verify", reject: "Reject", suspend: "Suspend", done: "Vendor updated." },
  moderation: { title: "Moderation of microsites and external gifts" },
  users: { title: "Users and roles" },
  organizations: { title: "Organizations" },
  metrics: { title: "Lead metrics" },
  operations: {
    title: "Operational status", services: "Services", healthy: "Available", down: "Not responding",
    replay: "Rebuild the public projection", replayConfirm: "It will be dropped and rebuilt from the event history. Sites stay available meanwhile.",
    replayDone: "Projection rebuilt: {{count}} events applied.", grafana: "Open Grafana", rabbit: "Open RabbitMQ"
  }
};
