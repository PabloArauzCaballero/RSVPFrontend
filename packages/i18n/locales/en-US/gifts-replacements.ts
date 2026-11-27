import type { DeepStrings } from "../types.js";
import type { giftsReplacementsEsBO } from "../es-BO/gifts-replacements.js";

/** R7 · unavailable gift and replacements (plan 5.7 and 5.10). Hangs from `gifts.host.replacements` (host and organizer). Same keys as es-BO. */
export const giftsReplacementsEnUS: DeepStrings<typeof giftsReplacementsEsBO> = {
  reason: {
    HIDDEN_BY_ADMIN: "DOne hid this product.", PROVIDER_SUSPENDED: "The provider is suspended.", PROVIDER_REJECTED: "The provider is no longer on DOne.",
    PROVIDER_NOT_VERIFIED: "The provider is no longer verified.", UNPUBLISHED: "The provider unpublished it.", INCOMPLETE: "The product listing became incomplete.",
    OUT_OF_STOCK: "It is out of stock.", VARIANT_OUT_OF_STOCK: "The version you chose is out of stock.", LISTING_NOT_PRODUCT: "It stopped being a catalog product.",
    unknown: "The provider no longer offers it."
  },
  open: "See replacements of the same idea", openLabel: "See replacements of the same idea: {{title}}", close: "Hide replacements", closeLabel: "Hide replacements: {{title}}",
  title: "Replacements of the same idea", intro: "These are products from verified providers for the same gift idea. Swapping takes one tap: the new one goes on your list with the same quantity.",
  loading: "Looking for replacements…",
  empty: "There are no replacements for this idea right now.", emptyHint: "When a provider publishes one you will see it here. You can also pick another product from the catalog.", emptyAction: "Browse the catalog",
  noIdea: "This gift did not come from the assistant, so it has no idea to look replacements up by. You can pick another product from the catalog.",
  swap: "Swap for this one", swapLabel: "Swap for this one: {{new}} (replaces {{old}})", swapping: "Swapping…",
  done: "You swapped “{{old}}” for “{{new}}”. It is on your list now.",
  price: "Current price: {{price}}",
  error: {
    forbidden: "Only the hosts or organizers of this celebration can change the gifts.",
    notFound: "That gift is no longer on your list. We refreshed the list.",
    unavailable: "The catalog is not answering right now. Nothing was changed.",
    offline: "No connection right now. Nothing was changed; try again when you are back online.",
    unknown: "We could not look up the replacements. Nothing was changed.",
    retry: "Try again",
    swap: {
      CATALOG_PRODUCT_UNAVAILABLE: "That product just stopped being available. Pick another.",
      GIFT_LISTING_NOT_ELIGIBLE: "That product no longer meets what a gift needs. Pick another.",
      GIFT_LISTING_NOT_PRODUCT: "That is a service, not a product. Pick another.",
      DUPLICATE_GIFT_IDEA: "That idea already has another gift on your list. We refreshed the list.",
      INVALID_QUANTITY: "This gift's quantity is not valid for the new product.",
      INVALID_GIFT_IDEA: "That gift idea no longer exists.",
      maybeApplied: "We do not know whether the swap was applied. Tap the same product again to confirm it: it will not be added twice.",
      unknown: "We could not swap the gift. Nothing was changed: you can try again."
    }
  }
};
