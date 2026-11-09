import type { DeepStrings } from "../types.js";
import type { guestsEsBO } from "../es-BO/guests.js";

/** Home, guests, replies, companion requests and host notices (F16–F18). Same voice as es-BO: warm, short, no exclamation marks in errors. */
export const guestsEnUS: DeepStrings<typeof guestsEsBO> = {
  more: "More options",
  loading: "Loading…",
  errors: {
    invalid: "Check this detail and try again.", invalidField: { name: "Check this detail: the name must be 1 to 200 characters.", email: "Check this detail: enter a valid email.", phone: "Check this detail: enter the phone with country code.", contact: "Check this detail: an email or a phone number is missing.", allowedCompanions: "Check this detail: companions are a whole number, 0 or more.", groupId: "Check this detail: that group no longer exists.", locale: "Check this detail: the language is not valid.", retentionDays: "Check this detail: days go from 1 to 36500.", csv: "Check this detail: the file is not in the expected format." },
    rateLimited: "There are too many requests in a row. Wait a moment and try again.",
    rateLimitedWait: "There are too many requests in a row. Try again in {{seconds}} s.",
    unavailable: "The service is not available right now. What you typed is still here: try again in a few minutes.",
    offline: "There is no connection to the server. Check your internet and try again; what you typed is still here."
  },
  status: { PENDING: "Not answered", CONFIRMED: "Confirmed", DECLINED: "Not attending" },
  fresh: {
    updated: "Updated {{date}}", never: "No processed data yet.",
    lag_one: "The latest changes can take a few seconds to show ({{count}} waiting to be processed).",
    lag_other: "The latest changes can take a few seconds to show ({{count}} waiting to be processed).",
    stale: "Some changes have not shown up for {{seconds}} s. The numbers will catch up on their own.", refresh: "Refresh"
  },
  summary: {
    title: "Your celebration", intro: "Invite today. Know tomorrow who is coming.",
    progressTitle: "How you are doing",
    confirmed: "Confirmed", pending: "Not answered", declined: "Not attending", companions: "Companions", total: "Guests",
    steps: {
      published: "Invitation published", publishedDone: "Your guests can open it now", publishedTodo: "It is still a draft",
      guests: "Guests on your list", guestsNone: "Nobody yet", guestsSome: "You can give them their link now",
      answers: "Replies", answersNone: "Once you add guests you will see who replies here", answersSome: "{{answered}} of {{total}} have replied"
    },
    next: {
      publish: { title: "Publish your invitation", body: "Until it is published, your guests cannot open it or reply.", action: "Publish" },
      finish: { title: "Finish your invitation", body_one: "{{count}} detail left before you can publish it.", body_other: "{{count}} details left before you can publish it.", action: "Complete" },
      addGuests: { title: "Here you will see who is coming", body: "Add the first people and send them their link. Their replies show up here.", action: "Add guests" },
      requests: { title_one: "Review {{count}} request", title_other: "Review {{count}} requests", body: "Guests asking to bring more people than allowed.", action: "Review requests" },
      gifts: { title_one: "Review {{count}} gift reservation", title_other: "Review {{count}} gift reservations", body: "Someone wants to give you a gift and is waiting for your answer.", action: "See reservations" },
      pending: { title_one: "{{count}} person has not replied", title_other: "{{count}} people have not replied", body: "See who has not answered and send their link again.", action: "See who is missing" },
      done: { title: "Everyone has replied", body: "Your list is complete. When something changes, you will see it here." }
    },
    firstReply: { title: "Your first reply is in", body: "This is how it starts: every tap from a guest shows up here right away." },
    welcome: { title: "Here is where you will see who is coming", body: "Add your first guests and share their personal link. They reply in one tap.", action: "Add guests" },
    allDone: "All caught up",
    viewGuests: "See who is coming",
    shareOfGuests: "{{percent}}% of your guests", heroGuests: "{{total}} guests · {{answered}} replied", daysLeft_one: "day to go", daysLeft_other: "days to go",
    daysToDeadline_one: "{{count}} day left until replies close", daysToDeadline_other: "{{count}} days left until replies close",
    deadlineToday: "Replies close today", deadlinePassed: "Replies are closed", noDeadline: "No reply deadline",
    openRequests_one: "{{count}} companion request to review", openRequests_other: "{{count}} companion requests to review"
  },
  list: {
    title: "Who is coming", intro: "Your guest list, with each reply next to the name.", totalGuests_one: "{{count}} guest", totalGuests_other: "{{count}} guests", search: "Search by name or email", filterLabel: "Filter by reply", all: "All",
    emptyTitle: "Here you will see who is coming", empty: "Add the first people and send them their link. Their replies show up here.", appearing: "Appearing…", emptyFilteredTitle: "No matches", emptyFiltered: "We could not find anyone with that search. Try another name or email.",
    add: "Add guest", import: "Import CSV", groups: "Groups", page: "Showing {{from}}–{{to}} of {{total}}", prev: "Previous", next: "Next",
    companions: "Companions allowed: {{count}}", open: "Open {{name}}", retry: "Try again", settings: "Guest settings", groupFilter: "Filter by group", allGroups: "All groups"
  },
  form: {
    title: "Add guest", intro: "An email or a phone number is enough.", name: "Name", email: "Email", emailHelp: "Used to send their invitation.", companions: "Companions allowed", companionsHelp: "How many more people they can bring without asking for approval.",
    duplicateTitle: "Add anyway?", duplicateBody: "There is already a guest with this same contact: {{name}}. If you add them, you will have two records and two different links.", duplicateConfirm: "Add anyway",
    group: "Family group", noGroup: "No group", save: "Add to my list", saving: "Adding…", saved: "{{name}} is on your list.", savedDetail: "It can take a few seconds to show in the list. Type the next one whenever you like.", back: "Back to the list",
    firstTitle: "You have your first guest", firstBody: "Now give them their personal link so they can reply in one tap.", firstAction: "See my list",
    phone: "Phone (WhatsApp)", phoneHelp: "Optional if you enter an email. With country code.",
    errors: { contact: "Enter an email or a phone number.", phone: "Enter the phone with country code, for example +59171234567.", companions: "Enter a whole number, 0 or more.", tooLong: "This text is too long.", required: "This field is required.", email: "Enter a valid email, for example name@mail.com." }
  },
  import: {
    title: "Import guests", intro: "Bring your whole list at once from a CSV file.", steps: "The first row of the file must be:", header: "name,email,phone,locale,allowedCompanions,groupId",
    headerNote: "groupId is optional. Each row needs an email or a phone with country code. Up to 1000 rows: valid rows go in even if others have errors.", csvLabel: "Or paste the CSV content here", chooseFile: "Choose CSV file",
    run: "Import", running: "Importing…", empty: "Paste or choose a CSV first.", tooManyRows: "The CSV has more than 1000 rows. Split it into smaller files.", fileTooBig: "The file is larger than 1 MB.", result: "Import result",
    fields: { name: "name", email: "email", phone: "phone", contact: "contact", csv: "file", locale: "language", allowedCompanions: "companions", groupId: "group" }, reasons: { email: "The email is not valid.", contact: "An email or a phone number is missing.", header: "The first row is not in the expected format.", name: "The name is missing or too long (1 to 200 characters).", phone: "The phone needs a country code, for example +59171234567.", locale: "The language is not valid.", companions: "Companions are a whole number, 0 or more.", group: "That group does not exist.", other: "Check this row." },
    summary: "{{imported}} imported, {{failed}} with errors, out of {{total}} rows.", errorsTitle: "Rows to review", line: "Line {{line}}", field: "Field: {{field}}",
    celebrateTitle: "Your list just grew", celebrateBody: "You can now give each guest their link.", again: "Import another file", viewList: "View guests"
  },
  groups: {
    title: "Family groups", intro: "Group the people who come together and filter your list by group.", name: "Group name", create: "Create group", creating: "Creating…", created: "Group “{{name}}” created.",
    emptyTitle: "No groups yet", empty: "Create one and assign it when you add each guest.", members: "{{count}} members", limit: "To move someone to another group, open their page."
  },
  detail: {
    title: "Guest", intro: "Their reply, their link and their group.", groupTitle: "Family group", groupNone: "No group", groupSaved: "Group updated.", phone: "Phone", email: "Email", companions: "Companions allowed", locale: "Language", group: "Group", consent: "Consent given on {{date}}", missing: "We could not find this guest.",
    erase: {
      title: "Delete guest", intro: "Deletes this guest, their link and their answers from this celebration. It cannot be undone.",
      action: "Delete guest", confirmTitle: "Delete {{name}}?", confirmBody: "Their personal data, link and answers are erased. Notices and reports will no longer include them. This cannot be undone.", confirm: "Delete for good"
    },
    link: {
      title: "Their personal link", intro: "Each guest replies with a unique link. We never show it in full, so nobody can read it over your shoulder.",
      none: "They do not have a link yet. Generate one and send it.", issue: "Generate and copy link", reissue: "Reissue link", revoke: "Revoke link", manage: "Reissue or revoke the link", copy: "Copy link", copied: "Link copied.", copyFailed: "We could not copy. Use Share.",
      readyTitle: "Link ready for {{name}}", readyBody: "Copy it or share it: one tap and they can reply.",
      share: "Share", shareTitle: "Your invitation", shareText: "You are invited to {{title}}. Confirm your attendance here:", masked: "Link: {{value}}", expires: "Expires on {{date}}",
      once: "For safety, the full link only exists on this screen while you keep it open. If you lose it, reissue it.",
      revokeTitle: "Revoke this link?", revokeBody: "The guest will no longer be able to open it right away. You can generate a new one whenever you want.", reissueTitle: "Reissue the link?", reissueBody: "The previous link stops working and a new one is generated.", revoked: "Link revoked."
    }
  },
  settings: {
    title: "Guest settings", intro: "How many companions are allowed by default and how long we keep the data.", save: "Save",
    defaultsTitle: "Default companions", defaultsIntro: "How many companions each new guest is allowed. You can change it per guest when adding them.", defaultCompanions: "Default companions", defaultCompanionsHelp: "A whole number, 0 or more.", defaultsSaved: "Saved: {{count}} default companions.",
    retentionTitle: "Data retention", retentionIntro: "After this period, counted from each guest's registration, their personal data is erased.", retentionCurrent: "Data is kept {{count}} days after registration.", retentionNone: "No period set: data is kept until you delete it.",
    retentionDays: "Days to keep data", retentionHelp: "From 1 to 36500. Leave empty to set no period.", retentionInvalid: "Enter a whole number between 1 and 36500.", retentionSaved: "Retention period saved.", retentionClear: "Remove the period",
    retentionConfirmTitle: "Save this period?", retentionConfirmBody: "Each guest's data will be erased {{count}} days after they registered. This cannot be undone.", clearTitle: "Remove the period?", clearBody: "Guest data will be kept until you delete it yourself."
  },
  report: {
    title: "Replies", intro: "Who replied, how many are coming and what they need.", filterLabel: "Filter by reply", export: "Export CSV", exporting: "Preparing…", exported: "File {{name}} ready.", exportFailed: "We could not prepare the file. Try again.", exportCatering: "Export for catering", exportCateringNote: "The catering file has no names or contacts, only diets and head count.",
    emptyTitle: "Replies will show up here", empty: "When your guests answer, you will see how many are coming, their diets and their messages.", emptyFiltered: "Nobody has given that reply yet.", dietary: "Diet: {{value}}", message: "Message: {{value}}", requested: "Asked for {{requested}} · approved {{approved}}",
    requestsLink_one: "You have {{count}} companion request to review", requestsLink_other: "You have {{count}} companion requests to review", requestsAction: "Review requests",
    columns: { name: "Name", email: "Email", phone: "Phone", guestKey: "Guest key", group: "Group", partySize: "People", status: "Reply", allowed: "Companions allowed", requested: "Companions requested", approved: "Companions approved", dietary: "Dietary restrictions", message: "Message" }
  },
  requests: {
    title: "Companion requests", intro: "Guests who ask to bring more people than allowed.", emptyTitle: "All caught up", empty: "When someone asks to bring more people, it will show up here so you can approve it in one tap. Requests you already resolved are not kept in a list.",
    ask: "Asked for {{requested}} companions (allowed: {{allowed}})", guest: "Guest", approve: "Approve", reject: "Reject", approving: "Approving…", rejecting: "Rejecting…",
    approved: "Request approved.", rejected: "Request rejected.", stale: "This request was already resolved or changed. We refreshed the list.", open: "Open guest"
  },
  notifications: {
    title: "Inbox", intro: "What needs your attention in this celebration.", emptyTitle: "Your inbox is quiet", empty: "Requests and replies that need your attention land here.", unread: "Unread", read: "Read",
    markRead: "Mark as read", markAll: "Mark all as read", unreadCount: "{{count}} unread", open: "Open", refresh: "Refresh", markFailed: "It could not be marked as read; we restored the previous state.",
    channel: { EMAIL: "Email", SMS: "SMS", WHATSAPP: "WhatsApp", PUSH: "Push notification", INBOX: "In-app inbox" },
    delivery: { PENDING: "Queued", SENDING: "Sending", SENT: "Sent", DEFERRED: "Deferred", SUPPRESSED: "Skipped by your preferences", FAILED: "Could not be sent", UNCERTAIN: "Unconfirmed", CANCELLED: "Canceled", RETRY: "Retrying" },
    templates: {
      companionRequested: { subject: "Companion request", text: "A guest asks to bring more people. Approve or reject it from your dashboard." },
      giftRequested: { subject: "Gift reservation request", text: "Someone wants to reserve a gift. Review it from your dashboard." },
      leadCapReached: { subject: "Contact limit reached", text: "You reached your configured contact limit. Check the details in your dashboard." },
      celebrationPublished: { subject: "Celebration published", text: "Your invitation is now published. You can check its status in your dashboard." },
      pushTest: { subject: "Notice test", text: "We are checking that this device receives notices." },
      hostRsvpConfirmed: { subject: "A guest confirmed", text: "Someone confirmed they are coming. See the details in Replies." },
      hostRsvpDeclined: { subject: "A guest cannot attend", text: "Someone replied that they will not attend. See the details in Replies." },
      hostRsvpChanged: { subject: "A guest changed their reply", text: "Someone updated their reply. See the details in Replies." }
    },
    via: "By {{channel}} · {{status}} · {{date}}", viewedAt: "{{date}}"
  },
  preferences: {
    title: "How you want to hear", intro: "Choose where notices reach you. We honor your choice when sending.", channelsTitle: "Channels",
    EMAIL: "Email", SMS: "SMS", WHATSAPP: "WhatsApp", PUSH: "Push notifications", saved: "Preference saved.", saveFailed: "It could not be saved; we restored the previous value.", on: "On", off: "Off",
    quietTitle: "Quiet hours", quietIntro: "During this window, in your celebration's time, notices wait and arrive when it ends. None are lost.", quietStart: "From (hour, 0–23)", quietEnd: "Until (hour, 0–23)", quietSave: "Save quiet hours", quietDefault: "Use the service's hours", quietCurrent: "Quiet from {{start}}:00 to {{end}}:00", quietOff: "No quiet hours", quietSourceDefault: "Service hours", quietSourceMine: "Your hours", quietInvalid: "Enter whole hours between 0 and 23.", eventsTitle: "Which notices you want", eventsIntro: "The ones you do not change stay on.", event: { celebrationPublished: "My celebration was published", companionRequested: "A guest asks for more companions", giftRequested: "Someone asks to reserve a gift", leadCapReached: "A vendor reached its inquiry cap" }, pushSetup: "Set up notices on this device"
  },
  push: {
    title: "Notices on this device", intro: "We tell you when someone confirms or asks for companions. You can turn them off any time in Preferences.",
    enable: "Turn on push notices", registering: "Turning on…", enabled: "This device will receive push notices.", denied: "Notices are blocked. Turn them on in the system settings for this app.", openSettings: "Open settings",
    unsupported: "Push notices need a real phone with the app installed. This environment does not support them.", failed: "We could not turn notices on. Try again.", noProject: "The app's notification project is not configured.", disable: "Remove this device", preferences: "Notice preferences",
    state: { ready: "Instant alerts", enabled: "This phone already gets alerts", denied: "Alerts are turned off", unsupported: "No push alerts here" },
    readyBody: "Turn them on and this phone gets every alert right away.", 
    advanced: "Devices and deliveries",
    devicesTitle: "Registered devices", devicesEmpty: "No devices are registered for push notices yet.", platform: { ios: "iPhone", android: "Android" },
    deviceStatus: { ACTIVE: "Active", REVOKED: "Removed", INVALID: "Invalid" }, registeredOn: "registered on {{date}}", inactiveReason: "This device no longer receives notices; turn it on again from the phone.",
    test: "Send a test notice", testQueued: "Test notice on its way.", removeTitle: "Remove this device?", removeBody: "It will stop receiving push notices for this celebration. You can turn it on again from the phone.",
    deliveriesTitle: "Recent deliveries", deliveriesIntro: "What happened to each push notice sent to your devices.", deliveriesEmpty: "No push notice has been sent yet.",
    delivery: { PENDING: "Queued", SENDING: "Sending", TICKETED: "Handed to the push service", ACCEPTED: "Accepted by the device", RETRY: "Retrying", FAILED: "Could not be sent", UNCERTAIN: "Unconfirmed", DEFERRED: "Deferred", SUPPRESSED: "Skipped per your preferences", CANCELLED: "Canceled" },
    attempts: "{{count}} attempts · available from {{date}}", lastError: "Detail: {{detail}}"
  }
};
