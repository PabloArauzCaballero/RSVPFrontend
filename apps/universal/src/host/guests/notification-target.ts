import type { HostRoute } from "../routes";

const TARGETS = new Map<string, HostRoute>([
  ["companionRequested", "requests"],
  ["rsvp.companion.requested", "requests"],
  ["hostRsvpConfirmed", "report"],
  ["hostRsvpDeclined", "report"],
  ["hostRsvpChanged", "report"],
  ["guest.rsvp.confirmed", "report"],
  ["rsvp.confirmed", "report"],
  ["giftRequested", "giftInbox"],
  ["celebrationPublished", "preview"]
]);

/** Unknown templates can be read, but never produce a navigation action. */
export function notificationTarget(template: string): HostRoute | null {
  return TARGETS.get(template) ?? null;
}
