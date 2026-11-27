import { useMutation, useQuery, useQueryClient, type Query } from "@tanstack/react-query";
import { ApiError, type ApiClient } from "@rsvp/api-client";
import { cachePolicy } from "../policy.js";
import { queryKeys } from "../keys.js";
import { invalidation } from "../invalidation.js";
import { giftApi } from "../domains.js";
import type { Destination } from "../provider/types.js";

const refetchAll = (queryClient: ReturnType<typeof useQueryClient>, keys: readonly (readonly unknown[])[]) => Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));

export function useGiftItems<T>(client: ApiClient, celebrationId: string) {
  return useQuery({ queryKey: queryKeys.gift.list(celebrationId), queryFn: () => giftApi(client).get("/celebrations/{celebrationId}/items", { path: { celebrationId }, auth: false }) as Promise<T>, ...cachePolicy.gift, enabled: Boolean(celebrationId) });
}
export function useAddGiftItem<TResponse, TInput>(client: ApiClient, celebrationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) => giftApi(client).post("/celebrations/{celebrationId}/items", { path: { celebrationId }, body: input as never }) as Promise<TResponse>,
    onSuccess: () => refetchAll(queryClient, invalidation.giftReservationChanged(celebrationId))
  });
}
export function useReserveGift<TResponse, TInput>(client: ApiClient, celebrationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ giftItemId, input }: { giftItemId: string; input: TInput }) => giftApi(client).post("/celebrations/{celebrationId}/items/{giftItemId}/reservations", { path: { celebrationId, giftItemId }, body: input as never, auth: false }) as Promise<TResponse>,
    onSuccess: () => refetchAll(queryClient, invalidation.giftReservationChanged(celebrationId))
  });
}
export function useApproveReservation<TResponse>(client: ApiClient, celebrationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reservationId: string) => giftApi(client).post("/celebrations/{celebrationId}/reservations/{reservationId}/approve", { path: { celebrationId, reservationId } }) as Promise<TResponse>,
    onSuccess: () => refetchAll(queryClient, invalidation.giftReservationChanged(celebrationId))
  });
}

// ---- Typed gift flows (F22 guest list, F23 host management). Contract: gift-list.openapi.json 1.1.0. ----
import { addGiftWithList, giftApi as giftService } from "./api.js";
import type { AddGiftInput, UpdateGiftSettingsInput, GiftItemList, GiftReservation, ReservationStatus, ReserveGiftInput } from "./types.js";
export * from "./types.js";
export * from "./reserve-rules.js";
export * from "./guest-card.js";
export * from "./purchase-attempts.js";
export * from "./purchase-prompt.js";
export * from "./replacements.js";
export * from "./replacements-hooks.js";
export { giftApi as giftService, isGiftListMissing, suggestionsOf, problemCode } from "./api.js";
import { suggestionsOf, problemCode } from "./api.js";

/** Cataloged gifts first (the order the backend returns); this only repeats the guarantee for older payloads. */
export function catalogedFirst<T extends { readonly source: string }>(items: readonly T[]): T[] {
  return [...items.filter((item) => item.source === "CATALOGED"), ...items.filter((item) => item.source !== "CATALOGED")];
}

/** Guest-visible gifts: the host also receives PROPOSED/REJECTED, which a guest must never see. */
export const guestVisible = <T extends { readonly status: string }>(items: readonly T[]): T[] => items.filter((item) => item.status === "AVAILABLE" || item.status === "PENDING_REVIEW" || item.status === "COMMITTED");

/** `credential` = the guest's bearer; omit it for the host session. The credential is never part of the query key. */
/** Where a gift comes from, as a guest filters it: a DOne partner (CATALOGED) or any other store. */
export type GiftSourceFilter = "all" | "partner" | "other";
export interface GiftFilters { readonly maxMinor?: number; readonly source: GiftSourceFilter; readonly onlyAvailable: boolean }

/**
 * The guest's list as the web page and the app show it: only what a guest may see, the guest's filters applied, and partner
 * gifts before the others whatever the order they arrived in. One function so both surfaces filter identically.
 */
export function arrangeGifts<T extends { readonly source: string; readonly status: string; readonly availability?: string; readonly price: { readonly amountMinor: number }; readonly currentPrice?: { readonly amountMinor: number } | null }>(items: readonly T[], filters: GiftFilters): { readonly partner: T[]; readonly other: T[] } {
  const kept = guestVisible(items).filter((item) => (filters.maxMinor === undefined || (item.currentPrice?.amountMinor ?? item.price.amountMinor) <= filters.maxMinor) && (!filters.onlyAvailable || (item.status === "AVAILABLE" && item.availability !== "UNAVAILABLE")) && (filters.source === "all" || (filters.source === "partner") === (item.source === "CATALOGED")));
  const ordered = catalogedFirst(kept);
  return { partner: ordered.filter((item) => item.source === "CATALOGED"), other: ordered.filter((item) => item.source !== "CATALOGED") };
}

