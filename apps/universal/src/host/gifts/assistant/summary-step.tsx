import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { SkeletonList, useColors } from "@rsvp/ui";
import { radius, spacing } from "@rsvp/design-tokens";
import { BALANCE_BANDS, type BalanceBandId, type BalanceReport } from "@rsvp/query-hooks";
import { DELIVERY_NOTES_MAX, hasControlCharacters, notesLength } from "@rsvp/forms";
import { formatBs } from "./money";
import { useLocale, useT } from "../../../platform/providers";
import { ActionButton, Field, Notice, useStyles } from "../../ui";
import { bandText } from "./ideas-step";

const BAR_HEIGHT = 8;

/** One line of the chosen list, ready to draw. */
export interface SummaryLine {
  readonly ideaCode: string;
  readonly idea: string;
  readonly title: string;
  readonly version: string | null;
  readonly quantity: number;
  readonly unitMinor: number;
  readonly group: boolean;
  readonly problem?: string;
}

/**
 * The balance bar (D-10 §5.6, decision 9): four price ranges, each with how many gifts the list would have in it, and the sentence that compares the cheap range
 * with the guests. Never colour alone: every row carries its words and its count; the bars are decoration for the sighted and hidden from readers.
 */
export function BalanceBar({ report, guests, onSeeCheap }: {
  readonly report: BalanceReport;
  readonly guests: { readonly state: "loading" | "error" | "ready"; readonly count: number };
  readonly onSeeCheap: () => void;
}): ReactNode {
  const palette = useColors();
  const styles = useStyles();
  const t = useT();
  const locale = useLocale();
  const widest = Math.max(1, ...BALANCE_BANDS.map((band) => report.units[band.id]));
  const have = report.units.b1;
  const guestsText = t("gifts.host.wizard.summary.balance.guestsCount", { count: guests.count });
  const sentence = guests.state === "loading" ? t("gifts.host.wizard.summary.balance.loadingGuests")
    : guests.state === "error" ? t("gifts.host.wizard.summary.balance.guestsError")
    : guests.count === 0 ? t("gifts.host.wizard.summary.balance.noGuests")
    : report.needsAffordable
      ? (have === 0 ? t("gifts.host.wizard.summary.balance.needAffordableNone", { max: formatBs(BALANCE_BANDS[0].maxMinor, locale), guests: guestsText }) : t("gifts.host.wizard.summary.balance.needAffordable", { count: have, have, max: formatBs(BALANCE_BANDS[0].maxMinor, locale), guests: guestsText }))
      : t("gifts.host.wizard.summary.balance.ok");
  return (
    <View testID="wizard-balance" style={{ gap: spacing[3] }}>
      <Text accessibilityRole="header" aria-level={3} style={styles.itemTitle}>{t("gifts.host.wizard.summary.balance.title")}</Text>
      <Text style={styles.muted}>{t("gifts.host.wizard.summary.balance.intro")}</Text>
      {BALANCE_BANDS.map((band) => {
        const units = report.units[band.id as BalanceBandId];
        const label = bandText(t, locale, band.id);
        const count = t("gifts.host.wizard.summary.balance.units", { count: units });
        return (
          <View key={band.id} testID={`balance-${band.id}`} accessible accessibilityLabel={`${label}: ${count}`} style={{ gap: spacing[1] }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing[3] }}>
              <Text style={styles.body}>{label}</Text>
              <Text style={[styles.body, { fontVariant: ["tabular-nums"] }]}>{count}</Text>
            </View>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height: BAR_HEIGHT, borderRadius: radius.full, backgroundColor: palette.border, overflow: "hidden" }}>
              <View style={{ height: BAR_HEIGHT, width: `${Math.round((units / widest) * 100)}%`, backgroundColor: palette.primary }} />
            </View>
          </View>
        );
      })}
      {guests.state === "ready" && guests.count > 0 ? <Text style={styles.muted}>{t("gifts.host.wizard.summary.balance.guests", { count: guests.count })}</Text> : null}
      {guests.state === "loading" ? <SkeletonList count={1} row={{ minHeight: 24, avatar: false, trailing: false }} label={t("gifts.host.wizard.summary.balance.loadingGuests")} /> : null}
      <Notice kind="info">
        <Text style={styles.body} testID="balance-sentence">{sentence}</Text>
        {guests.state === "ready" && report.needsAffordable ? <ActionButton variant="secondary" label={t("gifts.host.wizard.summary.balance.seeCheap", { max: formatBs(BALANCE_BANDS[0].maxMinor, locale) })} onPress={onSeeCheap} testID="balance-see-cheap" /> : null}
      </Notice>
    </View>
  );
}

