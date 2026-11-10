import { useState, type PropsWithChildren, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, type TextInputProps } from "react-native";
import { colors, radius, spacing, typography, type ColorTheme } from "@rsvp/design-tokens";
import { CheckMark, Enter, Illustration, Logo, NoticeMark, PressFeedback, fonts, useTheme, type IllustrationName } from "@rsvp/ui";
import type { AppLocale } from "@rsvp/i18n";
import { useLocalePreference, useT } from "../platform/providers";

/**
 * Building blocks of the sign-in, sign-up and recovery screens. Visual world: the invitation paper (brief
 * `minimalista-brief.md`). Bone canvas, ink actions, a serif title and air; on wide screens a quiet editorial
 * column beside the form, on narrow ones the form alone under a plain header. No bands, patterns or colour fields.
 * Copy always arrives translated.
 */

const MIN_TOUCH = 44;
const WIDE_BREAKPOINT = 900;
const FORM_WIDTH = 400;
const displayFamily = fonts.display;
const textFamily = fonts.sans;
/** react-native-web understands outline styles that the native types do not declare. */
const ringFor = (color: string): object => Platform.select({ web: { outlineColor: color, outlineWidth: 2, outlineOffset: 2 }, default: {} }) as object;
const focusRings = { light: ringFor(colors.light.primary), dark: ringFor(colors.dark.primary) } as const;
/** Focus ring of the active scheme (ink on both). */
export function useAuthFocusRing(): object {
  return focusRings[useTheme().scheme];
}

/** Auth style sheet of one palette. */
function createAuthStyles(palette: (typeof colors)[ColorTheme]) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.canvas },
  rootWide: { flexDirection: "row" },
  brand: { flex: 1, minWidth: 0, backgroundColor: palette.canvas, borderRightWidth: 1, borderRightColor: palette.border, paddingHorizontal: spacing[16], paddingVertical: spacing[12], justifyContent: "space-between" },
  pitchBody: { color: palette.textMuted, fontSize: 18, lineHeight: 29, maxWidth: 420, fontFamily: textFamily },
  pitch: { color: palette.text, fontSize: 56, lineHeight: 61, fontWeight: "500", letterSpacing: -1.5, maxWidth: 520, fontFamily: displayFamily },
  panel: { flex: 1, backgroundColor: palette.surface },
  panelNarrow: { backgroundColor: palette.surface },
  panelWide: { flexGrow: 0, flexShrink: 0, flexBasis: "auto", width: 560 },
  panelContent: { flexGrow: 1 },
  panelContentNarrow: { padding: spacing[6], paddingTop: spacing[8], paddingBottom: spacing[12], alignItems: "center" },
  panelContentWide: { alignItems: "center", justifyContent: "center", paddingHorizontal: spacing[8], paddingVertical: spacing[12] },
  column: { width: "100%", maxWidth: FORM_WIDTH, gap: spacing[8] },
  title: { color: palette.text, fontSize: typography.fontSize["2xl"], lineHeight: typography.lineHeight["2xl"], fontWeight: "500", letterSpacing: -0.9, fontFamily: displayFamily },
  intro: { color: palette.textMuted, fontSize: typography.fontSize.base, lineHeight: typography.lineHeight.base, fontFamily: textFamily },
  form: { gap: spacing[5] },
  label: { color: palette.text, fontSize: typography.fontSize.sm, fontWeight: "600", fontFamily: textFamily },
  inputRow: { flexDirection: "row", alignItems: "stretch" },
  input: { flex: 1, minWidth: 0, minHeight: MIN_TOUCH + 4, borderWidth: 1, borderColor: palette.fieldBorder, borderRadius: radius.md, paddingHorizontal: spacing[3], color: palette.text, backgroundColor: palette.surface, fontSize: typography.fontSize.base, fontFamily: textFamily },
  inputWithToggle: { borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  inputError: { borderColor: palette.danger },
  toggle: { flexShrink: 0, minWidth: MIN_TOUCH * 1.6, minHeight: MIN_TOUCH + 4, alignItems: "center", justifyContent: "center", borderWidth: 1, borderLeftWidth: 0, borderColor: palette.fieldBorder, borderTopRightRadius: radius.md, borderBottomRightRadius: radius.md, backgroundColor: palette.surfaceMuted, paddingHorizontal: spacing[3] },
  toggleText: { color: palette.text, fontWeight: "500", fontSize: typography.fontSize.sm, fontFamily: textFamily },
  hint: { color: palette.textMuted, fontSize: typography.fontSize.sm, lineHeight: typography.lineHeight.sm, fontFamily: textFamily },
  fieldError: { color: palette.danger, fontSize: typography.fontSize.sm, lineHeight: typography.lineHeight.sm, fontFamily: textFamily },
  primary: { minHeight: MIN_TOUCH + 4, alignItems: "center", justifyContent: "center", borderRadius: radius.button, backgroundColor: palette.primary, paddingHorizontal: spacing[4] },
  primaryBusy: { opacity: 0.6 },
  primaryText: { color: palette.onPrimary, fontSize: typography.fontSize.base, fontWeight: "500", fontFamily: textFamily },
  link: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, justifyContent: "center", alignSelf: "flex-start" },
  linkText: { color: palette.text, fontSize: typography.fontSize.sm, fontWeight: "500", textDecorationLine: "underline", fontFamily: textFamily },
  switchRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing[1] },
  switchLead: { color: palette.textMuted, fontSize: typography.fontSize.sm, fontFamily: textFamily },
  banner: { borderRadius: radius.md, padding: spacing[4], backgroundColor: palette.dangerBg, borderWidth: 1, borderColor: palette.danger },
  bannerOk: { backgroundColor: palette.successBg, borderColor: palette.success },
  bannerText: { color: palette.text, fontSize: typography.fontSize.sm, lineHeight: typography.lineHeight.sm, fontFamily: textFamily },
  languages: { flexDirection: "row", gap: spacing[2], alignItems: "center", flexWrap: "wrap" },
  language: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, paddingHorizontal: spacing[3], justifyContent: "center", borderRadius: radius.button, borderWidth: 1, borderColor: palette.border },
  languageActive: { backgroundColor: palette.surfaceMuted, borderColor: palette.text },
  roleOption: { minHeight: MIN_TOUCH + 12, justifyContent: "center", paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderWidth: 1, borderColor: palette.fieldBorder, borderRadius: radius.md, backgroundColor: palette.surface },
  roleOptionActive: { borderColor: palette.text, backgroundColor: palette.surfaceMuted },
  roleTitle: { color: palette.text, fontSize: typography.fontSize.base, fontWeight: "600", fontFamily: textFamily },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing[6], backgroundColor: palette.canvas, gap: spacing[4] }
  });
}

