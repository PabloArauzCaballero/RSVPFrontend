/** Gift List contract 1.2.0 (gift-list.openapi.json). Money is integer minor units, never a float. */
export interface Money { readonly amountMinor: number; readonly currency: string }
export type GiftSource = "CATALOGED" | "EXTERNAL";
export type GiftItemStatus = "AVAILABLE" | "PROPOSED" | "PENDING_REVIEW" | "COMMITTED" | "REJECTED";
export type ReservationStatus = "PENDING_REVIEW" | "COMMITTED" | "REJECTED";
export interface GiftItem {
  readonly id: string; readonly listId: string; readonly celebrationId: string; readonly title: string; readonly description?: string | null;
  readonly price: Money; readonly source: GiftSource; readonly status: GiftItemStatus; readonly version: number;
  readonly productListingId?: string | null; readonly providerId?: string | null; readonly externalUrl?: string | null; readonly createdAt: string;
  /** Present only when the host lets this viewer see who reserved (gift-settings). */
  readonly reservedByName?: string;
}
export interface GiftItemList { readonly items: readonly GiftItem[]; readonly partnerPriorityEnabled: boolean }
export interface GiftReservation {
  readonly id: string; readonly itemId: string; readonly celebrationId: string; readonly guestId?: string | null; readonly guestDisplayName?: string | null;
  readonly message?: string | null; readonly status: ReservationStatus; readonly requestedAt: string; readonly resolvedAt?: string | null; readonly resolvedBy?: string | null;
  /** True when the host chose not to see the requester: the name is null and the UI says so. */
  readonly requesterHidden?: boolean;
}
export interface ReservationList { readonly items: readonly GiftReservation[] }
export interface ReserveGiftInput { readonly guestDisplayName?: string | null; readonly message?: string | null }
export interface AddCatalogedGiftInput { readonly source: "CATALOGED"; readonly title: string; readonly description?: string | null; readonly price: Money; readonly productListingId: string }
export interface AddExternalGiftInput { readonly source: "EXTERNAL"; readonly title: string; readonly description?: string | null; readonly price: Money; readonly url: string; readonly partnerSuggestionsAcknowledged?: boolean }
export type AddGiftInput = AddCatalogedGiftInput | AddExternalGiftInput;
export interface PartnerSuggestion { readonly productListingId: string; readonly title: string }
export interface GiftSettings { readonly showRequesterToHost: boolean; readonly showRequesterToGuests: boolean; readonly version: number }
export type UpdateGiftSettingsInput = Pick<GiftSettings, "showRequesterToHost" | "showRequesterToGuests">;
