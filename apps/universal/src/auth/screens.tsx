import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { fieldErrorsOf, isInvalidLink, loginSchema, passwordResetSchema, recoverySchema, registerSchema, validate, type Role } from "@rsvp/auth";
import { spacing } from "@rsvp/design-tokens";
import { CheckMark, Checkbox, StickyActions, useColors } from "@rsvp/ui";
import { useT } from "../platform/providers";
import { useAuth } from "./auth-context";
import { AuthField, AuthLayout, Banner, SubmitButton, TextLink, useAuthFocusRing, useAuthStyles } from "./auth-ui";
import { ACCOUNT_LINK_ROUTES, AUTH_ROUTES, loginHref } from "./routes";
import { IDLE, useAuthSubmit, type AuthSubmit } from "./use-auth-submit";

/**
 * Sign-in, sign-up and recovery against the real Identity service (REQ-F05-01). Navigation after
 * a successful sign-in is the route's job (it redirects once the session exists), so the screens
 * only submit, show state and link to each other.
 */

type Navigate = (href: string) => void;
export interface AuthScreenProps { readonly onNavigate: Navigate; readonly returnTo?: string | null }
type FieldErrors = Readonly<Record<string, string>>;
type Translator = ReturnType<typeof useT>;

/** Translates validation keys (`auth.validation.<key>`). Unknown server-side keys fall back to the generic message. */
function fieldMessages(t: Translator, errors: FieldErrors): FieldErrors {
  return Object.fromEntries(Object.entries(errors).map(([field, key]) => [field, t(`auth.validation.${key}`)]));
}

/** Feedback sits under the submit button: appearing or clearing it moves only what is below the button, never the button a second tap is aimed at. */
function FailureBanner({ submit }: { readonly submit: AuthSubmit }): ReactNode {
  const t = useT();
  const { status, waitSeconds } = submit;
  if (status.kind !== "failed") return null;
  const { failure } = status;
  if (failure.kind === "rateLimited") return <Banner kind="error">{waitSeconds > 0 ? t("auth.failure.rateLimited", { seconds: waitSeconds }) : t("auth.failure.rateLimitedNoWait")}</Banner>;
  return <Banner kind="error">{t(`auth.failure.${failure.kind}`)}</Banner>;
}

