import { ApiError } from "@rsvp/api-client";
import { publicClient } from "./api";
import { resolveProviderId } from "./catalog";
import { loadPartner, type Partner } from "./partner";

export interface ProviderProfile { readonly id: string; readonly name: string; readonly currency: string; readonly timeZone: string; readonly status: string }
export type PartnerContext =
  | { readonly state: "ok"; readonly partner: Partner; readonly providerId: string; readonly profile: ProviderProfile }
  | { readonly state: "not-found" }
  | { readonly state: "unavailable"; readonly partner?: Partner };

/** Partner + provider id + public profile (currency and time zone) for the pages that talk to quotes, bookings or the calendar. */
export async function loadPartnerContext(slug: string): Promise<PartnerContext> {
  const lookup = await loadPartner(slug);
  if (lookup.state !== "ok") return lookup.state === "not-found" ? { state: "not-found" } : { state: "unavailable" };
  const providerId = await resolveProviderId(lookup.partner);
  if (!providerId) return { state: "unavailable", partner: lookup.partner };
  try {
    const profile = await publicClient().request<ProviderProfile>(`/providers/${providerId}`, { auth: false });
    if (profile.status !== "VERIFIED") return { state: "not-found" };
    return { state: "ok", partner: lookup.partner, providerId, profile };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return { state: "not-found" };
    return { state: "unavailable", partner: lookup.partner };
  }
}

export { todayIn } from "@rsvp/query-hooks";
