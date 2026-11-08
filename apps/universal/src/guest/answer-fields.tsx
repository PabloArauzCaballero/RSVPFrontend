import { useState, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { brand, radius, spacing, typography } from "@rsvp/design-tokens";
import { CheckMark, PressFeedback, useColors, useThemedStyles, type Palette } from "@rsvp/ui";
import { Field, useStyles } from "../host/ui";
import { useT } from "../platform/providers";

/**
 * The few things a guest answers: come or not (two big taps), how many come along (a stepper) and, only if they want,
 * a dietary restriction or a message. Everything optional stays folded away so the common answer takes two taps.
 */

const fontFamily = Platform.select({ web: "'Plus Jakarta Sans', 'Avenir Next', 'Segoe UI', system-ui, sans-serif", default: undefined });
const MIN_TOUCH = 44;
/** The contract sets no maximum; this only keeps the stepper from running away. */
const STEPPER_MAX = 20;
const ringFor = (color: string): object => Platform.select({ web: { outlineColor: color, outlineWidth: 2, outlineOffset: 2 }, default: {} }) as object;

const createStyles = (palette: Palette, scheme: "light" | "dark") => StyleSheet.create({
  answers: { flexDirection: "row", gap: spacing[3] },
  answerSlot: { flex: 1, minHeight: 76, borderRadius: radius.lg },
  answer: { flexGrow: 1, minHeight: 76, borderRadius: radius.lg, borderWidth: 1.5, borderColor: scheme === "dark" ? palette.textMuted : palette.fieldBorder, backgroundColor: palette.surface, alignItems: "center", justifyContent: "center", gap: spacing[1], paddingHorizontal: spacing[3] },
  answerYes: { backgroundColor: brand.azul, borderColor: brand.azul },
  /* On the dark page a night fill would vanish: the refusal lifts to the raised surface with its outline. */
  answerNo: scheme === "dark" ? { backgroundColor: palette.surfaceMuted, borderColor: palette.fieldBorder } : { backgroundColor: brand.noche, borderColor: brand.noche },
  answerText: { color: palette.text, fontSize: 20, lineHeight: 24, fontWeight: "800", letterSpacing: -0.4, fontFamily },
  answerTextOn: { color: "#FFFFFF" },
  ring: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  ringDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFFFFF" },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  step: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: palette.fieldBorder, backgroundColor: palette.surface, alignItems: "center", justifyContent: "center" },
  stepOff: { opacity: 0.4 },
  stepGlyph: { color: palette.primary, fontSize: 24, lineHeight: 26, fontWeight: "700", fontFamily },
  count: { minWidth: 40, textAlign: "center", color: palette.text, fontSize: 28, lineHeight: 32, fontWeight: "800", fontFamily },
  toggle: { minHeight: MIN_TOUCH, justifyContent: "center", alignSelf: "flex-start" },
  toggleText: { color: palette.primary, fontSize: typography.fontSize.base, fontWeight: "700", textDecorationLine: "underline", fontFamily }
});

export type Attendance = "" | "CONFIRMED" | "DECLINED";

/** "Voy" / "No puedo": two large taps. The selection is a filled shape plus a mark, never colour alone. */
export function AttendanceChoice({ value, onChange, error }: { readonly value: Attendance; readonly onChange: (next: "CONFIRMED" | "DECLINED") => void; readonly error?: string | undefined }): ReactNode {
  const s = useThemedStyles(createStyles);
  const styles = useStyles();
  const palette = useColors();
  const focusRing = ringFor(palette.primary);
  const t = useT();
  const yes = value === "CONFIRMED";
  const no = value === "DECLINED";
  return (
    <View style={{ gap: spacing[2] }}>
      <View accessibilityRole="radiogroup" accessibilityLabel={t("rsvp.invite.question")} style={s.answers}>
        <PressFeedback accessibilityRole="radio" aria-checked={yes} accessibilityLabel={t("rsvp.invite.yes")} onPress={() => onChange("CONFIRMED")} testID="answer-yes" style={[s.answerSlot, focusRing]}>
          <View style={[s.answer, yes && s.answerYes]}>
            {yes ? <CheckMark size={24} tone="white" /> : null}
            <Text style={[s.answerText, yes && s.answerTextOn]}>{t("rsvp.invite.yes")}</Text>
          </View>
        </PressFeedback>
        <PressFeedback accessibilityRole="radio" aria-checked={no} accessibilityLabel={t("rsvp.invite.no")} onPress={() => onChange("DECLINED")} testID="answer-no" style={[s.answerSlot, focusRing]}>
          <View style={[s.answer, no && s.answerNo]}>
            {no ? <View style={s.ring}><View style={s.ringDot} /></View> : null}
            <Text style={[s.answerText, no && s.answerTextOn]}>{t("rsvp.invite.no")}</Text>
          </View>
        </PressFeedback>
      </View>
      {error ? <Text accessibilityRole="alert" style={[styles.muted, { color: palette.danger }]}>{error}</Text> : null}
    </View>
  );
}

/** How many come along. The invitation says how many it includes; asking for more is allowed and the host decides. */
export function CompanionsStepper({ value, onChange, allowed, error }: { readonly value: string; readonly onChange: (next: string) => void; readonly allowed: number | undefined; readonly error?: string | undefined }): ReactNode {
  const s = useThemedStyles(createStyles);
  const styles = useStyles();
  const palette = useColors();
  const focusRing = ringFor(palette.primary);
  const t = useT();
  const parsed = Number(value);
  const count = Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
  const set = (next: number): void => onChange(String(Math.min(STEPPER_MAX, Math.max(0, next))));
  return (
    <View style={{ gap: spacing[2] }}>
      <Text style={styles.label}>{t("rsvp.invite.companions")}</Text>
      <View style={s.stepper}>
        <Pressable accessibilityRole="button" accessibilityLabel={t("rsvp.invite.companionsRemove")} aria-disabled={count === 0} disabled={count === 0} onPress={() => set(count - 1)} testID="companions-minus" style={[s.step, count === 0 && s.stepOff, focusRing]}><Text accessibilityElementsHidden aria-hidden style={s.stepGlyph}>−</Text></Pressable>
        <Text accessibilityLiveRegion="polite" accessibilityLabel={t("rsvp.invite.companionsCount", { count })} testID="companions-count" style={s.count}>{count}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t("rsvp.invite.companionsAdd")} aria-disabled={count >= STEPPER_MAX} disabled={count >= STEPPER_MAX} onPress={() => set(count + 1)} testID="companions-plus" style={[s.step, count >= STEPPER_MAX && s.stepOff, focusRing]}><Text accessibilityElementsHidden aria-hidden style={s.stepGlyph}>+</Text></Pressable>
      </View>
      {allowed !== undefined ? <Text style={styles.muted}>{t("rsvp.invite.companionsIncluded", { count: allowed })}</Text> : null}
      {error ? <Text accessibilityRole="alert" style={[styles.muted, { color: palette.danger }]}>{error}</Text> : null}
    </View>
  );
}

