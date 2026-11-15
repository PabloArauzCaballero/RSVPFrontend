import type { DeepStrings } from "../types.js";
import type { giftsEsBO } from "../es-BO/gifts.js";

/** Public gift list (F22) and host gift management (F23). */
export const giftsEnUS: DeepStrings<typeof giftsEsBO> = {
  meta: { title: "Gifts · {{name}}", description: "Choose a gift for {{name}}. Products from our partners come first." },
  title: "Gift list",
  intro: "Pick what to give. Reserving a gift keeps someone else from giving the same one.",
  back: "Back to the celebration",
  loading: "Loading gifts…",
  filters: { label: "Filter gifts", maxPrice: "Maximum price", source: "Source", sourceAll: "All", sourcePartner: "From our partners", sourceOther: "Other stores", onlyAvailable: "Available only", clear: "Clear filters", count: "{{count}} gifts" },
  group: { partner: "Products from our partners", other: "More ideas from the hosts" },
  status: { AVAILABLE: "Available", PENDING_REVIEW: "Awaiting approval", COMMITTED: "Already reserved" },
  price: "Price",
  card: { reservedBy: "Reserved by {{name}}", open: "See details of {{title}}", reserve: "Reserve", reserveFor: "Reserve {{title}}", viaPartner: "See at the partner's store", viaOther: "See at the store" },
  detail: { title: "{{title}} · Gifts", back: "Back to the list", notFound: "This gift is no longer on the list.", partnerNote: "A DOne partner offers this product. Opening the link takes you out of DOne." },
  reserve: { title: "Reserve this gift", intro: "We ask for your name so the hosts know who is giving it.", name: "Your name", nameHelp: "Optional. The hosts will see this name next to your reservation.", message: "Message for the hosts", messageHelp: "Optional, up to 500 characters.", submit: "Reserve gift", submitting: "Reserving…", cancel: "Cancel", close: "Close" },
  outcome: {
    confirmedTitle: "Gift reserved!", confirmedBody: "You reserved “{{title}}”. The hosts know you are giving it.",
    pendingTitle: "Request sent", pendingBody: "The hosts approve each reservation. We will let you know when “{{title}}” is confirmed; meanwhile nobody else can reserve it.",
    takenTitle: "Someone got there first", takenBody: "“{{title}}” was just taken by someone else. No worries: the list is up to date and here are other options.",
    takenAlternatives: "Other available gifts",
    takenNone: "No gifts are left on this list. Thank you for wanting to celebrate with them.",
    seeList: "See the gift list", reserveAnother: "Choose another gift"
  },
  error: {
    otherTitle: "This link belongs to another celebration", otherBody: "The link you opened does not match this gift list. Open the link the hosts of this celebration sent you.",
    busyTitle: "It is busy right now", busyBody: "We received too many requests in a row. Wait a few seconds and try again.",
    limit: "You already hold the maximum number of reserved gifts. Wait for the hosts to confirm one before reserving another.",
    needLinkTitle: "Open your invitation link", needLinkBody: "To see and reserve gifts we use the personal link of your invitation; you do not need an account. Open it from the message the hosts sent you.",
    needLinkAction: "Go to my invitation",
    forbiddenTitle: "You cannot reserve gifts here", forbiddenBody: "Your invitation has no permission for this list. Ask the hosts for a new link.",
    expiredTitle: "Your link expired", expiredBody: "The personal link is no longer valid. Ask the hosts to send you a new one.",
    unavailableTitle: "We could not load the gifts", unavailableBody: "The gift service is not responding right now. Nothing was lost: try again.",
    offline: "No connection. Check your internet and try again; your message is still here.", nameTooLong: "The name can be up to {{max}} characters.", messageTooLong: "The message can be up to {{max}} characters.", busyWait: "We received too many requests in a row. Wait {{seconds}} seconds and try again.", retryHint: "You can press Reserve again: it will not reserve twice.",
    retry: "Try again", validation: "Check the data: the name or the message is too long.", generic: "We could not reserve the gift. Try again."
  },
  empty: { title: "No gifts yet", body: "The hosts have not added gifts yet. Come back soon.", filtered: "No gift matches these filters." },
  notFound: { title: "We could not find this celebration", body: "The page does not exist or the hosts have not published it yet." },
  /** Guest gift list in the app (Persuade). seo-web keeps using the keys above. */
  guest: {
    title: "Gifts", intro: "Reserve a gift in one tap and nobody else will give the same one.", rule: "Each person can hold a limited number of reserved gifts at a time.", backToRsvp: "Back to my answer", loading: "Opening the list…",
    groupPartner: "From our partners", groupOther: "Ideas from your hosts",
    status: { AVAILABLE: "Available", PENDING_REVIEW: "Waiting for approval", COMMITTED: "Reserved" },
    reserve: "Reserve", reserveFor: "Reserve {{title}}", viaPartner: "See it at the partner shop", partnerNote: "A DOne partner offers it. Opening the link takes you out of DOne.", reservedBy: "Reserved by {{name}}",
    form: { title: "Reserve “{{title}}”", lead: "If you like, leave your name and a message for your hosts. Both are optional.", name: "Your name (optional)", nameHelp: "Your hosts see it next to your reservation.", message: "Message (optional)", messageHelp: "Up to 500 characters.", submit: "Confirm reservation", submitting: "Reserving…", cancel: "Not now" },
    done: { confirmedTitle: "Gift reserved", confirmedBody: "“{{title}}” is yours. Your hosts will see it on their list in a moment.", pendingTitle: "Reservation sent", pendingBody: "Your hosts approve each reservation. Meanwhile, nobody else can reserve “{{title}}”." },
    taken: { title: "Someone got there first", body: "Someone else already reserved “{{title}}”. It happens. Here are other options.", alternatives: "Other available gifts", none: "There are no available gifts left. Thank you for wanting to join them." },
    empty: { title: "No gifts yet", body: "Your hosts have not added any yet. Come back in a few days." },
    error: {
      expiredTitle: "Your link no longer works", expiredBody: "Ask whoever invited you for a new one.",
      otherTitle: "This link is for another celebration", otherBody: "Open the link you were sent for this celebration. If you cannot find it, ask whoever invited you for a new one.",
      forbiddenTitle: "This link cannot reserve gifts", forbiddenBody: "Ask whoever invited you for a new link.",
      busyTitle: "It is busy right now", busyBody: "Wait a few seconds and try again.", busyMinutes: "You can open the list again in about {{minutes}} min. If it is urgent, write to whoever invited you.",
      unavailableTitle: "We could not load the gifts", unavailableBody: "Nothing was lost. Try again.",
      offlineTitle: "No connection right now", offlineBody: "Check your internet and try again.", retry: "Try again",
      notFoundTitle: "We could not find this celebration", notFoundBody: "The link may be incomplete, or it may not be published yet."
    },
    reserveError: {
      limit: "You reached the most gifts one person can reserve. If your hosts reject one of your reservations, you can pick another.",
      expired: "Your link no longer works. Ask whoever invited you for a new one.", forbidden: "This link cannot reserve gifts. Ask whoever invited you for a new one.", notFound: "This link is for another celebration. Open the one you were sent for this one.",
      busy: "There were a lot of requests in a row. Wait a moment and try again.", busyWait: "There were a lot of requests in a row. Wait {{seconds}} s and try again.", busyMinutes: "There were a lot of requests. You can try again in about {{minutes}} min. Your message is still here.",
      validation: "The name or the message is too long. Shorten it and try again.", offline: "No connection right now. Your message is still here; try again when your internet is back.", generic: "We could not reserve the gift. Try again.",
      retryHint: "You can tap “Confirm reservation” again: it will not be reserved twice.", nameTooLong: "The name accepts up to {{max}} characters.", messageTooLong: "The message accepts up to {{max}} characters."
    }
  },
  host: {
    title: "Gifts", intro: "What you add here your guests see and reserve with one tap.", nav: "Gifts",
    figures: { gifts: "Gifts", available: "Available", reserved: "Reserved", review: "To review" }, list: {
      emptyTitle: "Your list starts with one gift", emptyBody: "Pick products from our partners or link one from your favorite store. Guests reserve it, so nobody gives the same thing twice.",
      add: "Add a gift", fromPartner: "From a partner", external: "From a store", reservedBy: "Reserved by {{name}}",
      more: "More options", pending: "Reservations to review: {{count}}", pendingBody: "Your guests are waiting for your answer.", pendingAction: "Review reservations"
    },
    status: { AVAILABLE: "Available", PROPOSED: "To review", PENDING_REVIEW: "Reservation to review", COMMITTED: "Reserved", REJECTED: "Rejected" },
    visibility: { title: "Who sees who reserved", intro: "You decide whether names show in your dashboard and in your guests' list.", host: "Show the name in my dashboard", hostHelp: "If you turn it off, you see reservations without a name.", guests: "Show the name to other guests", guestsHelp: "Off: guests only see that the gift is already reserved.", saved: "Preference saved. It applies from now on." },
    approveProposal: "Approve proposal", approvingProposal: "Approving…",
    rejectProposal: "Reject proposal", rejectingProposal: "Rejecting…", proposalRejected: "Proposal rejected: {{title}}.", rejectConfirm: { title: "Reject this proposal?", body: "“{{title}}” will not show to your guests. You cannot undo this from here." },
    inbox: { title: "Reservations to review", intro: "Your guests want these gifts. You decide.", emptyTitle: "There are no pending reservations", emptyBody: "When a guest reserves a gift that needs your approval, you will see it here.", emptyAction: "Back to my list", signedAs: "Signed as: {{name}}", group: "Group: {{group}}", requester: "Requested by: {{name}}", hidden: "Name hidden by your setting", hiddenHelp: "You can show names again in My list, \"More options\".", anonymous: "A guest", approve: "Approve", reject: "Reject", approved: "Reservation approved.", rejected: "Reservation rejected.", stale: "This reservation was no longer pending. We refreshed the list.", gift: "Gift: {{title}}", requestedAt: "Requested on {{date}}" },
    add: {
      title: "Add a gift", intro: "Choose where the gift comes from. Partners come first.", originLabel: "Where does the gift come from?",
      origin: { catalog: "From the catalog", provider: "From a provider", store: "From a store" },
      hint: { catalog: "Products from verified providers, ready to add.", provider: "Browse providers by category and city, and add what they offer.", store: "A link from any store. First we show you partner options." },
      seeList: "See my list"
    },
    providers: {
      category: "Category", allCategories: "All", city: "City", cityHelp: "Optional. For example: la-paz or santa-cruz.", maxPrice: "Maximum price (Bs.)", search: "Search providers", moreFilters: "More filters",
      by: "By {{name}}", leadTime: "Lead time: {{days}} days", coverage: "Coverage: {{zones}}", transport: "Delivery from {{price}}", address: "Address: {{address}}", hours: "Hours: {{hours}}", details: "See details",
      disclaimer: "DOne connects you with the provider; it does not provide or guarantee the service. Agree price, delivery and timing with them.", none: "No provider matches these filters. Try another category.", count: "{{count}} results", page: "Page {{page}} of {{pages}}"
    },
    catalog: { alreadyListed: "Already on your list.", prompt: "Type what you are looking for, like a cake or a dinner set.", search: "Search", searchLabel: "Search the catalog", searchPlaceholder: "Cake, tableware, flowers…", add: "Add to my list", adding: "Adding…", added: "Added: {{title}}", none: "We found no products for that search. Try another word.", fallbackNote: "Product search is not available yet; we show the public provider catalog.", unavailable: "Product unavailable", unavailableBody: "That product is no longer in the catalog. Pick another.", priceFrom: "From {{price}}" },
    store: {
      ruleTitle: "Partners first", ruleOn: "Before you add a store gift we show you similar partner products. If none fits, you add it anyway.", ruleOff: "You can add gifts from any store with no steps before.", ruleChange: "Change in Control modes",
      modeAUTO_ACCEPT: "Your store gifts show on the list right away.", modeRESTRICTED: "Your store gifts wait for review: you approve them from My list.",
      name: "Gift name", url: "Store link", price: "Price ({{currency}})", priceHelp: "Numbers only, for example 150.50", submit: "Add gift", submitAnyway: "Add anyway",
      suggestionsTitle: "Before you go on, look at these partner options", suggestionsBody: "Your list puts partners first. Pick one of these or add your gift anyway.", useSuggestion: "Add this one",
      added: "Store gift added.", proposed: "Gift proposed: it waits for review in My list.", invalidUrl: "Enter a valid link starting with http:// or https://.", titleTooLong: "The name can be up to {{max}} characters.", invalidMoney: "Enter a valid price, for example 150.50.", required: "Fill in the name, the link and the price."
    },
    errors: { codes: { notAvailable: "Someone got there first: that gift is no longer available. We refreshed the list.", alreadyAnswered: "That gift already has another answer and the list changed. We refreshed it.", reservationAnswered: "That reservation already has an answer. We refreshed the list.", requestReused: "That request was already sent with other details. Start again from the list.", validation: "Check the gift details and try again.", invalidUrl: "That link is not valid. It must start with http:// or https://.", invalidMoney: "That price is not valid. Use numbers only, for example 150.50.", invalidTitle: "Check the gift name: it cannot be empty or too long.", invalidCurrency: "The gift currency is not valid for this celebration.", giftGone: "That gift is no longer on the list. We refreshed it.", listMissing: "The gift list is unavailable. Please try again.", reservationGone: "We could not find that reservation. We refreshed the list.", forbidden: "Only the hosts of this celebration can manage gifts." }, forbidden: "Only the hosts of this celebration can manage gifts.", conflict: "This list changed while you were editing. We refreshed it.", validation: "Check the gift data.", retry: "Try again" }
  }
};
