import { ApiError, type ApiClient } from "@rsvp/api-client";
import type { AddGiftInput, GiftItem, GiftItemList, GiftReservation, ReservationList, ReservationStatus, ReserveGiftInput, PartnerSuggestion, GiftSettings, UpdateGiftSettingsInput } from "./types.js";

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

/** L4 · Gift answers bounded pages (Gift List 1.12.0). The lists read here are whole, so they follow nextCursor up to this many pages. */
const PAGE_SIZE = 200;
const MAX_PAGES = 50;
const pageQuery = (cursor: string | undefined, extra: Readonly<Record<string, string>> = {}): string =>
  `?${new URLSearchParams({ ...extra, limit: String(PAGE_SIZE), ...(cursor ? { cursor } : {}) }).toString()}`;
/**
 * Reads every page into one list. A server before 1.12.0 ignores limit/cursor and sends no nextCursor, so one call is enough;
 * more than MAX_PAGES pages is a broken cursor, and failing loudly beats showing a list silently cut short.
 */
async function allPages<TPage extends { readonly items: readonly unknown[]; readonly nextCursor?: string | null }>(read: (cursor?: string) => Promise<TPage>): Promise<TPage> {
  let page = await read();
  const items = [...page.items];
  for (let pages = 1; page.nextCursor; pages++) {
    if (pages >= MAX_PAGES) throw new Error("Gift list pagination did not end.");
    page = await read(page.nextCursor);
    items.push(...page.items);
  }
  return { ...page, items, nextCursor: null };
}

/**
 * Guest calls carry the guest's credential as Bearer; the host's calls use the session. `credential` set means "send exactly this
 * token and never the stored session" (auth:false), so a guest page never leaks or needs a host session.
 */
export function giftApi(client: ApiClient) {
  // undefined = the host session; null = anonymous (no refresh attempt); string = exactly that guest bearer.
  const withCredential = (credential?: string | null) => (credential === undefined ? {} : { auth: false as const, headers: bearer(credential ?? undefined) });
  return {
    list: (celebrationId: string, credential?: string | null, signal?: AbortSignal) =>
      allPages((cursor) => client.request<GiftItemList>(`${BASE}/${celebrationId}/items${pageQuery(cursor)}`, { signal, ...withCredential(credential) })),
    createList: (celebrationId: string) => client.request<unknown>(`${BASE}/${celebrationId}/gift-list`, { method: "POST" }),
    add: (celebrationId: string, body: AddGiftInput) => client.request<GiftItem, AddGiftInput>(`${BASE}/${celebrationId}/items`, { method: "POST", body }),
    reserve: (celebrationId: string, giftItemId: string, body: ReserveGiftInput, credential: string | null | undefined, idempotencyKey: string) =>
      client.request<GiftReservation, ReserveGiftInput>(`${BASE}/${celebrationId}/items/${giftItemId}/reservations`, { method: "POST", body, ...withCredential(credential), headers: { ...bearer(credential ?? undefined), "idempotency-key": idempotencyKey } }),
    reservations: (celebrationId: string, status?: ReservationStatus) =>
      allPages((cursor) => client.request<ReservationList>(`${BASE}/${celebrationId}/reservations${pageQuery(cursor, status ? { status } : {})}`)),
    approve: (celebrationId: string, reservationId: string) => client.request<GiftReservation>(`${BASE}/${celebrationId}/reservations/${reservationId}/approve`, { method: "POST" }),
    reject: (celebrationId: string, reservationId: string) => client.request<GiftReservation>(`${BASE}/${celebrationId}/reservations/${reservationId}/reject`, { method: "POST" }),
    /** D-3 · the guest (their own, with `credential`) or the host (session, `credential` undefined) cancels an active reservation. */
    cancel: (celebrationId: string, reservationId: string, credential: string | null | undefined, idempotencyKey: string) =>
      client.request<GiftReservation>(`${BASE}/${celebrationId}/reservations/${reservationId}/cancel`, { method: "POST", ...withCredential(credential), headers: { ...bearer(credential ?? undefined), "idempotency-key": idempotencyKey } }),
    /** The guest's own reservations (any status); only with the guest's link credential. */
    myReservations: (celebrationId: string, credential: string, signal?: AbortSignal) => client.request<ReservationList>(`${BASE}/${celebrationId}/my-reservations`, { signal, ...withCredential(credential) }),
    settings: (celebrationId: string) => client.request<GiftSettings>(`${BASE}/${celebrationId}/gift-settings`),
    updateSettings: (celebrationId: string, body: UpdateGiftSettingsInput) => client.request<GiftSettings, UpdateGiftSettingsInput>(`${BASE}/${celebrationId}/gift-settings`, { method: "PUT", body }),
    approveExternal: (celebrationId: string, giftItemId: string) => client.request<GiftItem>(`${BASE}/${celebrationId}/items/${giftItemId}/approve`, { method: "POST" }),
    rejectExternal: (celebrationId: string, giftItemId: string) => client.request<GiftItem>(`${BASE}/${celebrationId}/items/${giftItemId}/reject`, { method: "POST" })
  } as const;
}

/** Retry only after Gift confirmed that the first POST wrote no item because the list was missing. */
export async function addGiftWithList(client: ApiClient, celebrationId: string, body: AddGiftInput): Promise<GiftItem> {
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