/** Step 3 (D-10 §5.6): the chosen gifts with their total, the balance bar and the delivery notes (≤ 200, never the exact address). */
export function SummaryStep({ lines, totalMinor, report, guests, notes, onNotes, onSeeCheap, onChange, showCurrencyNote }: {
  readonly lines: readonly SummaryLine[];
  readonly totalMinor: number;
  readonly report: BalanceReport;
  readonly guests: { readonly state: "loading" | "error" | "ready"; readonly count: number };
  readonly notes: string;
  readonly onNotes: (value: string) => void;
  readonly onSeeCheap: () => void;
  readonly onChange: () => void;
  readonly showCurrencyNote: boolean;
}): ReactNode {
  const palette = useColors();
  const styles = useStyles();
  const t = useT();
  const locale = useLocale();
  const over = notesLength(notes) - DELIVERY_NOTES_MAX;
  return (
    <View style={{ gap: spacing[6] }}>
      <Text style={styles.body}>{t("gifts.host.wizard.summary.intro")}</Text>
      <View role="list" accessibilityRole="list" testID="wizard-lines" style={{ gap: spacing[3] }}>
        {lines.map((line) => (
          <View key={line.ideaCode} role="listitem" testID={`line-${line.ideaCode}`} style={{ gap: spacing[1], paddingVertical: spacing[2], borderBottomWidth: 1, borderBottomColor: palette.border }}>
            <Text style={styles.itemTitle}>{line.version ? t("gifts.host.wizard.summary.lineVersion", { idea: line.idea, title: line.title, version: line.version }) : t("gifts.host.wizard.summary.line", { idea: line.idea, title: line.title })}</Text>
            <Text style={styles.body}>{t("gifts.host.wizard.summary.lineQuantity", { count: line.quantity, price: formatBs(line.unitMinor, locale) })}</Text>
            {line.group ? <Text style={styles.muted}>{t("gifts.host.wizard.summary.group")}</Text> : null}
            {line.problem ? <Text accessibilityRole="alert" role="alert" style={[styles.body, { color: palette.danger }]} testID={`line-problem-${line.ideaCode}`}>{line.problem}</Text> : null}
          </View>
        ))}
      </View>
      <Text style={[styles.itemTitle, { fontVariant: ["tabular-nums"] }]} testID="wizard-total">{t("gifts.host.wizard.summary.total", { price: formatBs(totalMinor, locale) })}</Text>
      {showCurrencyNote ? <Text style={styles.muted}>{t("gifts.host.wizard.summary.currencyNote")}</Text> : null}
      <View style={styles.row}><ActionButton variant="secondary" label={t("gifts.host.wizard.summary.change")} onPress={onChange} testID="wizard-change" /></View>
      <BalanceBar report={report} guests={guests} onSeeCheap={onSeeCheap} />
      <Text style={styles.muted} testID="wizard-disclaimer">{t("gifts.host.wizard.summary.disclaimer")}</Text>
      <View style={{ gap: spacing[2] }}>
        <Field label={t("gifts.host.wizard.summary.delivery.label")} value={notes} onChange={onNotes} multiline testID="wizard-notes"
          help={`${t("gifts.host.wizard.summary.delivery.help")} ${t("gifts.host.wizard.summary.delivery.warning")}`}
          {...(over > 0 ? { error: t("gifts.host.wizard.summary.delivery.tooLong", { count: over, max: DELIVERY_NOTES_MAX }) } : hasControlCharacters(notes) ? { error: t("gifts.host.wizard.summary.delivery.control") } : {})} />
        <Text style={styles.muted} testID="wizard-notes-counter">{t("gifts.host.wizard.summary.delivery.counter", { count: notesLength(notes), max: DELIVERY_NOTES_MAX })}</Text>
      </View>
    </View>
  );
}
