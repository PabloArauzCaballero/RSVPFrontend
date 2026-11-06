import { ApiError, type ApiClient } from "@rsvp/api-client";
import type { ProviderDiscoveryQuery, ProviderPage, Availability, Booking, BookingRequestInput, BookingStatus, Calendar, CreateListingInput, Lead, ListingHit, ListingSummary, LeadConfig, Metrics, OwnListing, Provider, QuoteInput, QuoteReceipt, RegisterProviderInput, UpdateProviderInput, Microsite, MicrositeInput, ProviderDocument, DocumentInput, DocumentRegistration, DocumentDownload } from "./types.js";

const qs = (params: Record<string, string | number | undefined>): string => {
  const entries = Object.entries(params).filter((entry): entry is [string, string | number] => entry[1] !== undefined && entry[1] !== "");
  return entries.length ? `?${new URLSearchParams(entries.map(([key, value]) => [key, String(value)]))}` : "";
};
const NOT_ROUTED = 404;

/** Provider Catalog through Kong (`/providers`, `/r`). Public reads use auth:false; the portal uses the PROVIDER session. */
export function providerService(client: ApiClient) {
  const base = (providerId: string) => `/providers/${providerId}`;
  return {
    register: (body: RegisterProviderInput) => client.request<Provider, RegisterProviderInput>("/providers", { method: "POST", body }),
    /** With the owner's session a DRAFT/PENDING provider is readable; anonymous callers only see VERIFIED ones (404 otherwise). */
    get: (providerId: string) => client.request<Provider>(base(providerId)),
    /** GET /providers (public, VERIFIED only): the discovery the host panel uses to pick partners (REQ-F23-05). */
    discover: (query: ProviderDiscoveryQuery, locale = "es-BO") => client.request<ProviderPage>(`/providers${qs({ ...query, locale })}`, { auth: false }),
    /** GET /providers/mine (provider-catalog 2.1.0): every provider the caller owns, in any status, oldest first. */
    mine: () => client.request<{ items: readonly Provider[] }>("/providers/mine"),
    /** GET/PUT /providers/{id}/microsite: version 0 until first saved; `If-Match` carries the version loaded (409 MICROSITE_VERSION_CONFLICT otherwise). */
    microsite: (providerId: string) => client.request<Microsite>(`${base(providerId)}/microsite`),
    saveMicrosite: (providerId: string, body: MicrositeInput, version: number) => client.request<Microsite, MicrositeInput>(`${base(providerId)}/microsite`, { method: "PUT", body, headers: { "if-match": String(version) } }),
    /** Verification documents: (1) register, (2) PUT the bytes to the presigned URL (no bearer), (3) complete. */
    documents: (providerId: string) => client.request<{ items: readonly ProviderDocument[] }>(`${base(providerId)}/documents`),
    registerDocument: (providerId: string, body: DocumentInput) => client.request<DocumentRegistration, DocumentInput>(`${base(providerId)}/documents`, { method: "POST", body }),
    completeDocument: (providerId: string, documentId: string) => client.request<ProviderDocument>(`${base(providerId)}/documents/${documentId}/complete`, { method: "POST" }),
    downloadDocument: (providerId: string, documentId: string) => client.request<DocumentDownload>(`${base(providerId)}/documents/${documentId}/download`),
    /** PATCH /providers/{id} (owner or admin): rename. A listing cannot be edited after creation: the contract has no such route. */
    update: (providerId: string, body: UpdateProviderInput) => client.request<Provider, UpdateProviderInput>(base(providerId), { method: "PATCH", body }),
    /** DELETE /providers/{id}/documents/{documentId} answers 204 (also when the document did not exist). */
    deleteDocument: (providerId: string, documentId: string) => client.request<undefined>(`${base(providerId)}/documents/${documentId}`, { method: "DELETE" }),
    submit: (providerId: string) => client.request<Provider>(`${base(providerId)}/submit`, { method: "POST" }),
    configureLeads: (providerId: string, body: LeadConfig) => client.request<Provider, LeadConfig>(`${base(providerId)}/lead-config`, { method: "PUT", body }),
    ownListings: (providerId: string, locale: string) => client.request<{ items: readonly OwnListing[] }>(`${base(providerId)}/listings${qs({ locale })}`),
    createListing: (providerId: string, body: CreateListingInput, locale: string) => client.request<OwnListing, CreateListingInput>(`${base(providerId)}/listings${qs({ locale })}`, { method: "POST", body }),
    publishListing: (providerId: string, listingId: string, locale: string) => client.request<OwnListing>(`${base(providerId)}/listings/${listingId}/publish${qs({ locale })}`, { method: "POST" }),
    leads: (providerId: string, limit = 50, offset = 0) => client.request<{ items: readonly Lead[]; total?: number }>(`${base(providerId)}/leads${qs({ limit, offset })}`),
    metrics: (providerId: string, from: string, to: string, groupBy?: string) => client.request<Metrics>(`${base(providerId)}/metrics${qs({ from, to, groupBy })}`),
    availability: (providerId: string) => client.request<Availability>(`${base(providerId)}/availability`),
    setAvailability: (providerId: string, body: Omit<Availability, "timeZone" | "providerId" | "version">) => client.request<Availability, typeof body>(`${base(providerId)}/availability`, { method: "PUT", body }),
    calendar: (providerId: string, month: string) => client.request<Calendar>(`${base(providerId)}/calendar${qs({ month })}`, { auth: false }),
    bookings: (providerId: string, status?: BookingStatus) => client.request<{ items: readonly Booking[] }>(`${base(providerId)}/bookings${qs({ status })}`),
    myBookings: () => client.request<{ items: readonly Booking[] }>("/providers/me/bookings"),
    requestBooking: (providerId: string, body: BookingRequestInput) => client.request<Booking, BookingRequestInput>(`${base(providerId)}/bookings`, { method: "POST", body }),
    decideBooking: (providerId: string, bookingId: string, action: "confirm" | "reject" | "cancel") => client.request<Booking>(`${base(providerId)}/bookings/${bookingId}/${action}`, { method: "POST" }),
    requestQuote: (providerId: string, body: QuoteInput, locale: string) => client.request<QuoteReceipt, QuoteInput>(`${base(providerId)}/quotes${qs({ locale })}`, { method: "POST", body }),
    /**
     * GET /listings?q= (host picker for cataloged gifts). The running gateway has no `/listings` route yet (404 "no Route matched"),
     * so a 404 falls back to the public `GET /providers` cards filtered by `q` on the client; both yield `{id,title}`.
     */
    searchListings: async (q: string, limit = 20, locale = "es-BO"): Promise<{ items: readonly ListingHit[]; viaFallback: boolean }> => {
      try {
        const result = await client.request<{ items: readonly ListingHit[] }>(`/listings${qs({ q, type: "PRODUCT", limit, locale })}`, { auth: false });
        return { items: result.items, viaFallback: false };
      } catch (error) {
        // Kong answers an unrouted path with a bare 404 that carries no CORS headers, so in a browser it surfaces as a network TypeError, not an ApiError.
        if (error instanceof ApiError && error.status !== NOT_ROUTED) throw error;
        const page = await client.request<{ items: readonly { listingId: string; providerSlug: string; name: string; summary?: string; category?: string; priceFrom?: { amountMinor: number; currency: string } }[] }>(`/providers${qs({ pageSize: 50 })}`, { auth: false });
        const needle = q.trim().toLowerCase();
        const items = page.items.filter((card) => !needle || `${card.name} ${card.summary ?? ""}`.toLowerCase().includes(needle)).slice(0, limit)
          .map((card): ListingHit => ({ id: card.listingId, providerId: card.providerSlug, title: card.summary ?? card.name, ...(card.category ? { category: card.category } : {}), ...(card.priceFrom ? { priceFromMinor: card.priceFrom.amountMinor, currency: card.priceFrom.currency } : {}) }));
        return { items, viaFallback: true };
      }
    }
  } as const;
}
export type { ListingSummary };
