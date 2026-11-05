import type { DeepStrings } from "../types.js";
import type { rsvpEsBO } from "../es-BO/rsvp.js";

/** Guest RSVP through the personal link (F15 web, F21 app). */
export const rsvpEnUS: DeepStrings<typeof rsvpEsBO> = {
  page: { title: "Your response", invitationTo: "Invitation to {{title}}" },
  loading: "Opening your invitation…",
  invalid: {
    title: "This link is not available",
    body: "It may have expired, been revoked or be incomplete. Ask whoever invited you to send you a new one.",
    hint: "Check that you copied the whole link."
  },
  guest: { title: "Can you join us?", intro: "Reply with your personal link. You do not need an account." },
  deadline: { open: "You can reply or change your answer until {{date}} ({{timeZone}} time).", none: "You can change your answer at any time." },
  countdown: { value: "{{days}} d {{hours}} h {{minutes}} min left to reply", label: "Time left to reply" },
  form: {
    statusLegend: "Will you attend?", confirm: "Yes, I will attend", decline: "I cannot attend",
    companions: "Guests with you", companionsHelp: "Your invitation includes up to {{count}}. Asking for more needs the host's approval.",
    dietary: "Dietary restrictions", dietaryHelp: "Allergies, vegetarian, gluten free…",
    message: "Message for the hosts (optional)",
    name: "Your name", email: "Your email", emailHelp: "Only the hosts will see it.",
    consent: "I consent to the hosts storing my name and email and contacting me about this event.",
    submit: "Send reply", submitting: "Sending…", save: "Save changes", cancelEdit: "Cancel", register: "Confirm my attendance"
  },
  errors: {
    summary: "Check the highlighted fields.",
    companions: "Enter a whole number, 0 or more.", tooLong: "This text is too long.", required: "This field is required.", email: "Enter a valid email, for example name@mail.com.", consent: "We need your consent to save your reply.",
    offline: "No connection. Your reply is still here and was not lost: try again when the internet is back.",
    unavailable: "The service is not responding right now. Your reply is still here: try again in a few minutes.",
    rateLimited: "Too many attempts in a row. Wait {{seconds}} seconds and try again; your reply is still here.",
    rateLimitedNoWait: "Too many attempts in a row. Wait a moment and try again; your reply is still here.",
    validation: "The service did not accept some of the data. Check it and try again.",
    conflict: "This reply was already sent with other data. Reload to see the current version.",
    unknown: "We could not save your reply. Try again; what you wrote is still here.",
    celebrationMissing: "We could not find this celebration."
  },
  actions: { retry: "Try again", reload: "Reload", copyLink: "Copy link", copied: "Link copied." },
  draft: { kept: "Your draft is kept on this device only until the submission is confirmed." },
  success: { confirmed: "Done: your attendance is confirmed.", declined: "Thanks for letting us know. We noted that you cannot attend.", saved: "Changes saved." },
  status: { PENDING: "Not answered", CONFIRMED: "You will attend", DECLINED: "You will not attend" },
  confirmed: { title: "Your attendance is confirmed", titleDeclined: "We noted that you cannot attend", edit: "Change my reply", editHint: "You can change it until the deadline." },
  summary: {
    label: "Your reply", companions: "Approved guests with you: {{count}}", pendingCompanions: "{{count}} waiting for the host's approval", dietary: "Restrictions: {{value}}", message: "Your message: {{value}}", updated: "Last updated: {{date}}", none: "No additional details."
  },
  closed: {
    contactEmail: "Contact email:", contactPhone: "Contact phone:",
    title: "The reply deadline has passed",
    closedOn: "It closed on {{date}} ({{timeZone}} time).", closedGeneric: "The hosts closed replies.",
    contact: "If you need to change your reply, write to {{hosts}}.", contactGeneric: "If you need to change your reply, write to whoever invited you.",
    yourAnswer: "Your last reply: {{status}}"
  },
  unregistered: {
    checking: "Checking whether this celebration accepts sign-ups…", unavailable: "We could not check whether you can sign up. Try again.",
    title: "Confirm your attendance", intro: "If you did not get a personal link, you can register here when the hosts allow it.",
    restrictedTitle: "This celebration only accepts guests with a personal link",
    restrictedBody: "Ask whoever invited you to send your link. If you already have it, open it from the original message.",
    doneTitle: "Done: your attendance is confirmed", doneBody: "Keep your personal link. It is the only way to change your reply later; we do not store it in your browser.",
    replayBody: "We had already recorded your reply. If you lost your link, ask the hosts to send you a new one.", linkLabel: "Your personal link"
  },
  app: { title: "Your invitation", openApp: "Open in the DOne app", openAppHint: "If you have the app installed, open it from here." }
};
