import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@rsvp/api-client";

/**
 * Partner requests, requester side (DPA-10). Hand-written copies of provider-catalog 3.3.0 (RSVPBackend #108, `PartnerRequestInput`,
 * `PartnerRequest`, `PartnerRequestList`), kept by hand like the A24 partner hooks until the contracts copy can be generated (FE #49).
 * No role is required: any signed-in account that owns no partner may ask. The admin side lives in `@rsvp/query-hooks/admin`.
 */

export type PartnerRequestStatus = "OPEN" | "IN_REVIEW" | "CONVERTED" | "REJECTED";
export const PARTNER_REQUEST_STATUSES: readonly PartnerRequestStatus[] = ["OPEN", "IN_REVIEW", "CONVERTED", "REJECTED"];
export type PartnerRequestChannel = "WHATSAPP" | "PHONE";
/** `statusReason` of a REJECTED request that its own requester withdrew. */
export const WITHDRAWN_BY_REQUESTER = "WITHDRAWN_BY_REQUESTER";
/** At most this many requests per account in PARTNER_REQUEST_WINDOW_DAYS days (429 REQUEST_LIMIT carries the live values). */
export const PARTNER_REQUEST_LIMIT = 3;
export const PARTNER_REQUEST_WINDOW_DAYS = 30;

export interface PartnerRequestInput {
  readonly businessName: string; readonly categoryCode: string; readonly departmentCode: string; readonly cityCode: string;
  readonly contactPhone: string; readonly contactChannel?: PartnerRequestChannel; readonly message?: string | null; readonly contactConsent: true;
}
export interface PartnerRequest {
  readonly id: string; readonly requesterUserId: string; readonly businessName: string; readonly categoryCode: string; readonly departmentCode: string; readonly cityCode: string;
  readonly contactPhone: string; readonly contactChannel: PartnerRequestChannel; readonly message: string | null; readonly contactConsent: true;
  readonly status: PartnerRequestStatus;
  /** The administrator's reason of a REJECTED request, or WITHDRAWN_BY_REQUESTER. */
  readonly statusReason: string | null;
  readonly reviewedBy: string | null; readonly convertedIntakeId: string | null; readonly createdAt: string; readonly updatedAt: string; readonly version: number;
}
export interface PartnerRequestList { readonly items: readonly PartnerRequest[] }

export const partnerRequestKeys = {
  all: ["partner-requests"] as const,
  mine: ["partner-requests", "mine"] as const
} as const;

const BASE = "/providers/partner-requests";
/** `If-Match: "<version>"` only when the caller knows the version (absent: last writer wins on the server). */
export const partnerRequestIfMatch = (version: number | undefined): Record<string, string> => (version === undefined ? {} : { "If-Match": String(version) });

/** GET .../mine: the caller's requests, newest first (the server's order is kept). */
export function useMyPartnerRequests(client: ApiClient, enabled = true) {
  return useQuery({ queryKey: partnerRequestKeys.mine, queryFn: () => client.request<PartnerRequestList>(`${BASE}/mine`), enabled, staleTime: 5_000, gcTime: 60_000, retry: false });
}

/** POST: 201 OPEN. 422 VALIDATION_FAILED (details field → code), 409 REQUEST_ALREADY_OPEN / ALREADY_PARTNER_OWNER, 429 REQUEST_LIMIT. */
export function useSubmitPartnerRequest(client: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PartnerRequestInput) => client.request<PartnerRequest, PartnerRequestInput>(BASE, { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: partnerRequestKeys.mine })
  });
}

/** DELETE an OPEN own request: it becomes REJECTED with WITHDRAWN_BY_REQUESTER. 409 INVALID_REQUEST_TRANSITION once it was taken. */
export function useWithdrawPartnerRequest(client: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, version }: { readonly requestId: string; readonly version?: number }) =>
      client.request<PartnerRequest>(`${BASE}/${encodeURIComponent(requestId)}`, { method: "DELETE", headers: partnerRequestIfMatch(version) }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: partnerRequestKeys.mine })
  });
}

/** GET /providers/geo (public): Bolivia's cities with their department, the only values the form accepts. Same cache entry as the admin's usePartnerGeo. */
export interface ProviderGeoCity { readonly slug: string; readonly name: string; readonly department: string; readonly departmentCode: string; readonly capital?: boolean }
export function useProviderGeo(client: ApiClient) {
  return useQuery({ queryKey: ["providers", "geo"] as const, queryFn: () => client.request<{ readonly country?: string; readonly items: readonly ProviderGeoCity[] }>("/providers/geo", { auth: false }), staleTime: 300_000 });
}
