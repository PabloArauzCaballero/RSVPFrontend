import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { ApiError, type ApiClient } from "@rsvp/api-client";
import { cachePolicy } from "../policy.js";
import { queryKeys } from "../keys.js";
import { invalidation } from "../invalidation.js";
import { usePublicCelebration } from "../celebration/index.js";
import { guestAccessApi, hostGuestsApi, hostNotificationsApi } from "./api.js";
import { readHostRsvpAnswers } from "./csv.js";
import { classifyRsvpError, tokenFingerprint } from "./rsvp-flow.js";
import type { CompanionDecision, PublicCelebrationRef, RegisterGuestInput, RsvpResponse, RsvpState, UnregisteredConfirmation } from "./types.js";

export * from "./types.js";
export * from "./rsvp-flow.js";
export * from "./api.js";
export * from "./csv.js";

const refetchAll = (queryClient: ReturnType<typeof useQueryClient>, keys: readonly (readonly unknown[])[]) => Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));

/** 4xx answers are final (bad token, closed window…); only network and 5xx failures are worth another try. */
export const retryTransient = (count: number, error: unknown): boolean => {
  if (error instanceof ApiError && error.status < 500 && error.status !== 429) return false;
  return count < 1;
};

/** GET /celebrations/public/{slug}: the real public read that turns a slug into a celebrationId (never the deprecated slug helper). */
export function useCelebrationBySlug<TView extends PublicCelebrationRef = PublicCelebrationRef>(client: ApiClient, slug: string) {
  return usePublicCelebration<TView>(client, slug);
}

/** GET /rsvp/celebrations/{id}/guest: the allowed companions of this credential (also proves the token is valid). */
export function useGuestResource(client: ApiClient, celebrationId: string | undefined, token: string) {
  return useQuery({
    queryKey: ["guests", "resource", celebrationId ?? "", tokenFingerprint(token)] as const,
    queryFn: ({ signal }) => guestAccessApi(client).resource(celebrationId ?? "", token, signal),
    enabled: Boolean(celebrationId && token), staleTime: 60_000, gcTime: 0, retry: retryTransient
  });
}

/** GET /rsvp/celebrations/{id}/rsvp with the personal token as Bearer. Never cached beyond the session (gcTime 0) and keyed without the token. */
export function useGuestRsvp(client: ApiClient, celebrationId: string | undefined, token: string) {
  return useQuery({
    queryKey: queryKeys.guest.rsvp(celebrationId ?? "", tokenFingerprint(token)),
    queryFn: ({ signal }) => guestAccessApi(client).read(celebrationId ?? "", token, signal),
    enabled: Boolean(celebrationId && token),
    staleTime: 0, gcTime: 0, retry: retryTransient
  });
}

export interface SaveRsvpVariables {
  /** The state the form was opened with: PENDING means the first answer (POST), anything else an edit (PATCH). */
  readonly current: RsvpState;
  readonly input: RsvpResponse;
  /** One key per submit intent, reused on every retry of the same draft so a lost response never duplicates the RSVP. */
  readonly idempotencyKey: string;
}

export function useSaveGuestRsvp(client: ApiClient, celebrationId: string, token: string) {
  const queryClient = useQueryClient();
  const fingerprint = tokenFingerprint(token);
  return useMutation({
    mutationFn: async ({ current, input, idempotencyKey }: SaveRsvpVariables): Promise<RsvpState> => {
      const api = guestAccessApi(client);
      if (current.status !== "PENDING") return api.update(celebrationId, token, input, idempotencyKey);
      try { return await api.create(celebrationId, token, input, idempotencyKey); }
      catch (error) {
        // Answered from another tab/device in the meantime: the create is superseded, apply it as an edit.
        if (classifyRsvpError(error).kind === "exists") return api.update(celebrationId, token, input, idempotencyKey);
        throw error;
      }
    },
    retry: false,
    onSuccess: (state) => { queryClient.setQueryData(queryKeys.guest.rsvp(celebrationId, fingerprint), state); }
  });
}

export interface RegisterUnregisteredVariables { readonly input: UnregisteredConfirmation; readonly idempotencyKey: string }
/** Public registration. The receipt's one-time token is returned to the caller and never persisted by the hook. */
export function useRegisterUnregistered(client: ApiClient, celebrationId: string) {
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: RegisterUnregisteredVariables) => guestAccessApi(client).registerUnregistered(celebrationId, input, idempotencyKey),
    retry: false
  });
}

/* ------------------------------ host surface ------------------------------ */

export interface GuestListFilters { readonly status?: "PENDING" | "CONFIRMED" | "DECLINED"; readonly groupId?: string; readonly search?: string; readonly limit?: number; readonly offset?: number }

