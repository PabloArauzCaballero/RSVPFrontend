import { useEffect, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { radius, spacing } from "@rsvp/design-tokens";
import { AvatarMark, Chip, Enter, Stagger, fonts, useColors } from "@rsvp/ui";
import { ApiError } from "@rsvp/api-client";
import { formatNumber } from "@rsvp/i18n";
import { MAX_PROVIDER_NAME, providerService, useMetrics, useOwnListings, useRegisterProviderAccount, useSubmitProvider, useUpdateProvider, type Provider } from "@rsvp/query-hooks";
import { createApiClientForPublicRead } from "./public-client";
import { useApiClient, useClaims, useLocale, useT } from "../platform/providers";
import { ActionButton, Celebrate, CheckMark, EmptyState, Field, Illustration, Notice, PageIntro, useStyles } from "../host/ui";
import { Button } from "@rsvp/ui";
import { PortalErrorNotice as ErrorNotice } from "./errors";
import { PORTAL_ROUTES, PortalScreen, usePortalHeader, useProviderId } from "./frame";
import { lastDays } from "./metrics-screen";
import { useSingleMutation } from "../platform/single-flight";
import { Moment, useFirstTime } from "./parts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Rename the business (PATCH /providers/{id}); opened from the "⋯" menu of the header. The plan is admin-only and is not offered. */
function RenameProvider({ provider, open, onClose }: { readonly provider: Provider; readonly open: boolean; readonly onClose: () => void }): ReactNode {
  const t = useT();
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (open) setSaved(false); }, [open]);
  if (!open) return saved ? <Notice kind="success">{t("portal.rename.saved")}</Notice> : null;
  // The form is mounted only while open, so its fields start from the current name with no effect that could overwrite what was just typed.
  return <RenameForm provider={provider} onClose={onClose} onSaved={() => setSaved(true)} />;
}

