import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { useConfigureLeads, type Destination, type LeadConfig, type Provider } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../platform/providers";
import { ActionButton, ChoiceGroup, Field, Notice, PageIntro, Section, ToggleChip, useStyles } from "../host/ui";
import { PortalErrorNotice as ErrorNotice } from "./errors";
import { PortalScreen } from "./frame";
import { useSingleMutation } from "../platform/single-flight";
import { MoreToggle, StickyActions } from "./parts";

const DESTINATIONS: readonly Destination[] = ["OFFICIAL_SITE", "LANDING", "WHATSAPP", "PHONE", "EMAIL", "INSTAGRAM", "PRODUCT_PAGE"];
const UTM = /^[A-Za-z0-9_.-]{1,64}$/;
const BILLING = ["CPC", "CPA", "FLAT", "COMMISSION"] as const;
const MAX_DEDUPE = 1440;
const MAX_CAP = 1_000_000;

/** D7 · Redirect destinations and UTM. At least one destination is mandatory (REQ-F28-04); the UTM fields follow the contract's pattern. */
function Destinations({ provider }: { readonly provider: Provider }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const client = useApiClient();
  const save = useConfigureLeads(client, provider.id);
  const saveOnce = useSingleMutation(save);
  const config = provider.leadConfig;
  const [enabled, setEnabled] = useState<readonly Destination[]>(config?.enabledDestinations ?? ["OFFICIAL_SITE"]);
  const [source, setSource] = useState(config?.utmSource ?? "done");
  const [medium, setMedium] = useState(config?.utmMedium ?? "referral");
  const [campaign, setCampaign] = useState(config?.utmCampaign ?? "");
  const [dedupe, setDedupe] = useState(String(config?.dedupeMinutes ?? 60));
  const [cap, setCap] = useState(String(config?.monthlyCap ?? 0));
  const [billing, setBilling] = useState<LeadConfig["billingModel"]>(config?.billingModel ?? "CPC");
  const [errors, setErrors] = useState<readonly string[]>([]);
  const [more, setMore] = useState(false);

  const toggle = (destination: Destination): void => setEnabled((current) => current.includes(destination) ? current.filter((item) => item !== destination) : [...current, destination]);
  const submit = (): void => {
    const found: string[] = [];
    if (enabled.length === 0) found.push(t("portal.destinations.atLeastOne"));
    if (!UTM.test(source) || !UTM.test(medium) || (campaign.trim() && !UTM.test(campaign.trim()))) found.push(t("portal.destinations.utmInvalid"));
    const dedupeMinutes = Number(dedupe); const monthlyCap = Number(cap);
    if (!Number.isInteger(dedupeMinutes) || dedupeMinutes < 1 || dedupeMinutes > MAX_DEDUPE || !Number.isInteger(monthlyCap) || monthlyCap < 0 || monthlyCap > MAX_CAP) found.push(t("portal.destinations.numberInvalid"));
    setErrors(found);
    if (found.length && !found.includes(t("portal.destinations.atLeastOne"))) setMore(true);
    if (found.length) return;
    saveOnce({ enabledDestinations: enabled, utmSource: source, utmMedium: medium, ...(campaign.trim() ? { utmCampaign: campaign.trim() } : {}), dedupeMinutes, monthlyCap, billingModel: billing });
  };
  return (
    <View style={{ gap: spacing[4] }}>
      <PageIntro>{t("portal.destinations.intro")}</PageIntro>
      <Section title={t("portal.destinations.enabled")}>
        <View style={styles.row} role="group" aria-label={t("portal.destinations.enabled")}>
          {DESTINATIONS.map((destination) => {
            const on = enabled.includes(destination);
            return <ToggleChip key={destination} on={on} label={t(`portal.destinations.destination.${destination}`)} onPress={() => toggle(destination)} testID={`destination-${destination}`} />;
          })}
        </View>
      </Section>
      <MoreToggle label={t(more ? "portal.home.less" : "portal.home.more")} onPress={() => setMore((current) => !current)} testID="destinations-more" />
      {more ? (
        <Section title={t("portal.destinations.utmTitle")}>
          <Field label={t("portal.destinations.utmSource")} value={source} onChange={setSource} help={t("portal.destinations.utmHelp")} testID="utm-source" />
          <Field label={t("portal.destinations.utmMedium")} value={medium} onChange={setMedium} testID="utm-medium" />
          <Field label={t("portal.destinations.utmCampaign")} value={campaign} onChange={setCampaign} testID="utm-campaign" />
          <Field label={t("portal.destinations.dedupe")} value={dedupe} onChange={setDedupe} keyboardType="number-pad" testID="utm-dedupe" />
          <Field label={t("portal.destinations.cap")} value={cap} onChange={setCap} keyboardType="number-pad" testID="utm-cap" />
          <ChoiceGroup<LeadConfig["billingModel"]> label={t("portal.destinations.billing")} value={billing} onChange={setBilling} choices={BILLING.map((value) => ({ value, label: value }))} />
        </Section>
      ) : null}
      {errors.length ? <Notice kind="error">{errors.map((message) => <Text key={message} style={styles.body}>{message}</Text>)}</Notice> : null}
      {save.isSuccess ? <Notice kind="success">{t("portal.destinations.saved")}</Notice> : null}
      <ErrorNotice error={save.error} onRetry={submit} />
      <StickyActions><ActionButton label={save.isPending ? t("portal.destinations.saving") : t("portal.destinations.save")} busy={save.isPending} disabled={save.isPending} onPress={submit} testID="destinations-save" /></StickyActions>
    </View>
  );
}

export function DestinationsScreen(): ReactNode {
  const t = useT();
  return <PortalScreen title={t("portal.destinations.title")} current="destinations">{(provider) => <Destinations provider={provider} />}</PortalScreen>;
}
