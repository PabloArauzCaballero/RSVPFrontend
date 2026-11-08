import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { brand, radius, spacing } from "@rsvp/design-tokens";
import { countdownTo, useGuestSummary, useHostReservations, usePublishCheck, type Celebration } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { HOST_ROUTES, withCelebration } from "../routes";
import { ActionButton, Celebrate, CheckMark, EmptyState, Loading, styles } from "../ui";
import { FreshnessLine, RetryNotice, TextAction } from "./parts";
import { livePalette } from "../../platform/theme";

const palette = livePalette;

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
  return (
    <View testID={testID} accessible accessibilityLabel={`${label}: ${value}`} style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: swatch }} />
      <Text style={[styles.body, { fontVariant: ["tabular-nums"] }]}><Text style={{ fontWeight: "800" }}>{value}</Text> {label}</Text>
    </View>
  );
}

/** The answer so far as one stacked bar (the kit's progress pattern): confirmed, declined, and what is still open. Decorative: the legend says every number. */
function ResponseBar({ confirmed, declined, total }: { readonly confirmed: number; readonly declined: number; readonly total: number }): ReactNode {
  const share = (n: number): `${number}%` => `${total ? (n / total) * 100 : 0}%`;
  return (
    <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height: 14, borderRadius: radius.full, backgroundColor: palette.primaryMuted, overflow: "hidden", flexDirection: "row" }}>
      <View style={{ width: share(confirmed), backgroundColor: palette.primary }} />
      <View style={{ width: share(declined), backgroundColor: palette.text }} />
    </View>
  );
}

/** A milestone of the celebration: the drawn check when reached, an empty ring when not. The words say the state too. */
function StepRow({ done, title, detail, testID }: { readonly done: boolean; readonly title: string; readonly detail: string; readonly testID?: string }): ReactNode {
  return (
    <View {...(testID ? { testID } : {})} accessible accessibilityLabel={`${title}: ${detail}`} style={{ flexDirection: "row", alignItems: "center", gap: spacing[3], minHeight: 44 }}>
      <View style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}>
        {done ? <CheckMark size={28} tone="brand" /> : <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: palette.fieldBorder }} />}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.label, { fontSize: 16 }]}>{title}</Text>
        <Text style={styles.muted}>{detail}</Text>
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

/** The featured card: the one thing to do now, on the night colour with its single primary button. */
function NextCard({ step, onGo, t }: { readonly step: Exclude<NextStep, { kind: "done" | "addGuests" }>; readonly onGo: () => void; readonly t: ReturnType<typeof useT> }): ReactNode {
  const base = `guests.summary.next.${step.kind}`;
  const count = step.kind === "finish" ? step.missing : step.kind === "publish" ? 0 : step.count;
  const title = step.kind === "publish" ? t(`${base}.title`) : step.kind === "finish" ? t(`${base}.title`) : t(`${base}.title`, { count });
  const body = step.kind === "finish" ? t(`${base}.body`, { count }) : t(`${base}.body`);
  return (
    <View testID="next-step" style={{ backgroundColor: brand.noche, borderRadius: radius.xl, padding: spacing[6], gap: spacing[3] }}>
      <Text accessibilityRole="header" aria-level={2} style={{ color: "#FFFFFF", fontSize: 28, lineHeight: 32, fontWeight: "800", letterSpacing: -0.7 }}>{title}</Text>
      <Text style={{ color: brand.niebla, fontSize: 16, lineHeight: 24, maxWidth: 520 }}>{body}</Text>
      <View style={{ alignItems: "flex-start", paddingTop: spacing[2] }}><ActionButton label={t(`${base}.action`)} onPress={onGo} testID="next-step-action" /></View>
    </View>
  );
}

