import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { brand, onNight, spacing } from "@rsvp/design-tokens";
import { AvatarMark, BrandBand, Chip, Enter, Stagger, useColors } from "@rsvp/ui";
import { ApiError } from "@rsvp/api-client";
import { MAX_PROVIDER_NAME, providerService, useMetrics, useOwnListings, useRegisterProviderAccount, useSubmitProvider, useUpdateProvider, type Provider } from "@rsvp/query-hooks";
import { createApiClientForPublicRead } from "./public-client";
import { useApiClient, useClaims, useLocale, useT } from "../platform/providers";
import { ActionButton, Celebrate, CheckMark, EmptyState, Field, Illustration, Notice, PageIntro, useStyles } from "../host/ui";
import { PortalErrorNotice as ErrorNotice } from "./errors";
import { PORTAL_ROUTES, PortalScreen, useProviderId } from "./frame";
import { RangeTotals, lastDays } from "./metrics-screen";
import { useSingleMutation } from "../platform/single-flight";
import { MoreToggle, Moment, RowsSkeleton, useFirstTime } from "./parts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Rename the business (PATCH /providers/{id}). The plan is admin-only and is not offered. */
function RenameProvider({ provider }: { readonly provider: Provider }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const update = useUpdateProvider(useApiClient(), provider.id);
  const updateOnce = useSingleMutation(update);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(provider.name);
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const submit = (): void => {
    const next = name.trim();
    if (!next) return setProblem(t("portal.rename.required"));
    if (next.length > MAX_PROVIDER_NAME) return setProblem(t("portal.rename.tooLong"));
    setProblem(null); setSaved(false);
    if (next === provider.name) { setOpen(false); return; }
    updateOnce({ name: next }, { onSuccess: () => { setSaved(true); setOpen(false); } });
  };
  if (!open) return <View style={{ gap: spacing[2] }}>{saved ? <Notice kind="success">{t("portal.rename.saved")}</Notice> : null}<ActionButton variant="secondary" label={t("portal.rename.action")} onPress={() => { setName(provider.name); setSaved(false); update.reset(); setOpen(true); }} testID="rename-open" /></View>;
  return (
    <View style={{ gap: spacing[2] }}>
      <Field label={t("portal.rename.field")} value={name} onChange={setName} {...(problem ? { error: problem } : {})} testID="rename-name" />
      <ErrorNotice error={update.error} onRetry={submit} />
      <View style={styles.row}>
        <ActionButton label={update.isPending ? t("portal.rename.saving") : t("portal.rename.save")} busy={update.isPending} disabled={update.isPending} onPress={submit} testID="rename-save" />
        <ActionButton variant="secondary" label={t("portal.rename.cancel")} disabled={update.isPending} onPress={() => { setOpen(false); setProblem(null); }} testID="rename-cancel" />
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
 * D2 · "Ready to sell": the profile, the first offer and the verification as one visible path, one primary action at a time.
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
  const [more, setMore] = useState(false);
  const hasListing = (listings.data?.items.length ?? 0) > 0;
  const resubmittable = provider.status === "DRAFT" || provider.status === "REJECTED";
  const sent = !resubmittable;
  const suspended = provider.status === "SUSPENDED";
  const doneCount = 1 + (hasListing ? 1 : 0) + (sent ? 1 : 0);
  const tone = provider.status === "VERIFIED" ? "yes" : provider.status === "PENDING_VERIFICATION" ? "maybe" : provider.status === "DRAFT" ? "wait" : "no";
  const firstVerified = useFirstTime(`rsvp.provider.${provider.id}.verified-seen`, provider.status === "VERIFIED");
  const milestone = provider.status === "PENDING_VERIFICATION" ? "PENDING_VERIFICATION" : resubmittable && hasListing ? "offer" : firstVerified ? "VERIFIED" : null;
  return (
    <View style={{ gap: spacing[5] }}>
      <ReadyBand provider={provider} tone={tone} doneCount={doneCount} celebrating={Boolean(milestone)} />
      {milestone ? <Enter key={milestone} from="down"><Moment variant={milestone === "VERIFIED" ? "published" : "confirmed"}><Celebrate title={t(`portal.home.milestone.${milestone}.title`)} body={t(`portal.home.milestone.${milestone}.body`)} /></Moment></Enter> : null}
      {suspended ? <EmptyState illustration="suspended" title={t("portal.status.SUSPENDED.label")} body={t("portal.status.SUSPENDED.body")} /> : (
        <View style={{ maxWidth: 720 }}>
          <Stagger>
            <Step key="profile" testID="step-profile" done title={t("portal.home.journey.profile.title")} body={t("portal.home.journey.profile.done", { name: provider.name })} />
            <Step key="offer" testID="step-offer" done={hasListing} title={t("portal.home.journey.offer.title")} body={t(hasListing ? "portal.home.journey.offer.done" : "portal.home.journey.offer.todo")}>
              {!hasListing && listings.data ? <Illustration name="welcomeProvider" tone="auto" size="md" /> : null}
              {!hasListing && listings.data ? <ActionButton label={t("portal.home.journey.offer.action")} onPress={() => router.push(PORTAL_ROUTES.services as Href)} testID="step-offer-action" /> : null}
            </Step>
            <Step key="verify" testID="step-verify" done={sent} title={t("portal.home.journey.verify.title")} body={t(sent ? "portal.home.journey.verify.done" : "portal.home.journey.verify.todo")}>
              {resubmittable && hasListing ? <Notice>{t("portal.status.documentsNote")}</Notice> : null}
              {resubmittable && !hasListing && listings.data ? <Text style={styles.muted}>{t("portal.status.needsListing")}</Text> : null}
              <ErrorNotice error={submit.error} onReload={refetch} />
              {resubmittable && hasListing ? <ActionButton label={submit.isPending ? t("portal.status.submitting") : t("portal.status.submit")} busy={submit.isPending} disabled={submit.isPending} onPress={() => submitOnce(undefined, { onSuccess: refetch })} testID="submit-verification" /> : null}
            </Step>
          </Stagger>
        </View>
      )}
      <View style={{ gap: spacing[2], maxWidth: 560 }}>
        <Text accessibilityRole="header" style={styles.subtitle}>{t("portal.home.last30")}</Text>
        {metrics.isPending ? <RowsSkeleton count={3} minHeight={52} trailing={false} /> : metrics.isError ? <ErrorNotice error={metrics.error} onReload={() => { void metrics.refetch(); }} /> : <RangeTotals totals={metrics.data.totals} />}
      </View>
      <View style={{ gap: spacing[2], maxWidth: 560 }}>
        <MoreToggle label={t(more ? "portal.home.less" : "portal.home.more")} onPress={() => setMore((current) => !current)} testID="more-options" />
        {more ? (
          <View style={{ gap: spacing[2] }}>
            <Text style={styles.muted}>{provider.name} · {t("portal.home.plan", { plan: provider.plan })} · {t("portal.home.zone", { zone: provider.timeZone })}</Text>
            <Text style={styles.muted}>{t("portal.home.slug", { slug: provider.slug })}</Text>
            <RenameProvider provider={provider} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const BAND_TITLE = { color: onNight, fontSize: 24, lineHeight: 28, fontWeight: "800", letterSpacing: -0.6 } as const;

/** "Ready to sell": the night band of the brand with the business, its state and how far the path has come. */
function ReadyBand({ provider, tone, doneCount, celebrating = false }: { readonly provider: Provider; readonly tone: "yes" | "maybe" | "wait" | "no"; readonly doneCount: number; readonly celebrating?: boolean }): ReactNode {
  const t = useT();
  return (
    <BrandBand tone="night" art="ready" style={{ maxWidth: 720 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
        <AvatarMark name={provider.name} size={52} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text accessibilityRole="header" style={BAND_TITLE}>{t("portal.home.journey.title")}</Text>
          <Text numberOfLines={1} style={{ color: brand.niebla, fontSize: 14, fontWeight: "600" }}>{provider.name}</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2], flexWrap: "wrap" }} testID="provider-status"><Chip tone={tone}>{t(`portal.status.${provider.status}.label`)}</Chip></View>
      {/* While a milestone is celebrated just below, it already says the same thing: the band keeps the state and the progress, not the prose twice. */}
      {provider.status === "SUSPENDED" || celebrating ? null : <Text style={{ color: onNight, fontSize: 15, lineHeight: 22 }}>{t(`portal.status.${provider.status}.body`)}</Text>}
      <View style={{ gap: spacing[1] }}>
        <Text style={{ color: brand.niebla, fontSize: 13, fontWeight: "700" }}>{t("portal.home.journey.progress", { done: doneCount, total: 3 })}</Text>
        <View style={{ height: 8, borderRadius: 999, backgroundColor: brand.medianoche, overflow: "hidden" }} role="progressbar" aria-label={t("portal.home.journey.title")} aria-valuemin={0} aria-valuemax={3} aria-valuenow={doneCount}>
          <View style={{ height: 8, width: `${Math.round((doneCount / 3) * 100)}%`, backgroundColor: brand.cielo }} />
        </View>
      </View>
    </BrandBand>
  );
}

export function OverviewScreen(): ReactNode {
  const t = useT();
  return <PortalScreen title={t("portal.home.title")} current="home">{(provider, refetch) => <Overview provider={provider} refetch={refetch} />}</PortalScreen>;
}

/** D1 · Sign-up of the business and connecting an existing profile. */
export function OnboardingScreen({ onDone }: { readonly onDone: () => void }): ReactNode {
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
  return (
    <PortalScreen title={t("portal.onboarding.title")} current="home" requireProvider={false}>
      {() => (
        <View style={{ gap: spacing[4] }}>
          <View style={[styles.row, { gap: spacing[4], flexWrap: "nowrap" }]}><Illustration name="welcomeProvider" tone="auto" size="md" /><View style={{ flex: 1 }}><PageIntro>{t("portal.onboarding.intro")}</PageIntro></View></View>
          <View style={{ gap: spacing[3], maxWidth: 560 }}>
            <Field label={t("portal.onboarding.name")} value={name} onChange={setName} help={t("portal.onboarding.nameHelp")} testID="provider-name" />
            {error ? <Notice kind="error">{error}</Notice> : null}
            <ErrorNotice error={register.error} onRetry={create} />
            <ActionButton label={register.isPending ? t("portal.onboarding.creating") : t("portal.onboarding.submit")} busy={register.isPending} disabled={register.isPending} onPress={create} testID="provider-create" />
          </View>
          <View style={{ gap: spacing[3], maxWidth: 560, paddingTop: spacing[4], borderTopWidth: 1, borderTopColor: palette.border }}>
            <Text accessibilityRole="header" style={styles.subtitle}>{t("portal.onboarding.existingTitle")}</Text>
            <Text style={styles.body}>{t("portal.onboarding.existingBody")}</Text>
            <Field label={t("portal.onboarding.existingId")} value={code} onChange={setCode} testID="provider-code" />
            <ActionButton variant="secondary" label={t("portal.onboarding.connect")} busy={connecting} disabled={connecting} onPress={() => { void connect(); }} testID="provider-connect" />
          </View>
        </View>
      )}
    </PortalScreen>
  );
}
