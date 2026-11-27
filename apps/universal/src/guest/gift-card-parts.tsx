import { useEffect, type ReactNode } from "react";
import { AccessibilityInfo, Pressable, Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { useColors } from "@rsvp/ui";
import type { GuestGiftState, PurchaseAnswer } from "@rsvp/query-hooks";
import { ActionButton, Notice, useStyles } from "../host/ui";
import { useT } from "../platform/providers";

/** R5 · the pieces of the guest's gift card that are new: the units stepper, the units and group lines, and the «¿Compraste?» card. */
const TOUCH = 44;

/** How many units the guest wants of a plain gift (1 to what is left). The signs are drawn, not typed, like the host's stepper. */
export function UnitsStepper({ value, max, onChange, title, testID }: { readonly value: number; readonly max: number; readonly onChange: (next: number) => void; readonly title: string; readonly testID: string }): ReactNode {
  const palette = useColors();
  const styles = useStyles();
  const t = useT();
  const sign = (plus: boolean): ReactNode => (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 14, height: 14, alignItems: "center", justifyContent: "center" }}>
      <View style={{ position: "absolute", width: 14, height: 2, borderRadius: 1, backgroundColor: palette.text }} />
      {plus ? <View style={{ position: "absolute", width: 2, height: 14, borderRadius: 1, backgroundColor: palette.text }} /> : null}
    </View>
  );
  const step = (label: string, next: number, disabled: boolean, id: string, plus: boolean): ReactNode => (
    <Pressable role="button" accessibilityRole="button" accessibilityLabel={`${label} · ${title}`} aria-disabled={disabled} disabled={disabled} onPress={() => onChange(next)} testID={id}
      style={[styles.choice, { minWidth: TOUCH, minHeight: TOUCH, alignItems: "center" }, disabled && styles.buttonDisabled]}>{sign(plus)}</Pressable>
  );
  return (
    <View style={{ gap: spacing[1] }} testID={testID}>
      <Text style={styles.label}>{t("gifts.guest.units.choose")}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
        {step(t("gifts.guest.units.less"), value - 1, value <= 1, `${testID}-less`, false)}
        <Text aria-live="polite" accessibilityLiveRegion="polite" accessibilityLabel={t("gifts.guest.units.value", { count: value })} style={[styles.itemTitle, { minWidth: 32, textAlign: "center" }]} testID={`${testID}-value`}>{value}</Text>
        {step(t("gifts.guest.units.more"), value + 1, value >= max, `${testID}-more`, true)}
      </View>
      <Text style={styles.muted}>{t("gifts.guest.units.help", { left: max })}</Text>
    </View>
  );
}

/** «Faltan 8 de 12», «Entre varios · 3 personas aportan» and who buys it. Counts only; a name shows only when its owner chose to (PF-1). */
export function UnitsAndGroup({ id, state }: { readonly id: string; readonly state: GuestGiftState }): ReactNode {
  const styles = useStyles();
  const t = useT();
  if (!state.showUnits && !state.group) return null;
  return (
    <View style={{ gap: spacing[1] }} testID={`gift-participation-${id}`}>
      {state.showUnits ? <Text style={[styles.body, { fontWeight: "600", fontVariant: ["tabular-nums"] }]} testID={`gift-units-${id}`}>{t("gifts.guest.units.left", { count: state.unitsLeft, total: state.quantity })}</Text> : null}
      {state.group ? <Text style={[styles.label]} testID={`gift-badge-${id}`}>{t("gifts.guest.group.badge")}</Text> : null}
      {state.group ? (
        <Text style={styles.muted} testID={`gift-group-${id}`}>
          {state.contributors === 0 ? t("gifts.guest.group.contributorsNone") : t("gifts.guest.group.contributors", { count: state.contributors })}
        </Text>
      ) : null}
      {state.coordinator ? <Text style={styles.body} testID={`gift-coordinator-${id}`}>{state.coordinator.name ? t("gifts.guest.group.coordinatorNamed", { name: state.coordinator.name }) : t("gifts.guest.group.coordinatorAnonymous")}</Text> : null}
      {state.group && !state.hasCoordinator ? <Text style={styles.muted}>{t("gifts.guest.group.noCoordinator")}</Text> : null}
      {state.contributorNames.length > 0 ? <Text style={styles.muted} testID={`gift-names-${id}`}>{t("gifts.guest.group.namesShown", { names: state.contributorNames.join(", ") })}</Text> : null}
    </View>
  );
}

/** The card that appears when the guest comes back. It is a named region and its question is announced when it appears, so a screen reader hears it on return. */
export function PurchasePromptCard({ id, title, units, reminder, onAnswer, claimAnnouncement }: { readonly id: string; readonly title: string; readonly units: number; readonly reminder: boolean; readonly onAnswer: (answer: PurchaseAnswer) => void; readonly claimAnnouncement: () => boolean }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const question = units > 1 ? t("gifts.guest.prompt.titleUnits", { units, title }) : t("gifts.guest.prompt.title", { title });
  // Once per attempt: a remount caused by a filter must not announce the question again.
  useEffect(() => { if (!claimAnnouncement()) return; try { AccessibilityInfo?.announceForAccessibility?.(question); } catch { /* no screen reader bridge (web, tests) */ } }, [question, claimAnnouncement]);
  return (
    <Notice kind="info">
      <View role="region" aria-label={question} testID={`gift-prompt-${id}`} style={{ gap: spacing[2] }}>
        <Text accessibilityRole="header" aria-level={3} style={styles.itemTitle}>{question}</Text>
        <Text style={styles.muted}>{t("gifts.guest.prompt.body")}</Text>
        {reminder ? <Text style={styles.muted}>{t("gifts.guest.prompt.reminder")}</Text> : null}
        <View style={styles.row}>
          <ActionButton icon="check" label={t("gifts.guest.prompt.yes")} accessibilityLabel={t("gifts.guest.prompt.yesFor", { title })} onPress={() => onAnswer("yes")} testID={`prompt-yes-${id}`} />
          <ActionButton variant="secondary" label={t("gifts.guest.prompt.later")} accessibilityLabel={t("gifts.guest.prompt.laterFor", { title })} onPress={() => onAnswer("later")} testID={`prompt-later-${id}`} />
          <ActionButton variant="secondary" label={t("gifts.guest.prompt.no")} accessibilityLabel={t("gifts.guest.prompt.noFor", { title })} onPress={() => onAnswer("no")} testID={`prompt-no-${id}`} />
        </View>
      </View>
    </Notice>
  );
}