type AuthStyles = ReturnType<typeof createAuthStyles>;
const sheets: Readonly<Record<ColorTheme, AuthStyles>> = { light: createAuthStyles(colors.light), dark: createAuthStyles(colors.dark) };

/** The auth styles for the active scheme. Call it in the component that draws. */
export function useAuthStyles(): AuthStyles {
  return sheets[useTheme().scheme];
}


export function LanguageSwitch(): ReactNode {
  const authStyles = useAuthStyles();
  const focusRing = useAuthFocusRing();
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

/** Wide: a quiet editorial column (logo, serif pitch, one line illustration) beside the form. Narrow: a plain header with the logo, then the form. */
export function AuthLayout({ title, intro, illustration = "invitation", children }: PropsWithChildren<{ readonly title: string; readonly intro: string; /** Line illustration of the editorial column (wide screens only); decorative. */ readonly illustration?: IllustrationName }>): ReactNode {
  const authStyles = useAuthStyles();
  const t = useT();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;
  return (
    <View style={[authStyles.root, wide && authStyles.rootWide]}>
      {wide ? (
        <View style={authStyles.brand}>
          <Logo tone="auto" height={32} />
          <View style={{ gap: spacing[6] }}>
            <Illustration name={illustration} tone="auto" size={104} />
            <Text accessibilityElementsHidden aria-hidden style={authStyles.pitch}>{t("auth.brandPitch")}</Text>
            <Text accessibilityElementsHidden aria-hidden style={authStyles.pitchBody}>{t("auth.brandBody")}</Text>
          </View>
          <View />
        </View>
      ) : null}
      <ScrollView role="main" tabIndex={0} style={[authStyles.panel, !wide && authStyles.panelNarrow, wide && authStyles.panelWide]} contentContainerStyle={[authStyles.panelContent, wide ? authStyles.panelContentWide : authStyles.panelContentNarrow]} keyboardShouldPersistTaps="handled">
        {wide ? null : <View style={[authStyles.column, { paddingBottom: spacing[8] }]}><Logo tone="auto" height={28} /></View>}
        <View style={authStyles.column}>
          <Enter from="down"><View style={{ gap: spacing[3] }}>
            <Text accessibilityRole="header" aria-level={1} style={authStyles.title}>{title}</Text>
            <Text style={authStyles.intro}>{intro}</Text>
          </View></Enter>
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
  const authStyles = useAuthStyles();
  const focusRing = useAuthFocusRing();
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

/** `blocked` keeps the label but refuses presses (a 429 cooldown); `busy` also swaps the label. */
export function SubmitButton({ label, busyLabel, busy, blocked = false, onPress, testID }: { readonly label: string; readonly busyLabel: string; readonly busy: boolean; readonly blocked?: boolean; readonly onPress: () => void; readonly testID?: string }): ReactNode {
  const authStyles = useAuthStyles();
  const focusRing = useAuthFocusRing();
  const unavailable = busy || blocked;
  return (
    <PressFeedback accessibilityLabel={busy ? busyLabel : label} aria-busy={busy} aria-disabled={unavailable} disabled={unavailable} onPress={onPress} testID={testID} style={[{ borderRadius: radius.md }, focusRing]}>
      <View style={[authStyles.primary, unavailable && authStyles.primaryBusy]}>
        <Text style={authStyles.primaryText}>{busy ? busyLabel : label}</Text>
      </View>
    </PressFeedback>
  );
}

export function TextLink({ label, onPress }: { readonly label: string; readonly onPress: () => void }): ReactNode {
  const authStyles = useAuthStyles();
  const focusRing = useAuthFocusRing();
  return <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={onPress} style={[authStyles.link, focusRing]}><Text style={authStyles.linkText}>{label}</Text></Pressable>;
}

/** Errors say what happened and how to go on. Every banner pairs one drawn mark with its words: the D's check for success, the disc with a stem and a dot for an error. */
export function Banner({ kind, children }: PropsWithChildren<{ readonly kind: "error" | "success" }>): ReactNode {
  const authStyles = useAuthStyles();
  return (
    <View role={kind === "error" ? "alert" : "status"} style={[authStyles.banner, kind === "success" && authStyles.bannerOk, { flexDirection: "row", alignItems: "flex-start", gap: spacing[3] }]}>
      <View style={{ paddingTop: 1 }}>{kind === "success" ? <CheckMark size={24} tone="success" /> : <NoticeMark tone="error" />}</View>
      <Text style={[authStyles.bannerText, { flex: 1 }]}>{children}</Text>
    </View>
  );
}

