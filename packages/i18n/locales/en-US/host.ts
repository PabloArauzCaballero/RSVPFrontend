import type { DeepStrings } from "../types.js";
import type { hostEsBO } from "../es-BO/host.js";

/** Host workspace: onboarding, editor, templates, preview, publishing and settings (F11–F13). */
export const hostEnUS: DeepStrings<typeof hostEsBO> = {
  common: {
    save: "Save", saving: "Saving…", saved: "Changes saved.", retry: "Try again", reload: "See the new version", cancel: "Cancel", confirm: "Confirm",
    back: "Back", next: "Next", loading: "Loading…", add: "Add", remove: "Remove", moveUp: "Move up", moveDown: "Move down",
    error: "Something didn't go as expected. Check your connection and try again; what you wrote is still here.",
    conflict: "Someone saved changes while you were editing. What you wrote is still here: open the new version and save again what you need.",
    forbidden: "You can see this celebration, but only its hosts or the organization's planner can change it.",
    notFound: "We could not find this celebration, or you do not have access to it.",
    accessDenied: "This area is for hosts and planners only.",
    invalid: "Check this value: {{detail}}",
    noCelebration: "Choose a celebration to continue.",
    chooseCelebration: "Choose a celebration",
    noCelebrationTitle: "Choose a celebration", noCelebrationBody: "Your guests, gifts and notices live inside each celebration.", archivedTitle: "This celebration is archived", archivedBody: "It is read-only. To keep editing, create a new celebration.",
    archivedReadOnly: "This celebration is archived: you can only view it. To keep editing, create a new celebration."
  },
  errors: {
    slugTaken: "Another celebration already uses that link. Try a different one.",
    slugImmutable: "The link can no longer be changed because the invitation was published or archived.",
    archived: "This celebration is archived: it no longer accepts changes.",
    invalidTransition: "That no longer applies to the celebration's current state. Reload the page to see where it stands.",
    rateLimited: "You're going fast. Wait {{seconds}} seconds and try again; what you wrote is still here.",
    rateLimitedNoWait: "You're going fast. Wait a moment and try again; what you wrote is still here.",
    server: "The server did not respond as expected. Try again in a few minutes; your changes are still here.",
    network: "Cannot reach the server. Check your internet and try again; your changes are still here.",
    serverLoad: "The server did not respond as expected. Try again in a few minutes.",
    networkLoad: "Cannot reach the server. Check your internet and try again."
  },
  limits: {
    requiredMissing: "To save, fill in: {{fields}}.", fieldsTooLong: "Some texts are too long. Shorten them to save.",
    tooLong_one: "Remove {{count}} character: the maximum is {{max}}.",
    tooLong_other: "Remove {{count}} characters: the maximum is {{max}}.",
    slugLength: "The link must be between 3 and 80 characters.",
    slugPattern: "Use only lowercase letters, numbers and single hyphens, with no hyphen at the start or end.",
    userId: "Enter a valid user identifier (UUID format)."
  },
  nav: { label: "Dashboard sections" },
  dest: { home: "Home", guests: "Guests", gifts: "Gifts", invitation: "My invitation", alerts: "Notices", settings: "Settings" },
  tabs: { summary: "Summary", guests: "Who is coming", report: "Replies", requests: "Companions", gifts: "My list", giftInbox: "Reservations", editor: "Content", gallery: "Gallery", translations: "Languages", templates: "Style", preview: "Preview", notifications: "Inbox", preferences: "Preferences", publish: "Publish", settings: "Configuration", modes: "Control modes", celebrations: "My celebrations", organizations: "Team", label: "Section tabs" },
  picker: { title: "My celebrations", intro: "Each celebration has its own invitation, guests and gifts.", emptyTitle: "Your celebrations will live here", emptyBody: "Create the first one in three steps and see how it looks before you share it.", create: "Create a celebration", open: "Open {{title}}", untitled: "Untitled", noDate: "No date yet", status: { DRAFT: "Draft", PUBLISHED: "Published", ARCHIVED: "Archived" } },
  onboarding: {
    joinNames: "{{first}} and {{second}}",
    title: "Create your invitation", intro: "Three short steps and your invitation has its own link.",
    step: "Step {{step}} of 3", stepLabels: { type: "What you're celebrating", who: "Who, when and where", name: "Name and link" }, progress: "Your steps",
    typeLabel: "Pick one",
    typeTitle: "What are you celebrating?", typeHelp: "This sets up the wording and the sections that suit it best.",
    whoTitle: "Who is it, when and where?", hostsHelp: "Write the names the way you want them to read on the invitation.",
    dateLabel: "Date", timeLabel: "Time", venuePlaceholder: "Las Palmas Hall", dateHelp: "With these details your invitation is ready to publish. You can change them whenever you like.",
    nameTitle: "Give it a name and a link", titleLabel: "Celebration name", titlePlaceholder: "Ana and Luis", titleHelp: "It's the first thing your guests see.",
    slugLabel: "Your invitation's link", slugHelp: "This is how your guests will get it: {{url}}. Lowercase letters, numbers and hyphens only.",
    defaultsSummary: "Already set for you: {{timeZone}} time, {{language}} and {{currency}}.",
    timeZoneLabel: "Event time zone", timeZoneHelp: "Your guests see times in this zone, wherever they are.", languageLabel: "Main language", currencyLabel: "Currency",
    titleRequired: "Write your celebration's name.", dateInvalid: "Choose the date.", timeInvalid: "Choose the time.", required: "Fill in this field.", requiredNotice: "Fill in the marked fields to continue.", slugRequired: "Write your invitation's link.",
    previewTitle: "How it's shaping up", previewHint: "It changes as you type.", previewShow: "See how it looks", previewHide: "Hide", previewFallbackTitle: "Your celebration",
    create: "Create my invitation", readyTitle: "Your invitation is ready", readyBody: "For now it's a draft: only you can see it. Fill in what's missing and publish it whenever you like.",
    finish: "Finish my invitation", chooseStyle: "Pick another style"
  },
  editor: {
    title: "Your invitation", intro: "Fill in each part at your own pace and see how it looks without leaving.",
    progress: "{{done}} of {{total}} parts ready", list: "Parts of your invitation", status: { ready: "Ready", missing: "Something's missing", optional: "Optional" },
    save: "Save changes", dirty: "You have unsaved changes.", viewPreview: "See how it looks", previewTitle: "How your guests see it", closePreview: "Close preview", previewDraftNote: "It includes what you typed, even if you haven't saved it yet.",
    sections: { general: "The basics", hosts: "Who", venues: "Where", story: "Story", schedule: "Schedule", sections: "More details" },
    about: { general: "The first thing your guests see.", anfitriones: "The names shown on the invitation.", lugares: "Where it happens: ceremony, reception or another place.", historia: "Tell how it all began.", itinerario: "What happens, and when.", secciones: "Dress code, FAQ and recommendations." },
    general: { slug: "Your invitation's link", slugLocked: "The link can no longer be changed because the invitation was published or archived.", title: "Celebration name", subtitle: "Welcome line", eventDate: "Date", eventTime: "Time", venueName: "Location", extraField: "Extra detail: {{field}}" },
    hosts: { help: "The roles come from the event type: {{eventType}}." },
    venues: { name: "Venue name", address: "Address", kind: "Type", kinds: { ceremony: "Ceremony", reception: "Reception", other: "Other" }, add: "Add venue", item: "Venue {{n}}" },
    story: { label: "Your story", help: "Separate paragraphs with a blank line." },
    schedule: { title: "Activity", date: "Date", time: "Time", description: "Details", add: "Add activity", item: "Activity {{n}}", zoneHelp: "Write the event's local time ({{timeZone}})." },
    extra: { dressCode: "Dress code", faq: "FAQ", question: "Question", answer: "Answer", addFaq: "Add question", recommendations: "Recommendations", recommendationName: "Name", recommendationDescription: "Description", recommendationKind: "Type", kinds: { lodging: "Lodging", transport: "Transport", other: "Other" }, listingId: "Partner code (optional)", listingHelp: "If it's a partner, its link goes through our redirector.", addRecommendation: "Add recommendation", item: "Item {{n}}" }
  },
  gallery: {
    title: "Your photos", intro: "The first one is the cover. You can change it whenever you like.", help: "JPG, PNG or WebP, up to 10 MB each.",
    add: "Add photo", uploading: "Uploading {{name}}… {{percent}} %", cover: "Cover", makeCover: "Use as cover", delete: "Delete",
    emptyTitle: "Your story's photos go here", emptyBody: "Upload the first one and it becomes your invitation's cover.", loadFailedTitle: "We couldn't load your photos",
    deleteTitle: "Delete this photo?", deleteBody: "It's removed from your invitation and can't be undone.", deleted: "Photo deleted.", orderSaved: "Order saved.",
    photo: "Photo {{n}}", invalidType: "That file is not a JPG, PNG or WebP image.", tooLarge: "The image is over 10 MB. Try a lighter one.", failed: "We couldn't upload {{name}}. Try again."
  },
  translations: {
    title: "Languages", intro: "Write your invitation in each language. Whatever you don't translate shows in the main language.",
    language: "Language", addLanguage: "Add language", emptyTitle: "Your invitation speaks one language", emptyBody: "Add another and write here how it reads in it.", loadFailedTitle: "We couldn't load your languages",
    progress: "{{done}} of {{total}} texts translated", original: "Original: {{text}}",
    fields: { title: "Name", subtitle: "Welcome line", story: "Story", dressCode: "Dress code" }, faqItem: "Question {{n}}", scheduleItem: "Activity {{n}}"
  },
  templates: {
    title: "Pick the style", intro: "Tap one and see it right away with your details.", current: "In use", apply: "Use this style",
    applied: "Done, your invitation now uses {{name}}.", preserved: "Changing style doesn't erase anything you wrote.", emptyTitle: "No styles for this event type yet", emptyBody: "Meanwhile your invitation uses the basic design. Check back in a few days.",
    loadFailedTitle: "We couldn't load the styles", preview: "Preview of {{name}}", list: "Available styles", seeFull: "See it full size"
  },
  preview: {
    title: "Preview", intro: "This is how your invitation looks on each screen.", devices: { mobile: "Phone", tablet: "Tablet", desktop: "Desktop" }, device: "Size", frame: "Preview of your invitation",
    openPublic: "Open my published invitation", templateFallback: "Meanwhile we use the basic design, not the style you picked.", notPublished: "It isn't published yet: this is how it will look when you publish.", changeStyle: "Change style"
  },
  publish: {
    title: "Publish", intro: "Complete what is missing, publish and share the link.", ready: "Your celebration is ready to publish.", readyBody: "Everything needed is complete. Publish whenever you like.", missing: "Before publishing, complete:", pending: "Items left: {{count}}",
    fields: { title: "The celebration name", subtitle: "The welcome line", eventDate: "The event date", venueName: "The location", childName: "The name of the child being baptised", companyName: "The company name", celebrantName: "The name of the celebrant", host: "The name of: {{role}}", other: "The field “{{field}}”" },
    goTo: "Complete", publish: "Publish celebration", publishConfirm: "Your invitation will be visible to anyone with the link. Publish now?",
    done: { title: "Your invitation is published", body: "Share the link and tomorrow you will know who is coming." },
    unpublish: "Unpublish", unpublishConfirm: "The site stops showing until you publish it again. The link stays the same.", reasonLabel: "Reason (optional)",
    archive: "Archive", archiveConfirm: "Archiving is final: the celebration can no longer be published or edited.", more: "More options",
    status: { DRAFT: "Draft: only you can see it.", PUBLISHED: "Published: anyone with the link can see it.", ARCHIVED: "Archived." },
    share: "Share the link", link: "Public link", copy: "Copy link", copied: "Link copied.", whatsappPreview: "How it looks on WhatsApp"
  },
  settings: {
    title: "Settings", intro: "Languages and RSVP deadline for your celebration.", general: "Languages", saved: "Settings saved.", languages: "Site languages", defaultLanguage: "Main language", timeZone: "Time zone", currency: "Currency", more: "More options", format: "Time and currency", formatHelp: "They already match your area. Change them only if your celebration is somewhere else.",
    deadline: { label: "RSVP deadline", date: "Date", time: "Time", help: "Event local time ({{timeZone}}).", none: "No deadline: your guests reply whenever they like.", clear: "Remove deadline",
      past: "That date has passed: your guests can no longer reply or change their answer.", effect: "Your guests can reply until {{date}} ({{zone}})." }
  },
  settingsExtra: {
    eventType: { label: "Celebration type", help: "Changing it changes the hosts and the data required to publish. Your content is kept.", locked: "The type can only be changed while the celebration is a draft.", save: "Change type" },
    team: { title: "Team", help: "People with access to this celebration. A co-host can edit; a read-only person can only view.", empty: "For now only you have access.",
      roles: { CO_HOST: "Co-host", VIEWER: "Read-only" }, userId: "Person's identifier (UUID)", role: "Permission", add: "Give access", remove: "Remove access", removeTitle: "Remove access", removeBody: "This person will no longer see your celebration.", added: "Access saved.", removed: "Access removed." },
    audit: { title: "Change history", empty: "No changes recorded yet.", item: "{{action}} · {{at}}",
      actions: { CREATED: "You created the celebration", TYPE_ASSIGNED: "The celebration type changed", CONFIGURED: "The content was updated", SETTINGS_UPDATED: "The settings were updated", PUBLISHED: "It was published", UNPUBLISHED: "It was unpublished", ARCHIVED: "It was archived", TEMPLATE_SELECTED: "A template was chosen", other: "A change to the celebration" } }
  },
  modes: {
    title: "Control modes", intro: "Choose what is approved on its own and what goes through you.", help: "You can change it any time.",
    nonRetroactive: "The change applies to what comes next. What already waits for your answer keeps waiting.",
    values: { AUTO_ACCEPT: "Automatic", RESTRICTED: "With my review" }, current: "Now: {{value}}",
    confirmTitle: "Switch to “{{value}}”", confirm: "Yes, switch", change: "Switch to “{{value}}”",
    switches: {
      giftReservationMode: { label: "Gift reservations", AUTO_ACCEPT: "When a guest reserves a gift it is committed at once and nobody else can choose it.", RESTRICTED: "Every reservation reaches Reservations and the gift is held until you approve or reject it." },
      unregisteredRsvpMode: { label: "Replies from people without an invitation", AUTO_ACCEPT: "Anyone with the link can confirm attendance without being on your list.", RESTRICTED: "Only the people on your guest list can confirm." },
      extraCompanionMode: { label: "Extra companions", AUTO_ACCEPT: "If a guest asks for more companions than you gave them, they are approved automatically.", RESTRICTED: "Extra companions stay pending until you approve them." },
      externalGiftMode: { label: "Store gifts", AUTO_ACCEPT: "Store gifts that get proposed show on the list without review.", RESTRICTED: "Store gifts that get proposed wait for your approval before they show." }
    },
    saved: "Mode updated.",
    partnerPriority: { enable: "Turn on", disable: "Turn off", label: "Partners first", help: "Gifts from verified providers show first on your list, and when you add a store gift we suggest partner options.", on: "On", off: "Off" }
  }
};
