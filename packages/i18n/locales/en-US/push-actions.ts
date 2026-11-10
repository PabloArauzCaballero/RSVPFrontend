export const pushActionsEnUS = {
  title: "Reservation request",
  approve: "Approve reservation", reject: "Reject reservation", inbox: "View gift inbox", retry: "Check latest status", signIn: "Sign in to continue",
  gift: "Gift reservation", requester: "Requested by: {{name}}", hidden: "Identity hidden", anonymous: "Guest", requestedAt: "Requested on {{date}}",
  giftUnavailable: "The gift name could not be loaded. You can still check the reservation status.",
  applied: "Your decision was saved. The reservation status is up to date.",
  resolved: "This request has already been resolved. Its current status is shown below.",
  changed: "The request changed while you were responding. Check its status before deciding again.",
  sessionExpired: "Your session expired. Sign in to review this same request; no decision will be sent automatically.",
  forbidden: "You do not have permission to decide this reservation. Contact the celebration host.",
  missing: "This request is unavailable. Check the current requests in the gift inbox.",
  invalid: "This decision could not be processed. Check the request status before trying again.",
  failed: "We could not confirm the result. Check the status before trying again.",
  busy: "A decision for this request is already being processed.",
  status: { PENDING_REVIEW: "Awaiting your decision", COMMITTED: "Reservation approved", REJECTED: "Reservation rejected" }
} as const;
