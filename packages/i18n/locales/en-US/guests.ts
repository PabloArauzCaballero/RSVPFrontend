import type { DeepStrings } from "../types.js";
import type { guestsEsBO } from "../es-BO/guests.js";

/** Host guest management, RSVP summary, companion requests and notices (F16–F18). */
export const guestsEnUS: DeepStrings<typeof guestsEsBO> = {
  nav: { summary: "Summary", guests: "Guests", report: "RSVP report", requests: "Companions", notifications: "Notices", preferences: "Notice preferences" },
  status: { PENDING: "Not answered", CONFIRMED: "Confirmed", DECLINED: "Not attending" },
  fresh: {
    updated: "Updated {{date}}", never: "No processed data yet.",
    lag: "Data may take a few seconds to reflect the latest changes ({{count}} waiting to be processed).",
    stale: "Some changes have not been reflected for {{seconds}} s. The numbers will catch up on their own.", refresh: "Refresh"
  },
  list: {
    title: "Guests", search: "Search by name or email", filterLabel: "Filter by reply", all: "All",
    empty: "There are no guests yet. Add the first one or import your list from a CSV.", emptyFiltered: "No guest matches this search.",
    add: "Add guest", import: "Import CSV", groups: "Groups", page: "Showing {{from}}–{{to}} of {{total}}", prev: "Previous", next: "Next",
    companions: "{{count}} guests allowed", open: "Open {{name}}", retry: "Try again"
  },
  form: {
    title: "Add guest", name: "Name", email: "Email", emailHelp: "Used to send their invitation.", companions: "Guests allowed", companionsHelp: "How many more people they can bring without asking for approval.",
    group: "Family group", noGroup: "No group", save: "Save guest", saving: "Saving…", saved: "Guest added.", another: "Add another", back: "Back to the list",
    phone: "Phone (WhatsApp)", phoneHelp: "Optional if you enter an email. With country code.",
    errors: { contact: "Enter an email or a phone number.", phone: "Enter the phone with country code, for example +59171234567.", companions: "Enter a whole number, 0 or more.", tooLong: "This text is too long.", required: "This field is required.", email: "Enter a valid email, for example name@mail.com." }
  },
  import: {
    fileReadError: "We could not read the file. Choose it again or paste the CSV contents.",
    retryFailed: "To import again, fix the CSV and include only the rows with errors. The other rows are already saved.",
    title: "Import guests", intro: "Paste your CSV or choose the file. The first row must be:", header: "name,email,phone,locale,allowedCompanions,groupId",
    headerNote: "groupId is optional. Give at least an email or a phone (with country code) per row. Up to 1000 rows. Valid rows are imported even if others have errors.", csvLabel: "CSV content", chooseFile: "Choose CSV file",
    run: "Import", running: "Importing…", empty: "Paste or choose a CSV first.", fileTooBig: "The file is larger than 1 MB.", result: "Import result",
    summary: "{{imported}} imported, {{failed}} with errors, out of {{total}} rows.", errorsTitle: "Rows with errors", line: "Line {{line}}", field: "Field: {{field}}", none: "Every row was imported.", again: "Import another file", viewList: "View guests"
  },
  groups: {
    title: "Family groups", intro: "Group people who live together. Assign the group when you add each guest.", name: "Group name", create: "Create group", creating: "Creating…", created: "Group “{{name}}” created.",
    empty: "There are no groups yet. Create one and assign it when adding guests.", members: "{{count}} members", limit: "To move a guest to another group, open their page."
  },
  detail: {
    title: "Guest", groupTitle: "Family group", groupNone: "No group", groupSaved: "Group updated.", phone: "Phone", email: "Email", companions: "Guests allowed", locale: "Language", group: "Group", consent: "Consent given on {{date}}", missing: "We could not find this guest.",
    link: {
      title: "Personal link", intro: "Every guest has a unique link. Copy or share it: it is never shown in full so nobody sees it on a shared screen.",
      none: "You have not generated a link for this guest yet.", issue: "Generate link", reissue: "Reissue link", revoke: "Revoke link", copy: "Copy link", copied: "Link copied.", copyFailed: "We could not copy. Use Share.",
      share: "Share", shareTitle: "Your invitation", shareText: "You are invited to {{title}}. Confirm your attendance here:", masked: "Link: {{value}}", expires: "Expires on {{date}}",
      once: "For safety, the full link only exists on this screen while you keep it open. If you lose it, reissue it.",
      revokeTitle: "Revoke this link?", revokeBody: "The guest will no longer be able to open it right away. You can generate a new one whenever you want.", reissueTitle: "Reissue the link?", reissueBody: "The previous link stops working and a new one is generated.", revoked: "Link revoked.", working: "One moment…"
    }
  },
  summary: {
    refreshFailed: "We could not refresh the summary. You are seeing the last data received. You can refresh again.",
    title: "Guest summary", confirmed: "Confirmed", pending: "Not answered", declined: "Not attending", companions: "Companions", total: "Guests",
    daysToDeadline: "{{count}} days until replies close", deadlineToday: "Less than one day until replies close", deadlinePassed: "Replies are closed", noDeadline: "No reply deadline",
    openRequests: "{{count}} companion requests to review", noRequests: "No companion requests pending", reviewRequests: "Review requests", viewReport: "View report", viewGuests: "View guests", empty: "Once you add guests you will see here how many confirmed."
  },
  report: {
    answersUnavailable: "We could not load dietary notes and messages. Retry to complete the report.",
    loadingAnswers: "Loading dietary notes and messages…",
    title: "RSVP report", intro: "Replies, companions, diets and messages.", filterLabel: "Filter by reply", export: "Export CSV", exporting: "Preparing…", exported: "File {{name}} ready.", exportFailed: "We could not prepare the file. Try again.", exportCatering: "Export for the caterer", exportCateringNote: "The caterer file has no names or contacts, only diets and head count.",
    empty: "There are no replies to show yet.", dietary: "Diet: {{value}}", message: "Message: {{value}}", requested: "Asked for {{requested}} · approved {{approved}}",
    columns: { name: "Name", email: "Email", phone: "Phone", guestKey: "Guest key", group: "Group", partySize: "People", status: "Reply", allowed: "Companions allowed", requested: "Companions requested", approved: "Companions approved", dietary: "Dietary restrictions", message: "Message" }
  },
  requests: {
    title: "Companion requests", intro: "Guests who asked to bring more people than allowed.", empty: "There are no pending requests.",
    ask: "Asked for {{requested}} companions (allowed: {{allowed}})", guest: "Guest", approve: "Approve", reject: "Reject", approving: "Approving…", rejecting: "Rejecting…",
    approved: "Request approved.", rejected: "Request rejected.", stale: "This request was already resolved or changed. We refreshed the list.", open: "Open guest"
  },
  notifications: {
    title: "Notices", intro: "Messages the system sent or tried to send you about this celebration.", empty: "You have no notices yet.", unread: "Unread", read: "Read",
    markRead: "Mark as read", markAll: "Mark all as read", unreadCount: "{{count}} unread", open: "Open", refresh: "Refresh",
    markFailed: "Some selected notices could not be marked as read. Try again with the ones that are still unread.",
    marking: "Saving read status…", inApp: "In the app · {{date}}",
    markVisible: "Mark notices in the list as read", listLimit: "This list shows up to {{count}} notices.",
    channel: { EMAIL: "Email", SMS: "SMS", WHATSAPP: "WhatsApp", PUSH: "Push notification" },
    delivery: { PENDING: "Queued", SENDING: "Sending", SENT: "Sent", DEFERRED: "Deferred", SUPPRESSED: "Skipped by your preferences", FAILED: "Could not be sent", UNCERTAIN: "Unconfirmed", CANCELLED: "Cancelled", RETRY: "Retrying" },
    via: "By {{channel}} · {{status}} · {{date}}"
  },
  preferences: {
    saving: "Saving preference…", quietSaveFailed: "The schedule could not be saved. Your changes are still in the form.",
    quietZone: "Celebration time zone: {{timeZone}}",
    title: "Notice preferences", intro: "Choose how you want to receive notices about this celebration. The service honours your choice when sending.", channelsTitle: "Channels",
    EMAIL: "Email", SMS: "SMS", WHATSAPP: "WhatsApp", PUSH: "Push notifications", saved: "Preference saved.", saveFailed: "It could not be saved; we restored the previous value.", on: "On", off: "Off",
    quietTitle: "Quiet hours", quietIntro: "During this window, in your celebration's time, notices are deferred and arrive when it ends; none are lost.", quietStart: "From (hour, 0–23)", quietEnd: "Until (hour, 0–23)", quietSave: "Save quiet hours", quietDefault: "Use the service schedule", quietCurrent: "Quiet from {{start}}:00 to {{end}}:00", quietOff: "No quiet hours", quietSourceDefault: "Service schedule", quietSourceMine: "Your schedule", quietInvalid: "Enter whole hours between 0 and 23.", eventsTitle: "Notice types", eventsIntro: "Choose which notices you want. Any you do not change stay on.", event: { celebrationPublished: "My celebration was published", companionRequested: "A guest asks for more companions", giftRequested: "Someone asks to reserve a gift", leadCapReached: "A provider reached its inquiry cap" }, pushSetup: "Set up notices on this device"
  },
  push: {
    channel: "RSVP notices", received: "You have a new notice.", dismiss: "Dismiss notice",
    title: "Push notices on this device", intro: "We tell you when someone confirms or asks for companions. You can turn them off any time from Notice preferences.",
    enable: "Turn on push notices", registering: "Turning on…", enabled: "This device is registered for push notices.", denied: "Notices are blocked. Turn them on in the system settings for this app.", openSettings: "Open settings",
    unsupported: "Push notices need a real phone with the app installed. This environment does not support them.", failed: "We could not turn notices on. Try again.", noProject: "The app's notification project is not configured.", disable: "Remove this device", removed: "Device removed.", preferences: "Notice preferences"
  }
};
