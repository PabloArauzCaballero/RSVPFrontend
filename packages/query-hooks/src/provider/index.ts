import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@rsvp/api-client";
import { providerService } from "./api.js";
import type { Fulfillment, ProviderDiscoveryQuery, DocumentInput, MicrositeInput, Availability, BookingRequestInput, BookingStatus, CreateListingInput, LeadConfig, QuoteInput, RegisterProviderInput } from "./types.js";
export * from "./types.js";
export { providerService } from "./api.js";
import { cachePolicy } from "../policy.js";
import { queryKeys } from "../keys.js";
import { invalidation } from "../invalidation.js";
import { providerApi } from "../domains.js";

const refetchAll = (queryClient: ReturnType<typeof useQueryClient>, keys: readonly (readonly unknown[])[]) => Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));

export function useProviders<T>(client: ApiClient, query: Record<string, string | undefined> = {}) {
  const search = new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => entry[1] !== undefined)).toString();
  return useQuery({ queryKey: queryKeys.provider.search(search), queryFn: () => providerApi(client).get("/providers", { query: query as never, auth: false }) as Promise<T>, ...cachePolicy.provider });
}
export function useProviderCalendar<T>(client: ApiClient, providerId: string) {
  return useQuery({ queryKey: queryKeys.provider.calendar(providerId), queryFn: () => providerApi(client).get("/providers/{providerId}/calendar", { path: { providerId }, auth: false }) as Promise<T>, ...cachePolicy.provider, enabled: Boolean(providerId) });
}
export function useRegisterProvider<TResponse, TInput>(client: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: TInput) => providerApi(client).post("/providers", { body: input as never }) as Promise<TResponse>, onSuccess: () => refetchAll(queryClient, invalidation.providerChanged()) });
}
export function useVerifyProvider<TResponse>(client: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (providerId: string) => providerApi(client).post("/providers/{providerId}/verify", { path: { providerId } }) as Promise<TResponse>, onSuccess: () => refetchAll(queryClient, invalidation.providerChanged()) });
}
export function useCreateListing<TResponse, TInput>(client: ApiClient, providerId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: TInput) => providerApi(client).post("/providers/{providerId}/listings", { path: { providerId }, body: input as never }) as Promise<TResponse>, onSuccess: () => refetchAll(queryClient, invalidation.providerChanged()) });
}
export function useRequestQuote<TResponse, TInput>(client: ApiClient, providerId: string) {
  return useMutation({ mutationFn: (input: TInput) => providerApi(client).post("/providers/{providerId}/quotes", { path: { providerId }, body: input as never }) as Promise<TResponse> });
}
export function useRequestBooking<TResponse, TInput>(client: ApiClient, providerId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: TInput) => providerApi(client).post("/providers/{providerId}/bookings", { path: { providerId }, body: input as never }) as Promise<TResponse>, onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.provider.calendar(providerId) }) });
}

// ---- Typed provider flows (F26 quotes and schedule, F28 portal, F23 listing picker). Contract: provider-catalog 2.0.0. ----
const P = (providerId: string, ...rest: readonly unknown[]) => ["providers", providerId, ...rest] as const;
const live = { staleTime: 15_000, gcTime: 5 * 60_000 } as const;

