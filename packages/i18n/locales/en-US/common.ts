export const enUS = {
  common: { loading: "Loading…", retry: "Try again", cancel: "Cancel", save: "Save", signOut: "Sign out", more: "More", close: "Close", empty: "There are no results." },
  auth: {
    signOut: { title: "Are you sure you want to sign out?", body: "You can cancel to stay signed in." },
    restoreUnavailable: { title: "We couldn't restore your session", body: "Check your connection and try again. You don't need to sign out.", retry: "Try again" },
    email: "Email", password: "Password", signIn: "Sign in", register: "Create my account", forgotPassword: "I forgot my password",
    signInTitle: "Sign in to DOne", signInIntro: "Pick up your invitation or your services where you left them.",
    registerTitle: "Create your account", registerIntro: "Tell us what you will do and you are in within a minute.",
    recoverTitle: "Reset your password", recoverIntro: "Type your email and we will send you the instructions.",
    recoverSend: "Send instructions", recoverSent: "All set. If there is an account with that email, we sent a link that expires in 30 minutes. Check your spam folder too.",
    signingIn: "Signing in…", creating: "Creating your account…",
    backToSignIn: "Back to sign in", noAccount: "No account yet?", haveAccount: "Already have an account?",
    role: "What will you do on DOne?", roleHost: "I am organizing a celebration", roleHostHint: "I create my invitation and see who is coming.", roleProvider: "I offer services", roleProviderHint: "I get requests from people who organize.", rolePlanner: "I help organize", rolePlannerHint: "I run celebrations for other people.",
    passwordHint: "At least 12 characters. A phrase you will remember works.", showPassword: "Show", hidePassword: "Hide", brandPitch: "Invite today. Tomorrow you know who is coming.", brandBody: "Your guests answer in one tap, no account needed. You see the list up to date.",
    sessionEnded: "Your session ended. Sign in again to continue.",
    reset: { title: "Choose a new password", intro: "Saving it signs you out everywhere, including other devices.", newPassword: "New password", submit: "Save password", busy: "Saving…", doneTitle: "Your password changed", doneBody: "We signed you out everywhere. Sign in with the new password.", goSignIn: "Go to sign in", linkInvalidTitle: "This link no longer works", linkInvalidBody: "You may have used it already, more than half an hour may have passed, or you asked for a newer one. Ask for another and use the latest one you get.", requestNew: "Ask for a new link" },
    verify: { title: "Confirming your email", checking: "One moment, we are confirming your email…", doneTitle: "Email confirmed", doneBody: "Thanks. Now we know this email is yours.", continue: "Continue", failedBody: "We could not confirm it right now. Check your connection and try again.", linkInvalidTitle: "This link no longer works", linkInvalidBody: "You may have used it already or it expired (it lasts 24 hours). Sign in and we will offer you a new one.", linkInvalidSignedIn: "You may have used it already or it expired (it lasts 24 hours). If your email is still unconfirmed, we will send you a new one.", resend: "Send a new link", resent: "Done. If your email was not confirmed yet, a new link will arrive in a few minutes." },
    validation: { required: "This is missing.", invalidEmail: "Check the email: it should look like name@mail.com.", passwordShort: "Use at least 12 characters. A short phrase works well.", passwordBytes: "That password is too long. Try a shorter one.", tooLong: "That is too long.", linkInvalid: "This link no longer works." },
    failure: { invalidCredentials: "That email and password do not match. Check them or reset your password.", emailTaken: "We could not create the account with those details. Try another email, or sign in if you already have an account.", validation: "Some details are not valid. Check the marked fields.", offline: "No connection right now. Check your internet and try again.", unavailable: "Accounts are not responding right now. Try again in a few minutes.", unknown: "Something did not go as expected. Try again.", forbidden: "This account cannot do that. If you think this is a mistake, write to us.", rateLimited: "There were a lot of attempts. You can try again in {{seconds}} s.", rateLimitedNoWait: "There were a lot of attempts. Wait a moment and try again." },
    guard: { checking: "Opening your space…", forbiddenTitle: "This section belongs to another account", forbiddenBody: "This account cannot open it. Sign in with the right one or go back to your space.", goHome: "Go to my space", noRole: "Your account has no role yet. Whoever manages DOne can assign one." }
  },
  errorBoundary: { title: "This part could not be shown", body: "Something failed while opening this screen. Your data is safe. Try again or go back to the start.", retry: "Try again", home: "Go to the start" },
  notFound: { title: "This page does not exist", intro: "The link may be incomplete. Go back to the start and we will pick up from there.", home: "Go to the start" },
  language: { label: "Language", "es-BO": "Español", "en-US": "English" },
  invitation: {
    title: "Open your invitation", body: "This link is meant for the DOne app. If you have it installed, open it from here; otherwise you can continue in the browser.", openApp: "Open in the DOne app",
    pendingTitle: "This link uses an older format", pendingBody: "The celebration name is missing from the link. Ask whoever invited you to send the updated link, or open it from the DOne app, which can resolve it.", appTitle: "Opening your invitation", appBody: "This link uses an older format and does not say which celebration it belongs to. Ask whoever invited you for the updated link.", invalidTitle: "This link does not open", invalidBody: "A piece of it may be missing, or it may have expired. Ask whoever invited you for a new one.", home: "Go to the home page"
  },
  stubs: { host: { title: "Host dashboard", description: "Manage your celebration from one place." }, provider: { title: "Provider portal", description: "Review and answer your requests." }, guest: { title: "Your invitation", description: "Confirm your attendance and see the details." } },
  ui: {
    partnerDisclaimer: "Sponsored link: opening it takes you out of DOne. DOne connects you, but does not provide or guarantee the provider's service.", action: "Action", loading: "Loading…", empty: "No information available.", genericError: "The action could not be completed.", close: "Close", emptyTable: "No records.", chooseFile: "Choose file", dismiss: "Dismiss notice", moreOptions: "More options",
    datePlaceholder: "Choose a date", datePreviousMonth: "Previous month", dateNextMonth: "Next month", dateToday: "Today", dateClear: "Clear date", timePlaceholder: "Choose a time", timeAm: "AM", timePm: "PM", timeHour: "Hour", timeMinute: "Minutes", timePeriod: "AM or PM", timeDone: "Done", timeClear: "Clear", confirmChange: "Confirm change", cancel: "Cancel",
    catalogTitle: "Component catalog", catalogIntro: "Each block is a state. Same tokens in light and dark.", catalogActions: "Actions", catalogState: "State:", catalogSave: "Save", catalogBlocked: "Blocked",
    catalogOpenDialog: "Open dialog", catalogOpenPanel: "Open panel", catalogName: "Name", catalogNamePlaceholder: "Type your name", catalogNameError: "Type your full name.", catalogOption: "Option", catalogOptionOne: "Option one", catalogOptionTwo: "Option two", catalogOptionError: "Choose an option.",
    catalogTerms: "I accept the terms", catalogTermsError: "You must accept.", catalogDate: "Date", catalogAttachment: "Attachment", catalogCard: "Card content", catalogRowName: "Invitation", catalogRowStatus: "Active", catalogColName: "Name", catalogColStatus: "Status",
    catalogPanel: "Panel", catalogPanelBody: "Panel content.", catalogDialog: "Confirmation", catalogDialogBody: "Review this action before continuing.", catalogDone: "Action completed"
  },
  errors: { unauthorized: "Your session has expired.", signInAgain: "Sign in again", forbidden: "You do not have permission to perform this action.", conflict: "This resource changed. Refresh and try again.", validation: "Check the information you entered.", tooMany: "Too many requests. Wait a moment and try again.", tooManyWait: "Too many requests. Wait {{seconds}} s and try again." },
  org: {
    nav: "Organizations", title: "Organizations", intro: "Group your team to share celebrations.",
    createTitle: "New organization", nameLabel: "Organization name", nameHelp: "Up to 120 characters.", create: "Create organization", creating: "Creating…", created: "Organization created.",
    plannerOnly: "Only event planner accounts can create organizations.",
    listTitle: "Your organizations", empty: "You do not belong to any organization yet.", open: "View {{name}}", owner: "Owner", retry: "Retry",
    membersTitle: "Members of {{name}}", noMembers: "No members yet.", memberHost: "Host", memberPlanner: "Event planner",
    addTitle: "Invite someone", emailLabel: "Their email", emailHelp: "They get an invitation by email and join only if they accept. If they have no account yet, they can create one from the email.", roleLabel: "Role in the organization", add: "Send invitation", adding: "Sending…", added: "Invitation sent to {{email}}. They join once they accept.",
    ownerOnly: "Only the owner can invite people.",
    pendingTitle: "Pending invitations", pendingEmpty: "No pending invitations.", pendingRole: "{{role}} · expires {{date}}", revoke: "Withdraw", revoking: "Withdrawing…", revokeLabel: "Withdraw the invitation to {{email}}", revoked: "Invitation withdrawn. The link no longer works.",
    myInvitations: "See the invitations I received",
    validation: { nameRequired: "Enter a name for the organization.", nameTooLong: "The name can have up to 120 characters.", emailRequired: "Enter their email.", emailInvalid: "Enter a valid email, for example name@mail.com." },
    errors: { notFound: "We could not find this organization. Refresh the list and try again.", conflict: "We could not invite them: that person is already a member, or the organization has too many pending invitations. Withdraw some and try again.", forbidden: "You do not have permission for this action in this organization.", revokeGone: "That invitation was no longer pending. We refreshed the list." },
    inbox: {
      title: "Invitations", intro: "Organizations that invited you appear here. You only join if you accept.", empty: "You have no pending invitations.",
      unverified: "Verify your email to see your invitations here. Meanwhile, you can answer from the link we emailed you.",
      card: "{{organization}} invites you as {{role}}.", expires: "Expires {{date}}.",
      fromLinkTitle: "You were invited to an organization", fromLinkBody: "Accept to join the team, or decline the invitation.",
      accept: "Accept", accepting: "Accepting…", decline: "Decline", declining: "Declining…",
      acceptLabel: "Accept the invitation from {{organization}}", declineLabel: "Decline the invitation from {{organization}}", thisOrganization: "this organization",
      confirmDeclineTitle: "Decline the invitation?", confirmDeclineBody: "You will not be able to accept it later. If you change your mind, ask for a new invitation.",
      accepted: "Done, you are part of the team.", declined: "You declined the invitation.", goToTeams: "See my organizations",
      errors: { notFound: "This invitation is no longer available: it expired, was already answered or is for another account. Sign in with the invited email's account.", forbidden: "To answer, open the link in the invitation email or verify your email.", conflict: "You already belong to this organization." }
    }
  },
  theme: {
    title: "Appearance", label: "App theme", darkMode: "Dark mode", system: "System", light: "Light", dark: "Dark",
    help: "\"System\" follows your device. The invitation your guests see does not change."
  }
} as const;
