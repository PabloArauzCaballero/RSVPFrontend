import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { brand, colors, radius } from "@rsvp/design-tokens";
import { spacing } from "@rsvp/design-tokens";
import { countdownTo, useGuestSummary, type Celebration } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { HOST_ROUTES, withCelebration } from "../routes";
import { ActionButton, Loading, Notice, styles } from "../ui";
import { FreshnessLine, RetryNotice } from "./parts";

const palette = colors.light;

/** One legend entry: a swatch, the word and the number. The swatch never carries the meaning alone. */
function LegendItem({ testID, label, value, swatch }: { readonly testID: string; readonly label: string; readonly value: number; readonly swatch: string }): ReactNode {
  return (
    <View testID={testID} accessible accessibilityLabel={`${label}: ${value}`} style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: swatch }} />
      <Text style={[styles.body, { fontVariant: ["tabular-nums"] }]}><Text style={{ fontWeight: "800" }}>{value}</Text> {label}</Text>
    </View>
  );
}

/** The answer so far as one stacked bar (the kit's progress pattern): confirmed, declined, and what is still open. */
function ResponseBar({ confirmed, declined, total, label }: { readonly confirmed: number; readonly declined: number; readonly total: number; readonly label: string }): ReactNode {
  const share = (n: number): `${number}%` => `${total ? (n / total) * 100 : 0}%`;
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: total, now: confirmed + declined }} style={{ height: 14, borderRadius: radius.full, backgroundColor: brand.bruma, overflow: "hidden", flexDirection: "row" }}>
      <View style={{ width: share(confirmed), backgroundColor: brand.azul }} />
      <View style={{ width: share(declined), backgroundColor: brand.noche }} />
    </View>
  );
}

/** C6 · Panel cover: the backend's numbers as they are (no client-side recount) and how fresh they are (REQ-F17-01/04/06). */


function deadlineLine(celebration: Celebration, t: ReturnType<typeof useT>, now: number): string {
  const deadline = celebration.settings.rsvpDeadline;
  if (!deadline) return t("guests.summary.noDeadline");
  if (Date.parse(deadline) <= now) return t("guests.summary.deadlinePassed");
  const left = countdownTo(deadline, now);
  return !left || left.days === 0 ? t("guests.summary.deadlineToday") : t("guests.summary.daysToDeadline", { count: left.days });
}

function SummaryBody({ celebration, onNavigate }: { readonly celebration: Celebration; readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const summary = useGuestSummary(client, celebration.id);
  const go = (path: string) => () => onNavigate(withCelebration(path, celebration.id));
  if (summary.isPending) return <Loading />;
  if (summary.isError) return <RetryNotice error={summary.error} onRetry={() => { void summary.refetch(); }} />;
  const data = summary.data;
  // Authoritative total from the read model (contract v1.9.0), not the size of a page of requests.
  const open = data.openCompanionRequests;
  return (
    <View style={{ gap: spacing[4] }}>
      {data.total === 0 ? <Notice>{t("guests.summary.empty")}</Notice> : null}
      <View style={[styles.card, { gap: spacing[4] }]} accessibilityRole="summary">
        <Text accessibilityRole="header" style={[styles.title, { fontSize: 28, lineHeight: 32 }]}>{t("guests.summary.headline", { confirmed: data.confirmed, total: data.total })}</Text>
        <ResponseBar confirmed={data.confirmed} declined={data.declined} total={data.total} label={t("guests.summary.barLabel")} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: spacing[6], rowGap: spacing[2] }}>
          <LegendItem testID="count-confirmed" label={t("guests.summary.confirmed")} value={data.confirmed} swatch={brand.azul} />
          <LegendItem testID="count-pending" label={t("guests.summary.pending")} value={data.pending} swatch={brand.niebla} />
          <LegendItem testID="count-declined" label={t("guests.summary.declined")} value={data.declined} swatch={brand.noche} />
          <LegendItem testID="count-companions" label={t("guests.summary.companions")} value={data.companions} swatch={brand.ambar} />
          <LegendItem testID="count-total" label={t("guests.summary.total")} value={data.total} swatch={palette.border} />
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.body}>{deadlineLine(celebration, t, Date.now())}</Text>
        <Text testID="open-requests" style={styles.body}>{open ? t("guests.summary.openRequests", { count: open }) : t("guests.summary.noRequests")}</Text>
        <View style={styles.row}>
          {open ? <ActionButton label={t("guests.summary.reviewRequests")} onPress={go(HOST_ROUTES.requests)} /> : null}
          <ActionButton variant="secondary" label={t("guests.summary.viewGuests")} onPress={go(HOST_ROUTES.guests)} />
          <ActionButton variant="secondary" label={t("guests.summary.viewReport")} onPress={go(HOST_ROUTES.report)} />
        </View>
        <FreshnessLine freshness={data.freshness} timeZone={celebration.timeZone} onRefresh={() => { void summary.refetch(); }} />
      </View>
    </View>
  );
}

export function SummaryScreen(props: ScreenProps): ReactNode {
  const t = useT();
  return <CelebrationScreen {...props} current="summary" title={t("guests.summary.title")}>{({ celebration }) => <SummaryBody celebration={celebration} onNavigate={props.onNavigate} />}</CelebrationScreen>;
}

