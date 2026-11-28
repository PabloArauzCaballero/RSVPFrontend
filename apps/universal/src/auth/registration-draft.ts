/**
 * What the sign-up remembers while the person moves between its four steps, and the one thing the sign-up hands to the sign-in.
 * It lives ONLY in this module's memory: never in `localStorage`, `sessionStorage`, a cookie, a URL, analytics or a log, because
 * it holds personal data (name, mobile, e-mail) and the single-use proof of the e-mail (MV-D2 risk R6, PF-1). A reload forgets it.
 * It exists so that reading the terms (a navigation away from the form) does not throw away a verified e-mail.
 * The password is deliberately NOT here: it stays in the screen's own state and is gone when the screen is.
 */
export interface RegistrationDraft {
  /** 1-based step the person was on. */
  readonly step: 1 | 2 | 3 | 4;
  readonly email: string;
  /** The single-use proof of `proofEmail` (Identity 2.3.0); null until the code was verified. */
  readonly proof: string | null;
  /** The address the proof belongs to: changing the e-mail field afterwards voids the proof. */
  readonly proofEmail: string;
  readonly role: "HOST" | "PLANNER" | "PROVIDER";
  readonly givenName: string;
  readonly familyName: string;
  readonly organizationName: string;
  readonly phone: string;
  /** A city of the list, or `OTHER` with the text in `otherCity`. */
  readonly city: string;
  readonly otherCity: string;
  readonly marketingOptIn: boolean;
  readonly termsAccepted: boolean;
}

export const EMPTY_REGISTRATION_DRAFT: RegistrationDraft = {
  step: 1, email: "", proof: null, proofEmail: "", role: "HOST", givenName: "", familyName: "", organizationName: "", phone: "+591 ", city: "", otherCity: "", marketingOptIn: false, termsAccepted: false
};

let draft: RegistrationDraft | null = null;
let loginEmail = "";

/** The remembered draft, or null when there is none (first visit, after sign-up, after a reload). */
export function readRegistrationDraft(): RegistrationDraft | null { return draft; }
export function writeRegistrationDraft(next: RegistrationDraft): void { draft = next; }
export function clearRegistrationDraft(): void { draft = null; }

/**
 * The e-mail the person typed in the sign-up, offered to the sign-in when they tap "I already have an account". It travels by this
 * module (the same app, the same device) and NEVER in the URL (PF-1): `/login` stays exactly `/login`.
 */
export function rememberLoginEmail(email: string): void { loginEmail = email.trim(); }
export function readLoginEmail(): string { return loginEmail; }
export function clearLoginEmail(): void { loginEmail = ""; }
