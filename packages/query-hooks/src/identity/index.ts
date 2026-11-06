import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@rsvp/api-client";
import { cachePolicy } from "../policy.js";
import { invalidation } from "../invalidation.js";
import { queryKeys } from "../keys.js";

/**
 * Organizations of the signed-in account (identity.openapi.json): POST/GET /organizations,
 * GET /organizations/{id} and POST /organizations/{id}/members. Kong routes them under /identity.
 */

export const ORGANIZATION_NAME_MAX = 120;
export type OrganizationMemberRole = "HOST" | "PLANNER";
export const ORGANIZATION_MEMBER_ROLES: readonly OrganizationMemberRole[] = ["HOST", "PLANNER"];

export interface OrganizationSummary { readonly id: string; readonly name: string; readonly ownerUserId: string }
export interface OrganizationMemberRow { readonly userId: string; readonly role: OrganizationMemberRole; /** Absent in the creation response. */ readonly email?: string }
export interface OrganizationDetail extends OrganizationSummary { readonly members: readonly OrganizationMemberRow[] }

const path = (id: string): string => `/identity/organizations/${encodeURIComponent(id)}`;

/** GET /organizations: the organizations the caller belongs to. */
export function useMyOrganizations(client: ApiClient, enabled = true) {
  return useQuery({ queryKey: queryKeys.identity.organizations, queryFn: () => client.request<{ readonly items: readonly OrganizationSummary[] }>("/identity/organizations"), ...cachePolicy.identity, enabled, retry: false });
}

/** GET /organizations/{id}: members are visible to members and ADMIN only. */
export function useOrganizationDetail(client: ApiClient, id: string | null) {
  return useQuery({ queryKey: queryKeys.identity.organization(id ?? ""), queryFn: () => client.request<OrganizationDetail>(path(id ?? "")), ...cachePolicy.identity, enabled: Boolean(id), retry: false });
}

/** POST /organizations (PLANNER or ADMIN). The caller becomes its owner. */
export function useCreateOrganization(client: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { readonly name: string }) => client.request<OrganizationDetail, { readonly name: string }>("/identity/organizations", { method: "POST", body: input }),
    onSuccess: () => Promise.all(invalidation.organizationsChanged().map((queryKey) => queryClient.invalidateQueries({ queryKey })))
  });
}

/** POST /organizations/{id}/members: adds an existing account (owner or ADMIN). 404 unknown account, 409 already a member. */
export function useAddOrganizationMember(client: ApiClient, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { readonly email: string; readonly role: OrganizationMemberRole }) => client.request<OrganizationMemberRow, { readonly email: string; readonly role: OrganizationMemberRole }>(`${path(organizationId)}/members`, { method: "POST", body: input }),
    onSuccess: () => Promise.all(invalidation.organizationChanged(organizationId).map((queryKey) => queryClient.invalidateQueries({ queryKey })))
  });
}
