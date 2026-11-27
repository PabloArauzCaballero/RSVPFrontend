import type { GiftListComponents } from "@rsvp/contracts";
/** Gift List (gift-list.openapi.json; vendored version in packages/contracts/backend.lock.json, 1.14.0). Money is integer minor units, never a float. */
export interface Money { readonly amountMinor: number; readonly currency: string }
export type GiftSource = "CATALOGED" | "EXTERNAL";
/**
 * `status` never says UNAVAILABLE (gift-list 1.14.0, R1, M-6): it keeps the value the gift had. That a gift can no longer be
 * given (its catalog listing is not a product) is `GiftItem.availability`, a field of its own. Both derive from the contract.
 */
export type GiftItemStatus = GiftListComponents["schemas"]["DevCompatGiftItemStatus"];
/** Gift availability (1.14.0, required on every v2 item). The host (MANAGE) receives UNAVAILABLE gifts; a guest never does. */
export type GiftAvailability = GiftListComponents["schemas"]["PagedGiftItemPage"]["items"][number]["availability"];
export type ReservationStatus = "PENDING_REVIEW" | "COMMITTED" | "REJECTED" | "CANCELLED";
export type CancellationReason = "RSVP_DECLINED" | "GUEST_CANCELLED" | "HOST_CANCELLED";
export interface GiftItem {
  readonly id: string; readonly listId: string; readonly celebrationId: string; readonly title: string; readonly description?: string | null;
  readonly price: Money; readonly source: GiftSource; readonly status: GiftItemStatus; /** Required by gift-list 1.14.0 (v2). A pre-1.14 payload without it is read as available (see `isGiftUnavailable`). */ readonly availability: GiftAvailability; readonly version: number;
  readonly productListingId?: string | null; readonly providerId?: string | null; readonly externalUrl?: string | null; readonly createdAt: string;
  /** Present only when the host lets this viewer see who reserved (gift-settings). */
  readonly reservedByName?: string;
}
export interface GiftItemList { readonly items: readonly GiftItem[]; readonly partnerPriorityEnabled: boolean; /** L4 (1.12.0): next page, null on the last one. */ readonly nextCursor?: string | null; /** R6a (1.16.0): signed lead context of a celebration member's read, otherwise null. Opaque bearer, ~5 min: append it as `ctx` to every `/r/{listingId}` link of this list, never to a link that is copied or shared. */ readonly leadContext?: string | null }
export interface GiftReservation {
  readonly id: string; readonly itemId: string; readonly celebrationId: string; readonly guestId?: string | null; readonly guestDisplayName?: string | null;
  readonly message?: string | null; readonly status: ReservationStatus; readonly requestedAt: string; readonly resolvedAt?: string | null; readonly resolvedBy?: string | null;
  /** True when the host chose not to see the requester: the name is null and the UI says so. */
  readonly requesterHidden?: boolean;
  readonly cancelledAt?: string;
  readonly cancelledFromStatus?: "PENDING_REVIEW" | "COMMITTED";
  /** RSVP_DECLINED: the guest said they will not attend. GUEST_CANCELLED: the guest withdrew it. HOST_CANCELLED: the host released the gift. */
  readonly cancellationReason?: CancellationReason;
}
export interface ReservationList { readonly items: readonly GiftReservation[]; /** L4 (1.12.0): next page, null on the last one. */ readonly nextCursor?: string | null }
export interface ReserveGiftInput { readonly guestDisplayName?: string | null; readonly message?: string | null }
export interface AddCatalogedGiftInput { readonly source: "CATALOGED"; readonly title: string; readonly description?: string | null; readonly price: Money; readonly productListingId: string }
export interface AddExternalGiftInput { readonly source: "EXTERNAL"; readonly title: string; readonly description?: string | null; readonly price: Money; readonly url: string; readonly partnerSuggestionsAcknowledged?: boolean }
export type AddGiftInput = AddCatalogedGiftInput | AddExternalGiftInput;
export interface PartnerSuggestion { readonly productListingId: string; readonly title: string }
export interface GiftSettings { readonly showRequesterToHost: boolean; readonly showRequesterToGuests: boolean; readonly version: number }
export type UpdateGiftSettingsInput = Pick<GiftSettings, "showRequesterToHost" | "showRequesterToGuests">;
