import { useState, type PropsWithChildren, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, type TextInputProps } from "react-native";
import { brand, colors, onNight, radius, spacing, typography, type ColorTheme } from "@rsvp/design-tokens";
import { CheckMark, Illustration, Logo, useTheme, type IllustrationName } from "@rsvp/ui";
import type { AppLocale } from "@rsvp/i18n";
import { useLocalePreference, useT } from "../platform/providers";
import { currentScheme } from "../platform/theme";

/**
 * Building blocks of the sign-in, sign-up and recovery screens. Visual world: DOne Brand Kit v3.
 * Night is the committed panel, electric blue the single action colour, sky the focus accent on
 * dark. Copy always arrives translated.
 */

const MIN_TOUCH = 44;
const WIDE_BREAKPOINT = 900;
const FORM_WIDTH = 400;
const displayFamily = Platform.select({ web: "'Plus Jakarta Sans', 'Avenir Next', 'Segoe UI', system-ui, sans-serif", default: undefined });
const textFamily = Platform.select({ web: "'Plus Jakarta Sans', 'Avenir Next', 'Segoe UI', system-ui, sans-serif", default: undefined });
/** react-native-web understands outline styles that the native types do not declare. */
const ringFor = (color: string): object => Platform.select({ web: { outlineColor: color, outlineWidth: 2, outlineOffset: 2 }, default: {} }) as object;
const focusRings = { light: ringFor(colors.light.primary), dark: ringFor(colors.dark.primary) } as const;
/** Focus ring of the active scheme (blue on light, sky on dark). */
export function useAuthFocusRing(): object {
  return focusRings[useTheme().scheme];
}

