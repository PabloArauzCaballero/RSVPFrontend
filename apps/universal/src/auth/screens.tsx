import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { classifyAuthError, loginSchema, recoverySchema, registerSchema, validate, type AuthFailure, type Role } from "@rsvp/auth";
import { spacing } from "@rsvp/design-tokens";
import { useT } from "../platform/providers";
import { useAuth } from "./auth-context";
import { AuthField, AuthLayout, Banner, SubmitButton, TextLink, authStyles } from "./auth-ui";
import { AUTH_ROUTES, loginHref } from "./routes";

/**
 * Sign-in, sign-up and recovery against the real Identity service (REQ-F05-01). Navigation after
 * a successful sign-in is the route's job (it redirects once the session exists), so the screens
 * only submit, show state and link to each other.
 */

type Navigate = (href: string) => void;
export interface AuthScreenProps { readonly onNavigate: Navigate; readonly returnTo?: string | null }
type Status = { readonly kind: "idle" } | { readonly kind: "busy" } | { readonly kind: "failed"; readonly failure: AuthFailure } | { readonly kind: "sent" };
const IDLE: Status = { kind: "idle" };
type FieldErrors = Readonly<Record<string, string>>;
type Translator = ReturnType<typeof useT>;

/** Translates validation keys (`auth.validation.<key>`). Unknown server-side keys fall back to the generic message. */
function fieldMessages(t: Translator, errors: FieldErrors): FieldErrors {
  return Object.fromEntries(Object.entries(errors).map(([field, key]) => [field, t(`auth.validation.${key}`)]));
}

function FailureBanner({ status }: { readonly status: Status }): ReactNode {
  const t = useT();
  return status.kind === "failed" ? <Banner kind="error">{t(`auth.failure.${status.failure}`)}</Banner> : null;
}

