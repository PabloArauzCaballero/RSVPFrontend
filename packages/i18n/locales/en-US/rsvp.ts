import type { DeepStrings } from "../types.js";
import type { rsvpEsBO } from "../es-BO/rsvp.js";
/** Guest RSVP through the personal link (F15 web, F21 app). */
export const rsvpEnUS: DeepStrings<typeof rsvpEsBO> = {
  page: { title: "Your response" },
  status: { PENDING: "Not answered", CONFIRMED: "You will attend", DECLINED: "You will not attend" },
  /** Guest journey in the app (Persuade): invitation, answer and, if they want, a gift. The public site (seo-web) uses the same keys since M21. */
  invite: {
    loading: "Opening your invitation…",
    hostedBy: "{{hosts}} invite you",
    question: "Are you coming?",
    lead: "One tap to answer. No account or password.",
    yes: "I am in", no: "Cannot make it", chooseOne: "Choose an option to continue.",
    companions: "How many are coming with you?", companionsAdd: "Add a companion", companionsRemove: "Remove a companion", companionsCount: "{{count}} companions",
    companionsIncluded: "Included in your invitation: {{count}}. If you ask for more, your hosts decide.",
    extrasOpen: "Add a dietary restriction or a message", extrasClose: "Hide restriction and message",
    dietary: "Dietary restriction (optional)", dietaryHelp: "Allergies, vegetarian, gluten-free…", message: "Message for your hosts (optional)",
    submitYes: "Confirm I am coming", submitNo: "Let them know I cannot", submitNone: "Send answer", submitting: "Sending…", save: "Save changes", cancelEdit: "Leave it as it is",
    deadlineOpen: "You can change your answer until {{date}} ({{timeZone}} time).", deadlineNone: "You can change your answer whenever you like.",
    countdown: "{{days}} d {{hours}} h {{minutes}} min left", countdownLabel: "Time left to answer",
    doneTitle: "Done, you are in.", doneBodyUntil: "Your answer is saved. You can change it until {{date}}.", doneBodyAnytime: "Your answer is saved. You can change it whenever you like.",
    declinedTitle: "Thanks for letting them know.", declinedBody: "It is noted that you cannot come. If you change your mind, you can change your answer.",
    savedNote: "Changes saved.",
    giftsCta: "See the gift list", giftsClosedHint: "The gift list is closed: gifts can no longer be reserved.", giftsHint: "Want to give a gift? Reserve one in a tap.",
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
      name: "Your name", email: "Your email", emailHelp: "Only your hosts see it.", consent: "I agree that my hosts keep my name and email and contact me about this event, as the privacy policy describes.", submit: "Confirm I am coming",
      checkFailed: "We could not check whether you can sign up. Try again.",
      restrictedTitle: "This celebration only takes answers with a personal link", restrictedBody: "Ask whoever invited you for yours. If you already have it, open it from the original message.",
      doneTitle: "Done, you are in.", doneBody: "Keep your personal link: it is the only way to change your answer later. We do not store it in your browser.",
      replayBody: "We already had your answer. If you lost your link, ask whoever invited you for a new one.", linkLabel: "Your personal link", copyLink: "Copy link", copied: "Link copied.",
      emailNotice: "A confirmation email may not arrive. Your link is your proof: keep it."
    }
  }
};
