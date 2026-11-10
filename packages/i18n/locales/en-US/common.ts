export const enUS = {
  common: { loading: "Loading…", retry: "Try again", cancel: "Cancel", save: "Save", signOut: "Sign out", empty: "There are no results." },
  auth: {
    email: "Email", password: "Password", signIn: "Sign in", register: "Create account", forgotPassword: "Forgot your password?",
    signInTitle: "Sign in to your account", signInIntro: "Plan your celebration or manage your event services.",
    registerTitle: "Create your account", registerIntro: "Choose how you will use RSVP. It takes a minute.",
    recoverTitle: "Reset your password", recoverIntro: "Enter your account email and we will send you the instructions.",
    recoverSend: "Send instructions", recoverSent: "If an account exists for that email, you will receive instructions to set a new password.",
    signingIn: "Signing in…", creating: "Creating account…",
    backToSignIn: "Back to sign in", noAccount: "Do not have an account yet?", haveAccount: "Already have an account?",
    role: "I want to use DOne as", roleHost: "Host", roleHostHint: "I organise my own celebration", rolePlanner: "Event planner", rolePlannerHint: "I manage celebrations for other people", roleProvider: "Provider", roleProviderHint: "I offer services for celebrations",
    passwordHint: "At least 12 characters.", showPassword: "Show password", hidePassword: "Hide password", brandPitch: "Invite today. Tomorrow you know who is coming.",
    sessionEnded: "Your session ended. Sign in to continue.",
    validation: { required: "This field is required.", invalidEmail: "Enter a valid email, for example name@mail.com.", passwordShort: "The password must have at least 12 characters.", passwordBytes: "The password is too long. Use a shorter one.", tooLong: "The text is too long." },
    failure: { invalidCredentials: "The email and password do not match. Check them and try again.", emailTaken: "An account with this email already exists. Sign in or reset your password.", validation: "Check the highlighted fields and try again.", offline: "Cannot reach the server. Check your internet connection and try again.", unavailable: "The accounts service is not responding right now. Try again in a few minutes.", unknown: "We could not complete the action. Try again." },
    guard: { checking: "Checking your session…", forbiddenTitle: "You do not have access to this section", forbiddenBody: "Your account has no permission for this area. Sign in with another account or go back to your space.", goHome: "Go to my space", noRole: "Your account has no role assigned yet." }
  },
  language: { label: "Language", "es-BO": "Español", "en-US": "English" },
  invitation: {
    title: "Open your invitation", body: "This link is meant for the DOne app. If you have it installed, open it from here; otherwise you can continue in the browser.", openApp: "Open in the DOne app",
    pendingTitle: "This link uses an older format", pendingBody: "The celebration name is missing from the link. Ask whoever invited you to send the updated link, or open it from the DOne app, which can resolve it.", appTitle: "Your invitation", appBody: "This link uses an older format and does not say which celebration it belongs to. Ask whoever invited you for the updated link.", invalidTitle: "This link is not valid", invalidBody: "Make sure you opened the full link that was shared with you.", home: "Go to the home page"
  },
  stubs: { host: { title: "Host dashboard", description: "Manage your celebration from one place." }, provider: { title: "Provider portal", description: "Review and answer your requests." }, guest: { title: "Your invitation", description: "Confirm your attendance and see the details." } },
  ui: {
    partnerDisclaimer: "Sponsored link: opening it takes you out of DOne. DOne connects you, but does not provide or guarantee the provider's service.", action: "Action", loading: "Loading…", empty: "No information available.", genericError: "The action could not be completed.", close: "Close", emptyTable: "No records.", chooseFile: "Choose file", dismiss: "Dismiss notice",
    datePlaceholder: "YYYY-MM-DD", confirmChange: "Confirm change", cancel: "Cancel",
    catalogTitle: "Component catalog", catalogIntro: "Each block is a state. Same tokens in light and dark.", catalogActions: "Actions", catalogState: "State:", catalogSave: "Save", catalogBlocked: "Blocked",
    catalogOpenDialog: "Open dialog", catalogOpenPanel: "Open panel", catalogName: "Name", catalogNamePlaceholder: "Type your name", catalogNameError: "Type your full name.", catalogOption: "Option", catalogOptionOne: "Option one", catalogOptionTwo: "Option two", catalogOptionError: "Choose an option.",
    catalogTerms: "I accept the terms", catalogTermsError: "You must accept.", catalogDate: "Date", catalogAttachment: "Attachment", catalogCard: "Card content", catalogRowName: "Invitation", catalogRowStatus: "Active", catalogColName: "Name", catalogColStatus: "Status",
    catalogPanel: "Panel", catalogPanelBody: "Panel content.", catalogDialog: "Confirmation", catalogDialogBody: "Review this action before continuing.", catalogDone: "Action completed"
  },
  errors: { unauthorized: "Your session has expired.", signInAgain: "Sign in again", forbidden: "You do not have permission to perform this action.", conflict: "This resource changed. Refresh and try again.", validation: "Check the information you entered." }
} as const;
