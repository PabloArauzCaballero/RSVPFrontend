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
    pendingTitle: "We cannot show your invitation details yet", pendingBody: "The invitations service is not available yet. Keep this link and try again later, or ask whoever invited you to send it again.", appTitle: "Your invitation", appBody: "You opened your personal invitation link. You will be able to confirm your attendance here once the invitations service is available.", invalidTitle: "This link is not valid", invalidBody: "Make sure you opened the full link that was shared with you.", home: "Go to the home page"
  },
  stubs: { host: { title: "Host dashboard", description: "Manage your celebration from one place." }, provider: { title: "Provider portal", description: "Review and answer your requests." }, guest: { title: "Your invitation", description: "Confirm your attendance and see the details." } },
  errors: { unauthorized: "Your session has expired.", forbidden: "You do not have permission to perform this action.", conflict: "This resource changed. Refresh and try again.", validation: "Check the information you entered." }
} as const;