const GIFT_STORE_DESTINATIONS = ["PRODUCT_PAGE", "OFFICIAL_SITE", "LANDING"] as const;

/** Use the most specific store link and offer WhatsApp independently. */
export function giftContactDestinations(available: readonly Destination[] = []): Destination[] {
  const store = GIFT_STORE_DESTINATIONS.find((destination) => available.includes(destination));
  const choices: Destination[] = store ? [store] : [];
  if (available.includes("WHATSAPP")) choices.push("WHATSAPP");
  return choices;
}

/** A typed price ("150", "150.5") as minor units, or undefined when empty or not a number: an empty filter filters nothing. */
export function maxPriceMinor(text: string): number | undefined {
  const value = text.trim().replace(",", ".");
  return value !== "" && Number.isFinite(Number(value)) ? Math.round(Number(value) * 100) : undefined;
}

/**
 * R6a · The lead context (`leadContext`) is signed by Gift List with a 300 s TTL (GIFT_LEAD_CONTEXT_TTL_SECONDS, default 300, 60..3600).
 * With `refreshLeadContext`, a member's list is re-read every 240 s, so the `ctx` of the links is always younger than the TTL (a stale one proves
 * nothing and the member's click is billed to the provider). Only a read that carries a context polls (guests never get one). The poll pauses in the background, so the query also refetches every time the tab or the app returns to the foreground (`refetchOnWindowFocus: "always"` overrides the app default, which seo-web turns off, and ignores staleTime). On Expo the foreground signal is React Query's focusManager, fed by AppState in the app providers.
 */
export const LEAD_CONTEXT_REFRESH_MS = 240_000;

/** The `ctx` of the `/r/` links of a list: the member's signed lead context, or undefined (guest, public read, older server). */
export const leadContextOf = (list: Pick<GiftItemList, "leadContext"> | undefined | null): string | undefined => list?.leadContext || undefined;

export interface GiftListOptions {
  /** Re-read the list before its lead context expires. On only where `/r/{listingId}` links are rendered with that `ctx`; off elsewhere (no pointless polling). */
  readonly refreshLeadContext?: boolean;
}

export function useGiftList(client: ApiClient, celebrationId: string | undefined, credential?: string | null, initialData?: GiftItemList, options: GiftListOptions = {}) {
  // Documented limit: the app default is read only when it is a boolean or "always". React Query also allows a function of the query there; this repo's
  // apps (seo-web: false, universal: unset) never use one, and the function's parameter type (Query<unknown>) cannot take a typed gift query without a cast,
  // so a function default is treated as React Query's own default (true) for a read without a lead context.
  const configured = useQueryClient().getDefaultOptions().queries?.refetchOnWindowFocus;
  const appFocusDefault = typeof configured === "function" || configured === undefined ? true : configured;
  return useQuery({
    queryKey: [...queryKeys.gift.list(celebrationId ?? ""), credential === undefined ? "host" : "guest"] as const,
    queryFn: ({ signal }) => giftService(client).list(celebrationId ?? "", credential, signal),
    refetchInterval: (query) => (options.refreshLeadContext && leadContextOf(query.state.data) ? LEAD_CONTEXT_REFRESH_MS : false),
    // Only a read that carries a context overrides the app default; any other keeps it (seo-web: off, universal: React Query's on).
    ...(options.refreshLeadContext ? { refetchOnWindowFocus: (query: Query<GiftItemList>) => (leadContextOf(query.state.data) ? "always" as const : appFocusDefault) } : {}),
    ...cachePolicy.gift, ...(initialData ? { initialData } : {}), enabled: Boolean(celebrationId), retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 1
  });
}

export type ReserveOutcome = { readonly kind: "reserved"; readonly reservation: GiftReservation } | { readonly kind: "taken" } | { readonly kind: "failed"; readonly error: unknown };

/** One Idempotency-Key per tap target: a double click or a retry replays the same request instead of reserving twice. */
export function useReserveGiftItem(client: ApiClient, celebrationId: string, credential: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ giftItemId, input, idempotencyKey }: { giftItemId: string; input: ReserveGiftInput; idempotencyKey: string }) => giftService(client).reserve(celebrationId, giftItemId, input, credential, idempotencyKey),
    onSettled: () => refetchAll(queryClient, invalidation.giftReservationChanged(celebrationId))
  });
}
export const isGiftTaken = (error: unknown): boolean => error instanceof ApiError && error.status === 409 && problemCode(error) === "GIFT_NOT_AVAILABLE";
export const isGiftRsvpRequired = (error: unknown): boolean => error instanceof ApiError && error.status === 403
  && ["GUEST_RSVP_DECLINED", "GUEST_RSVP_REQUIRED"].includes(problemCode(error) ?? "");

