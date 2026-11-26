import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@rsvp/api-client";
import { partnerRequestIfMatch, partnerRequestKeys, type PartnerRequest, type PartnerRequestStatus } from "../provider/partner-requests.js";
import { partnerKeys, type Intake } from "./partners.js";

/**
 * Partner requests, admin side (DPA-10). Hand-written copies of provider-catalog 3.3.0 (RSVPBackend #108: `PartnerRequestPage`,
 * `PartnerRequestConversion`, `ReasonRequest`), ADMIN-only on the server. Every action takes an optional `If-Match: <version>`;
 * a stale one answers 409 PARTNER_REQUEST_VERSION_CONFLICT, an action the status does not allow 409 INVALID_REQUEST_TRANSITION.
 */

export const PARTNER_REQUESTS_PAGE_SIZE = 25;
/** The queue the admin works on by default: what still needs an answer (the tab badge counts the same two). */
export const OPEN_REQUEST_STATUSES: readonly PartnerRequestStatus[] = ["OPEN", "IN_REVIEW"];
export const PARTNER_REQUEST_REASON_MAX = 500;

export interface PartnerRequestPage {
  readonly items: readonly PartnerRequest[]; readonly page: number; readonly pageSize: number; readonly total: number;
  /** The whole queue, whatever the filter. */
  readonly counts: { readonly OPEN: number; readonly IN_REVIEW: number };
}
export interface PartnerRequestConversion { readonly request: PartnerRequest; readonly intake: Intake }
export interface PartnerRequestFilters { readonly statuses?: readonly PartnerRequestStatus[]; readonly q?: string; readonly page?: number }
export type PartnerRequestAction = "take" | "reject" | "convert";

export const adminPartnerRequestKeys = {
  all: ["admin", "partner-requests"] as const,
  list: (path: string) => ["admin", "partner-requests", "list", path] as const
} as const;

const ADMIN_REQUESTS = "/providers/admin/partner-requests";

/** `status[]` repeated per status (absent: every status), `q` trimmed, newest first, zero-based page, 25 per page. */
export function adminPartnerRequestsPath(filters: PartnerRequestFilters): string {
  const params = new URLSearchParams();
  for (const status of filters.statuses ?? []) params.append("status[]", status);
  const q = filters.q?.trim();
  if (q) params.append("q", q);
  params.append("sort", "-createdAt");
  params.append("page", String(filters.page ?? 0));
  params.append("pageSize", String(PARTNER_REQUESTS_PAGE_SIZE));
  return `${ADMIN_REQUESTS}?${params.toString()}`;
}

export function useAdminPartnerRequests(client: ApiClient, filters: PartnerRequestFilters) {
  const path = adminPartnerRequestsPath(filters);
  return useQuery({ queryKey: adminPartnerRequestKeys.list(path), queryFn: () => client.request<PartnerRequestPage>(path), staleTime: 5_000, gcTime: 60_000, placeholderData: (previous) => previous });
}

const actionPath = (requestId: string, action: PartnerRequestAction): string => `${ADMIN_REQUESTS}/${encodeURIComponent(requestId)}/${action}`;
type Target = { readonly requestId: string; readonly version?: number };

/** After any action: the admin queue (list and badge) and, for a same-browser requester, their own list. */
function useRefreshQueue() {
  const queryClient = useQueryClient();
  return { queryClient, refresh: () => Promise.all([queryClient.invalidateQueries({ queryKey: adminPartnerRequestKeys.all }), queryClient.invalidateQueries({ queryKey: partnerRequestKeys.all })]) };
}

/** OPEN → IN_REVIEW, the admin becomes the reviewer. */
export function useTakePartnerRequest(client: ApiClient) {
  const { refresh } = useRefreshQueue();
  return useMutation({ mutationFn: ({ requestId, version }: Target) => client.request<PartnerRequest>(actionPath(requestId, "take"), { method: "POST", headers: partnerRequestIfMatch(version) }), onSettled: refresh });
}

/** OPEN or IN_REVIEW → REJECTED with `{ reason }` (1–500 characters, shown to the requester). 422 REASON_REQUIRED / REASON_TOO_LONG. */
export function useRejectPartnerRequest(client: ApiClient) {
  const { refresh } = useRefreshQueue();
  return useMutation({
    mutationFn: ({ requestId, version, reason }: Target & { readonly reason: string }) =>
      client.request<PartnerRequest, { readonly reason: string }>(actionPath(requestId, "reject"), { method: "POST", body: { reason }, headers: partnerRequestIfMatch(version) }),
    onSettled: refresh
  });
}

/**
 * OPEN or IN_REVIEW → CONVERTED, with a new OPEN intake owned by the requester and prefilled (one transaction). The intake goes
 * straight into the cache so the partner wizard opens on it without another read; the partners and intakes lists refresh.
 */
export function useConvertPartnerRequest(client: ApiClient) {
  const { queryClient, refresh } = useRefreshQueue();
  return useMutation({
    mutationFn: ({ requestId, version }: Target) => client.request<PartnerRequestConversion>(actionPath(requestId, "convert"), { method: "POST", headers: partnerRequestIfMatch(version) }),
    onSuccess: ({ intake }) => {
      queryClient.setQueryData(partnerKeys.intake(intake.id), intake);
      return Promise.all([queryClient.invalidateQueries({ queryKey: partnerKeys.openIntakes }), queryClient.invalidateQueries({ queryKey: partnerKeys.lists })]);
    },
    onSettled: refresh
  });
}
