import { useState, type PropsWithChildren, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, type TextInputProps } from "react-native";
import { aguayo, colors, radius, spacing, typography, wine } from "@rsvp/design-tokens";
import type { AppLocale } from "@rsvp/i18n";
import { useLocalePreference, useT } from "../platform/providers";

/**
 * Building blocks of the sign-in, sign-up and recovery screens. Visual world: the Bolivian
 * aguayo. Wine is the committed panel, magenta the single action colour, marigold the focus
 * accent. Copy always arrives translated.
 */

const palette = colors.light;
const MIN_TOUCH = 44;
const WIDE_BREAKPOINT = 900;
const FORM_WIDTH = 400;
const BAND_HEIGHT = 8;
const ON_WINE = "#FBEFF6";
const BRAND = "RSVP";
/** Relative widths of the stripes, in weaving order. */
const STRIPE_WEIGHTS = [3, 1, 2, 2, 1] as const;
const displayFamily = Platform.select({ web: "'Bricolage Grotesque', 'Figtree', system-ui, sans-serif", default: undefined });
const textFamily = Platform.select({ web: "'Figtree', system-ui, sans-serif", default: undefined });
/** react-native-web understands outline styles that the native types do not declare. */
const focusRing = Platform.select({ web: { outlineColor: palette.primary, outlineWidth: 2, outlineOffset: 2 }, default: {} }) as object;

export const authStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.canvas },
  rootWide: { flexDirection: "row" },
  brand: { flex: 1, minWidth: 0, overflow: "hidden", backgroundColor: wine, padding: spacing[12], justifyContent: "space-between" },
  wordmark: { color: ON_WINE, fontSize: typography.fontSize["2xl"], lineHeight: typography.lineHeight["2xl"], fontWeight: "800", letterSpacing: -0.5, fontFamily: displayFamily },
  pitch: { color: ON_WINE, fontSize: 44, lineHeight: 48, fontWeight: "800", letterSpacing: -1, maxWidth: 440, fontFamily: displayFamily },
  weave: { flexDirection: "row", height: spacing[16], maxWidth: 440 },
  panel: { flex: 1, backgroundColor: palette.canvas },
  panelWide: { flexGrow: 0, flexShrink: 0, flexBasis: "auto", width: 520 },
  panelContent: { flexGrow: 1, alignItems: "center", paddingHorizontal: spacing[4], paddingVertical: spacing[8] },
  column: { width: "100%", maxWidth: FORM_WIDTH, gap: spacing[6] },
  band: { flexDirection: "row", height: BAND_HEIGHT },
  mobileWordmark: { color: wine, fontSize: typography.fontSize.xl, fontWeight: "800", fontFamily: displayFamily },
  title: { color: palette.text, fontSize: typography.fontSize["2xl"], lineHeight: typography.lineHeight["2xl"], fontWeight: "800", letterSpacing: -0.5, fontFamily: displayFamily },
  intro: { color: palette.textMuted, fontSize: typography.fontSize.base, lineHeight: typography.lineHeight.base, fontFamily: textFamily },
  form: { gap: spacing[4] },
  label: { color: palette.text, fontSize: typography.fontSize.sm, fontWeight: "600", fontFamily: textFamily },
  inputRow: { flexDirection: "row", alignItems: "stretch" },
  input: { flex: 1, minWidth: 0, minHeight: MIN_TOUCH, borderWidth: 1, borderColor: palette.border, borderRadius: radius.md, paddingHorizontal: spacing[3], color: palette.text, backgroundColor: palette.surface, fontSize: typography.fontSize.base, fontFamily: textFamily },
  inputWithToggle: { borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  inputError: { borderColor: palette.danger, borderWidth: 2 },
  toggle: { flexShrink: 0, minWidth: MIN_TOUCH * 1.6, minHeight: MIN_TOUCH, alignItems: "center", justifyContent: "center", borderWidth: 1, borderLeftWidth: 0, borderColor: palette.border, borderTopRightRadius: radius.md, borderBottomRightRadius: radius.md, backgroundColor: palette.surfaceMuted, paddingHorizontal: spacing[3] },
  toggleText: { color: palette.primary, fontWeight: "600", fontSize: typography.fontSize.sm, fontFamily: textFamily },
  hint: { color: palette.textMuted, fontSize: typography.fontSize.sm, lineHeight: typography.lineHeight.sm, fontFamily: textFamily },
  fieldError: { color: palette.danger, fontSize: typography.fontSize.sm, lineHeight: typography.lineHeight.sm, fontFamily: textFamily },
  primary: { minHeight: MIN_TOUCH + 4, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: palette.primary, paddingHorizontal: spacing[4] },
  primaryBusy: { opacity: 0.75 },
  primaryText: { color: palette.onPrimary, fontSize: typography.fontSize.base, fontWeight: "700", fontFamily: textFamily },
  link: { minHeight: MIN_TOUCH, justifyContent: "center", alignSelf: "flex-start" },
  linkText: { color: palette.primary, fontSize: typography.fontSize.sm, fontWeight: "600", textDecorationLine: "underline", fontFamily: textFamily },
  switchRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing[1] },
  switchLead: { color: palette.textMuted, fontSize: typography.fontSize.sm, fontFamily: textFamily },
  banner: { borderRadius: radius.md, padding: spacing[3], backgroundColor: "#FDECEA", borderWidth: 1, borderColor: palette.danger },
  bannerOk: { backgroundColor: "#E6F4EA", borderColor: palette.success },
  bannerText: { color: palette.text, fontSize: typography.fontSize.sm, lineHeight: typography.lineHeight.sm, fontFamily: textFamily },
  languages: { flexDirection: "row", gap: spacing[2], alignItems: "center", flexWrap: "wrap" },
  language: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, paddingHorizontal: spacing[3], justifyContent: "center", borderRadius: radius.md, borderWidth: 1, borderColor: palette.border },
  languageActive: { backgroundColor: palette.primaryMuted, borderColor: palette.primary },
  roleOption: { minHeight: MIN_TOUCH + 12, justifyContent: "center", paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderWidth: 1, borderColor: palette.border, borderRadius: radius.md, backgroundColor: palette.surface },
  roleOptionActive: { borderColor: palette.primary, borderWidth: 2, backgroundColor: palette.primaryMuted },
  roleTitle: { color: palette.text, fontSize: typography.fontSize.base, fontWeight: "700", fontFamily: textFamily },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing[6], backgroundColor: palette.canvas, gap: spacing[4] }
});

