import { useState, type ReactNode } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { SIGN_UP_CITIES, loginSchema, recoverySchema, validate, validateRegistration, type Role, type Session } from "@rsvp/auth";
import { spacing } from "@rsvp/design-tokens";
import { CheckMark, FilterSelect, StickyActions, useColors } from "@rsvp/ui";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { useAuth } from "./auth-context";
import { AuthCheck, AuthField, AuthLayout, AuthPair, AuthSection, Banner, SubmitButton, TextLink, useAuthFocusRing, useAuthStyles } from "./auth-ui";
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

type SelfServiceRole = Extract<Role, "HOST" | "PLANNER" | "PROVIDER">;

/** Said as what the person does, not as a system role: organise, offer services, help organise. */
const SELF_SERVICE_ROLES: readonly { readonly role: SelfServiceRole; readonly title: string; readonly hint: string }[] = [
  { role: "HOST", title: "auth.roleHost", hint: "auth.roleHostHint" },
  { role: "PROVIDER", title: "auth.roleProvider", hint: "auth.roleProviderHint" },
  { role: "PLANNER", title: "auth.rolePlanner", hint: "auth.rolePlannerHint" }
];

const OTHER_CITY = "OTHER";
const FALLBACK_TIME_ZONE = "America/La_Paz";
/** The device's zone (stored on the account for dates and reminders); Bolivia when the runtime cannot tell. */
function deviceTimeZone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TIME_ZONE; } catch { return FALLBACK_TIME_ZONE; }
}

interface RegisterDraft {
  role: SelfServiceRole; givenName: string; familyName: string; phone: string; city: string; otherCity: string; organizationName: string;
  email: string; password: string; passwordConfirmation: string; acceptedTerms: boolean; marketingOptIn: boolean;
}
const EMPTY_DRAFT: RegisterDraft = { role: "HOST", givenName: "", familyName: "", phone: "+591 ", city: SIGN_UP_CITIES[0], otherCity: "", organizationName: "", email: "", password: "", passwordConfirmation: "", acceptedTerms: false, marketingOptIn: false };

/**
 * Sign-up asks for what the account needs from day one: who the person is (name, mobile, city), what they do (and the
 * company or business that role works under) and how they sign in. Planner and provider accounts get their organization
 * or business created with the account, so the first screen after sign-up already shows it.
 */
