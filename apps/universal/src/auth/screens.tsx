import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { loginSchema, recoverySchema, registerSchema, validate, type Role } from "@rsvp/auth";
import { spacing } from "@rsvp/design-tokens";
import { useT } from "../platform/providers";
import { useAuth } from "./auth-context";
import { AuthField, AuthLayout, Banner, SubmitButton, TextLink, authFocusRing, authStyles } from "./auth-ui";
import { AUTH_ROUTES, loginHref } from "./routes";
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

function FailureBanner({ submit }: { readonly submit: AuthSubmit }): ReactNode {
  const t = useT();
  const { status, waitSeconds } = submit;
  if (status.kind !== "failed") return null;
  const { failure } = status;
  if (failure.kind === "rateLimited") return <Banner kind="error">{waitSeconds > 0 ? t("auth.failure.rateLimited", { seconds: waitSeconds }) : t("auth.failure.rateLimitedNoWait")}</Banner>;
  return <Banner kind="error">{t(`auth.failure.${failure.kind}`)}</Banner>;
}

export function LoginScreen({ onNavigate, returnTo = null }: AuthScreenProps): ReactNode {
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
    <AuthLayout title={t("auth.signInTitle")} intro={returnTo ? t("auth.sessionEnded") : t("auth.signInIntro")}>
      <View style={authStyles.form}>
        <FailureBanner submit={submitState} />
        <AuthField label={t("auth.email")} value={email} onChange={setEmail} error={errors["email"]} autoComplete="email" keyboardType="email-address" textContentType="emailAddress" returnKeyType="go" onSubmitEditing={() => { void submit(); }} editable={!busy} testID="login-email" />
        <AuthField label={t("auth.password")} value={password} onChange={setPassword} error={errors["password"]} secret autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={() => { void submit(); }} editable={!busy} testID="login-password" />
        <SubmitButton label={t("auth.signIn")} busyLabel={t("auth.signingIn")} busy={busy} blocked={submitState.waitSeconds > 0} onPress={() => { void submit(); }} testID="login-submit" />
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

const SELF_SERVICE_ROLES: readonly { readonly role: Extract<Role, "HOST" | "PLANNER" | "PROVIDER">; readonly title: string; readonly hint: string }[] = [
  { role: "HOST", title: "auth.roleHost", hint: "auth.roleHostHint" },
  { role: "PLANNER", title: "auth.rolePlanner", hint: "auth.rolePlannerHint" },
  { role: "PROVIDER", title: "auth.roleProvider", hint: "auth.roleProviderHint" }
];

export function RegisterScreen({ onNavigate, returnTo = null }: AuthScreenProps): ReactNode {
  const t = useT();
  const auth = useAuth();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [role, setRole] = useState<Extract<Role, "HOST" | "PLANNER" | "PROVIDER">>("HOST");
  const [errors, setErrors] = useState<FieldErrors>({}); const submitState = useAuthSubmit(); const { busy, setStatus } = submitState;
  const submit = async (): Promise<void> => {
    if (busy || submitState.waitSeconds > 0) return;
    const checked = validate(registerSchema, { email, password, role });
    if (!checked.ok) { setErrors(fieldMessages(t, checked.errors)); setStatus(IDLE); return; }
    setErrors({});
    await submitState.run(async () => { await auth.register(checked.value); return { kind: "busy" }; });
  };
  return (
    <AuthLayout title={t("auth.registerTitle")} intro={t("auth.registerIntro")}>
      <View style={authStyles.form}>
        <FailureBanner submit={submitState} />
        <AuthField label={t("auth.email")} value={email} onChange={setEmail} error={errors["email"]} autoComplete="email" keyboardType="email-address" textContentType="emailAddress" returnKeyType="go" onSubmitEditing={() => { void submit(); }} editable={!busy} testID="register-email" />
        <AuthField label={t("auth.password")} value={password} onChange={setPassword} error={errors["password"]} hint={t("auth.passwordHint")} secret autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={() => { void submit(); }} editable={!busy} testID="register-password" />
        <View accessibilityRole="radiogroup" accessibilityLabel={t("auth.role")} style={{ gap: spacing[2] }}>
          <Text style={authStyles.label}>{t("auth.role")}</Text>
          {SELF_SERVICE_ROLES.map((option) => (
            <ChoiceRow key={option.role} title={t(option.title)} hint={t(option.hint)} selected={role === option.role} disabled={busy} onSelect={() => setRole(option.role)} />
          ))}
        </View>
        <SubmitButton label={t("auth.register")} busyLabel={t("auth.creating")} busy={busy} blocked={submitState.waitSeconds > 0} onPress={() => { void submit(); }} testID="register-submit" />
      </View>
      <View style={authStyles.switchRow}>
        <Text style={authStyles.switchLead}>{t("auth.haveAccount")}</Text>
        <TextLink label={t("auth.signIn")} onPress={() => onNavigate(loginHref(returnTo))} />
      </View>
    </AuthLayout>
  );
}

function ChoiceRow({ title, hint, selected, disabled = false, onSelect }: { readonly title: string; readonly hint: string; readonly selected: boolean; readonly disabled?: boolean; readonly onSelect: () => void }): ReactNode {
  return (
    <Pressable accessibilityRole="radio" aria-checked={selected} aria-disabled={disabled} disabled={disabled} accessibilityLabel={`${title}. ${hint}`} onPress={onSelect} style={[authStyles.roleOption, selected && authStyles.roleOptionActive, disabled && authStyles.primaryBusy, authFocusRing]}>
      <Text style={authStyles.roleTitle}>{title}</Text>
      <Text style={authStyles.hint}>{hint}</Text>
    </Pressable>
  );
}

export function RecoveryScreen({ onNavigate }: AuthScreenProps): ReactNode {
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
    <AuthLayout title={t("auth.recoverTitle")} intro={t("auth.recoverIntro")}>
      <View style={authStyles.form}>
        {submitState.status.kind === "sent" ? <Banner kind="success">{t("auth.recoverSent")}</Banner> : null}
        <FailureBanner submit={submitState} />
        <AuthField label={t("auth.email")} value={email} onChange={setEmail} error={errors["email"]} autoComplete="email" keyboardType="email-address" textContentType="emailAddress" returnKeyType="go" onSubmitEditing={() => { void submit(); }} editable={!busy} testID="recover-email" />
        <SubmitButton label={t("auth.recoverSend")} busyLabel={t("common.loading")} busy={busy} blocked={submitState.waitSeconds > 0} onPress={() => { void submit(); }} testID="recover-submit" />
      </View>
      <TextLink label={t("auth.backToSignIn")} onPress={() => onNavigate(AUTH_ROUTES.login)} />
    </AuthLayout>
  );
}