export function LoginScreen({ onNavigate, returnTo = null }: AuthScreenProps): ReactNode {
  const t = useT();
  const auth = useAuth();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({}); const [status, setStatus] = useState<Status>(IDLE);
  const submit = async (): Promise<void> => {
    if (status.kind === "busy") return;
    const checked = validate(loginSchema, { email, password });
    if (!checked.ok) { setErrors(fieldMessages(t, checked.errors)); setStatus(IDLE); return; }
    setErrors({}); setStatus({ kind: "busy" });
    try { await auth.signIn(checked.value); }
    catch (error) { setStatus({ kind: "failed", failure: classifyAuthError(error) }); }
  };
  return (
    <AuthLayout title={t("auth.signInTitle")} intro={returnTo ? t("auth.sessionEnded") : t("auth.signInIntro")}>
      <View style={authStyles.form}>
        <FailureBanner status={status} />
        <AuthField label={t("auth.email")} value={email} onChange={setEmail} error={errors["email"]} autoComplete="email" keyboardType="email-address" textContentType="emailAddress" returnKeyType="next" editable={status.kind !== "busy"} testID="login-email" />
        <AuthField label={t("auth.password")} value={password} onChange={setPassword} error={errors["password"]} secret autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={() => { void submit(); }} editable={status.kind !== "busy"} testID="login-password" />
        <SubmitButton label={t("auth.signIn")} busyLabel={t("auth.signingIn")} busy={status.kind === "busy"} onPress={() => { void submit(); }} testID="login-submit" />
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
  const [errors, setErrors] = useState<FieldErrors>({}); const [status, setStatus] = useState<Status>(IDLE);
  const submit = async (): Promise<void> => {
    if (status.kind === "busy") return;
    const checked = validate(registerSchema, { email, password, role });
    if (!checked.ok) { setErrors(fieldMessages(t, checked.errors)); setStatus(IDLE); return; }
    setErrors({}); setStatus({ kind: "busy" });
    try { await auth.register(checked.value); }
    catch (error) { setStatus({ kind: "failed", failure: classifyAuthError(error) }); }
  };
  return (
    <AuthLayout title={t("auth.registerTitle")} intro={t("auth.registerIntro")}>
      <View style={authStyles.form}>
        <FailureBanner status={status} />
        <AuthField label={t("auth.email")} value={email} onChange={setEmail} error={errors["email"]} autoComplete="email" keyboardType="email-address" textContentType="emailAddress" returnKeyType="next" editable={status.kind !== "busy"} testID="register-email" />
        <AuthField label={t("auth.password")} value={password} onChange={setPassword} error={errors["password"]} hint={t("auth.passwordHint")} secret autoComplete="new-password" textContentType="newPassword" returnKeyType="next" editable={status.kind !== "busy"} testID="register-password" />
        <View accessibilityRole="radiogroup" accessibilityLabel={t("auth.role")} style={{ gap: spacing[2] }}>
          <Text style={authStyles.label}>{t("auth.role")}</Text>
          {SELF_SERVICE_ROLES.map((option) => (
            <ChoiceRow key={option.role} title={t(option.title)} hint={t(option.hint)} selected={role === option.role} onSelect={() => setRole(option.role)} />
          ))}
        </View>
        <SubmitButton label={t("auth.register")} busyLabel={t("auth.creating")} busy={status.kind === "busy"} onPress={() => { void submit(); }} testID="register-submit" />
      </View>
      <View style={authStyles.switchRow}>
        <Text style={authStyles.switchLead}>{t("auth.haveAccount")}</Text>
        <TextLink label={t("auth.signIn")} onPress={() => onNavigate(loginHref(returnTo))} />
      </View>
    </AuthLayout>
  );
}

function ChoiceRow({ title, hint, selected, onSelect }: { readonly title: string; readonly hint: string; readonly selected: boolean; readonly onSelect: () => void }): ReactNode {
  return (
    <Pressable accessibilityRole="radio" aria-checked={selected} accessibilityLabel={`${title}. ${hint}`} onPress={onSelect} style={[authStyles.roleOption, selected && authStyles.roleOptionActive]}>
      <Text style={authStyles.roleTitle}>{title}</Text>
      <Text style={authStyles.hint}>{hint}</Text>
    </Pressable>
  );
}

export function RecoveryScreen({ onNavigate }: AuthScreenProps): ReactNode {
  const t = useT();
  const auth = useAuth();
  const [email, setEmail] = useState(""); const [errors, setErrors] = useState<FieldErrors>({}); const [status, setStatus] = useState<Status>(IDLE);
  const submit = async (): Promise<void> => {
    if (status.kind === "busy") return;
    const checked = validate(recoverySchema, { email });
    if (!checked.ok) { setErrors(fieldMessages(t, checked.errors)); setStatus(IDLE); return; }
    setErrors({}); setStatus({ kind: "busy" });
    try { await auth.requestRecovery(checked.value); setStatus({ kind: "sent" }); }
    catch (error) { setStatus({ kind: "failed", failure: classifyAuthError(error) }); }
  };
  return (
    <AuthLayout title={t("auth.recoverTitle")} intro={t("auth.recoverIntro")}>
      <View style={authStyles.form}>
        {status.kind === "sent" ? <Banner kind="success">{t("auth.recoverSent")}</Banner> : null}
        <FailureBanner status={status} />
        <AuthField label={t("auth.email")} value={email} onChange={setEmail} error={errors["email"]} autoComplete="email" keyboardType="email-address" textContentType="emailAddress" returnKeyType="go" onSubmitEditing={() => { void submit(); }} editable={status.kind !== "busy"} testID="recover-email" />
        <SubmitButton label={t("auth.recoverSend")} busyLabel={t("common.loading")} busy={status.kind === "busy"} onPress={() => { void submit(); }} testID="recover-submit" />
      </View>
      <TextLink label={t("auth.backToSignIn")} onPress={() => onNavigate(AUTH_ROUTES.login)} />
    </AuthLayout>
  );
}

