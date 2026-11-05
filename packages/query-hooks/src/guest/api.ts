import { createContractClient, type ApiClient } from "@rsvp/api-client";
import type { GuestRsvpPaths, NotificationPaths } from "@rsvp/contracts";
import type { CompanionDecision, DeviceRegistration, NotificationPreferencesPatch, RegisterGuestInput, RsvpResponse, UnregisteredConfirmation } from "./types.js";

/**
 * Gateway routes (infra/kong/kong.yml): `/rsvp/*` reaches the guest service unchanged and is public
 * (the opaque guest token is the Bearer); `/guests/*` is the JWT-protected host surface and drops the prefix.
 */
const GUEST_PREFIX = "";
const HOST_PREFIX = "/guests";

const bearer = (token: string): HeadersInit => ({ authorization: `Bearer ${token}` });
const idempotency = (key: string | undefined): HeadersInit => (key ? { "idempotency-key": key } : {});

/** Calls made with the guest's personal token. The token is only ever put in the Authorization header. */
export function guestAccessApi(client: ApiClient) {
  const api = createContractClient<GuestRsvpPaths>(client, GUEST_PREFIX);
  const rsvp = "/rsvp/celebrations/{celebrationId}/rsvp" as const;
  return {
    resource: (celebrationId: string, token: string, signal?: AbortSignal) => api.get("/rsvp/celebrations/{celebrationId}/guest", { path: { celebrationId }, auth: false, headers: bearer(token), signal }),
    read: (celebrationId: string, token: string, signal?: AbortSignal) => api.get(rsvp, { path: { celebrationId }, auth: false, headers: bearer(token), signal }),
    create: (celebrationId: string, token: string, body: RsvpResponse, key: string) => api.post(rsvp, { path: { celebrationId }, body, auth: false, headers: { ...bearer(token), ...idempotency(key) } }),
    update: (celebrationId: string, token: string, body: RsvpResponse, key?: string) => api.patch(rsvp, { path: { celebrationId }, body, auth: false, headers: { ...bearer(token), ...idempotency(key) } }),
    /** POST /rsvp/resolve: the opaque credential (Bearer) → its celebration, without a slug in the URL. */
    resolve: (token: string, signal?: AbortSignal) => api.post("/rsvp/resolve", { auth: false, headers: bearer(token), signal }),
    /** GET .../public-settings: whether POST .../unregistered can succeed, asked before the form is shown. */
    publicSettings: (celebrationId: string, signal?: AbortSignal) => api.get("/rsvp/celebrations/{celebrationId}/public-settings", { path: { celebrationId }, auth: false, signal }),
    /** Public registration; the Idempotency-Key is mandatory so a retry never creates a second guest. */
    registerUnregistered: (celebrationId: string, body: UnregisteredConfirmation, key: string) => api.post("/rsvp/celebrations/{celebrationId}/unregistered", { path: { celebrationId }, body, auth: false, headers: idempotency(key) })
  } as const;
}