/** Reservations that still hold a gift, by gift: what the guest can cancel, or what the host can release. */
export function activeReservationsByItem(reservations: readonly GiftReservation[] | undefined): ReadonlyMap<string, GiftReservation> {
  const active = new Map<string, GiftReservation>();
  for (const reservation of reservations ?? []) if (reservation.status === "PENDING_REVIEW" || reservation.status === "COMMITTED") active.set(reservation.itemId, reservation);
  return active;
}

/** The guest's own reservations, so a reload still shows "your reservation" and lets them cancel it. Needs the link credential. */
export function useMyGiftReservations(client: ApiClient, celebrationId: string | undefined, credential: string | null | undefined) {
  return useQuery({
    queryKey: [...queryKeys.gift.list(celebrationId ?? ""), "mine"] as const,
    queryFn: ({ signal }) => giftService(client).myReservations(celebrationId ?? "", credential ?? "", signal),
    ...cachePolicy.gift, enabled: Boolean(celebrationId && credential), retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 1
  });
}

/**
 * D-3 · cancel an active reservation: the guest with their credential, or the host with the session (`credential` undefined).
 * The caller keeps one Idempotency-Key per reservation, so a double tap or a retry after a lost answer cancels once.
 */
export function useCancelGiftReservation(client: ApiClient, celebrationId: string, credential?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reservationId, idempotencyKey }: { reservationId: string; idempotencyKey: string }) => giftService(client).cancel(celebrationId, reservationId, credential, idempotencyKey),
    onSettled: () => refetchAll(queryClient, invalidation.giftReservationChanged(celebrationId))
  });
}
/** 409 RESERVATION_NOT_ACTIVE: somebody (the host, the guest or an attendance change) already ended it; the list is refreshed. */
export const isReservationNotActive = (error: unknown): boolean => error instanceof ApiError && error.status === 409 && problemCode(error) === "RESERVATION_NOT_ACTIVE";

export function useHostReservations(client: ApiClient, celebrationId: string | undefined, status?: ReservationStatus) {
  return useQuery({ queryKey: [...queryKeys.gift.list(celebrationId ?? ""), "reservations", status ?? "all"] as const, queryFn: () => giftService(client).reservations(celebrationId ?? "", status), ...cachePolicy.gift, enabled: Boolean(celebrationId) });
}
export function useDecideReservation(client: ApiClient, celebrationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reservationId, decision }: { reservationId: string; decision: "approve" | "reject" }) => decision === "approve" ? giftService(client).approve(celebrationId, reservationId) : giftService(client).reject(celebrationId, reservationId),
    onSettled: () => refetchAll(queryClient, invalidation.giftReservationChanged(celebrationId))
  });
}
export function useAddGift(client: ApiClient, celebrationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddGiftInput) => addGiftWithList(client, celebrationId, input),
    onSuccess: () => refetchAll(queryClient, invalidation.giftReservationChanged(celebrationId))
  });
}
export function useApproveExternalGift(client: ApiClient, celebrationId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (giftItemId: string) => giftService(client).approveExternal(celebrationId, giftItemId), onSettled: () => refetchAll(queryClient, invalidation.giftReservationChanged(celebrationId)) });
}
/** Host rejects a PROPOSED external gift (PROPOSED -> REJECTED). 409 when somebody already decided it. */
export function useRejectExternalGift(client: ApiClient, celebrationId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (giftItemId: string) => giftService(client).rejectExternal(celebrationId, giftItemId), onSettled: () => refetchAll(queryClient, invalidation.giftReservationChanged(celebrationId)) });
}
/** Gift List 1.20.0 · the host takes a gift that is «No disponible» off the list (removeGiftItem). 409 GIFT_NOT_REMOVABLE / GIFT_HAS_RESERVATIONS; repeating it is harmless. */
export function useRemoveGiftItem(client: ApiClient, celebrationId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (giftItemId: string) => giftService(client).remove(celebrationId, giftItemId), onSettled: () => refetchAll(queryClient, invalidation.giftReservationChanged(celebrationId)) });
}
export const partnerSuggestionsOf = suggestionsOf;

/** REQ-F23-06 · who may see the requester of a reservation (host only). */
export function useGiftSettings(client: ApiClient, celebrationId: string | undefined) {
  return useQuery({ queryKey: [...queryKeys.gift.list(celebrationId ?? ""), "settings"] as const, queryFn: () => giftService(client).settings(celebrationId ?? ""), ...cachePolicy.gift, enabled: Boolean(celebrationId) });
}
export function useUpdateGiftSettings(client: ApiClient, celebrationId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: UpdateGiftSettingsInput) => giftService(client).updateSettings(celebrationId, input), onSuccess: () => refetchAll(queryClient, invalidation.giftReservationChanged(celebrationId)) });
}

export * from "./assistant.js";
export * from "./assistant-hooks.js";
