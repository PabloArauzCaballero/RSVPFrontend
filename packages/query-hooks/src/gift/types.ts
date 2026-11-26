/** Gift List (gift-list.openapi.json; vendored version in packages/contracts/backend.lock.json, 1.17.0). Money is integer minor units, never a float. */
export interface Money { readonly amountMinor: number; readonly currency: string }
export type GiftSource = "CATALOGED" | "EXTERNAL";
/**
 * UNAVAILABLE (1.14.0, R1, M-6): the gift can no longer be given (its catalog listing is not a product). Guests never see it;
 * the host sees it marked. Written by hand, not derived: gift-list 1.14.0 declares UNAVAILABLE in GiftCatalogedItem and the
 * legacy schemas, but listGiftItems answers DevCompatGiftItem, whose DevCompatGiftItemStatus still omits it although the
 * service returns it. Derive it from the contract once that enum is fixed in the backend.
 */
export type GiftItemStatus = "AVAILABLE" | "PROPOSED" | "PENDING_REVIEW" | "COMMITTED" | "REJECTED" | "UNAVAILABLE";
export type ReservationStatus = "PENDING_REVIEW" | "COMMITTED" | "REJECTED" | "CANCELLED";
export type CancellationReason = "RSVP_DECLINED" | "GUEST_CANCELLED" | "HOST_CANCELLED";
export interface GiftItem {
  readonly id: string; readonly listId: string; readonly celebrationId: string; readonly title: string; readonly description?: string | null;
  readonly price: Money; readonly source: GiftSource; readonly status: GiftItemStatus; readonly version: number;
  readonly productListingId?: string | null; readonly providerId?: string | null; readonly externalUrl?: string | null; readonly createdAt: string;
  /** Present only when the host lets this viewer see who reserved (gift-settings). */
  readonly reservedByName?: string;
  /** 1.17.0 (R4): units wanted (1 before the assistant), the coordinated-gift switch, and the idea and version the host picked. */
  readonly quantity?: number; readonly groupGiftEnabled?: boolean; readonly giftIdeaCode?: string | null; readonly variantCode?: string | null;
}
export interface GiftItemList { readonly items: readonly GiftItem[]; readonly partnerPriorityEnabled: boolean; /** L4 (1.12.0): next page, null on the last one. */ readonly nextCursor?: string | null; /** 1.17.0 (R4): the delivery notes the host published for the whole list; absent or null when none. */ readonly deliveryNotes?: string | null }
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