export function LoginScreen({ onNavigate, returnTo = null }: AuthScreenProps): ReactNode {
  const authStyles = useAuthStyles();
  const t = useT();
  const auth = useAuth();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
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
        <SubmitButton label={t("auth.signIn")} busyLabel={t("auth.signingIn")} busy={busy} blocked={submitState.waitSeconds > 0} onPress={() => { void submit(); }} testID="login-submit" />
        <FailureBanner submit={submitState} />
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

/** Said as what the person does, not as a system role: organise, offer services, help organise. */
const SELF_SERVICE_ROLES: readonly { readonly role: Extract<Role, "HOST" | "PLANNER" | "PROVIDER">; readonly title: string; readonly hint: string }[] = [
  { role: "HOST", title: "auth.roleHost", hint: "auth.roleHostHint" },
  { role: "PROVIDER", title: "auth.roleProvider", hint: "auth.roleProviderHint" },
  { role: "PLANNER", title: "auth.rolePlanner", hint: "auth.rolePlannerHint" }
];

export function RegisterScreen({ onNavigate, returnTo = null }: AuthScreenProps): ReactNode {
  const authStyles = useAuthStyles();
  const t = useT();
  const compact = useWindowDimensions().width < 900;
  const auth = useAuth();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [role, setRole] = useState<Extract<Role, "HOST" | "PLANNER" | "PROVIDER">>("HOST");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({}); const submitState = useAuthSubmit(); const { busy, setStatus } = submitState;
  const submit = async (): Promise<void> => {
    if (busy || submitState.waitSeconds > 0) return;
    const checked = validate(registerSchema, { email, password, role });
    // B6: the account is created only with an explicit acceptance of the terms and the privacy policy, and Identity records which version.
    const termsError: FieldErrors = termsAccepted ? {} : { terms: t("legal.consent.required") };
    if (!checked.ok || !termsAccepted) { setErrors({ ...(checked.ok ? {} : fieldMessages(t, checked.errors)), ...termsError }); setStatus(IDLE); return; }
    setErrors({});
    await submitState.run(async () => { await auth.register({ ...checked.value, termsVersion: t("legal.version") }); return { kind: "busy" }; });
  };
  return (
    <AuthLayout title={t("auth.registerTitle")} intro={t("auth.registerIntro")} illustration="table">
      <View style={authStyles.form}>
        <View accessibilityRole="radiogroup" accessibilityLabel={t("auth.role")} style={{ gap: spacing[2] }}>
          <Text style={authStyles.label}>{t("auth.role")}</Text>
          {SELF_SERVICE_ROLES.map((option) => (
            <ChoiceRow key={option.role} testID={`register-role-${option.role}`} title={t(option.title)} hint={t(option.hint)} selected={role === option.role} disabled={busy} onSelect={() => setRole(option.role)} />
          ))}
        </View>
        <AuthField label={t("auth.email")} value={email} onChange={setEmail} error={errors["email"]} autoComplete="email" keyboardType="email-address" textContentType="emailAddress" returnKeyType="go" onSubmitEditing={() => { void submit(); }} editable={!busy} testID="register-email" />
        <AuthField label={t("auth.password")} value={password} onChange={setPassword} error={errors["password"]} hint={t("auth.passwordHint")} secret autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={() => { void submit(); }} editable={!busy} testID="register-password" />
        <View style={{ gap: spacing[1] }}>
          <Checkbox label={t("legal.consent.accept")} value={termsAccepted} onChange={setTermsAccepted} state={busy ? "disabled" : "default"} error={errors["terms"]} />
          <View style={authStyles.switchRow}>
            <TextLink label={t("legal.links.terms")} onPress={() => onNavigate("/terminos")} />
            <TextLink label={t("legal.links.privacy")} onPress={() => onNavigate("/privacidad")} />
          </View>
        </View>
        {compact ? (
          <StickyActions summary={<FailureBanner submit={submitState} />}>
            <SubmitButton label={t("auth.register")} busyLabel={t("auth.creating")} busy={busy} blocked={submitState.waitSeconds > 0} onPress={() => { void submit(); }} testID="register-submit" />
          </StickyActions>
        ) : (
          <>
            <SubmitButton label={t("auth.register")} busyLabel={t("auth.creating")} busy={busy} blocked={submitState.waitSeconds > 0} onPress={() => { void submit(); }} testID="register-submit" />
            <FailureBanner submit={submitState} />
          </>
        )}
      </View>
      <View style={authStyles.switchRow}>
        <Text style={authStyles.switchLead}>{t("auth.haveAccount")}</Text>
        <TextLink label={t("auth.signIn")} onPress={() => onNavigate(loginHref(returnTo))} />
      </View>
    </AuthLayout>
  );
}

function ChoiceRow({ title, hint, selected, disabled = false, onSelect, testID }: { readonly testID?: string; readonly title: string; readonly hint: string; readonly selected: boolean; readonly disabled?: boolean; readonly onSelect: () => void }): ReactNode {
  const authStyles = useAuthStyles();
  const authFocusRing = useAuthFocusRing();
  const palette = useColors();
  return (
    <Pressable accessibilityRole="radio" aria-checked={selected} aria-disabled={disabled} disabled={disabled} accessibilityLabel={`${title}. ${hint}`} onPress={onSelect} testID={testID} style={[authStyles.roleOption, { flexDirection: "row", alignItems: "center", gap: spacing[3] }, selected && authStyles.roleOptionActive, disabled && authStyles.primaryBusy, authFocusRing]}>
      <View style={{ flex: 1 }}>
        <Text style={authStyles.roleTitle}>{title}</Text>
        {selected ? <Text style={authStyles.hint}>{hint}</Text> : null}
      </View>
      {selected ? <CheckMark size={28} /> : <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: palette.fieldBorder }} />}
    </Pressable>
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
        <SubmitButton label={t("auth.recoverSend")} busyLabel={t("common.loading")} busy={busy} blocked={submitState.waitSeconds > 0} onPress={() => { void submit(); }} testID="recover-submit" />
        {submitState.status.kind === "sent" ? <Banner kind="success">{t("auth.recoverSent")}</Banner> : null}
        <FailureBanner submit={submitState} />
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
        <SubmitButton label={t("auth.reset.submit")} busyLabel={t("auth.reset.busy")} busy={busy} blocked={submitState.waitSeconds > 0} onPress={() => { void submit(); }} testID="reset-submit" />
        <FailureBanner submit={submitState} />
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