function SummaryBody({ celebration, onNavigate }: { readonly celebration: Celebration; readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const summary = useGuestSummary(client, celebration.id);
  const published = celebration.status !== "DRAFT";
  // Support reads never block the panel: if one fails, its step is simply left out.
  const check = usePublishCheck(client, published ? "" : celebration.id);
  const gifts = useHostReservations(client, celebration.id, "PENDING_REVIEW");
  const go = (path: string) => () => onNavigate(withCelebration(path, celebration.id));
  if (summary.isPending) return <Loading />;
  if (summary.isError) return <RetryNotice error={summary.error} onRetry={() => { void summary.refetch(); }} />;
  const data = summary.data;
  // Authoritative total from the read model (contract v1.9.0), not the size of a page of requests.
  const open = data.openCompanionRequests;
  const answered = data.confirmed + data.declined;
  const step = nextStep({ published, ready: check.data ? check.data.ready : null, missing: check.data?.missingFields.length ?? 0, total: data.total, pending: data.pending, openRequests: open, pendingGifts: gifts.data?.items.length ?? 0 });
  return (
    <View style={{ gap: spacing[5] }}>
      {step.kind === "addGuests" ? <EmptyState illustration="table" title={t("guests.summary.next.addGuests.title")} body={t("guests.summary.next.addGuests.body")} action={<ActionButton label={t("guests.summary.next.addGuests.action")} onPress={go(STEP_ROUTE.addGuests)} testID="next-step-action" />} /> : null}
      {step.kind === "done" ? <Celebrate title={t("guests.summary.next.done.title")} body={t("guests.summary.next.done.body")} /> : null}
      {step.kind !== "addGuests" && step.kind !== "done" ? <NextCard step={step} t={t} onGo={go(STEP_ROUTE[step.kind])} /> : null}
      <View style={[styles.card, { gap: spacing[4] }]}>
        <Text accessibilityRole="header" aria-level={2} style={styles.subtitle}>{t("guests.summary.progressTitle")}</Text>
        <View style={{ gap: spacing[1] }}>
          <StepRow testID="step-published" done={published} title={t("guests.summary.steps.published")} detail={published ? t("guests.summary.steps.publishedDone") : t("guests.summary.steps.publishedTodo")} />
          <StepRow testID="step-guests" done={data.total > 0} title={t("guests.summary.steps.guests")} detail={data.total > 0 ? t("guests.summary.steps.guestsSome", { count: data.total }) : t("guests.summary.steps.guestsNone")} />
          <StepRow testID="step-answers" done={data.total > 0 && data.pending === 0} title={t("guests.summary.steps.answers")} detail={data.total > 0 ? t("guests.summary.steps.answersSome", { answered, total: data.total }) : t("guests.summary.steps.answersNone")} />
        </View>
        {data.total > 0 ? (
          <View style={{ gap: spacing[3] }}>
            <ResponseBar confirmed={data.confirmed} declined={data.declined} total={data.total} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: spacing[6], rowGap: spacing[2] }}>
              <LegendItem testID="count-confirmed" label={t("guests.summary.confirmed")} value={data.confirmed} swatch={palette.primary} />
              <LegendItem testID="count-pending" label={t("guests.summary.pending")} value={data.pending} swatch={brand.niebla} />
              <LegendItem testID="count-declined" label={t("guests.summary.declined")} value={data.declined} swatch={palette.text} />
              <LegendItem testID="count-companions" label={t("guests.summary.companions")} value={data.companions} swatch={brand.ambar} />
              <LegendItem testID="count-total" label={t("guests.summary.total")} value={data.total} swatch={palette.border} />
            </View>
          </View>
        ) : null}
        <Text style={styles.muted}>{deadlineLine(celebration, t, Date.now())}</Text>
        {open && step.kind !== "requests" ? <Text testID="open-requests" style={styles.muted}>{t("guests.summary.openRequests", { count: open })}</Text> : null}
        {data.total > 0 ? <TextAction label={t("guests.summary.viewGuests")} onPress={go(HOST_ROUTES.guests)} /> : null}
        <FreshnessLine freshness={data.freshness} timeZone={celebration.timeZone} onRefresh={() => { void summary.refetch(); }} />
      </View>
    </View>
  );
}

export function SummaryScreen(props: ScreenProps): ReactNode {
  const t = useT();
  return <CelebrationScreen {...props} current="summary" title={t("guests.summary.title")} intro={t("guests.summary.intro")}>{({ celebration }) => <SummaryBody celebration={celebration} onNavigate={props.onNavigate} />}</CelebrationScreen>;
}
