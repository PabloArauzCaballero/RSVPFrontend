import { useEffect, useState, type ReactNode } from "react";
import { Text, View, useWindowDimensions, type ViewStyle } from "react-native";
import { chips, radius, spacing } from "@rsvp/design-tokens";
import { CheckMark, CountUp, Enter, Skeleton, SkeletonList, fonts, useColors, useReducedMotion, useTheme } from "@rsvp/ui";
import { countdownTo, useCelebration, useGuestSummary, useHostReservations, usePublishCheck, type Celebration } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { asText } from "../content-draft";
import { HOST_ROUTES, withCelebration } from "../routes";
import { ActionButton, EmptyState, useStyles } from "../ui";
import { FreshnessLine, RetryNotice, TextAction } from "./parts";


/** What the host should do next, as one value. The first rule that applies wins; the order is the order of the brief. */
export type NextStep =
  | { readonly kind: "publish" }
  | { readonly kind: "finish"; readonly missing: number }
  | { readonly kind: "addGuests" }
  | { readonly kind: "requests"; readonly count: number }
  | { readonly kind: "gifts"; readonly count: number }
  | { readonly kind: "pending"; readonly count: number }
  | { readonly kind: "done" };

export interface Progress {
  readonly published: boolean;
  /** `null` while the checklist is unknown: it never blocks the panel. */
  readonly ready: boolean | null;
  readonly missing: number;
  readonly total: number;
  readonly pending: number;
  readonly openRequests: number;
  readonly pendingGifts: number;
}

export function nextStep(progress: Progress): NextStep {
  if (!progress.published) return progress.ready === false ? { kind: "finish", missing: progress.missing } : { kind: "publish" };
  if (progress.total === 0) return { kind: "addGuests" };
  if (progress.openRequests > 0) return { kind: "requests", count: progress.openRequests };
  if (progress.pendingGifts > 0) return { kind: "gifts", count: progress.pendingGifts };
  if (progress.pending > 0) return { kind: "pending", count: progress.pending };
  return { kind: "done" };
}

const STEP_ROUTE: Readonly<Record<Exclude<NextStep["kind"], "done">, string>> = {
  publish: HOST_ROUTES.publish, finish: HOST_ROUTES.publish, addGuests: HOST_ROUTES.guestNew, requests: HOST_ROUTES.requests, gifts: HOST_ROUTES.giftInbox, pending: HOST_ROUTES.guests
};

/** One legend entry: a swatch, the word and the number. The swatch never carries the meaning alone. */
function LegendItem({ testID, label, value, swatch }: { readonly testID: string; readonly label: string; readonly value: number; readonly swatch: string }): ReactNode {
  const palette = useColors();
  const styles = useStyles();
  return (
    <View testID={testID} accessible accessibilityLabel={`${label}: ${value}`} style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: swatch, borderWidth: 1, borderColor: palette.fieldBorder }} />
      <Text style={[styles.body, { fontVariant: ["tabular-nums"] }]}><Text style={{ fontWeight: "600" }}>{value}</Text> {label}</Text>
    </View>
  );
}

/** The answer so far as one stacked bar (the kit's progress pattern): confirmed, declined, and what is still open. Decorative: the legend says every number. */
function ResponseBar({ confirmed, declined, total }: { readonly confirmed: number; readonly declined: number; readonly total: number }): ReactNode {
  const palette = useColors();
  const { scheme } = useTheme();
  const { yes, no } = { yes: chips[scheme].yes.dot, no: chips[scheme].no.dot };
  const share = (n: number): `${number}%` => `${total ? (n / total) * 100 : 0}%`;
  // The bar draws itself from the left once, on arrival; a changed figure re-draws it softly. Only transform animates.
  const reduced = useReducedMotion();
  const [drawn, setDrawn] = useState(reduced);
  useEffect(() => { const id = setTimeout(() => setDrawn(true), 60); return () => clearTimeout(id); }, []);
  const reveal = { transform: drawn ? "scaleX(1)" : "scaleX(0)", transformOrigin: "left center", transitionProperty: "transform", transitionDuration: reduced ? "0ms" : "900ms", transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" } as ViewStyle;
  return (
    <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height: 8, borderRadius: radius.full, backgroundColor: palette.surfaceMuted, overflow: "hidden", flexDirection: "row" }}>
      <View style={[{ flex: 1, flexDirection: "row" }, reveal]}>
        <View style={{ width: share(confirmed), backgroundColor: yes }} />
        <View style={{ width: share(declined), backgroundColor: no }} />
      </View>
    </View>
  );
}

