import type { DeepStrings } from "../types.js";
import type { hostEsBO } from "../es-BO/host.js";

/** Host workspace: onboarding, editor, templates, preview, publishing and settings (F11–F13). */
export const hostEnUS: DeepStrings<typeof hostEsBO> = {
  common: {
    save: "Save", saving: "Saving…", saved: "Changes saved.", retry: "Try again", reload: "See the new version", cancel: "Cancel", confirm: "Confirm",
    back: "Back", next: "Next", loading: "Loading…", add: "Add", remove: "Remove", moveUp: "Move up", moveDown: "Move down",
    error: "We could not finish that. Check your connection and try again; your changes are still here.",
    conflict: "Someone saved changes while you were editing. Your changes are still in the form: open the new version and save again what you need.",
    forbidden: "You can see this celebration, but only its hosts or the organization's planner can change it.",
    notFound: "We could not find this celebration, or you do not have access to it.",
    accessDenied: "This area is for hosts and planners only.",
    invalid: "Check this value: {{detail}}",
    noCelebration: "Choose a celebration to continue.",
    chooseCelebration: "Choose a celebration",
    archivedReadOnly: "This celebration is archived: you can only view it. To keep editing, create a new celebration."
  },
  errors: {
    slugTaken: "Another celebration already uses that address. Choose a different one.",
    slugImmutable: "The address can no longer be changed because the site was published or archived.",
    archived: "This celebration is archived and no longer accepts changes.",
    invalidTransition: "That action no longer fits the celebration's current state. Reload the page to see the current state.",
    rateLimited: "You did too many things in a row. Wait {{seconds}} seconds and try again; your changes are still here.",
    rateLimitedNoWait: "You did too many things in a row. Wait a moment and try again; your changes are still here.",
    server: "The server did not respond as expected. Try again in a few minutes; your changes are still here.",
    network: "Cannot reach the server. Check your internet and try again; your changes are still here."
  },
  limits: {
    fieldsTooLong: "some fields exceed the maximum number of characters.",
    tooLong: "Remove {{count}} characters: the maximum is {{max}}.",
    slugLength: "The address must be between 3 and 80 characters.",
    slugPattern: "Use only lowercase letters, numbers and single hyphens, with no hyphen at the start or end.",
    userId: "Enter a valid user identifier (UUID format)."
  },
  navGroups: { guests: "Guests", gifts: "Gifts", celebration: "My celebration", account: "Account" },
  nav: { label: "Dashboard sections", celebrations: "My celebrations", editor: "Content", gallery: "Gallery", translations: "Translations", templates: "Templates", preview: "Preview", publish: "Publish", settings: "Settings", modes: "Control modes" },
  picker: { title: "My celebrations", empty: "You have no celebrations yet. Create your first one in three steps.", create: "Create a celebration", open: "Open {{title}}", untitled: "Untitled", status: { DRAFT: "Draft", PUBLISHED: "Published", ARCHIVED: "Archived" } },
  onboarding: {
    title: "Create a celebration", step: "Step {{step}} of 3",
    typeTitle: "What are you celebrating?", typeHelp: "The type defines who the hosts are, which sections the site has and which templates you can use.",
    detailsTitle: "The basics", titleLabel: "Celebration name", titlePlaceholder: "Ana & Luis",
    slugLabel: "Site address", slugHelp: "Your link will be {{url}}. Lowercase letters, numbers and hyphens only.",
    dateLabel: "Date (YYYY-MM-DD)", timeLabel: "Time (HH:MM)", timeZoneLabel: "Event time zone", timeZoneHelp: "Guests see every time in this zone, wherever they are.",
    languageLabel: "Main language", currencyLabel: "Currency", hostsTitle: "Hosts",
    templateTitle: "Choose the look", templateHelp: "You can change it any time without losing content.",
    create: "Create draft", finish: "Go to the dashboard", skipTemplate: "Choose later"
  },
  editor: {
    title: "Content", unsavedHint: "Unsaved changes stay here if the connection fails.",
    sections: { general: "General", hosts: "Hosts", venues: "Venues", story: "Story", schedule: "Schedule", sections: "Other sections" },
    general: { slug: "Site address", slugLocked: "The address can no longer be changed because the site was published or archived.", title: "Celebration name", subtitle: "Welcome line", eventDate: "Date", eventTime: "Time", venueName: "Main venue", extraField: "Additional detail: {{field}}" },
    hosts: { help: "Roles come from the event type: {{eventType}}." },
    venues: { name: "Venue name", address: "Address", kind: "Kind", kinds: { ceremony: "Ceremony", reception: "Reception", other: "Other" }, add: "Add venue", item: "Venue {{n}}" },
    story: { label: "Your story", help: "Separate paragraphs with a blank line." },
    schedule: { title: "Activity", date: "Date", time: "Time", description: "Details", add: "Add activity", item: "Activity {{n}}", zoneHelp: "Type the event's local time ({{timeZone}})." },
    extra: { dressCode: "Dress code", faq: "Frequently asked questions", question: "Question", answer: "Answer", addFaq: "Add question", recommendations: "Recommendations", recommendationName: "Name", recommendationDescription: "Description", recommendationKind: "Kind", kinds: { lodging: "Lodging", transport: "Transport", other: "Other" }, listingId: "Partner code (optional)", listingHelp: "If it is a partner, its link goes through our redirector.", addRecommendation: "Add recommendation", item: "Item {{n}}" }
  },
  gallery: {
    title: "Gallery", help: "Photos upload straight to storage and optimised versions are generated. JPG, PNG or WebP up to 10 MB.",
    add: "Add photo", uploading: "Uploading {{name}}… {{percent}}%", cover: "Cover", makeCover: "Use as cover", delete: "Delete", empty: "No photos yet.",
    deleteTitle: "Delete photo", deleteBody: "The photo will be removed from your site. This cannot be undone.", deleted: "Photo deleted.", orderSaved: "Order saved.",
    photo: "Photo {{n}}", invalidType: "That file is not a JPG, PNG or WebP image.", tooLarge: "The image is larger than 10 MB.", failed: "We could not upload {{name}}. Please try again.",
    unsupportedPlatform: "Photo upload is available on the web and in the app with gallery permission.", reorderFailed: "We could not save the new order."
  },
  translations: {
    title: "Translations", help: "Write the content in each language of the site. Anything you leave untranslated shows in the main language.",
    language: "Language", addLanguage: "Add language", noLanguages: "Your celebration has one language. Add another to translate.", original: "Original: {{text}}",
    fields: { title: "Name", subtitle: "Welcome line", story: "Story", dressCode: "Dress code" }, faqItem: "Question {{n}}", scheduleItem: "Activity {{n}}"
  },
  templates: { title: "Templates", help: "Only templates compatible with {{eventType}} are shown.", current: "In use", apply: "Use this template", preserved: "Your content is kept when you change templates.", empty: "There are no compatible templates yet.", preview: "Preview of {{name}}" },
  preview: { title: "Preview", devices: { mobile: "Mobile", tablet: "Tablet", desktop: "Desktop" }, device: "Size", frame: "Preview of your celebration", openPublic: "Open the public site", templateFallback: "Meanwhile the preview uses the basic design, not the chosen template.", notPublished: "This is how your site will look once published." },
  publish: {
    title: "Publish", ready: "Everything is ready to publish.", missing: "Before publishing, complete:",
    fields: { title: "The celebration name", subtitle: "The welcome line", eventDate: "The event date", venueName: "The main venue", childName: "The name of the child being baptised", companyName: "The company name", celebrantName: "The name of the celebrant", host: "The name of: {{role}}", other: "The field “{{field}}”" },
    goTo: "Complete", publish: "Publish celebration", publishConfirm: "Your site will be visible to anyone with the link. Publish now?",
    unpublish: "Unpublish", unpublishConfirm: "The site stops showing until you publish it again. The link stays the same.", reasonLabel: "Reason (optional)",
    archive: "Archive", archiveConfirm: "Archiving is final: the celebration can no longer be published or edited.",
    status: { DRAFT: "Draft: only you can see it.", PUBLISHED: "Published: anyone with the link can see it.", ARCHIVED: "Archived." },
    share: "Share", link: "Public link", copy: "Copy link", copied: "Link copied.", whatsappPreview: "How it looks on WhatsApp"
  },
  settings: {
    title: "Settings", saved: "Settings saved.", languages: "Site languages", defaultLanguage: "Main language", timeZone: "Time zone", currency: "Currency",
    deadline: { label: "RSVP deadline", date: "Date (YYYY-MM-DD)", time: "Time (HH:MM)", help: "Event local time ({{timeZone}}).", none: "No deadline.", clear: "Remove deadline",
      past: "That date has passed: guests can no longer reply or change their answer.", effect: "Guests can reply until {{date}} ({{zone}})." }
  },
  settingsExtra: {
    eventType: { label: "Celebration type", help: "Changing it changes the hosts and the data required to publish. Your content is kept.", locked: "The type can only be changed while the celebration is a draft.", save: "Change type" },
    team: { title: "Team", help: "People with access to this celebration. A co-host can edit; a read-only person can only view.", empty: "For now only you have access.",
      roles: { CO_HOST: "Co-host", VIEWER: "Read-only" }, userId: "Person's identifier (UUID)", role: "Permission", add: "Give access", remove: "Remove access", removeTitle: "Remove access", removeBody: "This person will no longer see your celebration.", added: "Access saved.", removed: "Access removed." },
    audit: { title: "Change history", empty: "No changes recorded yet.", item: "{{action}} · {{at}}" }
  },
  modes: {
    title: "Control modes", help: "Decide what is approved automatically and what goes through your review. You can change it any time.",
    nonRetroactive: "Requests already pending stay pending: the change only applies to new ones.",
    values: { AUTO_ACCEPT: "Automatic", RESTRICTED: "With my review" }, current: "Now: {{value}}",
    confirmTitle: "Switch to “{{value}}”", confirm: "Yes, switch", change: "Switch to {{value}}",
    switches: {
      giftReservationMode: { label: "Gift reservations", AUTO_ACCEPT: "When a guest reserves a gift it is committed at once and nobody else can choose it.", RESTRICTED: "Every reservation reaches your inbox and the gift is held until you approve or reject it." },
      unregisteredRsvpMode: { label: "RSVPs from people not on your list", AUTO_ACCEPT: "Anyone with the link can RSVP without being on your list.", RESTRICTED: "Only people on your guest list can RSVP." },
      extraCompanionMode: { label: "Extra companions", AUTO_ACCEPT: "If a guest asks for more companions than you allowed, they are approved automatically.", RESTRICTED: "Extra companions stay pending until you approve them." },
      externalGiftMode: { label: "Gifts outside the catalogue", AUTO_ACCEPT: "Proposed external gifts appear on the list without review.", RESTRICTED: "Proposed external gifts wait for your approval before appearing." }
    },
    saved: "Mode updated.",
    partnerPriority: { enable: "Turn on", disable: "Turn off", label: "Feature partner gifts", help: "Gifts from verified vendors are shown first on your list." }
  }
};
