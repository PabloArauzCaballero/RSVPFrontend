import type { DeepStrings } from "../types.js";
import type { guestsEsBO } from "../es-BO/guests.js";

/** Host guest management, RSVP summary, companion requests and notices (F16–F18). */
export const guestsEnUS: DeepStrings<typeof guestsEsBO> = {
  errors: {
    rateLimited: "There are too many requests in a row. Wait a moment and try again.",
    rateLimitedWait: "There are too many requests in a row. Try again in {{seconds}} s.",
    unavailable: "The service is not available right now. Your data is still here: try again in a few minutes.",
    offline: "There is no connection to the server. Check your internet and try again; your data is still here."
  },
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
    companions: "Companions allowed: {{count}}", open: "Open {{name}}", retry: "Try again", settings: "Guest settings", groupFilter: "Filter by group", allGroups: "All groups"
  },
  form: {
    title: "Add guest", name: "Name", email: "Email", emailHelp: "Used to send their invitation.", companions: "Guests allowed", companionsHelp: "How many more people they can bring without asking for approval.",
    duplicateTitle: "Add anyway?", duplicateBody: "There is already a guest with this same contact: {{name}}. If you add them, you will have two records and two different links.", duplicateConfirm: "Add anyway",
    group: "Family group", noGroup: "No group", save: "Save guest", saving: "Saving…", saved: "Guest added.", another: "Add another", back: "Back to the list",
    phone: "Phone (WhatsApp)", phoneHelp: "Optional if you enter an email. With country code.",
    errors: { contact: "Enter an email or a phone number.", phone: "Enter the phone with country code, for example +59171234567.", companions: "Enter a whole number, 0 or more.", tooLong: "This text is too long.", required: "This field is required.", email: "Enter a valid email, for example name@mail.com." }
  },
  import: {
    title: "Import guests", intro: "Paste your CSV or choose the file. The first row must be:", header: "name,email,phone,locale,allowedCompanions,groupId",
    headerNote: "groupId is optional. Give at least an email or a phone (with country code) per row. Up to 1000 rows. Valid rows are imported even if others have errors.", csvLabel: "CSV content", chooseFile: "Choose CSV file",
    run: "Import", running: "Importing…", empty: "Paste or choose a CSV first.", tooManyRows: "The CSV has more than 1000 rows. Split it into smaller files.", fileTooBig: "The file is larger than 1 MB.", result: "Import result",
    summary: "{{imported}} imported, {{failed}} with errors, out of {{total}} rows.", errorsTitle: "Rows with errors", line: "Line {{line}}", field: "Field: {{field}}", none: "Every row was imported.", again: "Import another file", viewList: "View guests"
  },
  groups: {
    title: "Family groups", intro: "Group people who live together. Assign the group when you add each guest.", name: "Group name", create: "Create group", creating: "Creating…", created: "Group “{{name}}” created.",
    empty: "There are no groups yet. Create one and assign it when adding guests.", members: "{{count}} members", limit: "To move a guest to another group, open their page."
  },
  detail: {
    title: "Guest", groupTitle: "Family group", groupNone: "No group", groupSaved: "Group updated.", phone: "Phone", email: "Email", companions: "Guests allowed", locale: "Language", group: "Group", consent: "Consent given on {{date}}", missing: "We could not find this guest.",
    erase: {
      title: "Delete guest", intro: "Deletes this guest, their link and their answers from this celebration. It cannot be undone.",
      action: "Delete guest", confirmTitle: "Delete {{name}}?", confirmBody: "Their personal data, link and answers are erased. Notices and reports will no longer include them. This cannot be undone.", confirm: "Delete for good"
    },
    link: {
      title: "Personal link", intro: "Every guest has a unique link. Copy or share it: it is never shown in full so nobody sees it on a shared screen.",
      none: "You have not generated a link for this guest yet.", issue: "Generate link", reissue: "Reissue link", revoke: "Revoke link", copy: "Copy link", copied: "Link copied.", copyFailed: "We could not copy. Use Share.",
      share: "Share", shareTitle: "Your invitation", shareText: "You are invited to {{title}}. Confirm your attendance here:", masked: "Link: {{value}}", expires: "Expires on {{date}}",
      once: "For safety, the full link only exists on this screen while you keep it open. If you lose it, reissue it.",
      revokeTitle: "Revoke this link?", revokeBody: "The guest will no longer be able to open it right away. You can generate a new one whenever you want.", reissueTitle: "Reissue the link?", reissueBody: "The previous link stops working and a new one is generated.", revoked: "Link revoked.", working: "One moment…"
    }
  },
  settings: {
    title: "Guest settings", save: "Save",
    defaultsTitle: "Default companions", defaultsIntro: "How many companions each new guest is allowed. You can change it per guest when adding them.", defaultCompanions: "Default companions", defaultCompanionsHelp: "A whole number, 0 or more.", defaultsSaved: "Saved: {{count}} companions by default.",
    retentionTitle: "Data retention", retentionIntro: "After this period, counted from each guest's registration, their personal data is erased.", retentionCurrent: "Data is kept {{count}} days after registration.", retentionNone: "No period set: data is kept until you delete it.",
    retentionDays: "Days to keep data", retentionHelp: "From 1 to 36500. Leave empty to set no period.", retentionInvalid: "Enter a whole number between 1 and 36500.", retentionSaved: "Retention period saved.", retentionClear: "Remove the period",
    retentionConfirmTitle: "Save this period?", retentionConfirmBody: "Each guest's data will be erased {{count}} days after they registered. This cannot be undone.", clearTitle: "Remove the period?", clearBody: "Guest data will be kept until you delete it yourself."
  },
  summary: {
    title: "Guest summary", headline: "{{confirmed}} of {{total}} confirmed", confirmed: "Confirmed", pending: "Not answered", declined: "Not attending", companions: "Companions", total: "Guests",
    daysToDeadline: "{{count}} days until replies close", deadlineToday: "Replies close today", deadlinePassed: "Replies are closed", noDeadline: "No reply deadline",
    openRequests: "{{count}} companion requests to review", noRequests: "No companion requests pending", reviewRequests: "Review requests", viewReport: "View report", viewGuests: "View guests", empty: "Once you add guests you will see here how many confirmed."
  },
  report: {
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
    markRead: "Mark as read", markAll: "Mark all as read", unreadCount: "{{count}} unread", open: "Open", refresh: "Refresh", markFailed: "It could not be marked as read; we restored the previous state.",
    channel: { EMAIL: "Email", SMS: "SMS", WHATSAPP: "WhatsApp", PUSH: "Push notification", INBOX: "In-app inbox" },
    delivery: { PENDING: "Queued", SENDING: "Sending", SENT: "Sent", DEFERRED: "Deferred", SUPPRESSED: "Skipped by your preferences", FAILED: "Could not be sent", UNCERTAIN: "Unconfirmed", CANCELLED: "Cancelled", RETRY: "Retrying" },
    templates: {
      companionRequested: { subject: "Companion request", text: "A companion request is waiting for your review in your dashboard." },
      giftRequested: { subject: "Gift reservation request", text: "A gift reservation is waiting for your review in your dashboard." },
      leadCapReached: { subject: "Contact limit reached", text: "You reached your configured contact limit. Check the details in your dashboard." },
      celebrationPublished: { subject: "Celebration published", text: "Your celebration is now published. You can check its status in your dashboard." },
      pushTest: { subject: "Notification test", text: "The notification setup for this device is being checked." },
      hostRsvpConfirmed: { subject: "A guest confirmed attendance", text: "A guest confirmed they will attend. See the details in your guest dashboard." },
      hostRsvpDeclined: { subject: "A guest cannot attend", text: "A guest replied that they will not attend. See the details in your guest dashboard." },
      hostRsvpChanged: { subject: "A guest changed their reply", text: "A guest updated their RSVP. See the details in your guest dashboard." }
    },
    via: "By {{channel}} · {{status}} · {{date}}"
  },
  preferences: {
    title: "Notice preferences", intro: "Choose how you want to receive notices about this celebration. The service honours your choice when sending.", channelsTitle: "Channels",
    EMAIL: "Email", SMS: "SMS", WHATSAPP: "WhatsApp", PUSH: "Push notifications", saved: "Preference saved.", saveFailed: "It could not be saved; we restored the previous value.", on: "On", off: "Off",
    quietTitle: "Quiet hours", quietIntro: "During this window, in your celebration's time, notices are deferred and arrive when it ends; none are lost.", quietStart: "From (hour, 0–23)", quietEnd: "Until (hour, 0–23)", quietSave: "Save quiet hours", quietDefault: "Use the service schedule", quietCurrent: "Quiet from {{start}}:00 to {{end}}:00", quietOff: "No quiet hours", quietSourceDefault: "Service schedule", quietSourceMine: "Your schedule", quietInvalid: "Enter whole hours between 0 and 23.", eventsTitle: "Notice types", eventsIntro: "Choose which notices you want. Any you do not change stay on.", event: { celebrationPublished: "My celebration was published", companionRequested: "A guest asks for more companions", giftRequested: "Someone asks to reserve a gift", leadCapReached: "A provider reached its inquiry cap" }, pushSetup: "Set up notices on this device"
  },
  push: {
    title: "Push notices on this device", intro: "We tell you when someone confirms or asks for companions. You can turn them off any time from Notice preferences.",
    enable: "Turn on push notices", registering: "Turning on…", enabled: "This device will receive push notices.", denied: "Notices are blocked. Turn them on in the system settings for this app.", openSettings: "Open settings",
    unsupported: "Push notices need a real phone with the app installed. This environment does not support them.", failed: "We could not turn notices on. Try again.", noProject: "The app's notification project is not configured.", disable: "Remove this device", removed: "Device removed.", preferences: "Notice preferences",
    devicesTitle: "Registered devices", devicesEmpty: "No devices are registered for push notices yet.", platform: { ios: "iPhone", android: "Android" },
    deviceStatus: { ACTIVE: "Active", REVOKED: "Removed", INVALID: "Invalid" }, registeredOn: "registered on {{date}}", inactiveReason: "This device no longer receives notices; turn it on again from the phone.",
    test: "Send a test notice", testQueued: "Test notice on its way.", removeTitle: "Remove this device?", removeBody: "It will stop receiving push notices for this celebration. You can turn it on again from the phone.",
    deliveriesTitle: "Recent deliveries", deliveriesIntro: "What happened to each push notice sent to your devices.", deliveriesEmpty: "No push notice has been sent yet.",
    delivery: { PENDING: "Queued", SENDING: "Sending", TICKETED: "Handed to the push service", ACCEPTED: "Accepted by the device", RETRY: "Retrying", FAILED: "Could not be sent", UNCERTAIN: "Unconfirmed", DEFERRED: "Deferred", SUPPRESSED: "Skipped per your preferences", CANCELLED: "Cancelled" },
    attempts: "{{count}} attempts · available from {{date}}", lastError: "Detail: {{detail}}"
  }
};
