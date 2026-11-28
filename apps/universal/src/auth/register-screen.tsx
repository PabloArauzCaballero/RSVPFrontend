import { useEffect, useRef, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { ApiError } from "@rsvp/api-client";
import { REGISTRATION_CODE_LENGTH, SIGN_UP_CITIES, fieldErrorsOf, registrationCodeSchema, registrationContactSchema, registrationEmailSchema, registrationPasswordSchema, validate, validateRegistration, validateRegistrationAccount, type Role, type Session } from "@rsvp/auth";
import { spacing } from "@rsvp/design-tokens";
import { Checkbox, FilterSelect, StepTransition, type IllustrationName } from "@rsvp/ui";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { moveFocus } from "../platform/move-focus";
import { StepProgress } from "../host/step-progress";
import { useAuth } from "./auth-context";
import { AuthField, AuthLayout, AuthPair, Banner, FormActions, SubmitButton, TextLink, useAuthStyles } from "./auth-ui";
import { ChoiceRow, FailureBanner, fieldMessages, type AuthScreenProps, type FieldErrors } from "./auth-shared";
import { EMPTY_REGISTRATION_DRAFT, clearRegistrationDraft, readRegistrationDraft, rememberLoginEmail, writeRegistrationDraft, type RegistrationDraft } from "./registration-draft";
import { loginHref } from "./routes";
import { IDLE, useAuthSubmit } from "./use-auth-submit";

/**
 * Sign-up in four steps (MV-D2), a progress bar on top and the action fixed at the bottom of a phone (MV-D1):
 *  1. e-mail, then the 6-digit code that proves it (MV-D3: the screen is identical whether or not the address has an account);
 *  2. account type (what the person does), first and last name;
 *  3. mobile and city;
 *  4. one password with a show toggle, the terms (B6/PF-10) and the news consent.
 * The draft lives in memory only (`registration-draft.ts`). A planner's company is created with the account, as before; a
 * provider's business is not created here: partners are registered by an ADMIN (A24, DP-2).
 */

type SelfServiceRole = Extract<Role, "HOST" | "PLANNER" | "PROVIDER">;
type Step = RegistrationDraft["step"];
const STEPS = ["email", "account", "contact", "access"] as const;
const LAST_STEP = STEPS.length;
/** One drawing per step, none yellow and none with a face (MV-D4). */
const STEP_ART: Readonly<Record<(typeof STEPS)[number], IllustrationName>> = { email: "emailCode", account: "nameBadge", contact: "cityPin", access: "accessKey" };
const OTHER_CITY = "OTHER";
const FALLBACK_TIME_ZONE = "America/La_Paz";
/** Identity's minimum between two sends to one address is 60 s: the same wait is shown to everybody, whatever happened to the send. */
const RESEND_SECONDS = 60;
const TICK_MS = 1000;
const MS = 1000;
const STATUS_INVALID = 422;

/** The self-service roles, said as what the person does, not as a system role. PLANNER stays as it was: no written recommendation removes it. */
const SELF_SERVICE_ROLES: readonly { readonly role: SelfServiceRole; readonly title: string; readonly hint: string }[] = [
  { role: "HOST", title: "auth.roleHost", hint: "auth.roleHostHint" },
  { role: "PROVIDER", title: "auth.roleProvider", hint: "auth.roleProviderHint" },
  { role: "PLANNER", title: "auth.rolePlanner", hint: "auth.rolePlannerHint" }
];

/** The device's zone (stored on the account for dates and reminders); Bolivia when the runtime cannot tell. */
function deviceTimeZone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TIME_ZONE; } catch { return FALLBACK_TIME_ZONE; }
}
const normalizeEmail = (value: string): string => value.trim().toLowerCase();
/** A restored draft never starts past step 1 without a proof of its address. */
function startingDraft(): RegistrationDraft {
  const saved = readRegistrationDraft() ?? { ...EMPTY_REGISTRATION_DRAFT, city: SIGN_UP_CITIES[0] };
  return saved.proof && saved.step > 1 ? saved : { ...saved, step: 1 };
}
/** Whole seconds left until `until` (epoch ms); 0 once it passed. Re-renders every second while it runs. */
function useSecondsUntil(until: number): number {
  const [, tick] = useState(0);
  useEffect(() => {
    if (until <= Date.now()) return undefined;
    const timer = setInterval(() => { tick((count) => count + 1); if (Date.now() >= until) clearInterval(timer); }, TICK_MS);
    return () => clearInterval(timer);
  }, [until]);
  return Math.max(0, Math.ceil((until - Date.now()) / MS));
}
/** Moves keyboard and screen-reader focus to a labelled group when `stage` changes after the first render (the code field appearing, a step swapping). */
function FocusGroup({ stage, label, children }: { readonly stage: string; readonly label: string; readonly children: ReactNode }): ReactNode {
  const node = useRef<View>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    moveFocus(node.current);
  }, [stage]);
  return <View ref={node} role="group" aria-label={label} style={{ gap: spacing[8] }}>{children}</View>;
}

