import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, type ApiClient } from "@rsvp/api-client";
import { cachePolicy } from "../policy.js";
import { queryKeys } from "../keys.js";
import { invalidation } from "../invalidation.js";
import { giftApi } from "../domains.js";

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
import { addExternalGift, giftApi as giftService } from "./api.js";
import type { AddGiftInput, UpdateGiftSettingsInput, GiftItemList, GiftReservation, ReservationStatus, ReserveGiftInput } from "./types.js";
export * from "./types.js";
export { giftApi as giftService, isGiftListMissing, suggestionsOf, problemCode } from "./api.js";
import { suggestionsOf, problemCode } from "./api.js";

/** Cataloged gifts first (the order the backend returns); this only repeats the guarantee for older payloads. */
export function catalogedFirst<T extends { readonly source: string }>(items: readonly T[]): T[] {
  return [...items.filter((item) => item.source === "CATALOGED"), ...items.filter((item) => item.source !== "CATALOGED")];
}

/** Guest-visible gifts: the host also receives PROPOSED/REJECTED, which a guest must never see. */
export const guestVisible = <T extends { readonly status: string }>(items: readonly T[]): T[] => items.filter((item) => item.status === "AVAILABLE" || item.status === "PENDING_REVIEW" || item.status === "COMMITTED");

/** `credential` = the guest's bearer; omit it for the host session. The credential is never part of the query key. */
export function useGiftList(client: ApiClient, celebrationId: string | undefined, credential?: string | null, initialData?: GiftItemList) {
  return useQuery({
    queryKey: [...queryKeys.gift.list(celebrationId ?? ""), credential === undefined ? "host" : "guest"] as const,
    queryFn: ({ signal }) => giftService(client).list(celebrationId ?? "", credential, signal),
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
    mutationFn: (input: AddGiftInput) => input.source === "EXTERNAL"
      ? addExternalGift(client, celebrationId, input)
      : giftService(client).add(celebrationId, input),
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
export const partnerSuggestionsOf = suggestionsOf;

/** REQ-F23-06 · who may see the requester of a reservation (host only). */
export function useGiftSettings(client: ApiClient, celebrationId: string | undefined) {
  return useQuery({ queryKey: [...queryKeys.gift.list(celebrationId ?? ""), "settings"] as const, queryFn: () => giftService(client).settings(celebrationId ?? ""), ...cachePolicy.gift, enabled: Boolean(celebrationId) });
}
export function useUpdateGiftSettings(client: ApiClient, celebrationId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: UpdateGiftSettingsInput) => giftService(client).updateSettings(celebrationId, input), onSuccess: () => refetchAll(queryClient, invalidation.giftReservationChanged(celebrationId)) });
}
