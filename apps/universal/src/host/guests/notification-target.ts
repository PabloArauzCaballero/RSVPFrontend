/** Where a notice leads. Templates are the backend's; anything unknown has no direct action (null), never a guess. */
export function notificationTarget(template: string): "requests" | "report" | null {
  if (/companion/i.test(template)) return "requests";
  if (/rsvp/i.test(template)) return "report";
  return null;
}
