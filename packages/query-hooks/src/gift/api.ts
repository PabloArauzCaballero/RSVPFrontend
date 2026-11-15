import { ApiError, type ApiClient } from "@rsvp/api-client";
import type { AddGiftInput, AddExternalGiftInput, GiftItem, GiftItemList, GiftReservation, ReservationList, ReservationStatus, ReserveGiftInput, PartnerSuggestion, GiftSettings, UpdateGiftSettingsInput } from "./types.js";

/** Gateway: Gift List is served under `/gifts` (Kong strips the prefix). */
const BASE = "/gifts/celebrations";
const bearer = (token: string | undefined): HeadersInit => (token ? { authorization: `Bearer ${token}` } : {});

/** Reads the `suggestions` of a 409 PARTNER_CATALOG_FIRST (the client's ApiError keeps the problem in `problem`/`details` depending on version). */
export function suggestionsOf(error: unknown): readonly PartnerSuggestion[] {
  const source = error as { problem?: { suggestions?: unknown }; details?: { suggestions?: unknown }; suggestions?: unknown } | null;
  const raw = source?.problem?.suggestions ?? source?.details?.suggestions ?? source?.suggestions;
  return Array.isArray(raw) ? (raw as PartnerSuggestion[]) : [];
}
export const problemCode = (error: unknown): string | undefined => (error instanceof ApiError ? error.problem?.code : undefined);
export const isGiftListMissing = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 404 && problemCode(error) === "GIFT_LIST_NOT_FOUND";

/**
 * Guest calls carry the guest's credential as Bearer; the host's calls use the session. `credential` set means "send exactly this
 * token and never the stored session" (auth:false), so a guest page never leaks or needs a host session.
 */
export function giftApi(client: ApiClient) {
  // undefined = the host session; null = anonymous (no refresh attempt); string = exactly that guest bearer.
  const withCredential = (credential?: string | null) => (credential === undefined ? {} : { auth: false as const, headers: bearer(credential ?? undefined) });
  return {
    list: (celebrationId: string, credential?: string | null, signal?: AbortSignal) => client.request<GiftItemList>(`${BASE}/${celebrationId}/items`, { signal, ...withCredential(credential) }),
    createList: (celebrationId: string) => client.request<unknown>(`${BASE}/${celebrationId}/gift-list`, { method: "POST" }),
    add: (celebrationId: string, body: AddGiftInput) => client.request<GiftItem, AddGiftInput>(`${BASE}/${celebrationId}/items`, { method: "POST", body }),
    reserve: (celebrationId: string, giftItemId: string, body: ReserveGiftInput, credential: string | null | undefined, idempotencyKey: string) =>
      client.request<GiftReservation, ReserveGiftInput>(`${BASE}/${celebrationId}/items/${giftItemId}/reservations`, { method: "POST", body, ...withCredential(credential), headers: { ...bearer(credential ?? undefined), "idempotency-key": idempotencyKey } }),
    reservations: (celebrationId: string, status?: ReservationStatus) => client.request<ReservationList>(`${BASE}/${celebrationId}/reservations${status ? `?status=${status}` : ""}`),
    approve: (celebrationId: string, reservationId: string) => client.request<GiftReservation>(`${BASE}/${celebrationId}/reservations/${reservationId}/approve`, { method: "POST" }),
    reject: (celebrationId: string, reservationId: string) => client.request<GiftReservation>(`${BASE}/${celebrationId}/reservations/${reservationId}/reject`, { method: "POST" }),
    settings: (celebrationId: string) => client.request<GiftSettings>(`${BASE}/${celebrationId}/gift-settings`),
    updateSettings: (celebrationId: string, body: UpdateGiftSettingsInput) => client.request<GiftSettings, UpdateGiftSettingsInput>(`${BASE}/${celebrationId}/gift-settings`, { method: "PUT", body }),
    approveExternal: (celebrationId: string, giftItemId: string) => client.request<GiftItem>(`${BASE}/${celebrationId}/items/${giftItemId}/approve`, { method: "POST" }),
    rejectExternal: (celebrationId: string, giftItemId: string) => client.request<GiftItem>(`${BASE}/${celebrationId}/items/${giftItemId}/reject`, { method: "POST" })
  } as const;
}

/** Retry only after Gift confirmed that the first POST wrote no item because the list was missing. */
export async function addExternalGift(client: ApiClient, celebrationId: string, body: AddExternalGiftInput): Promise<GiftItem> {
  const api = giftApi(client);
  try {
    return await api.add(celebrationId, body);
  } catch (error) {
    if (!isGiftListMissing(error)) throw error;
  }

  try {
    await api.createList(celebrationId);
  } catch (error) {
    // Another submission may have created the unique list after the first POST.
    if (!(error instanceof ApiError && error.status === 409 && problemCode(error) === "GIFT_LIST_EXISTS")) throw error;
  }

  return api.add(celebrationId, body);
}
