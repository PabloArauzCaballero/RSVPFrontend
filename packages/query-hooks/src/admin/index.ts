import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@rsvp/api-client";

/**
 * Platform-admin hooks (F14). Endpoints marked EXPECTED are not in the published OpenAPI specs yet
 * (provider-catalog exposes only register/verify/listings; identity only organizations). They follow the
 * conventions of `/celebrations/admin/*` and are the contract the backend lanes must publish. Until then
 * the gateway answers 404/503 and every screen shows its error state; nothing is invented client-side.
 */

export const adminKeys = {
  all: ["admin"] as const,
  categories: ["admin", "categories"] as const,
  geography: ["admin", "geography"] as const,
  verification: (status: string) => ["admin", "verification", status] as const,
  verificationAll: ["admin", "verification"] as const,
  moderation: (status: string) => ["admin", "moderation", status] as const,
  moderationAll: ["admin", "moderation"] as const,
  leads: (params: string) => ["admin", "metrics", "leads", params] as const,
  users: (search: string) => ["admin", "users", search] as const,
  organizations: ["admin", "organizations"] as const,
  organization: (id: string) => ["admin", "organizations", id] as const
} as const;

/** Admin data is operational: always re-check quickly. */
const FRESH = { staleTime: 5_000, gcTime: 60_000 } as const;

export interface Items<T> { readonly items: readonly T[] }

// ---- Categories · EXPECTED GET /providers/admin/categories, PUT /providers/admin/categories/{code}
export interface ProviderCategory { readonly code: string; readonly names: Readonly<Record<string, string>>; readonly active: boolean }
export function useAdminCategories(client: ApiClient) {
  return useQuery({ queryKey: adminKeys.categories, queryFn: () => client.request<Items<ProviderCategory>>("/providers/admin/categories"), ...FRESH });
}
export function useUpsertCategory(client: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, ...body }: ProviderCategory) => client.request<ProviderCategory, Omit<ProviderCategory, "code">>(`/providers/admin/categories/${encodeURIComponent(code)}`, { method: "PUT", body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.categories })
  });
}

// ---- Geography · EXPECTED GET /providers/admin/geography, PUT /providers/admin/geography/{code}
export type GeoKind = "COUNTRY" | "REGION" | "CITY";
export interface GeoEntry { readonly code: string; readonly kind: GeoKind; readonly parentCode: string | null; readonly names: Readonly<Record<string, string>>; readonly active: boolean }
export function useAdminGeography(client: ApiClient) {
  return useQuery({ queryKey: adminKeys.geography, queryFn: () => client.request<Items<GeoEntry>>("/providers/admin/geography"), ...FRESH });
}
export function useUpsertGeoEntry(client: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, ...body }: GeoEntry) => client.request<GeoEntry, Omit<GeoEntry, "code">>(`/providers/admin/geography/${encodeURIComponent(code)}`, { method: "PUT", body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.geography })
  });
}

// ---- Verification · EXPECTED GET /providers/admin/verification-queue?status=
//      verify = POST /providers/{id}/verify (published); EXPECTED POST /providers/{id}/reject and /suspend with { reason }
export type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";
export type VerificationAction = "verify" | "reject" | "suspend";
export interface VerificationItem { readonly providerId: string; readonly name: string; readonly category: string; readonly city: string; readonly submittedAt: string; readonly status: VerificationStatus; readonly reason?: string | null }
export function useVerificationQueue(client: ApiClient, status: VerificationStatus = "PENDING") {
  return useQuery({ queryKey: adminKeys.verification(status), queryFn: () => client.request<Items<VerificationItem>>(`/providers/admin/verification-queue?status=${status}`), ...FRESH });
}
export function useVerificationAction(client: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ providerId, action, reason }: { readonly providerId: string; readonly action: VerificationAction; readonly reason?: string }) =>
      client.request<unknown, { readonly reason: string } | undefined>(`/providers/${encodeURIComponent(providerId)}/${action}`, { method: "POST", ...(action === "verify" ? {} : { body: { reason: reason ?? "" } }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.verificationAll })
  });
}

