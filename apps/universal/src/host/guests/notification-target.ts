/** Where a notice leads. Templates are the backend's; anything unknown has no direct action (null), never a guess. */
export function notificationTarget(template: string): "requests" | "report" | null {
  if (/companion/i.test(template)) return "requests";
  if (/rsvp/i.test(template)) return "report";
  return null;
}

/** Host notices whose copy the app owns, so the subject and text follow the person's language and not the one the celebration was created in. Unknown templates keep the server's text. */
export const KNOWN_NOTICE_TEMPLATES = ["companionRequested", "giftRequested", "leadCapReached", "celebrationPublished", "pushTest", "hostRsvpConfirmed", "hostRsvpDeclined", "hostRsvpChanged"] as const;
export type KnownNoticeTemplate = (typeof KNOWN_NOTICE_TEMPLATES)[number];
export const knownNoticeTemplate = (template: string): KnownNoticeTemplate | null => KNOWN_NOTICE_TEMPLATES.find((name) => name === template) ?? null;
