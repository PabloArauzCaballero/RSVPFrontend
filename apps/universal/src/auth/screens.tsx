import { useEffect, useRef, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { fieldErrorsOf, isInvalidLink, loginSchema, passwordResetSchema, recoverySchema, validate } from "@rsvp/auth";
import { useT } from "../platform/providers";
import { useAuth } from "./auth-context";
import { AuthField, AuthLayout, Banner, FormActions, SubmitButton, TextLink, useAuthStyles } from "./auth-ui";
import { ACCOUNT_LINK_ROUTES, AUTH_ROUTES, loginHref } from "./routes";
import { IDLE, useAuthSubmit } from "./use-auth-submit";
import { fieldMessages, FailureBanner, type AuthScreenProps, type FieldErrors, type Navigate } from "./auth-shared";
import { clearLoginEmail, readLoginEmail } from "./registration-draft";

export type { AuthScreenProps } from "./auth-shared";
export { RegisterScreen } from "./register-screen";

/**
 * Sign-in, sign-up and recovery against the real Identity service (REQ-F05-01). Navigation after
 * a successful sign-in is the route's job (it redirects once the session exists), so the screens
 * only submit, show state and link to each other.
 */

export function LoginScreen({ onNavigate, returnTo = null }: AuthScreenProps): ReactNode {
  const authStyles = useAuthStyles();
  const t = useT();
  const auth = useAuth();
  // The sign-up hands over the address the person typed there ("I already have an account"): by memory, never by the URL (PF-1).
  const [email, setEmail] = useState(readLoginEmail); const [password, setPassword] = useState("");
  useEffect(() => { clearLoginEmail(); }, []);
  const [errors, setErrors] = useState<FieldErrors>({}); const submitState = useAuthSubmit(); const { busy, setStatus } = submitState;
  const submit = async (): Promise<void> => {
    if (busy || submitState.waitSeconds > 0) return;
    const checked = validate(loginSchema, { email, password });
    if (!checked.ok) { setErrors(fieldMessages(t, checked.errors)); setStatus(IDLE); return; }
    setErrors({});
    // Success keeps the form busy: the route redirects as soon as the session exists.
    await submitState.run(async () => { await auth.signIn(checked.value); return { kind: "busy" }; });
  };
  return (
    <AuthLayout title={t("auth.signInTitle")} intro={returnTo ? t("auth.sessionEnded") : t("auth.signInIntro")} illustration="welcomeHost">
      <View style={authStyles.form}>
        <AuthField label={t("auth.email")} value={email} onChange={setEmail} error={errors["email"]} autoComplete="email" keyboardType="email-address" textContentType="emailAddress" returnKeyType="go" onSubmitEditing={() => { void submit(); }} editable={!busy} testID="login-email" />
        <AuthField label={t("auth.password")} value={password} onChange={setPassword} error={errors["password"]} secret autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={() => { void submit(); }} editable={!busy} testID="login-password" />
        <FormActions summary={<FailureBanner submit={submitState} />}>
          <SubmitButton label={t("auth.signIn")} busyLabel={t("auth.signingIn")} busy={busy} blocked={submitState.waitSeconds > 0} onPress={() => { void submit(); }} testID="login-submit" />
        </FormActions>
      </View>
      <View>
        <TextLink label={t("auth.forgotPassword")} onPress={() => onNavigate(AUTH_ROUTES.recover)} />
        <View style={authStyles.switchRow}>
          <Text style={authStyles.switchLead}>{t("auth.noAccount")}</Text>
          <TextLink label={t("auth.register")} onPress={() => onNavigate(returnTo ? `${AUTH_ROUTES.register}?returnTo=${encodeURIComponent(returnTo)}` : AUTH_ROUTES.register)} />
        </View>
      </View>
    </AuthLayout>
  );
}

export function RecoveryScreen({ onNavigate }: AuthScreenProps): ReactNode {
  const authStyles = useAuthStyles();
  const t = useT();
  const auth = useAuth();
  const [email, setEmail] = useState(""); const [errors, setErrors] = useState<FieldErrors>({}); const submitState = useAuthSubmit(); const { busy, setStatus } = submitState;
  const submit = async (): Promise<void> => {
    if (busy || submitState.waitSeconds > 0) return;
    const checked = validate(recoverySchema, { email });
    if (!checked.ok) { setErrors(fieldMessages(t, checked.errors)); setStatus(IDLE); return; }
    setErrors({});
    await submitState.run(async () => { await auth.requestRecovery(checked.value); return { kind: "sent" }; });
  };
  return (
    <AuthLayout title={t("auth.recoverTitle")} intro={t("auth.recoverIntro")} illustration="verifying">
      <View style={authStyles.form}>
        <AuthField label={t("auth.email")} value={email} onChange={setEmail} error={errors["email"]} autoComplete="email" keyboardType="email-address" textContentType="emailAddress" returnKeyType="go" onSubmitEditing={() => { void submit(); }} editable={!busy} testID="recover-email" />
        <FormActions summary={<>{submitState.status.kind === "sent" ? <Banner kind="success">{t("auth.recoverSent")}</Banner> : null}<FailureBanner submit={submitState} /></>}>
          <SubmitButton label={t("auth.recoverSend")} busyLabel={t("common.loading")} busy={busy} blocked={submitState.waitSeconds > 0} onPress={() => { void submit(); }} testID="recover-submit" />
        </FormActions>
      </View>
      <TextLink label={t("auth.backToSignIn")} onPress={() => onNavigate(AUTH_ROUTES.login)} />
    </AuthLayout>
  );
}

export interface LinkScreenProps extends AuthScreenProps {
  /** The `token` query parameter of the e-mail link; absent when the link was cut. */
  readonly token: string | null;
}

/**
 * B4 · New password from the recovery e-mail. The link works once and for 30 minutes: an invalid one
 * says so and offers a new link instead of a generic error. Identity ends every session on success.
 */
export function ResetPasswordScreen({ onNavigate, token }: LinkScreenProps): ReactNode {
  const authStyles = useAuthStyles();
  const t = useT();
  const auth = useAuth();
  const [password, setPassword] = useState(""); const [errors, setErrors] = useState<FieldErrors>({}); const [linkInvalid, setLinkInvalid] = useState(!token);
  const submitState = useAuthSubmit(); const { busy, setStatus } = submitState;
  const submit = async (): Promise<void> => {
    if (busy || submitState.waitSeconds > 0) return;
    const checked = validate(passwordResetSchema, { token: token ?? "", newPassword: password });
    if (!checked.ok) {
      if (checked.errors["token"]) { setLinkInvalid(true); return; }
      setErrors(fieldMessages(t, checked.errors)); setStatus(IDLE); return;
    }
    setErrors({});
    await submitState.run(async () => {
      try { await auth.resetPassword(checked.value); return { kind: "sent" }; }
      catch (error) {
        if (isInvalidLink(error)) { setLinkInvalid(true); return IDLE; }
        // The server's password policy is the authority: show its verdict on the field.
        if ("newPassword" in fieldErrorsOf(error)) { setErrors({ newPassword: t("auth.validation.passwordShort") }); return IDLE; }
        throw error;
      }
    });
  };
  if (linkInvalid) {
    return (
      <AuthLayout title={t("auth.reset.linkInvalidTitle")} intro={t("auth.reset.linkInvalidBody")} illustration="noAccess">
        <View style={authStyles.form}>
          <SubmitButton label={t("auth.reset.requestNew")} busyLabel={t("auth.reset.requestNew")} busy={false} onPress={() => onNavigate(AUTH_ROUTES.recover)} testID="reset-request-new" />
        </View>
        <TextLink label={t("auth.backToSignIn")} onPress={() => onNavigate(AUTH_ROUTES.login)} />
      </AuthLayout>
    );
  }
  if (submitState.status.kind === "sent") {
    return (
      <AuthLayout title={t("auth.reset.doneTitle")} intro={t("auth.reset.doneBody")} illustration="verifying">
        <View style={authStyles.form}>
          <SubmitButton label={t("auth.reset.goSignIn")} busyLabel={t("auth.reset.goSignIn")} busy={false} onPress={() => onNavigate(AUTH_ROUTES.login)} testID="reset-go-sign-in" />
        </View>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout title={t("auth.reset.title")} intro={t("auth.reset.intro")} illustration="verifying">
      <View style={authStyles.form}>
        <AuthField label={t("auth.reset.newPassword")} value={password} onChange={setPassword} error={errors["newPassword"]} hint={t("auth.passwordHint")} secret autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={() => { void submit(); }} editable={!busy} testID="reset-password" />
        <FormActions summary={<FailureBanner submit={submitState} />}>
          <SubmitButton label={t("auth.reset.submit")} busyLabel={t("auth.reset.busy")} busy={busy} blocked={submitState.waitSeconds > 0} onPress={() => { void submit(); }} testID="reset-submit" />
        </FormActions>
      </View>
      <TextLink label={t("auth.backToSignIn")} onPress={() => onNavigate(AUTH_ROUTES.login)} />
    </AuthLayout>
  );
}

type VerifyState = "checking" | "verified" | "invalid" | "failed";

/**
 * B4 · Opening the verification link confirms the e-mail at once (one request per visit). States:
 * checking, verified, invalid or expired link, and a network or server failure that can be retried.
 */
export function VerifyEmailScreen({ onNavigate, token }: LinkScreenProps): ReactNode {
  const authStyles = useAuthStyles();
  const t = useT();
  const auth = useAuth();
  const [state, setState] = useState<VerifyState>(token ? "checking" : "invalid");
  const [attempt, setAttempt] = useState(0);
  const sent = useRef<number | null>(null);
  useEffect(() => {
    if (!token || sent.current === attempt) return;
    sent.current = attempt;
    setState("checking");
    auth.confirmEmail(token).then(() => setState("verified"), (error: unknown) => setState(isInvalidLink(error) ? "invalid" : "failed"));
  }, [auth, token, attempt]);
  const signedIn = auth.state.session !== null;
  const next = (): void => onNavigate(signedIn ? "/" : AUTH_ROUTES.login);
  if (state === "checking") {
    return <AuthLayout title={t("auth.verify.title")} intro={t("auth.verify.checking")} illustration="verifying"><View accessibilityLiveRegion="polite" /></AuthLayout>;
  }
  if (state === "verified") {
    return (
      <AuthLayout title={t("auth.verify.doneTitle")} intro={t("auth.verify.doneBody")} illustration="verifying">
        <View style={authStyles.form}>
          <SubmitButton label={signedIn ? t("auth.verify.continue") : t("auth.reset.goSignIn")} busyLabel={t("common.loading")} busy={false} onPress={next} testID="verify-continue" />
        </View>
      </AuthLayout>
    );
  }
  if (state === "failed") {
    return (
      <AuthLayout title={t("auth.verify.title")} intro={t("auth.verify.failedBody")} illustration="offline">
        <View style={authStyles.form}>
          <SubmitButton label={t("common.retry")} busyLabel={t("common.loading")} busy={false} onPress={() => setAttempt((value) => value + 1)} testID="verify-retry" />
        </View>
      </AuthLayout>
    );
  }
  return <InvalidVerificationLink signedIn={signedIn} onNavigate={onNavigate} onContinue={next} />;
}

/** An unusable link: signed in, ask for a new one right here; signed out, sign in and come back here to ask. */
function InvalidVerificationLink({ signedIn, onNavigate, onContinue }: { readonly signedIn: boolean; readonly onNavigate: Navigate; readonly onContinue: () => void }): ReactNode {
  const authStyles = useAuthStyles();
  const t = useT();
  const auth = useAuth();
  const submitState = useAuthSubmit();
  if (!signedIn) {
    return (
      <AuthLayout title={t("auth.verify.linkInvalidTitle")} intro={t("auth.verify.linkInvalidBody")} illustration="noAccess">
        <View style={authStyles.form}>
          <SubmitButton label={t("auth.reset.goSignIn")} busyLabel={t("common.loading")} busy={false} onPress={() => onNavigate(loginHref(ACCOUNT_LINK_ROUTES.verifyEmail))} testID="verify-sign-in" />
        </View>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout title={t("auth.verify.linkInvalidTitle")} intro={t("auth.verify.linkInvalidSignedIn")} illustration="noAccess">
      <View style={authStyles.form}>
        <SubmitButton label={t("auth.verify.resend")} busyLabel={t("common.loading")} busy={submitState.busy} blocked={submitState.waitSeconds > 0 || submitState.status.kind === "sent"}
          onPress={() => { void submitState.run(async () => { await auth.resendVerification(); return { kind: "sent" }; }); }} testID="verify-resend" />
        {submitState.status.kind === "sent" ? <Banner kind="success">{t("auth.verify.resent")}</Banner> : null}
        <FailureBanner submit={submitState} />
      </View>
      <TextLink label={t("auth.verify.continue")} onPress={onContinue} />
    </AuthLayout>
  );
}