// ---- Moderation · EXPECTED GET /providers/admin/moderation?status=, POST /providers/admin/moderation/{id}/approve|reject
export type ModerationKind = "MICROSITE" | "EXTERNAL_GIFT";
export type ModerationStatus = "PENDING" | "APPROVED" | "REJECTED";
export interface ModerationItem { readonly id: string; readonly kind: ModerationKind; readonly title: string; readonly url?: string | null; readonly submittedBy: string; readonly submittedAt: string; readonly status: ModerationStatus; readonly reason?: string | null }
export function useModerationQueue(client: ApiClient, status: ModerationStatus = "PENDING") {
  return useQuery({ queryKey: adminKeys.moderation(status), queryFn: () => client.request<Items<ModerationItem>>(`/providers/admin/moderation?status=${status}`), ...FRESH });
}
export function useModerationDecision(client: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, reason }: { readonly id: string; readonly decision: "approve" | "reject"; readonly reason?: string }) =>
      client.request<unknown, { readonly reason: string } | undefined>(`/providers/admin/moderation/${encodeURIComponent(id)}/${decision}`, { method: "POST", ...(decision === "reject" ? { body: { reason: reason ?? "" } } : {}) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.moderationAll })
  });
}

// ---- Lead metrics · EXPECTED GET /providers/admin/metrics/leads?groupBy=partner|category&from=YYYY-MM-DD&to=YYYY-MM-DD
export type LeadGrouping = "partner" | "category";
export interface LeadMetricRow { readonly key: string; readonly label: string; readonly leads: number; readonly quotes: number; readonly bookings: number }
export interface LeadMetrics { readonly groupBy: LeadGrouping; readonly from: string; readonly to: string; readonly total: number; readonly items: readonly LeadMetricRow[] }
export interface LeadMetricsQuery { readonly groupBy: LeadGrouping; readonly from: string; readonly to: string; readonly enabled?: boolean }
export function useLeadMetrics(client: ApiClient, { groupBy, from, to, enabled = true }: LeadMetricsQuery) {
  const params = new URLSearchParams({ groupBy, from, to }).toString();
  return useQuery({ queryKey: adminKeys.leads(params), queryFn: () => client.request<LeadMetrics>(`/providers/admin/metrics/leads?${params}`), ...FRESH, enabled });
}

// ---- Users · EXPECTED GET /identity/admin/users?query=
export interface AdminUser { readonly id: string; readonly email: string; readonly roles: readonly string[]; readonly status: "ACTIVE" | "SUSPENDED"; readonly createdAt: string }
export function useAdminUsers(client: ApiClient, search: string) {
  const query = search.trim();
  return useQuery({ queryKey: adminKeys.users(query), queryFn: () => client.request<Items<AdminUser>>(`/identity/admin/users${query ? `?query=${encodeURIComponent(query)}` : ""}`), ...FRESH });
}

// ---- Organizations · GET /identity/organizations/{id} is PUBLISHED (members and ADMIN); EXPECTED GET /identity/admin/organizations
export interface OrganizationMember { readonly userId: string; readonly role?: string; readonly [key: string]: unknown }
export interface Organization { readonly id: string; readonly name: string; readonly ownerUserId: string; readonly members: readonly OrganizationMember[] }
export function useAdminOrganizations(client: ApiClient) {
  return useQuery({ queryKey: adminKeys.organizations, queryFn: () => client.request<Items<Organization>>("/identity/admin/organizations"), ...FRESH, retry: false });
}
export function useOrganization(client: ApiClient, id: string) {
  return useQuery({ queryKey: adminKeys.organization(id), queryFn: () => client.request<Organization>(`/identity/organizations/${encodeURIComponent(id)}`), ...FRESH, enabled: Boolean(id), retry: false });
}
