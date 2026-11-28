import type { DeepStrings } from "../types.js";
import type { giftsWizardEsBO } from "../es-BO/gifts-wizard.js";
/** R4 · the host and planner «Add a gift» assistant (D-10 §5.6). Hangs from `gifts.host.wizard`. Prices in Bs. */
export const giftsWizardEnUS: DeepStrings<typeof giftsWizardEsBO> = {
  progress: "Your steps", step: "Step {{n}}", back: "Back", next: "Next",
  stepName: { ideas: "Ideas", products: "Products", summary: "Summary" },
  ideas: {
    title: "Pick gift ideas", intro: "Tick the ideas you want on your list. Then you choose a product from a verified provider for each one.",
    recommended: "Recommended for your celebration ({{event}}) in {{city}}", recommendedNoCity: "Recommended for your celebration ({{event}})", allIdeas: "Gift ideas",
    cityLabel: "Delivery city", cityAny: "All cities", cityHelp: "We show first the products that deliver to that city.",
    count_one: "{{count}} product · {{range}}", count_other: "{{count}} products · {{range}}", range: "{{min}} – {{max}}", rangeSingle: "{{price}}",
    alreadyListed: "Already on your list", choose: "Pick the idea {{name}}", chooseListed: "{{name}}: already on your list",
    selected_one: "{{count}} idea picked", selected_other: "{{count}} ideas picked", continue: "Choose products", needOne: "Tick at least one idea to continue.",
    emptyTitle: "No products for your celebration yet", emptyBody: "When a verified provider publishes complete products, their ideas will show up here. Meanwhile you can add a gift from a store.", emptyStore: "Add from a store",
    allListed: "You already have a gift for every available idea. You can see them on your list.",
    filterRange: "Showing ideas with prices {{range}}", clearFilter: "Clear filter", filterNone: "No idea has products in that price range.",
    loading: "Loading gift ideas…", error: "We could not load the gift ideas.", offline: "No connection right now. Check your internet and try again."
  },
  products: {
    title: "Choose one product per idea", intro: "One product per idea. To change it, tap another one.",
    ideaGroup: "Products for {{idea}}", optionsFor: "Options for {{title}}", chosen: "Chosen", choose: "Choose {{title}}, {{price}}", shown: "Showing {{shown}} of {{total}} products, most recommended first.",
    provider: "Verified provider: {{name}}", sponsored: "Sponsored", photo: "Photo of {{title}}", noPhoto: "No photo",
    deliveryHere: "Delivers to your city", deliveryOther: "Delivers to another city", leadSameDay: "Same-day delivery", lead_one: "Delivery in {{count}} day", lead_other: "Delivery in {{count}} days",
    shippingFree: "Free shipping", shipping: "Shipping {{price}}",
    stock: { AVAILABLE: "In stock", MADE_TO_ORDER: "Made to order", OUT_OF_STOCK: "Sold out" },
    version: "Version", versionOption: "{{label}} · {{price}}", versionOut: "{{label}} · sold out",
    quantity: "Quantity", quantityLess: "Less", quantityMore: "More", quantityValue: "Quantity: {{count}}", quantityHelp: "Between 1 and {{max}}.",
    group: "Can be given by several people", groupHelp: "Your guests can chip in to give it. We suggest turning it on above {{price}}.", groupSuggested: "Suggested by the price",
    emptyIdea: "This idea no longer has products in stock. Untick it or pick another.", missing: "Choose a product for {{idea}} or remove the idea.",
    currencyNote: "Provider prices are in bolivianos (Bs)."
  },
  summary: {
    title: "Review your list", intro: "These gifts are added together: if one fails, none is added.", disclaimer: "DOne connects you with the provider; it does not sell or guarantee the product. Agree price, delivery and timing with them.",
    line: "{{idea}}: {{title}}", lineVersion: "{{idea}}: {{title}} ({{version}})", lineQuantity: "{{count}} × {{price}}", group: "Can be given by several people", total: "Total of the new gifts: {{price}}",
    change: "Change", currencyNote: "Provider prices are in bolivianos (Bs).",
    balance: {
      title: "Price balance", intro: "This is how the gifts on your list, the ones you already have and the new ones, are spread by price.",
      b1: "Up to {{max}}", b2: "From {{min}} to {{max}}", b3: "From {{min}} to {{max}}", b4: "Over {{min}}",
      units_one: "{{count}} gift", units_other: "{{count}} gifts", guests_one: "{{count}} confirmed or pending guest", guests_other: "{{count}} confirmed or pending guests",
      guestsCount_one: "{{count}} guest", guestsCount_other: "{{count}} guests",
      needAffordable_one: "You have {{have}} gift up to {{max}} and {{guests}}: add affordable ideas.", needAffordable_other: "You have {{have}} gifts up to {{max}} and {{guests}}: add affordable ideas.",
      needAffordableNone: "You have no gifts up to {{max}} and {{guests}}: add affordable ideas.",
      seeCheap: "See ideas up to {{max}}", ok: "Your list has gifts for different budgets.", noGuests: "Once you invite people, we compare your list with them.", loadingGuests: "Working it out with your guests…", guestsError: "We could not read your guests; the balance is shown without comparing."
    },
    delivery: { label: "Delivery notes (optional)", help: "For example: “Deliver to the front desk, in the afternoon”. Your guests will see them when this feature is available.", warning: "Do not write the exact address.", control: "Remove the control characters: only text is allowed.", counter: "{{count}} of {{max}} characters", tooLong_one: "Remove {{count}} character: the limit is {{max}}.", tooLong_other: "Remove {{count}} characters: the limit is {{max}}." },
    submit_one: "Add {{count}} gift", submit_other: "Add {{count}} gifts", submitting: "Adding…",
    doneTitle_one: "Done: we added {{count}} gift", doneTitle_other: "Done: we added {{count}} gifts", doneBody: "They are on your list and your guests will see them.", seeList: "See my list", addMore: "Add more"
  },
  errors: {
    codes: {
      GIFT_LISTING_NOT_ELIGIBLE: "This product can no longer be recommended: the provider changed or removed it. Pick another one.",
      CATALOG_PRODUCT_UNAVAILABLE: "This product is no longer in the catalog. Pick another one.",
      GIFT_LISTING_NOT_PRODUCT: "That is a service, not a product: it cannot be added as a gift. Pick a product.",
      INVALID_QUANTITY: "That quantity is not valid. Pick between 1 and {{max}}.",
      INVALID_GIFT_IDEA: "That idea does not match this product. Pick another product or change the idea.",
      INVALID_VARIANT: "That version no longer exists. Pick another one.",
      DUPLICATE_GIFT_IDEA: "That idea already has a gift on your list. Remove one of the two."
    },
    entryFallback: "We could not add this gift. Pick another one.",
    failedTitle_one: "No gift was added: {{count}} needs a change", failedTitle_other: "No gift was added: {{count}} need a change",
    failedHelp: "Fix what is marked and tap “Add” again. The rest is kept.", fix: "Fix",
    invalidNotes: "Check the delivery notes: they allow up to {{max}} characters and must not carry the exact address.",
    retryHint: "You can tap “Add” again: nothing is added twice.", offline: "No connection right now. Your selection is still here; retry when the internet is back.",
    notesUnsavedTitle_one: "We added {{count}} gift, but could not save your notes", notesUnsavedTitle_other: "We added {{count}} gifts, but could not save your notes",
    notesSaving: "Saving…", notesEdit: "Edit delivery notes", notesSave: "Save notes",
    notesUnsaved: "Nothing was lost: your gifts are already on your list. Try again to save the delivery notes.", generic: "We could not complete that. Your selection is still here; tap “Add” again.",
    listUnreadable: "We could not read your gift list. Without it we cannot tell what you already added.", listRetry: "Try again"
  },
  list: { quantity: "Quantity: {{count}}", group: "Can be given by several people", delivery: "Delivery notes: {{notes}}" }
};