export function RegisterScreen({ onNavigate, returnTo = null }: AuthScreenProps): ReactNode {
  const authStyles = useAuthStyles();
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const auth = useAuth();
  const [draft, setDraftState] = useState<RegistrationDraft>(startingDraft);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [resendAt, setResendAt] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<"resent" | "proofExpired" | null>(null);
  const submitState = useAuthSubmit(); const { busy, setStatus } = submitState;
  const wait = useSecondsUntil(resendAt);
  useEffect(() => { writeRegistrationDraft(draft); }, [draft]);
  const set = <K extends keyof RegistrationDraft>(key: K) => (value: RegistrationDraft[K]): void => setDraftState((current) => ({ ...current, [key]: value }));
  const verified = draft.proof !== null && normalizeEmail(draft.email) === draft.proofEmail;
  const stepName = STEPS[draft.step - 1] ?? "email";
  const goTo = (step: Step): void => { setErrors({}); setNotice(null); setStatus(IDLE); setDraftState((current) => ({ ...current, step })); };
  const city = draft.city === OTHER_CITY ? draft.otherCity : draft.city;
  const cityErrorField = draft.city === OTHER_CITY ? "otherCity" : "city";
  const fail = (found: FieldErrors): void => { setErrors(fieldMessages(t, found)); setStatus(IDLE); };

  const signInInstead = (): void => { rememberLoginEmail(draft.email); onNavigate(loginHref(returnTo)); };
  const changeEmail = (): void => { setStage("email"); setCode(""); setErrors({}); setNotice(null); setStatus(IDLE); };

  const sendCode = async (resend: boolean): Promise<void> => {
    if (busy || submitState.waitSeconds > 0 || (resend && wait > 0)) return;
    const checked = validate(registrationEmailSchema, { email: draft.email });
    if (!checked.ok) { fail(checked.errors); return; }
    setErrors({});
    await submitState.run(async () => {
      // The answer is a bare 202 for every well-formed address: nothing about it can change what the person sees.
      await auth.requestRegistrationEmailCode(checked.value.email, locale);
      setStage("code"); setCode(""); setResendAt(Date.now() + RESEND_SECONDS * MS); setNotice(resend ? "resent" : null);
    });
  };
  const verifyCode = async (): Promise<void> => {
    if (busy || submitState.waitSeconds > 0) return;
    const checked = validate(registrationCodeSchema, { code });
    if (!checked.ok) { fail(checked.errors); return; }
    setErrors({}); setNotice(null);
    await submitState.run(async () => {
      try {
        const answer = await auth.verifyRegistrationEmailCode(draft.email.trim(), checked.value.code);
        setDraftState((current) => ({ ...current, email: current.email.trim(), proof: answer.proof, proofEmail: normalizeEmail(current.email), step: 2 }));
        setCode(""); setStage("email");
      } catch (error) {
        // One identical 422 for a wrong, expired, exhausted or never requested code: the person is told the same thing every time.
        if (error instanceof ApiError && error.status === STATUS_INVALID) { setErrors({ code: t("auth.signup.code.invalid") }); return IDLE; }
        throw error;
      }
    });
  };
  const nextFromEmail = async (): Promise<void> => {
    if (verified) { const checked = validate(registrationEmailSchema, { email: draft.email }); if (!checked.ok) { fail(checked.errors); return; } goTo(2); return; }
    await (stage === "email" ? sendCode(false) : verifyCode());
  };
  const nextFromAccount = (): void => {
    const checked = validateRegistrationAccount({ role: draft.role, givenName: draft.givenName, familyName: draft.familyName, organizationName: draft.role === "PLANNER" ? draft.organizationName : "" });
    if (!checked.ok) { fail(checked.errors); return; }
    goTo(3);
  };
  const nextFromContact = (): void => {
    const checked = validate(registrationContactSchema, { phone: draft.phone, city });
    if (!checked.ok) { const { city: cityError, ...rest } = checked.errors; fail(cityError ? { ...rest, [cityErrorField]: cityError } : rest); return; }
    goTo(4);
  };
  const createAccount = async (): Promise<void> => {
    if (busy || submitState.waitSeconds > 0) return;
    const passwordChecked = validate(registrationPasswordSchema, { password, marketingOptIn: draft.marketingOptIn });
    const termsError: FieldErrors = draft.termsAccepted ? {} : { terms: t("legal.consent.required") };
    if (!passwordChecked.ok || !draft.termsAccepted) { setErrors({ ...fieldMessages(t, passwordChecked.ok ? {} : passwordChecked.errors), ...termsError }); setStatus(IDLE); return; }
    const checked = validateRegistration({ ...draft, city, password, organizationName: draft.role === "PLANNER" ? draft.organizationName : "" });
    if (!checked.ok || !draft.proof || !verified) {
      // Something an earlier step let through (a restored draft): take the person back to it instead of failing at the last button.
      const found = checked.ok ? {} : checked.errors;
      const back: Step = !verified ? 1 : "givenName" in found || "familyName" in found || "organizationName" in found ? 2 : 3;
      const { city: cityError, ...rest } = found;
      goTo(back); setErrors(fieldMessages(t, cityError ? { ...rest, [cityErrorField]: cityError } : rest)); return;
    }
    const form = checked.value;
    const proof = draft.proof;
    const prepare = async (session: Session): Promise<void> => {
      if (form.role !== "PLANNER") return;
      await client.request("/identity/organizations", { method: "POST", body: { name: form.organizationName }, headers: { Authorization: `Bearer ${session.accessToken}` }, auth: false });
    };
    await submitState.run(async () => {
      try {
        await auth.register({
          email: form.email, password: form.password, role: form.role, termsVersion: t("legal.version"),
          givenName: form.givenName, familyName: form.familyName, phone: form.phone, city: form.city, country: form.country,
          locale, timeZone: deviceTimeZone(), marketingOptIn: form.marketingOptIn, registrationProof: proof
        }, prepare);
      } catch (error) {
        // The proof is single use and lasts 30 minutes: a 422 on it sends the person back to ask for a new code, with what they typed kept.
        if (error instanceof ApiError && error.status === STATUS_INVALID && "registrationProof" in fieldErrorsOf(error)) {
          setDraftState((current) => ({ ...current, proof: null, proofEmail: "", step: 1 })); setStage("code"); setCode(""); setPassword(""); setErrors({}); setNotice("proofExpired");
          return IDLE;
        }
        throw error;
      }
      clearRegistrationDraft();
      return { kind: "busy" };
    });
  };

  const field = (key: "givenName" | "familyName" | "organizationName" | "phone" | "otherCity" | "email") => ({ value: draft[key], onChange: set(key), error: errors[key], editable: !busy, testID: `register-${key}` });
  const next = { returnKeyType: "next" as const };
  const stepLabel = t(`auth.signup.stepLabels.${stepName}`);
  const stepText = t("auth.signup.step", { step: draft.step });
  const progress = <StepProgress step={draft.step} total={LAST_STEP} name={stepLabel} progressLabel={t("auth.signup.progress")} stepText={stepText} {...(draft.step > 1 ? { back: { label: t("auth.signup.back"), onPress: () => goTo((draft.step - 1) as Step), testID: "register-back" } } : {})} />;
  const summary = <>{notice === "resent" ? <Banner kind="success">{t("auth.signup.code.resent")}</Banner> : null}{notice === "proofExpired" ? <Banner kind="error">{t("auth.signup.code.proofExpired")}</Banner> : null}<FailureBanner submit={submitState} /></>;
  const codeStage = draft.step === 1 && stage === "code" && !verified;
  const title = codeStage ? t("auth.signup.code.title") : stepName === "email" ? t("auth.signup.email.title") : t(`auth.signup.${stepName}.title`);
  const intro = codeStage ? t("auth.signup.code.intro") : stepName === "email" ? t("auth.signup.email.intro") : t(`auth.signup.${stepName}.intro`);

  const emailBody = (): ReactNode => (
    <FocusGroup stage={codeStage ? "code" : "email"} label={title}>
      <View style={authStyles.form}>
        {codeStage ? (
          <>
            <Text style={authStyles.hint} testID="register-code-email">{t("auth.signup.code.forEmail", { email: draft.email.trim() })}</Text>
            <AuthField label={t("auth.signup.code.label")} value={code} onChange={(value) => setCode(value.replace(/\D/g, "").slice(0, REGISTRATION_CODE_LENGTH))} error={errors["code"]} keyboardType="number-pad" inputMode="numeric" autoComplete="one-time-code" textContentType="oneTimeCode" returnKeyType="go" onSubmitEditing={() => { void verifyCode(); }} editable={!busy} testID="register-code" />
          </>
        ) : (
          <AuthField label={t("auth.email")} autoComplete="email" keyboardType="email-address" textContentType="emailAddress" returnKeyType="go" onSubmitEditing={() => { void nextFromEmail(); }} {...field("email")} onChange={(value) => setDraftState((current) => ({ ...current, email: value }))} />
        )}
        {verified && !codeStage ? <Banner kind="success">{t("auth.signup.verified")}</Banner> : null}
        <FormActions summary={summary}>
          <SubmitButton label={verified ? t("auth.signup.next") : codeStage ? t("auth.signup.code.verify") : t("auth.signup.email.send")} busyLabel={codeStage ? t("auth.signup.code.verifying") : t("auth.signup.email.sending")} busy={busy} blocked={submitState.waitSeconds > 0} onPress={() => { void nextFromEmail(); }} testID="register-next" />
        </FormActions>
        {codeStage ? (
          <View style={{ gap: spacing[1] }}>
            <TextLink label={wait > 0 ? t("auth.signup.code.resendIn", { seconds: wait }) : t("auth.signup.code.resend")} onPress={() => { void sendCode(true); }} />
            <TextLink label={t("auth.signup.code.change")} onPress={changeEmail} />
          </View>
        ) : null}
      </View>
    </FocusGroup>
  );
  const accountBody = (): ReactNode => (
    <View style={authStyles.form}>
      <View accessibilityRole="radiogroup" accessibilityLabel={t("auth.role")} style={{ gap: spacing[2] }}>
        {SELF_SERVICE_ROLES.map((option) => (
          <ChoiceRow key={option.role} testID={`register-role-${option.role}`} title={t(option.title)} hint={t(option.hint)} selected={draft.role === option.role} disabled={busy} onSelect={() => set("role")(option.role)} />
        ))}
      </View>
      {draft.role === "PLANNER" ? <AuthField label={t("auth.organizationPlanner")} hint={t("auth.organizationPlannerHint")} autoCapitalize="words" autoComplete="organization" textContentType="organizationName" {...next} {...field("organizationName")} /> : null}
      <AuthPair>
        <AuthField label={t("auth.givenName")} autoCapitalize="words" autoComplete="given-name" textContentType="givenName" {...next} {...field("givenName")} />
        <AuthField label={t("auth.familyName")} autoCapitalize="words" autoComplete="family-name" textContentType="familyName" returnKeyType="go" onSubmitEditing={nextFromAccount} {...field("familyName")} />
      </AuthPair>
      <FormActions summary={summary}><SubmitButton label={t("auth.signup.next")} busyLabel={t("common.loading")} busy={false} onPress={nextFromAccount} testID="register-next" /></FormActions>
    </View>
  );
  const contactBody = (): ReactNode => (
    <View style={authStyles.form}>
      <AuthField label={t("auth.phone")} hint={t("auth.phoneHint")} keyboardType="phone-pad" inputMode="tel" autoComplete="tel" textContentType="telephoneNumber" {...next} {...field("phone")} />
      <View style={{ gap: spacing[1] }}>
        <Text style={authStyles.label}>{t("auth.city")}</Text>
        <FilterSelect label={t("auth.city")} value={draft.city} onChange={set("city")} options={[...SIGN_UP_CITIES.map((name) => ({ value: name, label: name })), { value: OTHER_CITY, label: t("auth.cityOther") }]} testID="register-city" />
        {errors["city"] ? <Text accessibilityRole="alert" style={authStyles.fieldError}>{errors["city"]}</Text> : null}
      </View>
      {draft.city === OTHER_CITY ? <AuthField label={t("auth.cityOtherLabel")} autoCapitalize="words" textContentType="addressCity" returnKeyType="go" onSubmitEditing={nextFromContact} {...field("otherCity")} /> : null}
      <FormActions summary={summary}><SubmitButton label={t("auth.signup.next")} busyLabel={t("common.loading")} busy={false} onPress={nextFromContact} testID="register-next" /></FormActions>
    </View>
  );
  const accessBody = (): ReactNode => (
    <View style={authStyles.form}>
      <AuthField label={t("auth.password")} hint={t("auth.passwordHint")} value={password} onChange={setPassword} error={errors["password"]} secret autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={() => { void createAccount(); }} editable={!busy} testID="register-password" />
      <View style={{ gap: spacing[1] }}>
        <Checkbox label={t("legal.consent.accept")} value={draft.termsAccepted} onChange={set("termsAccepted")} state={busy ? "disabled" : "default"} error={errors["terms"]} />
        <View style={authStyles.switchRow}>
          <TextLink label={t("legal.links.terms")} onPress={() => onNavigate("/terminos")} />
          <TextLink label={t("legal.links.privacy")} onPress={() => onNavigate("/privacidad")} />
        </View>
      </View>
      <Checkbox label={t("auth.marketingOptIn")} value={draft.marketingOptIn} onChange={set("marketingOptIn")} state={busy ? "disabled" : "default"} />
      <FormActions summary={summary}>
        <SubmitButton label={t("auth.register")} busyLabel={t("auth.creating")} busy={busy} blocked={submitState.waitSeconds > 0} onPress={() => { void createAccount(); }} testID="register-submit" />
      </FormActions>
    </View>
  );
  const bodies: Readonly<Record<(typeof STEPS)[number], () => ReactNode>> = { email: emailBody, account: accountBody, contact: contactBody, access: accessBody };
  return (
    <AuthLayout title={title} intro={intro} illustration={STEP_ART[stepName]} progress={progress}>
      <StepTransition step={draft.step} announce={`${stepText}: ${stepLabel}`}>{bodies[stepName]()}</StepTransition>
      <View style={authStyles.switchRow}>
        <Text style={authStyles.switchLead}>{t("auth.haveAccount")}</Text>
        <TextLink label={t("auth.signIn")} onPress={signInInstead} />
      </View>
    </AuthLayout>
  );
}