export function useListingSearch(client: ApiClient, q: string) {
  return useQuery({ queryKey: ["providers", "listing-search", q] as const, queryFn: () => providerService(client).searchListings(q), staleTime: 30_000, enabled: q.trim().length >= 2 || q === "" });
}
export function useMonthCalendar(client: ApiClient, providerId: string | undefined, month: string) {
  return useQuery({ queryKey: P(providerId ?? "", "calendar", month), queryFn: () => providerService(client).calendar(providerId ?? "", month), ...live, enabled: Boolean(providerId) });
}
export function useQuote(client: ApiClient, providerId: string, locale: string) {
  return useMutation({ mutationFn: (input: QuoteInput) => providerService(client).requestQuote(providerId, input, locale) });
}
export function useBookDate(client: ApiClient, providerId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: BookingRequestInput) => providerService(client).requestBooking(providerId, input), onSettled: () => queryClient.invalidateQueries({ queryKey: P(providerId, "calendar") }) });
}
export function useRegisterProviderAccount(client: ApiClient) {
  return useMutation({ mutationFn: (input: RegisterProviderInput) => providerService(client).register(input) });
}
export function useProviderProfile(client: ApiClient, providerId: string | undefined) {
  return useQuery({ queryKey: P(providerId ?? "", "profile"), queryFn: () => providerService(client).get(providerId ?? ""), ...live, enabled: Boolean(providerId) });
}
export function useSubmitProvider(client: ApiClient, providerId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: () => providerService(client).submit(providerId), onSuccess: () => queryClient.invalidateQueries({ queryKey: P(providerId) }) });
}
export function useOwnListings(client: ApiClient, providerId: string | undefined, locale: string) {
  return useQuery({ queryKey: P(providerId ?? "", "listings", locale), queryFn: () => providerService(client).ownListings(providerId ?? "", locale), ...live, enabled: Boolean(providerId) });
}
export function useCreateOwnListing(client: ApiClient, providerId: string, locale: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: CreateListingInput) => providerService(client).createListing(providerId, input, locale), onSuccess: () => queryClient.invalidateQueries({ queryKey: P(providerId, "listings") }) });
}
export function usePublishListing(client: ApiClient, providerId: string, locale: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (listingId: string) => providerService(client).publishListing(providerId, listingId, locale), onSuccess: () => queryClient.invalidateQueries({ queryKey: P(providerId, "listings") }) });
}
/** EXPECTED contract (not in provider-catalog 2.1.0): edit the delivery conditions of an existing offer. */
export function useUpdateFulfillment(client: ApiClient, providerId: string, locale: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ listingId, fulfillment }: { listingId: string; fulfillment: Fulfillment }) => providerService(client).updateFulfillment(providerId, listingId, fulfillment, locale), onSuccess: () => queryClient.invalidateQueries({ queryKey: P(providerId, "listings") }) });
}
export function useLeads(client: ApiClient, providerId: string | undefined) {
  return useQuery({ queryKey: P(providerId ?? "", "leads"), queryFn: () => providerService(client).leads(providerId ?? ""), ...live, enabled: Boolean(providerId) });
}
export function useMetrics(client: ApiClient, providerId: string | undefined, from: string, to: string, groupBy?: string) {
  return useQuery({ queryKey: P(providerId ?? "", "metrics", from, to, groupBy ?? ""), queryFn: () => providerService(client).metrics(providerId ?? "", from, to, groupBy), ...live, enabled: Boolean(providerId) });
}
export function useAvailability(client: ApiClient, providerId: string | undefined) {
  return useQuery({ queryKey: P(providerId ?? "", "availability"), queryFn: () => providerService(client).availability(providerId ?? ""), ...live, enabled: Boolean(providerId) });
}
export function useSetAvailability(client: ApiClient, providerId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: Pick<Availability, "capacityPerDay" | "rules" | "blackouts">) => providerService(client).setAvailability(providerId, input as never), onSuccess: () => queryClient.invalidateQueries({ queryKey: P(providerId) }) });
}
export function useProviderBookings(client: ApiClient, providerId: string | undefined, status?: BookingStatus) {
  return useQuery({ queryKey: P(providerId ?? "", "bookings", status ?? "all"), queryFn: () => providerService(client).bookings(providerId ?? "", status), ...live, enabled: Boolean(providerId) });
}
export function useDecideBooking(client: ApiClient, providerId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ bookingId, action }: { bookingId: string; action: "confirm" | "reject" | "cancel" }) => providerService(client).decideBooking(providerId, bookingId, action), onSettled: () => queryClient.invalidateQueries({ queryKey: P(providerId) }) });
}
export function useConfigureLeads(client: ApiClient, providerId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: LeadConfig) => providerService(client).configureLeads(providerId, input), onSuccess: () => queryClient.invalidateQueries({ queryKey: P(providerId) }) });
}

/** GET /providers/mine: replaces the id remembered on the device. */
export function useMyProviders(client: ApiClient, enabled = true) {
  return useQuery({ queryKey: ["providers", "mine"] as const, queryFn: () => providerService(client).mine(), ...live, enabled });
}
export function useMicrosite(client: ApiClient, providerId: string | undefined) {
  return useQuery({ queryKey: P(providerId ?? "", "microsite"), queryFn: () => providerService(client).microsite(providerId ?? ""), ...live, enabled: Boolean(providerId) });
}
export function useSaveMicrosite(client: ApiClient, providerId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ input, version }: { input: MicrositeInput; version: number }) => providerService(client).saveMicrosite(providerId, input, version), onSuccess: (saved) => { queryClient.setQueryData(P(providerId, "microsite"), saved); } });
}
export function useProviderDocuments(client: ApiClient, providerId: string | undefined) {
  return useQuery({ queryKey: P(providerId ?? "", "documents"), queryFn: () => providerService(client).documents(providerId ?? ""), ...live, enabled: Boolean(providerId) });
}
/**
 * Three steps: register the metadata, PUT the file bytes to the presigned URL (no bearer, exactly the headers returned), then complete.
 * `put` is injected so the screen decides how to read the file (File on web, a blob on native).
 */
export function useUploadDocument(client: ApiClient, providerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ input, put }: { input: DocumentInput; put: (upload: { url: string; headers: Readonly<Record<string, string>> }) => Promise<void> }) => {
      const registered = await providerService(client).registerDocument(providerId, input);
      await put({ url: registered.upload.url, headers: registered.upload.headers });
      return providerService(client).completeDocument(providerId, registered.id);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: P(providerId, "documents") })
  });
}

/** REQ-F23-05 · public discovery of verified providers from the host panel. */
export function useProviderDiscovery(client: ApiClient, query: ProviderDiscoveryQuery, locale = "es-BO") {
  return useQuery({ queryKey: ["providers", "discover", locale, query] as const, queryFn: () => providerService(client).discover(query, locale), staleTime: 30_000, placeholderData: (previous) => previous });
}