/** Host-only calls (JWT). */
export function hostGuestsApi(client: ApiClient) {
  const api = createContractClient<GuestRsvpPaths>(client, HOST_PREFIX);
  return {
    list: (celebrationId: string, query: { readonly status?: "PENDING" | "CONFIRMED" | "DECLINED"; readonly groupId?: string; readonly search?: string; readonly limit?: number; readonly offset?: number }, signal?: AbortSignal) =>
      api.get("/celebrations/{celebrationId}/guest-list", { path: { celebrationId }, query, signal }),
    summary: (celebrationId: string) => api.get("/celebrations/{celebrationId}/guest-summary", { path: { celebrationId } }),
    detail: (celebrationId: string, guestId: string) => api.get("/celebrations/{celebrationId}/guests/{guestId}", { path: { celebrationId, guestId } }),
    register: (celebrationId: string, body: RegisterGuestInput) => api.post("/celebrations/{celebrationId}/guests", { path: { celebrationId }, body }),
    importCsv: (celebrationId: string, csv: string) => api.post("/celebrations/{celebrationId}/guests/import", { path: { celebrationId }, body: { csv } }),
    groups: (celebrationId: string) => api.get("/celebrations/{celebrationId}/groups", { path: { celebrationId }, query: { limit: 1000 } }),
    changeGroup: (celebrationId: string, guestId: string, groupId: string | null) => api.patch("/celebrations/{celebrationId}/guests/{guestId}", { path: { celebrationId, guestId }, body: { groupId } }),
    catering: (celebrationId: string, query: { readonly status?: "PENDING" | "CONFIRMED" | "DECLINED"; readonly withNotesOnly?: boolean; readonly includeMessage?: boolean; readonly limit?: number; readonly cursor?: string }) =>
      api.get("/celebrations/{celebrationId}/catering-report", { path: { celebrationId }, query }),
    createGroup: (celebrationId: string, name: string) => api.post("/celebrations/{celebrationId}/groups", { path: { celebrationId }, body: { name } }),
    group: (celebrationId: string, groupId: string) => api.get("/celebrations/{celebrationId}/groups/{groupId}", { path: { celebrationId, groupId } }),
    issueToken: (celebrationId: string, guestId: string) => api.post("/celebrations/{celebrationId}/guests/{guestId}/access-token", { path: { celebrationId, guestId }, body: {} }),
    revokeToken: (celebrationId: string, guestId: string) => api.delete("/celebrations/{celebrationId}/guests/{guestId}/access-token", { path: { celebrationId, guestId } }),
    rsvps: (celebrationId: string, query: { readonly limit?: number; readonly offset?: number }) => api.get("/celebrations/{celebrationId}/rsvps", { path: { celebrationId }, query }),
    companionRequests: (celebrationId: string) => api.get("/celebrations/{celebrationId}/companion-requests", { path: { celebrationId }, query: { limit: 100 } }),
    decide: (celebrationId: string, requestId: string, decision: CompanionDecision) => api.post("/celebrations/{celebrationId}/companion-requests/{requestId}/decision", { path: { celebrationId, requestId }, body: { decision } })
  } as const;
}

/** Host notification surface (notification-service, gateway prefix `/notifications` is stripped by the service). */
export function hostNotificationsApi(client: ApiClient) {
  const api = createContractClient<NotificationPaths>(client, "/notifications");
  return {
    inbox: (celebrationId: string, limit = 50) => api.get("/celebrations/{celebrationId}/notifications", { path: { celebrationId }, query: { limit } }),
    preferences: (celebrationId: string) => api.get("/celebrations/{celebrationId}/preferences", { path: { celebrationId } }),
    updatePreferences: (celebrationId: string, body: NotificationPreferencesPatch) => api.patch("/celebrations/{celebrationId}/preferences", { path: { celebrationId }, body }),
    markRead: (celebrationId: string, notificationId: string) => api.post("/celebrations/{celebrationId}/notifications/{notificationId}/read", { path: { celebrationId, notificationId }, body: {} }),
    /** PUT /celebrations/{id}/recipients: ONE call synchronizes the whole guest list (Notification reads Guest with the caller's credential). */
    syncRecipients: (celebrationId: string, guestIds?: readonly string[]) => api.put("/celebrations/{celebrationId}/recipients", { path: { celebrationId }, body: guestIds ? { guestIds: [...guestIds] } : {} }),
    devices: (celebrationId: string) => api.get("/celebrations/{celebrationId}/devices", { path: { celebrationId } }),
    registerDevice: (celebrationId: string, body: DeviceRegistration) => api.post("/celebrations/{celebrationId}/devices", { path: { celebrationId }, body }),
    unregisterDevice: (celebrationId: string, deviceId: string) => api.delete("/celebrations/{celebrationId}/devices/{deviceId}", { path: { celebrationId, deviceId } })
  } as const;
}
