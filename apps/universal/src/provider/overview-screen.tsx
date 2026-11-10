import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { ApiError } from "@rsvp/api-client";
import { useMetrics, useOwnListings, useRegisterProviderAccount, useSubmitProvider, type Provider } from "@rsvp/query-hooks";
import { createApiClientForPublicRead } from "./public-client";
import { useApiClient, useClaims, useLocale, useT } from "../platform/providers";
import { ActionButton, ErrorNotice, Field, Loading, Notice, Section, styles } from "../host/ui";
import { PortalScreen, useProviderId } from "./frame";
import { RangeCards, lastDays } from "./metrics-screen";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** D2 · Verification status (D3) and the next step; the summary of the last 30 days. */
function Overview({ provider, refetch }: { readonly provider: Provider; readonly refetch: () => void }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const submit = useSubmitProvider(client, provider.id);
  const listings = useOwnListings(client, provider.id, locale);
  const range = lastDays(30, provider.timeZone);
  const metrics = useMetrics(client, provider.id, range.from, range.to);
  const [done, setDone] = useState(false);
  const hasListing = (listings.data?.items.length ?? 0) > 0;
  const sendable = provider.status === "DRAFT" && hasListing;
  return (
    <View style={{ gap: spacing[4] }}>
      <Text style={styles.body}>{t("portal.home.intro")}</Text>
      <Section title={t("portal.status.title")}>
        <Text style={styles.subtitle} testID="provider-status">{t(`portal.status.${provider.status}.label`)}</Text>
        <Text style={styles.body}>{t(`portal.status.${provider.status}.body`)}</Text>
        <Text style={styles.muted}>{provider.name} · {t("portal.home.plan", { plan: provider.plan })} · {t("portal.home.zone", { zone: provider.timeZone })}</Text>
        <Text style={styles.muted}>{t("portal.home.slug", { slug: provider.slug })}</Text>
        {provider.status === "DRAFT" ? <Notice>{t("portal.status.documentsNote")}</Notice> : null}
        {provider.status === "DRAFT" && !hasListing && listings.data ? <Notice>{t("portal.status.needsListing")}</Notice> : null}
        {done ? <Notice kind="success">{t("portal.status.submitted")}</Notice> : null}
        <ErrorNotice error={submit.error} onReload={refetch} />
        {provider.status === "DRAFT" ? <ActionButton label={submit.isPending ? t("portal.status.submitting") : t("portal.status.submit")} busy={submit.isPending} disabled={!sendable || submit.isPending} onPress={() => submit.mutate(undefined, { onSuccess: () => { setDone(true); refetch(); } })} testID="submit-verification" /> : null}
      </Section>
      <Section title={t("portal.home.last30")}>
        {metrics.isPending ? <Loading /> : metrics.isError ? <ErrorNotice error={metrics.error} onReload={() => { void metrics.refetch(); }} /> : <RangeCards totals={metrics.data.totals} />}
      </Section>
    </View>
  );
}

export function OverviewScreen(): ReactNode {
  const t = useT();
  return <PortalScreen title={t("portal.home.title")} current="home">{(provider, refetch) => <Overview provider={provider} refetch={refetch} />}</PortalScreen>;
}

/** D1 · Sign-up of the business and connecting an existing profile. */
export function OnboardingScreen({ onDone }: { readonly onDone: () => void }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const { remember } = useProviderId();
  const claims = useClaims();
  const register = useRegisterProviderAccount(client);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const create = (): void => {
    if (!name.trim()) return setError(t("portal.onboarding.required"));
    setError(null);
    register.mutate({ name: name.trim() }, { onSuccess: (provider) => { void remember(provider.id).then(onDone); } });
  };
  const connect = async (): Promise<void> => {
    if (!UUID.test(code.trim())) return setError(t("portal.onboarding.invalidId"));
    setError(null); setConnecting(true);
    try {
      const provider = await createApiClientForPublicRead(client).get(code.trim());
      if (provider.ownerId && claims.userId && provider.ownerId !== claims.userId) { setError(t("portal.onboarding.notOwner")); return; }
      await remember(provider.id); onDone();
    } catch (failure) { setError(failure instanceof ApiError && failure.status === 404 ? t("portal.onboarding.notFound") : t("portal.errors.generic")); } finally { setConnecting(false); }
  };
  return (
    <PortalScreen title={t("portal.onboarding.title")} current="home" requireProvider={false}>
      {() => (
        <View style={{ gap: spacing[4] }}>
          <Text style={styles.body}>{t("portal.onboarding.intro")}</Text>
          <Section title={t("portal.onboarding.title")}>
            <Field label={t("portal.onboarding.name")} value={name} onChange={setName} help={t("portal.onboarding.nameHelp")} testID="provider-name" />
            {error ? <Notice kind="error">{error}</Notice> : null}
            <ErrorNotice error={register.error} />
            <ActionButton label={register.isPending ? t("portal.onboarding.creating") : t("portal.onboarding.submit")} busy={register.isPending} disabled={register.isPending} onPress={create} testID="provider-create" />
          </Section>
          <Section title={t("portal.onboarding.existingTitle")}>
            <Text style={styles.body}>{t("portal.onboarding.existingBody")}</Text>
            <Field label={t("portal.onboarding.existingId")} value={code} onChange={setCode} testID="provider-code" />
            <ActionButton variant="secondary" label={t("portal.onboarding.connect")} busy={connecting} disabled={connecting} onPress={() => { void connect(); }} testID="provider-connect" />
          </Section>
        </View>
      )}
    </PortalScreen>
  );
}
