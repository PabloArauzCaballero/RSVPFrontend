import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@rsvp/api-client";
import { cachePolicy } from "../policy.js";
import { invalidation } from "../invalidation.js";
import { queryKeys } from "../keys.js";

/**
 * Organizations of the signed-in account (identity.openapi.json 2.0.0): POST/GET /organizations,
 * GET /organizations/{id}, and invitations: nobody joins an organization without accepting (IDENTIDAD-SEG-003).
 * Kong routes them under /identity.
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

/** An open invitation as the organization's owner sees it. Same shape whether or not the address has an account. */
export interface OrganizationInvitation {
  readonly id: string; readonly organizationId: string; readonly email: string; readonly role: OrganizationMemberRole;
  readonly status: "PENDING"; readonly expiresAt: string; readonly createdAt: string;
}
/** An invitation addressed to the signed-in account. */
export interface ReceivedInvitation {
  readonly id: string; readonly organizationId: string; readonly organizationName: string; readonly role: OrganizationMemberRole;
  readonly expiresAt: string; readonly createdAt: string;
}
/** `emailVerified` false: the list is empty until the account proves its e-mail; the e-mail link (token) still works. */
export interface ReceivedInvitations { readonly emailVerified: boolean; readonly items: readonly ReceivedInvitation[] }
export type InvitationDecision = "accept" | "decline";

/** GET /organizations/{id}/invitations: open invitations (owner or ADMIN). */
export function useOrganizationInvitations(client: ApiClient, organizationId: string, enabled = true) {
  return useQuery({ queryKey: queryKeys.identity.invitations(organizationId), queryFn: () => client.request<{ readonly items: readonly OrganizationInvitation[] }>(`${path(organizationId)}/invitations`), ...cachePolicy.identity, enabled, retry: false });
}

/**
 * POST /organizations/{id}/invitations (owner or ADMIN): 202 with the same body whether or not the address has an account.
 * Nothing changes in the organization until the person accepts. 409: already a member, or too many open invitations.
 */
export function useInviteToOrganization(client: ApiClient, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { readonly email: string; readonly role: OrganizationMemberRole }) => client.request<OrganizationInvitation, { readonly email: string; readonly role: OrganizationMemberRole }>(`${path(organizationId)}/invitations`, { method: "POST", body: input }),
    onSuccess: () => Promise.all(invalidation.invitationsChanged(organizationId).map((queryKey) => queryClient.invalidateQueries({ queryKey })))
  });
}

/** DELETE /organizations/{id}/invitations/{invitationId} (owner or ADMIN): the link stops working. */
export function useRevokeOrganizationInvitation(client: ApiClient, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => client.request<void>(`${path(organizationId)}/invitations/${encodeURIComponent(invitationId)}`, { method: "DELETE" }),
    onSuccess: () => Promise.all(invalidation.invitationsChanged(organizationId).map((queryKey) => queryClient.invalidateQueries({ queryKey })))
  });
}

/** GET /invitations: open invitations addressed to the signed-in account's e-mail. */
export function useMyInvitations(client: ApiClient, enabled = true) {
  return useQuery({ queryKey: queryKeys.identity.myInvitations, queryFn: () => client.request<ReceivedInvitations>("/identity/invitations"), ...cachePolicy.identity, enabled, retry: false });
}

/**
 * POST /invitations/{id}/accept | decline. `token` (from the e-mail link) is required only while the account's e-mail is
 * not verified. 404: not this account's, or no longer open; 403: no proof of the e-mail; 409: already a member.
 */
export function useAnswerInvitation(client: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { readonly invitationId: string; readonly decision: InvitationDecision; readonly token?: string }) =>
      client.request<{ readonly organizationId: string; readonly role: OrganizationMemberRole } | undefined, { readonly token?: string }>(
        `/identity/invitations/${encodeURIComponent(input.invitationId)}/${input.decision}`, { method: "POST", body: input.token ? { token: input.token } : {} }),
    onSuccess: () => Promise.all(invalidation.invitationAnswered().map((queryKey) => queryClient.invalidateQueries({ queryKey })))
  });
}