/** Dietary restriction and message: folded away unless there is already something written. */
export function ExtrasFields({ dietaryNotes, message, onChange, errors }: { readonly dietaryNotes: string; readonly message: string; readonly onChange: (patch: { dietaryNotes?: string; message?: string }) => void; readonly errors: { readonly dietaryNotes?: string | undefined; readonly message?: string | undefined } }): ReactNode {
  const s = useThemedStyles(createStyles);
  const palette = useColors();
  const focusRing = ringFor(palette.primary);
  const t = useT();
  const [open, setOpen] = useState(() => Boolean(dietaryNotes || message));
  const shown = open || Boolean(errors.dietaryNotes || errors.message);
  return (
    <View style={{ gap: spacing[3] }}>
      <Pressable accessibilityRole="button" aria-expanded={shown} accessibilityState={{ expanded: shown }} onPress={() => setOpen(!shown)} testID="rsvp-extras" style={[s.toggle, focusRing]}>
        <Text style={s.toggleText}>{shown ? t("rsvp.invite.extrasClose") : t("rsvp.invite.extrasOpen")}</Text>
      </Pressable>
      {shown ? (
        <View style={{ gap: spacing[4] }}>
          <Field label={t("rsvp.invite.dietary")} help={t("rsvp.invite.dietaryHelp")} multiline value={dietaryNotes} onChange={(next) => onChange({ dietaryNotes: next })} error={errors.dietaryNotes} testID="rsvp-dietary" />
          <Field label={t("rsvp.invite.message")} multiline value={message} onChange={(next) => onChange({ message: next })} error={errors.message} testID="rsvp-message" />
        </View>
      ) : null}
    </View>
  );
}
