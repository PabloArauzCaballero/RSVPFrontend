import type { DeepStrings } from "../types.js";
import type { giftsEsBO } from "../es-BO/gifts.js";
import { giftsWizardEnUS } from "./gifts-wizard.js";
/** Public gift list (F22) and host gift management (F23). */
export const giftsEnUS: DeepStrings<typeof giftsEsBO> = {
  meta: { title: "Gifts · {{name}}", description: "Gift list for {{name}}. Products from our partners come first." },
  back: "Back to the celebration",
  filters: { label: "Filter gifts", maxPrice: "Maximum price", source: "Source", sourceAll: "All", sourcePartner: "From our partners", sourceOther: "Other stores", onlyAvailable: "Available only", clear: "Clear filters", count_one: "{{count}} gift", count_other: "{{count}} gifts" },
  card: { photo: "Photo of {{title}}", open: "See details of {{title}}", viaWhatsApp: "Order on WhatsApp", viaOther: "See at the store" },
  detail: { title: "{{title}} · Gifts", back: "Back to the list", notFound: "This gift is no longer on the list.", notFoundBody: "The hosts may have removed it. The full list is still open to you.", notFoundBodyClosed: "The hosts may have removed it. You can go back to the list to see the others.", partnerNote: "A DOne partner offers this product. Opening the link takes you out of DOne." },
  outcome: { cancelledTitle: "Reservation cancelled", cancelledBody: "This reservation was cancelled when your attendance changed. If you are attending again, confirm your response and choose an available gift." },
  error: {
    attendanceBody: "To reserve a gift, return to your response and confirm that you are attending.",
    needLinkTitle: "Open your invitation link", needLinkBody: "To see and reserve gifts we use the personal link of your invitation; you do not need an account. Open it from the message the hosts sent you.",
    needLinkAction: "Go to my invitation" },
  empty: { filtered: "No gift matches these filters.", filteredBody: "Try another price or source, or clear the filters." },
  notFound: { title: "We could not find this celebration", body: "The page does not exist or the hosts have not published it yet." },
  /** Guest gift list in the app (Persuade). The public site (seo-web) uses the same keys since M21. */
  guest: {
    title: "Gifts", intro: "Reserve a gift in one tap and nobody else will give the same one.", rule: "Each person can hold a limited number of reserved gifts at a time.", backToRsvp: "Back to my answer", loading: "Opening the list…",
    groupPartner: "From our partners", groupOther: "Ideas from your hosts",
    status: { AVAILABLE: "Available", PENDING_REVIEW: "Waiting for approval", COMMITTED: "Reserved" },
    /** R5 · guest card: quantity by units, coordinated contribution, current price and «did you buy it?». */
    units: { left_one: "{{count}} of {{total}} still needed", left_other: "{{count}} of {{total}} still needed", choose: "How many do you want to give", less: "Fewer units", more: "More units", value_one: "{{count}} unit", value_other: "{{count}} units", help_one: "{{count}} left. Reserve only the ones you will give.", help_other: "{{count}} left. Reserve only the ones you will give.", mine_one: "You reserved {{count}} unit", mine_other: "You reserved {{count}} units" },
    group: {
      badge: "Together", contributorsNone: "Nobody has joined yet", contributors_one: "1 person is chipping in", contributors_other: "{{count}} people are chipping in",
      noCoordinator: "Be the one who coordinates: you reserve the gift and buy it at the store; the others join with their share.",
      coordinatorNamed: "{{name}} will buy it", coordinatorAnonymous: "Someone in the group will buy it",
      join: "Join in", joinFor: "Join in for {{title}}", start: "Coordinate this gift", startFor: "Coordinate {{title}}",
      youCoordinate: "You coordinate this gift", youCoordinateHelp: "You are the one who buys it. Use the buttons below and the others chip in.", namesShown: "Joined: {{names}}",
      youContribute: "You joined this gift", youContributeHelp: "Someone else buys it; you chip in your share with them.", leave: "Leave this gift", leaveFor: "Leave this gift: {{title}}",
      lead: "This gift is bought together. Whoever signs up first coordinates and buys it; the app does not charge or move money.", leadContributor: "You join another person's purchase. The app does not charge: agree on the share between you."
    },
    prompt: {
      title: "Did you buy {{title}}?", titleUnits: "Did you buy {{units}} × {{title}}?", body: "Tell us so we reserve it and nobody else gives it. Your answer stays on this device until you reserve it.", reminder: "We will remind you only once.",
      yes: "Yes, I bought it", later: "Not yet", no: "No", yesCoordinator: "Thanks. Your reservation is still active.", dismissed: "Done. We will not ask again.",
      bodyClosed: "The list is closed and gifts can no longer be reserved, so we cannot record your purchase here. If you already bought it, tell your hosts so nobody repeats it.", ack: "Got it", ackFor: "Got it: {{title}}", yesClosed: "Thanks for letting us know. The list is closed, so we cannot record your purchase. If you already bought it, let your hosts know.", laterDone: "We will remind you once when you open the list.",
      yesFor: "Yes, I bought it: {{title}}", laterFor: "I have not bought {{title}} yet", noFor: "I did not buy {{title}}"
    },
    reserve: "Reserve", reserveFor: "Reserve {{title}}", viaPartner: "See it at the store", partnerNote: "A DOne partner offers it. Opening the link takes you out of DOne.", reservedBy: "Reserved by {{name}}",
    form: { title: "Reserve “{{title}}”", lead: "If you like, leave your name and a message for your hosts. Both are optional.", name: "Your name (optional)", nameHelp: "Your hosts see it next to your reservation.", message: "Message (optional)", messageHelp: "Up to 500 characters.", submit: "Confirm reservation", submitting: "Reserving…", cancel: "Not now", showName: "Show my name to the other guests", showNameHelp: "Only if you typed your name above. Your phone and e-mail are never shown.", coordinatorNote: "You will be the one who coordinates the purchase of the whole gift." },
    done: { confirmedTitle: "Gift reserved", confirmedBody: "“{{title}}” is yours. Your hosts will see it on their list in a moment.", pendingTitle: "Reservation sent", pendingBody: "Your hosts approve each reservation. Meanwhile, nobody else can reserve “{{title}}”." },
    taken: { title: "Someone got there first", body: "Someone else already reserved “{{title}}”. It happens. Here are other options.", alternatives: "Other available gifts", none: "There are no available gifts left. Thank you for wanting to join them." },
    empty: { title: "No gifts yet", body: "Your hosts have not added any yet. Come back in a few days." },
    /** R8a · gifts button on the invitation, driven by `GET /gifts/public/celebrations/{slug}/gifts/summary` (OPEN | EMPTY | CLOSED). */
    cta: { open: "View gifts", empty: "Gift list (coming soon)", closed: "View gifts" },
    error: {
      expiredTitle: "Your link no longer works", expiredBody: "Ask whoever invited you for a new one.",
      otherTitle: "This link is for another celebration", otherBody: "Open the link you were sent for this celebration. If you cannot find it, ask whoever invited you for a new one.",
      forbiddenTitle: "This link cannot reserve gifts", forbiddenBody: "Ask whoever invited you for a new link.",
      busyTitle: "It is busy right now", busyBody: "Wait a few seconds and try again.", busyMinutes: "You can open the list again in about {{minutes}} min. If it is urgent, write to whoever invited you.",
      unavailableTitle: "We could not load the gifts", unavailableBody: "Nothing was lost. Try again.",
      offlineTitle: "No connection right now", offlineBody: "Check your internet and try again.", retry: "Try again",
      notFoundTitle: "We could not find this celebration", notFoundBody: "The link may be incomplete, or it may not be published yet."
    },
    /** R8a (REG-01) · list closed by hand: say so and offer no reservation. */
    closed: { title: "The gift list is closed", body: "Your hosts closed it: gifts can no longer be reserved.", keepsMine: "What you already reserved stays reserved. You can still cancel it." },
    /** D-3 · the guest cancels their own reservation (app). */
    mine: { label: "Your reservation", pendingLabel: "Your reservation, waiting for approval", cancel: "Cancel my reservation", cancelFor: "Cancel my reservation of {{title}}", confirmTitle: "Cancel your reservation?", confirmBody: "\"{{title}}\" becomes available to the other guests again. If you change your mind, you can reserve it again while it is still free.", confirm: "Yes, cancel the reservation", keep: "No, keep it", confirmBodyClosed: "The list is closed: if you cancel your reservation of \"{{title}}\", you will not be able to reserve it again while it stays closed.", cancelling: "Cancelling…", done: "You cancelled your reservation of \"{{title}}\". The gift is back on the list.", notActive: "This reservation was no longer active. We refreshed the list.", error: "We could not cancel the reservation. Try again: it will not be cancelled twice.", expired: "Your link no longer works. Ask whoever invited you for a new one.", offline: "No connection right now. Your reservation is unchanged; try again when you are back online.", released: "Your hosts released \"{{title}}\". You can choose another gift." },
    reserveError: {
      closed: "The list is closed: gifts can no longer be reserved.",
      limit: "You reached the most gifts one person can reserve. If your hosts reject one of your reservations, you can pick another.",
      expired: "Your link no longer works. Ask whoever invited you for a new one.", forbidden: "This link cannot reserve gifts. Ask whoever invited you for a new one.", notFound: "This link is for another celebration. Open the one you were sent for this one.",
      busy: "There were a lot of requests in a row. Wait a moment and try again.", busyWait: "There were a lot of requests in a row. Wait {{seconds}} s and try again.", busyMinutes: "There were a lot of requests. You can try again in about {{minutes}} min. Your message is still here.",
      validation: "The name or the message is too long. Shorten it and try again.", offline: "No connection right now. Your message is still here; try again when your internet is back.", generic: "We could not reserve the gift. Try again.",
      units_one: "Only {{count}} unit is left. Pick 1 and try again.", units_other: "Only {{count}} units are left. Pick a smaller number and try again.", unitsNone: "No units of this gift are left. We refreshed the list.", already: "You already hold a reservation for this gift. Cancel it first if you want to change it.",
      retryHint: "You can tap “Confirm reservation” again: it will not be reserved twice.", nameTooLong: "The name accepts up to {{max}} characters.", messageTooLong: "The message accepts up to {{max}} characters."
    }
  },
  host: {
    title: "Gifts", intro: "What you add here your guests see and reserve with one tap.", nav: "Gifts",
    figures: { gifts: "Gifts", available: "Available", reserved: "Reserved", review: "To review" }, list: {
      emptyTitle: "Your list starts with one gift", emptyBody: "Pick products from our partners or link one from your favorite store. Guests reserve it, so nobody gives the same thing twice.",
      add: "Add a gift", fromPartner: "From a partner", external: "From a store", reservedBy: "Reserved by {{name}}",
      more: "More options", pending: "Reservations to review: {{count}}", pendingBody: "Your guests are waiting for your answer.", pendingAction: "Review reservations",
      unavailableNote: "Your guests no longer see it: this gift is no longer available in the catalog."
    },
    unavailable: { title: "Unavailable ({{count}})", body: "These gifts can no longer be given and your guests do not see them. They are not counted in your list total." },
    status: { AVAILABLE: "Available", PROPOSED: "To review", PENDING_REVIEW: "Reservation to review", COMMITTED: "Reserved", REJECTED: "Rejected", UNAVAILABLE: "Unavailable" },
    visibility: { title: "Who sees who reserved", intro: "You decide whether names show in your dashboard and in your guests' list.", host: "Show the name in my dashboard", hostHelp: "If you turn it off, you see reservations without a name.", guests: "Show the name to other guests", guestsHelp: "Off: guests only see that the gift is already reserved.", saved: "Preference saved. It applies from now on." },
    approveProposal: "Approve proposal", approvingProposal: "Approving…",
    rejectProposal: "Reject proposal", rejectingProposal: "Rejecting…", proposalRejected: "Proposal rejected: {{title}}.", rejectConfirm: { title: "Reject this proposal?", body: "“{{title}}” will not show to your guests. You cannot undo this from here." },
    /** D-3 · the host releases a reserved gift. */
    release: { action: "Release gift", confirmTitle: "Release this gift?", confirmBody: "The reservation of \"{{title}}\" is cancelled and the gift becomes available to your guests again. Whoever reserved it will see their reservation as cancelled.", confirm: "Yes, release it", keep: "No, keep the reservation", done: "You released \"{{title}}\". It is available again.", confirmBodyUnavailable: "The reservation of \"{{title}}\" is cancelled. The gift stays unavailable: your guests do not see it.", doneUnavailable: "You released \"{{title}}\". It is still unavailable: your guests do not see it." },
    inbox: { title: "Reservations to review", intro: "Your guests want these gifts. You decide.", emptyTitle: "There are no pending reservations", emptyBody: "When a guest reserves a gift that needs your approval, you will see it here.", emptyAction: "Back to my list", signedAs: "Signed as: {{name}}", group: "Group: {{group}}", requester: "Requested by: {{name}}", hidden: "Name hidden by your setting", hiddenHelp: "You can show names again in My list, \"More options\".", anonymous: "A guest", approve: "Approve", reject: "Reject", approved: "Reservation approved.", rejected: "Reservation rejected.", stale: "This reservation was no longer pending. We refreshed the list.", gift: "Gift: {{title}}", requestedAt: "Requested on {{date}}" },
    add: {
      title: "Add a gift", intro: "Choose where the gift comes from. Partners come first.", originLabel: "Where does the gift come from?",
      origin: { catalog: "From the catalog", store: "From a store" },
      hint: { catalog: "Products from verified providers, ready to add.", store: "A link from any store. First we show you partner options." },
      seeList: "See my list"
    },
    catalog: { photo: "Photo of {{title}}", alreadyListed: "Already on your list.", prompt: "Type what you are looking for, like a cake or a dinner set.", search: "Search", searchLabel: "Search the catalog", searchPlaceholder: "Cake, tableware, flowers…", add: "Add to my list", adding: "Adding…", added: "Added: {{title}}", none: "We found no products for that search or category. Try another word or pick \"All\".", empty: "There are no products from verified providers yet. When a provider publishes one, you will see it here.", error: "We could not load the catalog products.", offline: "No connection right now: we could not load the catalog products. Check your internet and try again.", categoriesOffline: "No connection right now: we could not load the categories. Check your internet; you can still search.", category: "Category", allCategories: "All", categoriesError: "We could not load the categories; you can still search.", disclaimer: "DOne connects you with the provider; it does not sell or guarantee the product. Agree price, delivery and timing with them.", unavailable: "Product unavailable", unavailableBody: "That product is no longer in the catalog. Pick another.", priceFrom: "From {{price}}" },
    store: {
      ruleTitle: "Partners first", ruleOn: "Before you add a store gift we show you similar partner products. If none fits, you add it anyway.", ruleOff: "You can add gifts from any store with no steps before.", ruleChange: "Change in Control modes",
      modeAUTO_ACCEPT: "Your store gifts show on the list right away.", modeRESTRICTED: "Your store gifts wait for review: you approve them from My list.",
      name: "Gift name", url: "Store link", price: "Price ({{currency}})", priceHelp: "Numbers only, for example 150.50", submit: "Add gift", submitAnyway: "Add anyway",
      suggestionsTitle: "Before you go on, look at these partner options", suggestionsBody: "Your list puts partners first. Pick one of these or add your gift anyway.", useSuggestion: "Add this one",
      added: "Store gift added.", proposed: "Gift proposed: it waits for review in My list.", invalidUrl: "Enter a valid link starting with http:// or https://.", titleTooLong: "The name can be up to {{max}} characters.", invalidMoney: "Enter a valid price, for example 150.50.", required: "Fill in the name, the link and the price."
    },
    wizard: giftsWizardEnUS,
    errors: { codes: { notAvailable: "Someone got there first: that gift is no longer available. We refreshed the list.", alreadyAnswered: "That gift already has another answer and the list changed. We refreshed it.", reservationAnswered: "That reservation already has an answer. We refreshed the list.", requestReused: "That request was already sent with other details. Start again from the list.", validation: "Check the gift details and try again.", invalidUrl: "That link is not valid. It must start with http:// or https://.", invalidMoney: "That price is not valid. Use numbers only, for example 150.50.", invalidTitle: "Check the gift name: it cannot be empty or too long.", invalidCurrency: "The gift currency is not valid for this celebration.", giftGone: "That gift is no longer on the list. We refreshed it.", listMissing: "The gift list is unavailable. Please try again.", reservationNotActive: "That reservation was no longer active. We refreshed the list.", reservationGone: "We could not find that reservation. We refreshed the list.", forbidden: "Only the hosts or organizers of this celebration can manage gifts.", notProduct: "That is a service, not a product, so it cannot be a gift. Choose a product from the catalog." }, forbidden: "Only the hosts or organizers of this celebration can manage gifts.", conflict: "This list changed while you were editing. We refreshed it.", validation: "Check the gift data.", retry: "Try again" }
  }
};
