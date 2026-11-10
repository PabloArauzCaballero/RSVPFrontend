export const enUS = {
  common: { loading: "Loading…", retry: "Try again", cancel: "Cancel", save: "Save", signOut: "Sign out", more: "More", close: "Close", empty: "There are no results." },
  auth: {
    email: "Email", password: "Password", signIn: "Sign in", register: "Create my account", forgotPassword: "I forgot my password",
    signInTitle: "Sign in to DOne", signInIntro: "Pick up your invitation or your services where you left them.",
    registerTitle: "Create your account", registerIntro: "Tell us what you will do and you are in within a minute.",
    recoverTitle: "Reset your password", recoverIntro: "Type your email and we will send you the instructions.",
    recoverSend: "Send instructions", recoverSent: "Done. If there is an account with that email, the instructions are on their way.",
    signingIn: "Signing in…", creating: "Creating your account…",
    backToSignIn: "Back to sign in", noAccount: "No account yet?", haveAccount: "Already have an account?",
    role: "What will you do on DOne?", roleHost: "I am organizing a celebration", roleHostHint: "I create my invitation and see who is coming.", roleProvider: "I offer services", roleProviderHint: "I get requests from people who organize.", rolePlanner: "I help organize", rolePlannerHint: "I run celebrations for other people.",
    passwordHint: "At least 12 characters. A phrase you will remember works.", showPassword: "Show", hidePassword: "Hide", brandPitch: "Invite today. Tomorrow you know who is coming.", brandBody: "Your guests answer in one tap, no account needed. You see the list up to date.",
    sessionEnded: "Your session ended. Sign in again to continue.",
    validation: { required: "This is missing.", invalidEmail: "Check the email: it should look like name@mail.com.", passwordShort: "Use at least 12 characters. A short phrase works well.", passwordBytes: "That password is too long. Try a shorter one.", tooLong: "That is too long." },
    failure: { invalidCredentials: "That email and password do not match. Check them or reset your password.", emailTaken: "We could not create the account with those details. Try another email, or sign in if you already have an account.", validation: "Some details are not valid. Check the marked fields.", offline: "No connection right now. Check your internet and try again.", unavailable: "Accounts are not responding right now. Try again in a few minutes.", unknown: "Something did not go as expected. Try again.", forbidden: "This account cannot do that. If you think this is a mistake, write to us.", rateLimited: "There were a lot of attempts. You can try again in {{seconds}} s.", rateLimitedNoWait: "There were a lot of attempts. Wait a moment and try again." },
    guard: { checking: "Opening your space…", forbiddenTitle: "This section belongs to another account", forbiddenBody: "This account cannot open it. Sign in with the right one or go back to your space.", goHome: "Go to my space", noRole: "Your account has no role yet. Whoever manages DOne can assign one." }
  },
  notFound: { title: "This page does not exist", intro: "The link may be incomplete. Go back to the start and we will pick up from there.", home: "Go to the start" },
  language: { label: "Language", "es-BO": "Español", "en-US": "English" },
  invitation: {
    title: "Open your invitation", body: "This link is meant for the DOne app. If you have it installed, open it from here; otherwise you can continue in the browser.", openApp: "Open in the DOne app",
    pendingTitle: "This link uses an older format", pendingBody: "The celebration name is missing from the link. Ask whoever invited you to send the updated link, or open it from the DOne app, which can resolve it.", appTitle: "Opening your invitation", appBody: "This link uses an older format and does not say which celebration it belongs to. Ask whoever invited you for the updated link.", invalidTitle: "This link does not open", invalidBody: "A piece of it may be missing, or it may have expired. Ask whoever invited you for a new one.", home: "Go to the home page"
  },
  stubs: { host: { title: "Host dashboard", description: "Manage your celebration from one place." }, provider: { title: "Provider portal", description: "Review and answer your requests." }, guest: { title: "Your invitation", description: "Confirm your attendance and see the details." } },
  ui: {
    partnerDisclaimer: "Sponsored link: opening it takes you out of DOne. DOne connects you, but does not provide or guarantee the provider's service.", action: "Action", loading: "Loading…", empty: "No information available.", genericError: "The action could not be completed.", close: "Close", emptyTable: "No records.", chooseFile: "Choose file", dismiss: "Dismiss notice", moreOptions: "More options",
    datePlaceholder: "Choose a date", timePlaceholder: "Choose a time", timeAm: "AM", timePm: "PM", timeHour: "Hour", timeMinute: "Minutes", timePeriod: "AM or PM", timeDone: "Done", timeClear: "Clear", confirmChange: "Confirm change", cancel: "Cancel",
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
    addTitle: "Add a member", emailLabel: "Account email", emailHelp: "The person must already have a DOne account.", roleLabel: "Role in the organization", add: "Add member", adding: "Adding…", added: "Member added.",
    ownerOnly: "Only the owner can add members.",
    validation: { nameRequired: "Enter a name for the organization.", nameTooLong: "The name can have up to 120 characters.", emailRequired: "Enter the account email.", emailInvalid: "Enter a valid email, for example name@mail.com." },
    errors: { cannotAdd: "We could not add that email. Check it is spelled correctly and that the person already has a DOne account.", notFound: "We could not find this organization. Refresh the list and try again.", conflict: "That person is already a member of this organization.", forbidden: "You do not have permission for this action in this organization." }
  },
  theme: {
    title: "Appearance", label: "App theme", darkMode: "Dark mode", system: "System", light: "Light", dark: "Dark",
    help: "\"System\" follows your device. The invitation your guests see does not change."
  }
} as const;