function RenameForm({ provider, onClose, onSaved }: { readonly provider: Provider; readonly onClose: () => void; readonly onSaved: () => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const update = useUpdateProvider(useApiClient(), provider.id);
  const updateOnce = useSingleMutation(update);
  const [name, setName] = useState(provider.name);
  const [problem, setProblem] = useState<string | null>(null);
  const submit = (): void => {
    const next = name.trim();
    if (!next) return setProblem(t("portal.rename.required"));
    if (next.length > MAX_PROVIDER_NAME) return setProblem(t("portal.rename.tooLong"));
    setProblem(null);
    if (next === provider.name) { onClose(); return; }
    updateOnce({ name: next }, { onSuccess: () => { onSaved(); onClose(); } });
  };
  return (
    <View style={{ gap: spacing[2], maxWidth: 560 }}>
      <Field label={t("portal.rename.field")} value={name} onChange={setName} {...(problem ? { error: problem } : {})} testID="rename-name" />
      <ErrorNotice error={update.error} onRetry={submit} />
      <View style={styles.row}>
        <ActionButton label={update.isPending ? t("portal.rename.saving") : t("portal.rename.save")} busy={update.isPending} disabled={update.isPending} onPress={submit} testID="rename-save" />
        <ActionButton variant="secondary" label={t("portal.rename.cancel")} disabled={update.isPending} onPress={onClose} testID="rename-cancel" />
      </View>
    </View>
  );
}

const STEP_ICON = 28;

/** One step of the "ready to sell" path: a drawn check when done, an empty ring when it is still to do. */
function Step({ done, title, body, children, testID }: { readonly done: boolean; readonly title: string; readonly body: string; readonly children?: ReactNode; readonly testID: string }): ReactNode {
  const styles = useStyles();
  const palette = useColors();
  return (
    <View style={{ flexDirection: "row", gap: spacing[3], paddingVertical: spacing[3] }} testID={testID} accessible accessibilityLabel={`${title}. ${body}`}>
      <View style={{ width: STEP_ICON, alignItems: "center" }}>
        {done ? <CheckMark size={STEP_ICON} tone="success" play={false} /> : <View style={{ width: STEP_ICON - 4, height: STEP_ICON - 4, marginTop: 2, borderRadius: 999, borderWidth: 2, borderColor: palette.fieldBorder }} />}
      </View>
      <View style={{ flex: 1, gap: spacing[1] }}>
        <Text style={styles.label}>{title}</Text>
        <Text style={styles.muted}>{body}</Text>
        {children}
      </View>
    </View>
  );
}

/**
 * D2 · "Ready to sell": the profile, the first offer and the verification as one visible path.
 * The ONE primary action sits at the top right of the header (create the first offer, or send to verification); renaming lives in its "⋯" menu.
 * The progress only counts what the backend confirms (provider exists, own listings exist, status left DRAFT/REJECTED).
 */
function Overview({ provider, refetch }: { readonly provider: Provider; readonly refetch: () => void }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const client = useApiClient();
  const styles = useStyles();
  const submit = useSubmitProvider(client, provider.id);
  const submitOnce = useSingleMutation(submit);
  const listings = useOwnListings(client, provider.id, locale);
  const range = lastDays(30, provider.timeZone);
  const metrics = useMetrics(client, provider.id, range.from, range.to);
  const [renaming, setRenaming] = useState(false);
  const hasListing = (listings.data?.items.length ?? 0) > 0;
  const resubmittable = provider.status === "DRAFT" || provider.status === "REJECTED";
  const sent = !resubmittable;
  const suspended = provider.status === "SUSPENDED";
  const doneCount = 1 + (hasListing ? 1 : 0) + (sent ? 1 : 0);
  const tone = provider.status === "VERIFIED" ? "yes" : provider.status === "PENDING_VERIFICATION" ? "maybe" : provider.status === "DRAFT" ? "wait" : "no";
  const firstVerified = useFirstTime(`rsvp.provider.${provider.id}.verified-seen`, provider.status === "VERIFIED");
  const milestone = provider.status === "PENDING_VERIFICATION" ? "PENDING_VERIFICATION" : resubmittable && hasListing ? "offer" : firstVerified ? "VERIFIED" : null;
  const primary = suspended || !listings.data ? undefined
    : !hasListing ? { label: t("portal.home.journey.offer.action"), onPress: () => router.push(PORTAL_ROUTES.services as Href), testID: "step-offer-action" }
    : resubmittable ? { label: submit.isPending ? t("portal.status.submitting") : t("portal.status.submit"), busy: submit.isPending, disabled: submit.isPending, onPress: () => submitOnce(undefined, { onSuccess: refetch }), testID: "submit-verification" }
    : undefined;
  usePortalHeader(primary, [{ key: "rename", label: t("portal.rename.action"), onPress: () => setRenaming(true) }]);
  const totals = metrics.data?.totals;
  return (
    <View style={{ gap: spacing[5] }}>
      <ReadyHeader provider={provider} tone={tone} doneCount={doneCount} celebrating={Boolean(milestone)} />
      <RenameProvider provider={provider} open={renaming} onClose={() => setRenaming(false)} />
      {milestone ? <Enter key={milestone} from="down"><Moment><Celebrate title={t(`portal.home.milestone.${milestone}.title`)} body={t(`portal.home.milestone.${milestone}.body`)} /></Moment></Enter> : null}
      {suspended ? <EmptyState illustration="suspended" title={t("portal.status.SUSPENDED.label")} body={t("portal.status.SUSPENDED.body")} /> : provider.status === "VERIFIED" ? null : (
        // Once verified the path is finished: the header already says "3 of 3" and "Verified", so the three done steps are not listed again.
        <View style={{ maxWidth: 720 }}>
          <Stagger>
            <Step key="profile" testID="step-profile" done title={t("portal.home.journey.profile.title")} body={t("portal.home.journey.profile.done", { name: provider.name })} />
            <Step key="offer" testID="step-offer" done={hasListing} title={t("portal.home.journey.offer.title")} body={t(hasListing ? "portal.home.journey.offer.done" : "portal.home.journey.offer.todo")} />
            <Step key="verify" testID="step-verify" done={sent} title={t("portal.home.journey.verify.title")} body={t(sent ? "portal.home.journey.verify.done" : "portal.home.journey.verify.todo")}>
              {resubmittable && hasListing ? <Notice>{t("portal.status.documentsNote")}</Notice> : null}
              {resubmittable && !hasListing && listings.data ? <Text style={styles.muted}>{t("portal.status.needsListing")}</Text> : null}
              <ErrorNotice error={submit.error} onReload={refetch} />
            </Step>
          </Stagger>
        </View>
      )}
      {totals && provider.status === "VERIFIED" ? (
        <View style={[styles.row, { maxWidth: 720, alignItems: "center" }]} testID="home-last30">
          <Text style={[styles.muted, { flex: 1 }]}>{t("portal.home.last30Summary", { valid: formatNumber(totals.validLeads, locale), views: formatNumber(totals.impressions, locale) })}</Text>
          <Button variant="ghost" accessibilityLabel={t("portal.home.last30Link")} onPress={() => router.push(PORTAL_ROUTES.metrics as Href)} testID="home-last30-link" state="default">{t("portal.home.last30Link")}</Button>
        </View>
      ) : null}
    </View>
  );
}

/** "Ready to sell": the business, its state and how far the path has come, on a plain card with a 1 px edge (no colour field). */
function ReadyHeader({ provider, tone, doneCount, celebrating = false }: { readonly provider: Provider; readonly tone: "yes" | "maybe" | "wait" | "no"; readonly doneCount: number; readonly celebrating?: boolean }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  return (
    <View style={{ maxWidth: 720, gap: spacing[5], padding: spacing[8], backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: radius.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[4] }}>
        <AvatarMark name={provider.name} size={52} />
        <View style={{ flex: 1, gap: spacing[1] }}>
          <Text accessibilityRole="header" style={[styles.subtitle, { fontSize: 28, lineHeight: 31, letterSpacing: -0.8 }]}>{t("portal.home.journey.title")}</Text>
          <Text numberOfLines={2} style={styles.muted}>{provider.name} · {t("portal.home.plan", { plan: provider.plan })} · {provider.timeZone}</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2], flexWrap: "wrap" }} testID="provider-status"><Chip tone={tone}>{t(`portal.status.${provider.status}.label`)}</Chip></View>
      {/* While a milestone is celebrated just below, it already says the same thing: the card keeps the state and the progress, not the prose twice. */}
      {provider.status === "SUSPENDED" || celebrating ? null : <Text style={[styles.body, { color: palette.text }]}>{t(`portal.status.${provider.status}.body`)}</Text>}
      <View style={{ gap: spacing[2] }}>
        <Text style={[styles.label, { fontFamily: fonts.mono, fontWeight: "400" }]}>{t("portal.home.journey.progress", { done: doneCount, total: 3 })}</Text>
        <View style={{ height: 4, borderRadius: radius.full, backgroundColor: palette.surfaceMuted, overflow: "hidden" }} role="progressbar" aria-label={t("portal.home.journey.title")} aria-valuemin={0} aria-valuemax={3} aria-valuenow={doneCount}>
          <View style={{ height: 4, width: `${Math.round((doneCount / 3) * 100)}%`, backgroundColor: palette.primary }} />
        </View>
      </View>
    </View>
  );
}