function deadlineLine(celebration: Celebration, t: ReturnType<typeof useT>, now: number): string {
  const deadline = celebration.settings.rsvpDeadline;
  if (!deadline) return t("guests.summary.noDeadline");
  if (Date.parse(deadline) <= now) return t("guests.summary.deadlinePassed");
  const left = countdownTo(deadline, now);
  return !left || left.days === 0 ? t("guests.summary.deadlineToday") : t("guests.summary.daysToDeadline", { count: left.days });
}

/** The one thing to do now, said as a plain card with a serif title and a soft entrance each time the step changes. Its button lives in the header (top right), where every screen keeps its single primary action. */
function NextCard({ step, t }: { readonly step: Exclude<NextStep, { kind: "done" | "addGuests" }>; readonly t: ReturnType<typeof useT> }): ReactNode {
  const palette = useColors();
  const base = `guests.summary.next.${step.kind}`;
  const count = step.kind === "finish" ? step.missing : step.kind === "publish" ? 0 : step.count;
  const title = step.kind === "publish" ? t(`${base}.title`) : step.kind === "finish" ? t(`${base}.title`) : t(`${base}.title`, { count });
  const body = step.kind === "finish" ? t(`${base}.body`, { count }) : t(`${base}.body`);
  return (
    <Enter key={step.kind} from="down">
      <View testID="next-step" style={{ backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: radius.lg, padding: spacing[8], gap: spacing[3] }}>
        <Text accessibilityRole="header" aria-level={2} style={{ color: palette.text, fontSize: 30, lineHeight: 34, fontWeight: "500", letterSpacing: -0.8, fontFamily: fonts.display, maxWidth: 560 }}>{title}</Text>
        <Text style={{ color: palette.textMuted, fontSize: 16, lineHeight: 26, maxWidth: 520, fontFamily: fonts.sans }}>{body}</Text>
      </View>
    </Enter>
  );
}

