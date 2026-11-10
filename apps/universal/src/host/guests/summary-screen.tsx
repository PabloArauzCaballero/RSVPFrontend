import { useEffect, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { ApiError } from "@rsvp/api-client";
import { countdownTo, useGuestSummary, type Celebration } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { HOST_ROUTES, withCelebration } from "../routes";
import { ActionButton, Loading, Notice, Section, styles } from "../ui";
import { CountTile, FreshnessLine, RetryNotice } from "./parts";

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
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const go = (path: string) => () => onNavigate(withCelebration(path, celebration.id));
  if (summary.isPending) return <Loading />;
  const data = summary.data;
  const retry = () => { void summary.refetch(); };
  const rejected = summary.error instanceof ApiError && summary.error.status < 500 && summary.error.status !== 429;
  if (!data || rejected) return <RetryNotice error={summary.error} onRetry={retry} />;
  // Authoritative total from the read model (contract v1.9.0), not the size of a page of requests.
  const open = data.openCompanionRequests;
  return (
    <View style={{ gap: spacing[4] }}>
      {summary.isError ? <Notice kind="error">{t("guests.summary.refreshFailed")}</Notice> : null}
      {data.total === 0 ? <Notice>{t("guests.summary.empty")}</Notice> : null}
      <View style={styles.row} accessibilityRole="summary">
        <CountTile testID="count-confirmed" label={t("guests.summary.confirmed")} value={data.confirmed} />
        <CountTile testID="count-pending" label={t("guests.summary.pending")} value={data.pending} />
        <CountTile testID="count-declined" label={t("guests.summary.declined")} value={data.declined} />
        <CountTile testID="count-companions" label={t("guests.summary.companions")} value={data.companions} />
        <CountTile testID="count-total" label={t("guests.summary.total")} value={data.total} />
      </View>
      <Section title={t("guests.summary.title")}>
        <Text style={styles.body}>{deadlineLine(celebration, t, now)}</Text>
        <Text testID="open-requests" style={styles.body}>{open ? t("guests.summary.openRequests", { count: open }) : t("guests.summary.noRequests")}</Text>
        <View style={styles.row}>
          {open ? <ActionButton label={t("guests.summary.reviewRequests")} onPress={go(HOST_ROUTES.requests)} /> : null}
          <ActionButton variant="secondary" label={t("guests.summary.viewGuests")} onPress={go(HOST_ROUTES.guests)} />
          <ActionButton variant="secondary" label={t("guests.summary.viewReport")} onPress={go(HOST_ROUTES.report)} />
        </View>
        <FreshnessLine freshness={data.freshness} timeZone={celebration.timeZone} onRefresh={retry} />
      </Section>
    </View>
  );
}

export function SummaryScreen(props: ScreenProps): ReactNode {
  const t = useT();
  return <CelebrationScreen {...props} current="summary" title={t("guests.summary.title")}>{({ celebration }) => <SummaryBody celebration={celebration} onNavigate={props.onNavigate} />}</CelebrationScreen>;
}

