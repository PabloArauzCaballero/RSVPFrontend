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
    retry: "Try again", validation: "Check the data: the name or the message is too long.", generic: "We could not reserve the gift. Try again."
  },
  empty: { title: "No gifts yet", body: "The hosts have not added gifts yet. Come back soon.", filtered: "No gift matches these filters." },
  notFound: { title: "We could not find this celebration", body: "The page does not exist or the hosts have not published it yet." },
  host: {
    title: "Gifts", intro: "Build the list your guests will see. Partner products come first.", nav: "Gifts",
    list: { title: "Status of each gift", empty: "You have not added gifts yet.", emptyAction: "Add from the catalog", fromPartner: "From a partner", external: "External", reservedBy: "Reserved by {{name}}" },
    status: { AVAILABLE: "Available", PROPOSED: "Proposed, to review", PENDING_REVIEW: "Reservation pending", COMMITTED: "Committed", REJECTED: "Rejected" },
    visibility: { title: "Who sees who reserved", intro: "Choose whether the names of people who reserve show in your dashboard and in your guests' list.", host: "Show the name in my dashboard", hostHelp: "If you turn it off, you will see reservations without the name.", guests: "Show the name to other guests", guestsHelp: "Off by default: guests only see that the gift is reserved.", saved: "Preference saved. It applies from now on." },
    approveProposal: "Approve proposal", approvingProposal: "Approving…",
    inbox: { title: "Pending reservations", intro: "Approve or reject your guests' reservations.", empty: "There are no pending reservations.", requester: "Requested by: {{name}}", hidden: "Name hidden by your setting", hiddenHelp: "You can show names again under Gifts, \"Who sees who reserved\".", anonymous: "A guest", approve: "Approve", reject: "Reject", approved: "Reservation approved.", rejected: "Reservation rejected.", stale: "This reservation was no longer pending; we refreshed the list.", gift: "Gift: {{title}}", requestedAt: "Requested on {{date}}" },
    providers: {
      title: "Discover providers", intro: "Browse verified providers with their offer, coverage and opening hours. Add the product you like to your list.",
      category: "Category", allCategories: "All", city: "City", cityHelp: "Optional. For example: la-paz or santa-cruz.", maxPrice: "Maximum price (Bs.)", search: "Search providers",
      by: "By {{name}}", leadTime: "Lead time: {{days}} days", coverage: "Coverage: {{zones}}", transport: "Delivery from {{price}}", address: "Address: {{address}}", hours: "Hours: {{hours}}",
      disclaimer: "DOne connects you with the provider; it does not provide or guarantee the service. Agree price, delivery and timing with them.", none: "No provider matches these filters.", count: "{{count}} results", page: "Page {{page}} of {{pages}}"
    },
    catalog: { title: "Add from the catalog", intro: "Search products from verified providers and add them to your list.", search: "Search products", searchPlaceholder: "Cake, tableware, flowers…", add: "Add to the list", adding: "Adding…", added: "Added: {{title}}", none: "We found no products for that search.", fallbackNote: "Product search is not available yet; showing the public provider catalog.", unavailable: "Product unavailable", unavailableBody: "That product is no longer available in the catalog. Choose another.", priceFrom: "From {{price}}" },
    external: {
      title: "Add an external gift", intro: "A gift from another store has no DOne partner behind it. Before adding it, check whether a partner offers something similar.",
      modeLabel: "Who can add external gifts", modeAuto: "They are published right away", modeRestricted: "I review them before publishing", modeSaved: "Mode saved.",
      priorityLabel: "Show partners first", priorityHelp: "When on, we suggest partner products before allowing an external gift.",
      name: "Gift name", url: "Store link", price: "Price (Bs.)", priceHelp: "Numbers only, for example 150.50", submit: "Add external gift", submitAnyway: "Add anyway",
      suggestionsTitle: "Before you continue, look at these partner products", suggestionsBody: "Your list puts partner products first. You can add one of these or continue with your external gift.", useSuggestion: "Add this one",
      added: "External gift added.", proposed: "Gift proposed: it waits for your approval.", invalidUrl: "Enter a valid link starting with http:// or https://.", invalidMoney: "Enter a valid price, for example 150.50.", required: "Fill in the name, the link and the price."
    },
    errors: { forbidden: "Only the hosts of this celebration can manage gifts.", conflict: "This list changed while you were editing. We refreshed it.", validation: "Check the gift data.", retry: "Try again" }
  }
};