/** The five stripes of the aguayo in weaving order; decorative, hidden from assistive technology. */
function Weave({ style }: { readonly style: object }): ReactNode {
  return (
    <View style={style} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
      {aguayo.map((color, index) => <View key={`${color}-${index}`} style={{ flex: STRIPE_WEIGHTS[index] ?? 1, backgroundColor: color }} />)}
    </View>
  );
}

export function LanguageSwitch(): ReactNode {
  const t = useT();
  const { locale, setLocale, options } = useLocalePreference();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={t("language.label")} style={authStyles.languages}>
      {options.map((option: AppLocale) => (
        <Pressable key={option} accessibilityRole="radio" aria-checked={option === locale} accessibilityLabel={t(`language.${option}`)} onPress={() => setLocale(option)} style={[authStyles.language, option === locale && authStyles.languageActive, focusRing]}>
          <Text style={[authStyles.linkText, { textDecorationLine: "none" }]}>{t(`language.${option}`)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Wine brand panel beside the form on wide screens; an aguayo band above it on narrow ones. */
export function AuthLayout({ title, intro, children }: PropsWithChildren<{ readonly title: string; readonly intro: string }>): ReactNode {
  const t = useT();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;
  return (
    <View style={[authStyles.root, wide && authStyles.rootWide]}>
      {wide ? (
        <View style={authStyles.brand}>
          <Text accessibilityElementsHidden aria-hidden style={authStyles.wordmark}>{BRAND}</Text>
          <View style={{ gap: spacing[8] }}>
            <Text style={authStyles.pitch}>{t("auth.brandPitch")}</Text>
            <Weave style={authStyles.weave} />
          </View>
        </View>
      ) : null}
      <ScrollView style={[authStyles.panel, wide && authStyles.panelWide]} contentContainerStyle={authStyles.panelContent} keyboardShouldPersistTaps="handled">
        <View style={authStyles.column}>
          {wide ? null : <><Weave style={authStyles.band} /><Text accessibilityElementsHidden aria-hidden style={authStyles.mobileWordmark}>{BRAND}</Text></>}
          <View style={{ gap: spacing[2] }}>
            <Text accessibilityRole="header" aria-level={1} style={authStyles.title}>{title}</Text>
            <Text style={authStyles.intro}>{intro}</Text>
          </View>
          {children}
          <LanguageSwitch />
        </View>
      </ScrollView>
    </View>
  );
}

export interface AuthFieldProps extends Pick<TextInputProps, "autoComplete" | "keyboardType" | "returnKeyType" | "onSubmitEditing" | "textContentType"> {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly hint?: string;
  readonly secret?: boolean;
  readonly editable?: boolean;
  readonly testID?: string;
}

/** Visible label, error tied to the field, and for passwords a reveal toggle (a 44 px target, never colour alone). */
export function AuthField({ label, value, onChange, error, hint, secret = false, editable = true, testID, ...input }: AuthFieldProps): ReactNode {
  const t = useT();
  const [revealed, setRevealed] = useState(false);
  const errorId = `${testID ?? label}-error`;
  return (
    <View style={{ gap: spacing[1] }}>
      <Text style={authStyles.label}>{label}</Text>
      <View style={authStyles.inputRow}>
        <TextInput
          accessibilityLabel={label} aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined} aria-required
          value={value} onChangeText={onChange} editable={editable} testID={testID} secureTextEntry={secret && !revealed} autoCapitalize="none" autoCorrect={false}
          style={[authStyles.input, secret && authStyles.inputWithToggle, error ? authStyles.inputError : null, focusRing]} {...input}
        />
        {secret ? (
          <Pressable accessibilityRole="button" accessibilityLabel={revealed ? t("auth.hidePassword") : t("auth.showPassword")} aria-pressed={revealed} onPress={() => setRevealed((current) => !current)} style={[authStyles.toggle, focusRing]}>
            <Text style={authStyles.toggleText}>{revealed ? t("auth.hidePassword") : t("auth.showPassword")}</Text>
          </Pressable>
        ) : null}
      </View>
      {hint && !error ? <Text style={authStyles.hint}>{hint}</Text> : null}
      {error ? <Text nativeID={errorId} accessibilityRole="alert" style={authStyles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function SubmitButton({ label, busyLabel, busy, onPress, testID }: { readonly label: string; readonly busyLabel: string; readonly busy: boolean; readonly onPress: () => void; readonly testID?: string }): ReactNode {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={busy ? busyLabel : label} aria-busy={busy} aria-disabled={busy} disabled={busy} onPress={onPress} testID={testID} style={[authStyles.primary, busy && authStyles.primaryBusy, focusRing]}>
      <Text style={authStyles.primaryText}>{busy ? busyLabel : label}</Text>
    </Pressable>
  );
}

export function TextLink({ label, onPress }: { readonly label: string; readonly onPress: () => void }): ReactNode {
  return <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={onPress} style={[authStyles.link, focusRing]}><Text style={authStyles.linkText}>{label}</Text></Pressable>;
}

export function Banner({ kind, children }: PropsWithChildren<{ readonly kind: "error" | "success" }>): ReactNode {
  return <View accessibilityRole={kind === "error" ? "alert" : "summary"} accessibilityLiveRegion="polite" style={[authStyles.banner, kind === "success" && authStyles.bannerOk]}><Text style={authStyles.bannerText}>{children}</Text></View>;
}

