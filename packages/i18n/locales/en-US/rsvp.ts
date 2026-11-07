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
    replayBody: "We had already recorded your reply. If you lost your link, ask the hosts to send you a new one.", linkLabel: "Your personal link",
    emailNotice: "We do not promise a confirmation email: whether you get a notice depends on how the hosts have set theirs up. Your personal link is the only reliable proof of your reply."
  },
  app: { title: "Your invitation", openApp: "Open in the DOne app", openAppHint: "If you have the app installed, open it from here." },
  /** Guest journey in the app (Persuade): invitation, answer and, if they want, a gift. seo-web keeps using the keys above. */
  invite: {
    loading: "Opening your invitation…",
    hostedBy: "{{hosts}} invite you",
    question: "Are you coming?",
    lead: "Answer with one tap. No account needed.",
    yes: "I am in", no: "Cannot make it", chooseOne: "Choose an option to continue.",
    companions: "How many are coming with you?", companionsAdd: "Add a companion", companionsRemove: "Remove a companion", companionsCount: "{{count}} companions",
    companionsIncluded: "Included in your invitation: {{count}}. If you ask for more, your hosts decide.",
    extrasOpen: "Add a dietary restriction or a message", extrasClose: "Hide restriction and message",
    dietary: "Dietary restriction (optional)", dietaryHelp: "Allergies, vegetarian, gluten-free…", message: "Message for your hosts (optional)",
    submitYes: "Confirm I am coming", submitNo: "Let them know I cannot", submitNone: "Send answer", submitting: "Sending…", save: "Save changes", cancelEdit: "Leave it as it is",
    deadlineOpen: "You can answer or change your answer until {{date}} ({{timeZone}} time).", deadlineNone: "You can change your answer whenever you like.",
    countdown: "{{days}} d {{hours}} h {{minutes}} min left", countdownLabel: "Time left to answer",
    doneTitle: "Done, you are in.", doneBodyUntil: "Your answer is saved. You can change it until {{date}}.", doneBodyAnytime: "Your answer is saved. You can change it whenever you like.",
    declinedTitle: "Thanks for letting them know.", declinedBody: "It is noted that you cannot come. If you change your mind, you can change your answer.",
    savedNote: "Changes saved.",
    giftsCta: "See the gift list", giftsHint: "If you would like to give something, reserve one from the list in one tap.",
    againTitleYes: "Your attendance is confirmed", againTitleNo: "It is noted that you cannot come", edit: "Change my answer", editHint: "You can change it until the deadline.",
    summaryLabel: "Your answer", summaryCompanions: "Approved companions: {{count}}", summaryPending: "{{count}} to approve: your hosts decide", summaryDietary: "Dietary restriction: {{value}}", summaryMessage: "Your message: {{value}}", summaryUpdated: "Updated on {{date}}",
    closedTitle: "The time to answer is over", closedOn: "Answers closed on {{date}} ({{timeZone}} time).", closedGeneric: "Your hosts closed the answers.",
    closedHelp: "It can no longer be changed from here, but your hosts can help.", contact: "Need to change something? Write to {{hosts}}.", contactGeneric: "Need to change something? Write to whoever invited you.", contactEmail: "Email:", contactPhone: "Phone:", yourAnswer: "Your last answer:",
    invalidTitle: "This link no longer works", invalidBody: "It may have expired, or a piece of it may be missing. Nothing serious happened.", invalidAction: "Ask whoever invited you for a new link.",
    offlineTitle: "No connection right now", offlineBody: "Check your internet and try again.", unavailableTitle: "We could not open your invitation", unavailableBody: "Try again in a few minutes.", retry: "Try again",
    kept: "Your answer is still here.",
    errors: {
      summary: "Check the marked fields.", companions: "Type a number from 0 up.", tooLong: "That is too long.", required: "This is missing.", email: "Check the email: it should look like name@mail.com.", consent: "We need your permission to save your answer.",
      offline: "No connection right now. Try again when your internet is back.", unavailable: "We could not send your answer right now. Try again in a few minutes.",
      rateLimited: "There were a lot of attempts in a row. Wait {{seconds}} s and try again.", rateLimitedNoWait: "There were a lot of attempts in a row. Wait a moment and try again.",
      rateLimitedMinutes: "There were a lot of attempts. You can try again in about {{minutes}} min. If it is urgent, write to whoever invited you.",
      restricted: "This link can no longer be used to answer. Ask whoever invited you for a new one.",
      validation: "Some details were not accepted. Check them and try again.", conflict: "Your answer changed while you were editing. Reload to see the current version.", unknown: "Something did not go as expected. Try again."
    },
    open: {
      title: "Confirm you are coming", lead: "This invitation is open. Leave your name and email and you are on the list.",
      name: "Your name", email: "Your email", emailHelp: "Only your hosts see it.", consent: "I agree that my hosts keep my name and email and contact me about this event.", submit: "Confirm I am coming",
      checkFailed: "We could not check whether you can sign up. Try again.",
      restrictedTitle: "This celebration only takes answers with a personal link", restrictedBody: "Ask whoever invited you for yours. If you already have it, open it from the original message.",
      doneTitle: "Done, you are in.", doneBody: "Keep your personal link: it is the only way to change your answer later. We do not store it in your browser.",
      replayBody: "We already had your answer. If you lost your link, ask whoever invited you for a new one.", linkLabel: "Your personal link", copyLink: "Copy link", copied: "Link copied.",
      emailNotice: "You may not get a confirmation email: it depends on how your hosts set theirs up. Your link is your proof."
    }
  }
};