/** Auth style sheet of one palette. The blue cover and panel are brand regions and stay the same in both schemes. */
function createAuthStyles(palette: (typeof colors)[ColorTheme]) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.canvas },
  rootWide: { flexDirection: "row" },
  brand: { flex: 1, minWidth: 0, overflow: "hidden", backgroundColor: brand.azul, padding: spacing[12], justifyContent: "space-between" },
  pitchBody: { color: "#D5DCFF", fontSize: 19, lineHeight: 30, maxWidth: 440, fontFamily: textFamily },
  cover: { backgroundColor: brand.azul, overflow: "hidden", paddingHorizontal: spacing[6], paddingTop: spacing[10], paddingBottom: spacing[12], gap: spacing[6] },
  coverPitch: { color: onNight, fontSize: 30, lineHeight: 33, fontWeight: "800", letterSpacing: -0.9, maxWidth: 320, fontFamily: displayFamily },
  columnSheet: { backgroundColor: palette.canvas, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, marginTop: -spacing[6], padding: spacing[6], paddingBottom: spacing[10], maxWidth: undefined },
  pitch: { color: onNight, fontSize: 56, lineHeight: 58, fontWeight: "800", letterSpacing: -1.8, maxWidth: 520, fontFamily: displayFamily },
  panel: { flex: 1, backgroundColor: palette.canvas },
  panelWide: { flexGrow: 0, flexShrink: 0, flexBasis: "auto", width: 520 },
  panelContent: { flexGrow: 1 },
  panelContentWide: { alignItems: "center", justifyContent: "center", paddingHorizontal: spacing[4], paddingVertical: spacing[8] },
  column: { width: "100%", maxWidth: FORM_WIDTH, gap: spacing[6] },
  title: { color: palette.text, fontSize: typography.fontSize["2xl"], lineHeight: typography.lineHeight["2xl"], fontWeight: "800", letterSpacing: -1, fontFamily: displayFamily },
  intro: { color: palette.textMuted, fontSize: typography.fontSize.base, lineHeight: typography.lineHeight.base, fontFamily: textFamily },
  form: { gap: spacing[4] },
  label: { color: palette.text, fontSize: typography.fontSize.sm, fontWeight: "700", fontFamily: textFamily },
  inputRow: { flexDirection: "row", alignItems: "stretch" },
  input: { flex: 1, minWidth: 0, minHeight: MIN_TOUCH + 8, borderWidth: 1.5, borderColor: palette.fieldBorder, borderRadius: radius.md, paddingHorizontal: spacing[3], color: palette.text, backgroundColor: palette.surface, fontSize: typography.fontSize.base, fontFamily: textFamily },
  inputWithToggle: { borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  inputError: { borderColor: palette.danger, borderWidth: 2 },
  toggle: { flexShrink: 0, minWidth: MIN_TOUCH * 1.6, minHeight: MIN_TOUCH + 8, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderLeftWidth: 0, borderColor: palette.border, borderTopRightRadius: radius.md, borderBottomRightRadius: radius.md, backgroundColor: palette.surfaceMuted, paddingHorizontal: spacing[3] },
  toggleText: { color: palette.primary, fontWeight: "600", fontSize: typography.fontSize.sm, fontFamily: textFamily },
  hint: { color: palette.textMuted, fontSize: typography.fontSize.sm, lineHeight: typography.lineHeight.sm, fontFamily: textFamily },
  fieldError: { color: palette.danger, fontSize: typography.fontSize.sm, lineHeight: typography.lineHeight.sm, fontFamily: textFamily },
  primary: { minHeight: MIN_TOUCH + 8, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: palette.primary, paddingHorizontal: spacing[4] },
  primaryBusy: { opacity: 0.75 },
  primaryText: { color: palette.onPrimary, fontSize: typography.fontSize.base, fontWeight: "700", fontFamily: textFamily },
  link: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, justifyContent: "center", alignSelf: "flex-start" },
  linkText: { color: palette.primary, fontSize: typography.fontSize.sm, fontWeight: "600", textDecorationLine: "underline", fontFamily: textFamily },
  switchRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing[1] },
  switchLead: { color: palette.textMuted, fontSize: typography.fontSize.sm, fontFamily: textFamily },
  banner: { borderRadius: radius.md, padding: spacing[3], backgroundColor: palette.dangerBg, borderWidth: 1, borderColor: palette.danger },
  bannerOk: { backgroundColor: palette.successBg, borderColor: palette.success },
  bannerText: { color: palette.text, fontSize: typography.fontSize.sm, lineHeight: typography.lineHeight.sm, fontFamily: textFamily },
  languages: { flexDirection: "row", gap: spacing[2], alignItems: "center", flexWrap: "wrap" },
  language: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, paddingHorizontal: spacing[3], justifyContent: "center", borderRadius: radius.md, borderWidth: 1, borderColor: palette.border },
  languageActive: { backgroundColor: palette.primaryMuted, borderColor: palette.primary },
  roleOption: { minHeight: MIN_TOUCH + 12, justifyContent: "center", paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderWidth: 1.5, borderColor: palette.border, borderRadius: radius.md, backgroundColor: palette.surface },
  roleOptionActive: { borderColor: palette.primary, borderWidth: 2, backgroundColor: palette.primaryMuted },
  roleTitle: { color: palette.text, fontSize: typography.fontSize.base, fontWeight: "700", fontFamily: textFamily },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing[6], backgroundColor: palette.canvas, gap: spacing[4] }
  });
}

type AuthStyles = ReturnType<typeof createAuthStyles>;
const sheets: Readonly<Record<ColorTheme, AuthStyles>> = { light: createAuthStyles(colors.light), dark: createAuthStyles(colors.dark) };

/** The auth styles for the active scheme. Call it in the component that draws. */
export function useAuthStyles(): AuthStyles {
  return sheets[useTheme().scheme];
}