export function useGuestList(client: ApiClient, celebrationId: string, filters: GuestListFilters = {}) {
  return useQuery({ queryKey: queryKeys.guest.list(celebrationId, filters), queryFn: ({ signal }) => hostGuestsApi(client).list(celebrationId, filters, signal), enabled: Boolean(celebrationId), placeholderData: keepPreviousData, ...cachePolicy.guest });
}
export function useGuestSummary(client: ApiClient, celebrationId: string) {
  return useQuery({
    queryKey: queryKeys.guest.summary(celebrationId),
    queryFn: () => hostGuestsApi(client).summary(celebrationId),
    enabled: Boolean(celebrationId),
    ...cachePolicy.guest,
    refetchInterval: ({ state }) => {
      if (state.error instanceof ApiError && state.error.status < 500) return false;
      return state.data?.freshness?.pendingEvents ? 5_000 : cachePolicy.guest.staleTime;
    }
  });
}
export function useHostRsvps(client: ApiClient, celebrationId: string) {
  return useQuery({ queryKey: queryKeys.guest.rsvps(celebrationId), queryFn: () => readHostRsvpAnswers(hostGuestsApi(client), celebrationId), enabled: Boolean(celebrationId), ...cachePolicy.guest });
}
export function useGuestDetail(client: ApiClient, celebrationId: string, guestId: string) {
  return useQuery({ queryKey: queryKeys.guest.detail(celebrationId, guestId), queryFn: () => hostGuestsApi(client).detail(celebrationId, guestId), enabled: Boolean(celebrationId && guestId), ...cachePolicy.guest });
}
/** After guests are registered or imported, Notification learns its recipients with ONE bulk PUT. Best effort: a failure never undoes the registration. */
function syncRecipientsOnce(client: ApiClient, celebrationId: string): void {
  void hostNotificationsApi(client).syncRecipients(celebrationId).catch(() => undefined);
}
export function useRegisterGuest(client: ApiClient, celebrationId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: RegisterGuestInput) => hostGuestsApi(client).register(celebrationId, input), onSuccess: () => { syncRecipientsOnce(client, celebrationId); return refetchAll(queryClient, invalidation.guestsChanged(celebrationId)); } });
}
export function useImportGuests(client: ApiClient, celebrationId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (csv: string) => hostGuestsApi(client).importCsv(celebrationId, csv), onSuccess: () => { syncRecipientsOnce(client, celebrationId); return refetchAll(queryClient, invalidation.guestsChanged(celebrationId)); } });
}

/** POST /rsvp/resolve: legacy `/rsvp/{token}` links find their celebration (and slug) from the credential alone. */
export function useResolveGuestCredential(client: ApiClient, token: string) {
  return useQuery({ queryKey: ["guests", "resolve", tokenFingerprint(token)], queryFn: ({ signal }) => guestAccessApi(client).resolve(token, signal), enabled: Boolean(token), retry: false, staleTime: 0, gcTime: 0 });
}

/** GET .../public-settings: asked before the no-account form is shown (never an existence oracle: always 200). */
export function usePublicRegistrationSettings(client: ApiClient, celebrationId: string | undefined) {
  return useQuery({ queryKey: ["guests", "public-settings", celebrationId ?? ""], queryFn: ({ signal }) => guestAccessApi(client).publicSettings(celebrationId ?? "", signal), enabled: Boolean(celebrationId), retry: false, staleTime: 0 });
}
export function useGuestGroups(client: ApiClient, celebrationId: string) {
  return useQuery({ queryKey: queryKeys.guest.groups(celebrationId), queryFn: () => hostGuestsApi(client).groups(celebrationId), enabled: Boolean(celebrationId), ...cachePolicy.guest });
}
export function useChangeGuestGroup(client: ApiClient, celebrationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ guestId, groupId }: { readonly guestId: string; readonly groupId: string | null }) => hostGuestsApi(client).changeGroup(celebrationId, guestId, groupId),
    onSuccess: () => Promise.all([refetchAll(queryClient, invalidation.guestsChanged(celebrationId)), queryClient.invalidateQueries({ queryKey: queryKeys.guest.groups(celebrationId) })])
  });
}
export function useCreateGuestGroup(client: ApiClient, celebrationId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (name: string) => hostGuestsApi(client).createGroup(celebrationId, name), onSuccess: () => Promise.all([refetchAll(queryClient, invalidation.guestsChanged(celebrationId)), queryClient.invalidateQueries({ queryKey: queryKeys.guest.groups(celebrationId) })]) });
}
/** Issue or replace the guest's link; the response carries the raw token once. Do not put it in a cache: callers keep it in component state. */
export function useIssueGuestToken(client: ApiClient, celebrationId: string) {
  return useMutation({ mutationFn: (guestId: string) => hostGuestsApi(client).issueToken(celebrationId, guestId), gcTime: 0 });
}
export function useRevokeGuestToken(client: ApiClient, celebrationId: string) {
  return useMutation({ mutationFn: (guestId: string) => hostGuestsApi(client).revokeToken(celebrationId, guestId) });
}
export function useCompanionRequests(client: ApiClient, celebrationId: string) {
  return useQuery({ queryKey: queryKeys.guest.companionRequests(celebrationId), queryFn: () => hostGuestsApi(client).companionRequests(celebrationId), enabled: Boolean(celebrationId), ...cachePolicy.guest });
}
export function useResolveCompanionRequest(client: ApiClient, celebrationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, decision }: { readonly requestId: string; readonly decision: CompanionDecision }) => hostGuestsApi(client).decide(celebrationId, requestId, decision),
    // A 409 means someone else decided first: the list must be refreshed either way.
    onSettled: () => refetchAll(queryClient, invalidation.guestsChanged(celebrationId))
  });
}