export function RegisterScreen({ onNavigate, returnTo = null }: AuthScreenProps): ReactNode {
  const authStyles = useAuthStyles();
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const compact = useWindowDimensions().width < 900;
  const auth = useAuth();
  const [draft, setDraft] = useState<RegisterDraft>(EMPTY_DRAFT);
  const set = <K extends keyof RegisterDraft>(key: K) => (value: RegisterDraft[K]): void => setDraft((current) => ({ ...current, [key]: value }));
  const [errors, setErrors] = useState<FieldErrors>({}); const submitState = useAuthSubmit(); const { busy, setStatus } = submitState;
  const submit = async (): Promise<void> => {
    if (busy || submitState.waitSeconds > 0) return;
    const city = draft.city === OTHER_CITY ? draft.otherCity : draft.city;
    const checked = validateRegistration({ ...draft, city, organizationName: draft.role === "HOST" ? "" : draft.organizationName });
    if (!checked.ok) {
      const { city: cityError, ...rest } = checked.errors;
      setErrors(fieldMessages(t, cityError ? { ...rest, [draft.city === OTHER_CITY ? "otherCity" : "city"]: cityError } : rest)); setStatus(IDLE); return;
    }
    setErrors({});
    const form = checked.value;
    const timeZone = deviceTimeZone();
    const prepare = async (session: Session): Promise<void> => {
      if (form.role === "HOST") return;
      const headers = { Authorization: `Bearer ${session.accessToken}` };
      if (form.role === "PLANNER") await client.request("/identity/organizations", { method: "POST", body: { name: form.organizationName }, headers, auth: false });
      else await client.request("/providers", { method: "POST", body: { name: form.organizationName, timeZone }, headers, auth: false });
    };
    await submitState.run(async () => {
      await auth.register({
        email: form.email, password: form.password, role: form.role, givenName: form.givenName, familyName: form.familyName, phone: form.phone,
        city: form.city, country: form.country, locale, timeZone, acceptedTerms: form.acceptedTerms, marketingOptIn: form.marketingOptIn
      }, prepare);
      return { kind: "busy" };
    });
  };
  const field = (key: keyof RegisterDraft) => ({ value: String(draft[key]), onChange: set(key) as (value: string) => void, error: errors[key], editable: !busy, testID: `register-${key}` });
  const go = { returnKeyType: "next" as const };
  const submitButton = <SubmitButton label={t("auth.register")} busyLabel={t("auth.creating")} busy={busy} blocked={submitState.waitSeconds > 0} onPress={() => { void submit(); }} testID="register-submit" />;
  return (
    <AuthLayout title={t("auth.registerTitle")} intro={t("auth.registerIntro")} illustration="table">
      <View style={[authStyles.form, { gap: spacing[8] }]}>
        <AuthSection title={t("auth.sectionRole")}>
          <View accessibilityRole="radiogroup" accessibilityLabel={t("auth.role")} style={{ gap: spacing[2] }}>
            {SELF_SERVICE_ROLES.map((option) => (
              <ChoiceRow key={option.role} testID={`register-role-${option.role}`} title={t(option.title)} hint={t(option.hint)} selected={draft.role === option.role} disabled={busy} onSelect={() => set("role")(option.role)} />
            ))}
          </View>
          {draft.role === "HOST" ? null : (
            <AuthField label={t(draft.role === "PLANNER" ? "auth.organizationPlanner" : "auth.organizationProvider")} hint={t(draft.role === "PLANNER" ? "auth.organizationPlannerHint" : "auth.organizationProviderHint")} autoCapitalize="words" autoComplete="organization" textContentType="organizationName" {...go} {...field("organizationName")} />
          )}
        </AuthSection>
        <AuthSection title={t("auth.sectionAbout")}>
          <AuthPair>
            <AuthField label={t("auth.givenName")} autoCapitalize="words" autoComplete="given-name" textContentType="givenName" {...go} {...field("givenName")} />
            <AuthField label={t("auth.familyName")} autoCapitalize="words" autoComplete="family-name" textContentType="familyName" {...go} {...field("familyName")} />
          </AuthPair>
          <AuthField label={t("auth.phone")} hint={t("auth.phoneHint")} keyboardType="phone-pad" inputMode="tel" autoComplete="tel" textContentType="telephoneNumber" {...go} {...field("phone")} />
          <View style={{ gap: spacing[1] }}>
            <Text style={authStyles.label}>{t("auth.city")}</Text>
            <FilterSelect label={t("auth.city")} value={draft.city} onChange={set("city")} options={[...SIGN_UP_CITIES.map((city) => ({ value: city, label: city })), { value: OTHER_CITY, label: t("auth.cityOther") }]} testID="register-city" />
            {errors["city"] ? <Text accessibilityRole="alert" style={authStyles.fieldError}>{errors["city"]}</Text> : null}
          </View>
          {draft.city === OTHER_CITY ? <AuthField label={t("auth.cityOtherLabel")} autoCapitalize="words" textContentType="addressCity" {...go} {...field("otherCity")} /> : null}
        </AuthSection>
        <AuthSection title={t("auth.sectionAccess")}>
          <AuthField label={t("auth.email")} autoComplete="email" keyboardType="email-address" textContentType="emailAddress" {...go} {...field("email")} />
          <AuthField label={t("auth.password")} hint={t("auth.passwordHint")} secret autoComplete="new-password" textContentType="newPassword" {...go} {...field("password")} />
          <AuthField label={t("auth.passwordConfirmation")} secret autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={() => { void submit(); }} {...field("passwordConfirmation")} />
          <AuthCheck label={t("auth.acceptTerms")} value={draft.acceptedTerms} onChange={set("acceptedTerms")} disabled={busy} testID="register-acceptedTerms" {...(errors["acceptedTerms"] ? { error: errors["acceptedTerms"] } : {})} />
          <AuthCheck label={t("auth.marketingOptIn")} value={draft.marketingOptIn} onChange={set("marketingOptIn")} disabled={busy} testID="register-marketingOptIn" />
        </AuthSection>
        {compact ? (
          <StickyActions bleed={0} summary={<FailureBanner submit={submitState} />}>{submitButton}</StickyActions>
        ) : (
          <View style={{ gap: spacing[5] }}>
            {submitButton}
            <FailureBanner submit={submitState} />
          </View>
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
        <Text style={authStyles.hint}>{hint}</Text>
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

