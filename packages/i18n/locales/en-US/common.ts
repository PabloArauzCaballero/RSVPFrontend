export const enUS = {
  common: { loading: "Loading…", retry: "Try again", cancel: "Cancel", save: "Save", signOut: "Sign out", empty: "There are no results." },
  auth: { email: "Email", password: "Password", signIn: "Sign in", register: "Create account", forgotPassword: "Forgot your password?" },
  errors: { unauthorized: "Your session has expired.", forbidden: "You do not have permission to perform this action.", conflict: "This resource changed. Refresh and try again.", validation: "Check the information you entered." }
} as const;