/** One number of the answer, as a tile: the word, the figure in the serif, and its share of the guests. The swatch repeats the word and is never the only cue. */
function StatTile({ testID, label, value, total, swatch }: { readonly testID: string; readonly label: string; readonly value: number; readonly total?: number; readonly swatch: string }): ReactNode {
  const palette = useColors();
  const t = useT();
  const share = total ? Math.round((value / total) * 100) : null;
  return (
    <View testID={testID} accessible accessibilityLabel={`${label}: ${value}`} style={{ flexGrow: 1, flexBasis: 150, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: radius.lg, padding: spacing[6], gap: spacing[3], minWidth: 0 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: swatch }} />
        <Text style={{ color: palette.textMuted, fontSize: 12, lineHeight: 16, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase", fontFamily: fonts.sans }}>{label}</Text>
      </View>
      <CountUp value={value} style={{ color: palette.text, fontSize: 44, lineHeight: 46, fontWeight: "500", letterSpacing: -1.2, fontFamily: fonts.display, fontVariant: ["tabular-nums"] }} />
      <Text style={{ color: palette.textMuted, fontSize: 13, lineHeight: 18, fontFamily: fonts.sans }}>{share === null ? " " : t("guests.summary.shareOfGuests", { percent: share })}</Text>
    </View>
  );
}

/** The celebration at a glance: when and where, how many days are left, and how many guests there are. */
function EventHero({ celebration, total, answered, t }: { readonly celebration: Celebration; readonly total: number; readonly answered: number; readonly t: ReturnType<typeof useT> }): ReactNode {
  const palette = useColors();
  const locale = useLocale();
  const narrow = useWindowDimensions().width < 640;
  const eventDate = asText(celebration.content["eventDate"]);
  const venue = asText(celebration.content["venueName"]);
  const when = eventDate ? Date.parse(eventDate) : Number.NaN;
  const days = Number.isFinite(when) ? Math.ceil((when - Date.now()) / 86_400_000) : null;
  const dateLabel = Number.isFinite(when) ? new Intl.DateTimeFormat(locale === "en-US" ? "en-US" : "es-BO", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(when).replace(/^./, (first) => first.toUpperCase()) : "";
  if (!dateLabel && !venue && total === 0) return null;
  return (
    <View testID="event-hero" style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: spacing[6], backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: radius.lg, padding: spacing[8] }}>
      <View style={{ gap: spacing[2], flexShrink: 1, minWidth: 220 }}>
        {dateLabel ? <Text style={{ color: palette.text, fontSize: 20, lineHeight: 28, fontFamily: fonts.display, fontWeight: "500", letterSpacing: -0.3 }}>{dateLabel}</Text> : null}
        {venue ? <Text style={{ color: palette.textMuted, fontSize: 15, lineHeight: 22, fontFamily: fonts.sans }}>{venue}</Text> : null}
        <Text testID="count-total" accessible accessibilityLabel={`${t("guests.summary.total")}: ${total}`} style={{ color: palette.textMuted, fontSize: 14, lineHeight: 20, fontFamily: fonts.sans, paddingTop: spacing[2] }}>{t("guests.summary.heroGuests", { total, answered })}</Text>
      </View>
      {days !== null && days >= 0 ? (
        <View testID="days-left" style={{ alignItems: narrow ? "flex-start" : "flex-end" }}>
          <CountUp value={days} durationMs={900} style={{ color: palette.text, fontSize: 64, lineHeight: 64, fontWeight: "500", letterSpacing: -2, fontFamily: fonts.display, fontVariant: ["tabular-nums"] }} />
          <Text style={{ color: palette.textMuted, fontSize: 13, lineHeight: 18, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase", fontFamily: fonts.sans }}>{t("guests.summary.daysLeft", { count: days })}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** What the panel looks like while it loads: the band, the progress rows and the bar, at their real heights. */
function SummarySkeleton(): ReactNode {
  const t = useT();
  return (
    <SkeletonList label={t("guests.loading")}>
      <View style={{ gap: spacing[5] }}>
        <Skeleton height={168} radius={radius.lg} />
        <View style={{ gap: spacing[3] }}><Skeleton width="40%" height={22} /><Skeleton height={44} /><Skeleton height={44} /><Skeleton height={44} /><Skeleton height={16} radius={8} /></View>
      </View>
    </SkeletonList>
  );
}

/** The panel's reads and the one next step, lifted to the screen so the header can carry the step's button while the body explains it. */
function useSummary(celebrationId: string | undefined, status: Celebration["status"] | undefined) {
  const client = useApiClient();
  const id = celebrationId ?? "";
  const summary = useGuestSummary(client, id);
  // Support reads never block the panel: if one fails, its step is simply left out.
  const published = status !== "DRAFT";
  const check = usePublishCheck(client, published ? "" : id);
  const gifts = useHostReservations(client, id, "PENDING_REVIEW");
  const data = summary.data;
  const step = data && status ? nextStep({ published, ready: check.data ? check.data.ready : null, missing: check.data?.missingFields.length ?? 0, total: data.total, pending: data.pending, openRequests: data.openCompanionRequests, pendingGifts: gifts.data?.items.length ?? 0 }) : null;
  return { summary, step };
}
type SummaryState = ReturnType<typeof useSummary>;

function SummaryBody({ celebration, state, onNavigate }: { readonly celebration: Celebration; readonly state: SummaryState; readonly onNavigate: (href: string) => void }): ReactNode {
  const styles = useStyles();
  const { scheme } = useTheme();
  const t = useT();
  const { summary, step } = state;
  const go = (path: string) => () => onNavigate(withCelebration(path, celebration.id));
  if (summary.isPending) return <SummarySkeleton />;
  if (summary.isError) return <RetryNotice error={summary.error} onRetry={() => { void summary.refetch(); }} />;
  const data = summary.data;
  // Authoritative total from the read model (contract v1.9.0), not the size of a page of requests.
  const open = data.openCompanionRequests;
  const answered = data.confirmed + data.declined;
  return (
    <View style={{ gap: spacing[5] }}>
      {step?.kind === "addGuests" ? <Enter key="addGuests" from="down"><EmptyState illustration="welcomeHost" title={t("guests.summary.welcome.title")} body={t("guests.summary.welcome.body")} /></Enter> : null}
      {step?.kind === "done" ? <Enter key="done" from="down"><View role="status"><EmptyState illustration="success" title={t("guests.summary.next.done.title")} body={t("guests.summary.next.done.body")} /></View></Enter> : null}
      {answered === 1 && step && step.kind !== "addGuests" && step.kind !== "done" ? (
        <Enter from="down">
          <View testID="first-reply" role="status" style={{ flexDirection: "row", alignItems: "center", gap: spacing[4] }}>
            <CheckMark size={24} tone="success" />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}><Text style={styles.itemTitle}>{t("guests.summary.firstReply.title")}</Text><Text style={styles.muted}>{t("guests.summary.firstReply.body")}</Text></View>
          </View>
        </Enter>
      ) : null}
      {step && step.kind !== "addGuests" && step.kind !== "done" ? <NextCard step={step} t={t} /> : null}
      {step?.kind === "addGuests" ? null : (
        <>
          <EventHero celebration={celebration} total={data.total} answered={answered} t={t} />
          {data.total > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[4] }}>
              <StatTile testID="count-confirmed" label={t("guests.summary.confirmed")} value={data.confirmed} total={data.total} swatch={chips[scheme].yes.dot} />
              <StatTile testID="count-pending" label={t("guests.summary.pending")} value={data.pending} total={data.total} swatch={chips[scheme].wait.dot} />
              <StatTile testID="count-declined" label={t("guests.summary.declined")} value={data.declined} total={data.total} swatch={chips[scheme].no.dot} />
              <StatTile testID="count-companions" label={t("guests.summary.companions")} value={data.companions} swatch={chips[scheme].maybe.dot} />
            </View>
          ) : null}
          <View style={styles.card}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", columnGap: spacing[4] }}>
              <Text accessibilityRole="header" aria-level={2} style={styles.subtitle}>{t("guests.summary.progressTitle")}</Text>
              {data.total > 0 ? <TextAction label={t("guests.summary.viewGuests")} onPress={go(HOST_ROUTES.guests)} /> : null}
            </View>
            <Text testID="step-answers" style={[styles.label, { fontSize: 16 }]}>{data.total > 0 ? t("guests.summary.steps.answersSome", { answered, total: data.total }) : t("guests.summary.steps.answersNone")}</Text>
            {data.total > 0 ? <ResponseBar confirmed={data.confirmed} declined={data.declined} total={data.total} /> : null}
            {/* The small print belongs together: one block with tight lines, set apart from the numbers above it. */}
            <View style={{ gap: spacing[1], paddingTop: spacing[2] }}>
              <Text style={styles.muted}>{deadlineLine(celebration, t, Date.now())}</Text>
              {open && step?.kind !== "requests" ? <Text testID="open-requests" style={styles.muted}>{t("guests.summary.openRequests", { count: open })}</Text> : null}
              <FreshnessLine freshness={data.freshness} timeZone={celebration.timeZone} onRefresh={() => { void summary.refetch(); }} />
            </View>
          </View>
        </>
      )}
    </View>
  );
}

export function SummaryScreen(props: ScreenProps): ReactNode {
  const t = useT();
  const client = useApiClient();
  const celebration = useCelebration(client, props.celebrationId ?? "").data;
  const state = useSummary(props.celebrationId, celebration?.status);
  const { step } = state;
  const action = step && step.kind !== "done"
    ? <ActionButton label={step.kind === "addGuests" ? t("guests.summary.welcome.action") : t(`guests.summary.next.${step.kind}.action`)} onPress={() => props.onNavigate(withCelebration(STEP_ROUTE[step.kind], props.celebrationId))} testID="next-step-action" />
    : undefined;
  return <CelebrationScreen {...props} current="summary" title={t("guests.summary.title")} heading={(loaded) => asText(loaded.celebration.content["title"])} intro={t("guests.summary.intro")} actions={action}>{({ celebration: loaded }) => <SummaryBody celebration={loaded} state={state} onNavigate={props.onNavigate} />}</CelebrationScreen>;
}