/** The same sheet read at render time from the theme store, for screens that still import `authStyles`; new code calls `useAuthStyles()`. */
export const authStyles: AuthStyles = Object.defineProperties({} as AuthStyles, Object.fromEntries(
  (Object.keys(sheets.light) as (keyof AuthStyles)[]).map((key) => [key, { enumerable: true, get: () => sheets[currentScheme()][key] }])
));
export const authFocusRing: object = Object.defineProperties({}, {
  outlineColor: { enumerable: true, get: () => (focusRings[currentScheme()] as Record<string, unknown>).outlineColor },
  outlineWidth: { enumerable: true, get: () => (focusRings[currentScheme()] as Record<string, unknown>).outlineWidth },
  outlineOffset: { enumerable: true, get: () => (focusRings[currentScheme()] as Record<string, unknown>).outlineOffset }
});

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

/** Electric-blue brand panel beside the form on wide screens; a blue cover above the form on narrow ones. */
export function AuthLayout({ title, intro, illustration = "invitation", children }: PropsWithChildren<{ readonly title: string; readonly intro: string; /** Line illustration on the blue panel or cover; decorative. */ readonly illustration?: IllustrationName }>): ReactNode {
  const authStyles = useAuthStyles();
  const t = useT();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;
  const ghost = (size: number, right: number, bottom: number): ReactNode => (
    <View pointerEvents="none" style={{ position: "absolute", right, bottom, opacity: 0.1 }}><Logo variant="mark" tone="white" height={size} decorative /></View>
  );
  return (
    <View style={[authStyles.root, wide && authStyles.rootWide]}>
      {wide ? (
        <View style={authStyles.brand}>
          {ghost(560, -90, -120)}
          <Logo tone="white" height={40} />
          <View style={{ gap: spacing[5] }}>
            <Illustration name={illustration} tone="onDark" size={148} />
            <Text accessibilityElementsHidden aria-hidden style={authStyles.pitch}>{t("auth.brandPitch")}</Text>
            <Text accessibilityElementsHidden aria-hidden style={authStyles.pitchBody}>{t("auth.brandBody")}</Text>
          </View>
          <View />
        </View>
      ) : null}
      <ScrollView role="main" tabIndex={0} style={[authStyles.panel, wide && authStyles.panelWide]} contentContainerStyle={[authStyles.panelContent, wide && authStyles.panelContentWide]} keyboardShouldPersistTaps="handled">
        {wide ? null : (
          <View style={authStyles.cover}>
            {ghost(220, -50, -60)}
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
              <Logo tone="white" height={30} />
              <Illustration name={illustration} tone="onDark" size={76} />
            </View>
            <Text accessibilityElementsHidden aria-hidden style={authStyles.coverPitch}>{t("auth.brandPitch")}</Text>
          </View>
        )}
        <View style={[authStyles.column, !wide && authStyles.columnSheet]}>
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
    <Pressable accessibilityRole="button" accessibilityLabel={busy ? busyLabel : label} aria-busy={busy} aria-disabled={unavailable} disabled={unavailable} onPress={onPress} testID={testID} style={[authStyles.primary, unavailable && authStyles.primaryBusy, focusRing]}>
      <Text style={authStyles.primaryText}>{busy ? busyLabel : label}</Text>
    </Pressable>
  );
}

export function TextLink({ label, onPress }: { readonly label: string; readonly onPress: () => void }): ReactNode {
  const authStyles = useAuthStyles();
  const focusRing = useAuthFocusRing();
  return <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={onPress} style={[authStyles.link, focusRing]}><Text style={authStyles.linkText}>{label}</Text></Pressable>;
}

/** Errors say what happened and how to go on; success draws the check of the D before the words. */
export function Banner({ kind, children }: PropsWithChildren<{ readonly kind: "error" | "success" }>): ReactNode {
  const authStyles = useAuthStyles();
  return (
    <View role={kind === "error" ? "alert" : "status"} style={[authStyles.banner, kind === "success" && authStyles.bannerOk, kind === "success" && { flexDirection: "row", alignItems: "center", gap: spacing[3] }]}>
      {kind === "success" ? <CheckMark size={28} tone="success" /> : null}
      <Text style={[authStyles.bannerText, kind === "success" && { flex: 1 }]}>{children}</Text>
    </View>
  );
}

