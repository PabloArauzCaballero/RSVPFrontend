import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { PressFeedback, useColors } from "@rsvp/ui";
import { radius, spacing } from "@rsvp/design-tokens";
import { useStyles } from "./ui";

const BAR = 4;
const TOUCH = 44;

/**
 * Segments that fill as the person moves on; the words say where they are ("Paso 2 · Identidad"), the bar shows how far is left.
 * Shared by the celebration sign-up (3 steps) and the admin's step dialogs. Only the bar is the progressbar: a control inside
 * one (the way back) is not reachable by assistive technology, so the back link sits beside it.
 */
export function StepProgress({ step, total, name, progressLabel, stepText, back }: {
  /** 1-based. */
  readonly step: number;
  readonly total: number;
  /** Translated name of the current step. */
  readonly name: string;
  /** Accessible name of the bar ("Tus pasos"). */
  readonly progressLabel: string;
  /** "Paso 2": shown before the name and read as part of the value. */
  readonly stepText: string;
  readonly back?: { readonly label: string; readonly onPress: () => void; readonly testID: string };
}): ReactNode {
  const palette = useColors();
  const styles = useStyles();
  return (
    <View style={{ gap: spacing[2] }}>
      <View role="progressbar" aria-label={progressLabel} aria-valuemin={1} aria-valuemax={total} aria-valuenow={step} aria-valuetext={`${stepText}: ${name}`} style={{ flexDirection: "row", gap: spacing[1] }}>
        {Array.from({ length: total }, (_unused, index) => <View key={index} style={{ flex: 1, height: BAR, borderRadius: radius.full, backgroundColor: index < step ? palette.primary : palette.border }} />)}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: TOUCH }}>
        <Text style={styles.label}>{`${stepText} · ${name}`}</Text>
        {back ? <PressFeedback accessibilityRole="button" accessibilityLabel={back.label} onPress={back.onPress} testID={back.testID} style={{ minHeight: TOUCH, minWidth: TOUCH, justifyContent: "center", alignItems: "flex-end", paddingHorizontal: spacing[2] }}><Text style={[styles.label, { color: palette.primary }]}>{back.label}</Text></PressFeedback> : null}
      </View>
    </View>
  );
}
