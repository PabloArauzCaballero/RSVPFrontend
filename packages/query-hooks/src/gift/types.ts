/** Gift List (gift-list.openapi.json; vendored version in packages/contracts/backend.lock.json, 1.19.0). Money is integer minor units, never a float. */
export interface Money { readonly amountMinor: number; readonly currency: string }
export type GiftSource = "CATALOGED" | "EXTERNAL";
/**
 * UNAVAILABLE (1.14.0, R1, M-6; reasons since 1.19.0, R7): the gift can no longer be given. On the wire the frozen `status` NEVER says UNAVAILABLE
 * (gift-list keeps the value the gift had, `wireGiftStatus`): what says it is `availability` + `unavailableReason`, and only the host (MANAGE)
 * receives such a gift. `status` keeps the literal only for payloads of a server that still wrote it there; read the state through `isGiftUnavailable`.
 */
export type GiftItemStatus = "AVAILABLE" | "PROPOSED" | "PENDING_REVIEW" | "COMMITTED" | "REJECTED" | "UNAVAILABLE";
export type GiftAvailability = "AVAILABLE" | "UNAVAILABLE";
export const GIFT_UNAVAILABLE_REASONS = ["HIDDEN_BY_ADMIN", "PROVIDER_SUSPENDED", "PROVIDER_REJECTED", "PROVIDER_NOT_VERIFIED", "UNPUBLISHED", "INCOMPLETE", "OUT_OF_STOCK", "VARIANT_OUT_OF_STOCK", "LISTING_NOT_PRODUCT"] as const;
export type GiftUnavailableReason = (typeof GIFT_UNAVAILABLE_REASONS)[number];
/** The gift cannot be reserved or bought any more: its provider stopped offering it. It comes back by itself when the listing is eligible again. */
export const isGiftUnavailable = (item: { readonly availability?: GiftAvailability; readonly status?: string }): boolean => item.availability === "UNAVAILABLE" || item.status === "UNAVAILABLE";
/** The reason to show, only for one the contract knows (a newer server may add one: the screen then says it generically). */
export const unavailableReasonOf = (item: { readonly unavailableReason?: string | null }): GiftUnavailableReason | null =>
  (GIFT_UNAVAILABLE_REASONS as readonly string[]).includes(item.unavailableReason ?? "") ? (item.unavailableReason as GiftUnavailableReason) : null;