export function OverviewScreen(): ReactNode {
  const t = useT();
  return <PortalScreen title={t("portal.home.title")} current="home">{(provider, refetch) => <Overview provider={provider} refetch={refetch} />}</PortalScreen>;
}

/** D1 · Sign-up of the business and connecting an existing profile. The primary action («Crear mi ficha») sits in the header. */
export function OnboardingScreen({ onDone }: { readonly onDone: () => void }): ReactNode {
  const t = useT();
  return <PortalScreen title={t("portal.onboarding.title")} current="home" requireProvider={false}>{() => <OnboardingBody onDone={onDone} />}</PortalScreen>;
}

function OnboardingBody({ onDone }: { readonly onDone: () => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  const client = useApiClient();
  const { remember } = useProviderId();
  const claims = useClaims();
  const register = useRegisterProviderAccount(client);
  const registerOnce = useSingleMutation(register);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const create = (): void => {
    if (!name.trim()) return setError(t("portal.onboarding.required"));
    if (name.trim().length > MAX_PROVIDER_NAME) return setError(t("portal.onboarding.tooLong"));
    setError(null);
    registerOnce({ name: name.trim() }, { onSuccess: (provider) => { void remember(provider.id).then(onDone); } });
  };
  const connect = async (): Promise<void> => {
    if (!UUID.test(code.trim())) return setError(t("portal.onboarding.invalidId"));
    setError(null); setConnecting(true);
    try {
      const provider = await createApiClientForPublicRead(client).get(code.trim());
      // GET /providers/{id} is public for VERIFIED providers and hides ownerId from other accounts, so ownership is checked against the
      // caller's own list; an older gateway without /providers/mine falls back to the ownerId the owner's read carries.
      const owned = await providerService(client).mine().then((mine) => mine.items.some((item) => item.id === provider.id), () => null);
      if (owned === false || (owned === null && provider.ownerId !== undefined && claims.userId && provider.ownerId !== claims.userId)) { setError(t("portal.onboarding.notOwner")); return; }
      await remember(provider.id); onDone();
    } catch (failure) { setError(failure instanceof ApiError && failure.status === 404 ? t("portal.onboarding.notFound") : t("portal.errors.generic")); } finally { setConnecting(false); }
  };
  usePortalHeader({ label: register.isPending ? t("portal.onboarding.creating") : t("portal.onboarding.submit"), busy: register.isPending, disabled: register.isPending, onPress: create, testID: "provider-create" });
  return (
    <View style={{ gap: spacing[4] }}>
      <View style={[styles.row, { gap: spacing[4], flexWrap: "nowrap" }]}><Illustration name="welcomeProvider" tone="auto" size="md" /><View style={{ flex: 1 }}><PageIntro>{t("portal.onboarding.intro")}</PageIntro></View></View>
      <View style={{ gap: spacing[3], maxWidth: 560 }}>
        <Field label={t("portal.onboarding.name")} value={name} onChange={setName} help={t("portal.onboarding.nameHelp")} testID="provider-name" />
        {error ? <Notice kind="error">{error}</Notice> : null}
        <ErrorNotice error={register.error} onRetry={create} />
      </View>
      <View style={{ gap: spacing[3], maxWidth: 560, paddingTop: spacing[4], borderTopWidth: 1, borderTopColor: palette.border }}>
        <Text accessibilityRole="header" style={styles.subtitle}>{t("portal.onboarding.existingTitle")}</Text>
        <Text style={styles.body}>{t("portal.onboarding.existingBody")}</Text>
        <Field label={t("portal.onboarding.existingId")} value={code} onChange={setCode} testID="provider-code" />
        <ActionButton variant="secondary" label={t("portal.onboarding.connect")} busy={connecting} disabled={connecting} onPress={() => { void connect(); }} testID="provider-connect" />
      </View>
    </View>
  );
}