export type ReservationStatus = "PENDING_REVIEW" | "COMMITTED" | "REJECTED" | "CANCELLED";
export type CancellationReason = "RSVP_DECLINED" | "GUEST_CANCELLED" | "HOST_CANCELLED";
export interface GiftItem {
  readonly id: string; readonly listId: string; readonly celebrationId: string; readonly title: string; readonly description?: string | null;
  readonly price: Money; readonly source: GiftSource; readonly status: GiftItemStatus; readonly version: number;
  readonly productListingId?: string | null; readonly providerId?: string | null; readonly externalUrl?: string | null; readonly createdAt: string;
  /** Present only when the host lets this viewer see who reserved (gift-settings). */
  readonly reservedByName?: string;
  /** 1.14.0 (R1): `UNAVAILABLE` when the catalog listing can no longer be bought; absent or `AVAILABLE` otherwise. Read it with `isGiftUnavailable`. */
  readonly availability?: GiftAvailability;
  /** 1.19.0 (R7): why the gift is unavailable; present only with `availability: "UNAVAILABLE"` and only in the host's lists. */
  readonly unavailableReason?: GiftUnavailableReason | null;
  /** 1.17.0 (R4): units wanted (1 before the assistant), the coordinated-gift switch, and the idea and version the host picked. */
  readonly quantity?: number; readonly groupGiftEnabled?: boolean; readonly giftIdeaCode?: string | null; readonly variantCode?: string | null;
  /** 1.18.0 (R5, GiftItemParticipation): what a guest may see of the units of the gift. Counts only; a name appears only when its owner chose to show it (PF-1). */
  readonly unitsReserved?: number; readonly unitsLeft?: number; readonly participants?: number; readonly contributors?: number;
  readonly coordinatorName?: string | null; readonly contributorNames?: readonly string[];
  /** The calling guest's own active reservation on this gift, or null. Only the COORDINATOR sees the provider buttons. */
  readonly viewer?: GiftViewerReservation | null;
  /** The price Provider Catalog charges now (M27); null or absent when it could not be read: show `price`, the snapshot. */
  readonly currentPrice?: Money | null;
}
export type ReservationRole = "SOLE" | "COORDINATOR" | "CONTRIBUTOR";
export interface GiftViewerReservation { readonly reservationId: string; readonly role: ReservationRole; readonly status: "PENDING_REVIEW" | "COMMITTED"; readonly units: number }
export interface GiftItemList { readonly items: readonly GiftItem[]; readonly partnerPriorityEnabled: boolean; /** L4 (1.12.0): next page, null on the last one. */ readonly nextCursor?: string | null; /** 1.17.0 (R4): the delivery notes the host published for the whole list; absent or null when none. */ readonly deliveryNotes?: string | null; /** R6a (1.16.0): signed lead context of a celebration member's read, otherwise null. Opaque bearer, ~5 min: append it as `ctx` to every `/r/{listingId}` link of this list, never to a link that is copied or shared. */ readonly leadContext?: string | null; /** R8a (1.13.0): the host or the organizer closed the list by hand; since 1.15.0 no new reservation is accepted (409 LIST_CLOSED). Absent on older servers. */ readonly closed?: boolean }
export interface GiftReservation {
  readonly id: string; readonly itemId: string; readonly celebrationId: string; readonly guestId?: string | null; readonly guestDisplayName?: string | null;
  readonly message?: string | null; readonly status: ReservationStatus; readonly requestedAt: string; readonly resolvedAt?: string | null; readonly resolvedBy?: string | null;
  /** True when the host chose not to see the requester: the name is null and the UI says so. */
  readonly requesterHidden?: boolean;
  readonly cancelledAt?: string;
  readonly cancelledFromStatus?: "PENDING_REVIEW" | "COMMITTED";
  /** RSVP_DECLINED: the guest said they will not attend. GUEST_CANCELLED: the guest withdrew it. HOST_CANCELLED: the host released the gift. */
  readonly cancellationReason?: CancellationReason;
  /** 1.17.0/1.18.0: units this reservation holds (SOLE: what the guest asked for; COORDINATOR: the whole quantity; CONTRIBUTOR: 0), its role and whether the guest agreed to show their name. */
  readonly units?: number; readonly role?: ReservationRole; readonly showName?: boolean;
}
export interface ReservationList { readonly items: readonly GiftReservation[]; /** L4 (1.12.0): next page, null on the last one. */ readonly nextCursor?: string | null }
/** 1.18.0 (R5) GiftReserveRequest. `units` counts only in a plain gift (the server decides in a coordinated one); `showName` is the guest's consent to show their name to the others of the gift. */
export interface ReserveGiftInput { readonly guestDisplayName?: string | null; readonly message?: string | null; readonly units?: number; readonly showName?: boolean }
export interface AddCatalogedGiftInput { readonly source: "CATALOGED"; readonly title: string; readonly description?: string | null; readonly price: Money; readonly productListingId: string }
export interface AddExternalGiftInput { readonly source: "EXTERNAL"; readonly title: string; readonly description?: string | null; readonly price: Money; readonly url: string; readonly partnerSuggestionsAcknowledged?: boolean }
export type AddGiftInput = AddCatalogedGiftInput | AddExternalGiftInput;
export interface PartnerSuggestion { readonly productListingId: string; readonly title: string }
export interface GiftSettings { readonly showRequesterToHost: boolean; readonly showRequesterToGuests: boolean; readonly version: number }
export type UpdateGiftSettingsInput = Pick<GiftSettings, "showRequesterToHost" | "showRequesterToGuests">;
