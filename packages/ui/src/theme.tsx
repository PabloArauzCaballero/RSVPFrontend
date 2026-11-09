import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { colors, radius, shadow, spacing, tones, typography, type ColorTheme } from '@rsvp/design-tokens';
import { fonts } from './fonts';
import { defaultStrings, type UiStrings } from './strings';

export type Palette = (typeof colors)[ColorTheme];
export type ColorScheme = 'light' | 'dark';
export type Tones = (typeof tones)[ColorTheme];

/** Letter-spacing in px from an `em` value, because native needs numbers. */
export const tracking = (size: number, em: number): number => Math.round(size * em * 100) / 100;

export function createStyles(palette: Palette, scheme: ColorScheme = palette === colors.dark ? 'dark' : 'light') {
  const tone = tones[scheme];
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: palette.canvas, padding: spacing[4], gap: spacing[4] },
    title: { color: palette.text, fontFamily: fonts.display, fontSize: typography.fontSize.xl, lineHeight: 26, fontWeight: '500', letterSpacing: tracking(typography.fontSize.xl, -0.02) },
    body: { color: palette.textMuted, fontFamily: fonts.sans, fontSize: typography.fontSize.base, lineHeight: typography.lineHeight.base },
    /** Small uppercase label: field labels, table heads. */
    label: { color: palette.text, fontFamily: fonts.sans, fontSize: typography.fontSize.xs, lineHeight: typography.lineHeight.xs, fontWeight: '600', letterSpacing: tracking(typography.fontSize.xs, 0.05), textTransform: 'uppercase', marginBottom: spacing[2] },
    help: { color: palette.danger, fontFamily: fonts.sans, fontSize: typography.fontSize.sm, lineHeight: typography.lineHeight.sm, marginTop: spacing[1] },
    button: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.control, borderWidth: 1, borderColor: palette.primary, paddingHorizontal: spacing[5], backgroundColor: palette.primary },
    buttonSecondary: { backgroundColor: 'transparent', borderColor: palette.fieldBorder },
    buttonGhost: { backgroundColor: 'transparent', borderColor: 'transparent', paddingHorizontal: spacing[2] },
    buttonDanger: { backgroundColor: tone.red.bg, borderColor: palette.danger },
    buttonDisabled: { opacity: 0.5 },
    buttonText: { color: palette.onPrimary, fontFamily: fonts.sans, fontSize: 15, lineHeight: 20, fontWeight: '600', letterSpacing: tracking(15, -0.01) },
    buttonTextSecondary: { color: palette.text },
    buttonTextGhost: { color: palette.text, textDecorationLine: 'underline' },
    buttonTextDanger: { color: palette.danger },
    input: { minHeight: 48, borderWidth: 1, borderColor: palette.fieldBorder, borderRadius: radius.button, paddingHorizontal: spacing[4], color: palette.text, backgroundColor: palette.surface, fontFamily: fonts.sans, fontSize: typography.fontSize.base },
    inputError: { borderColor: palette.danger },
    card: { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing[6], gap: spacing[2] },
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: palette.scrim },
    sheet: { backgroundColor: palette.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderWidth: 1, borderColor: palette.border, padding: spacing[6], gap: spacing[3], width: '100%', maxWidth: 640, alignSelf: 'center' },
    modal: { margin: spacing[4], marginTop: 'auto', marginBottom: 'auto', backgroundColor: palette.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: palette.border, boxShadow: shadow.lg, padding: spacing[6], gap: spacing[3], maxWidth: 520, alignSelf: 'center', width: '90%' },
    toast: { backgroundColor: palette.text, borderRadius: radius.md, paddingHorizontal: spacing[4], paddingVertical: spacing[3], minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: palette.text },
    toastSuccess: { backgroundColor: tone.green.bg, borderColor: palette.success },
    toastError: { backgroundColor: tone.red.bg, borderColor: palette.danger },
    toastText: { color: palette.canvas, fontFamily: fonts.sans, fontSize: typography.fontSize.sm, lineHeight: typography.lineHeight.sm, fontWeight: '500' },
    toastTextSuccess: { color: tone.green.fg, fontFamily: fonts.sans, fontSize: typography.fontSize.sm, lineHeight: typography.lineHeight.sm, fontWeight: '500' },
    toastTextError: { color: tone.red.fg, fontFamily: fonts.sans, fontSize: typography.fontSize.sm, lineHeight: typography.lineHeight.sm, fontWeight: '500' },
    tableHead: { flexDirection: 'row', backgroundColor: palette.surfaceMuted, borderRadius: radius.md },
    tableRow: { flexDirection: 'row', borderTopWidth: 1, borderColor: palette.border },
    cell: { flex: 1, padding: spacing[3], color: palette.text, fontFamily: fonts.sans, fontSize: typography.fontSize.sm },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], minHeight: 44 },
    checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 1, borderColor: palette.fieldBorder, backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center' },
    selected: { backgroundColor: palette.primary, borderColor: palette.primary },
    picker: { borderWidth: 1, borderColor: palette.fieldBorder, borderRadius: radius.button, overflow: 'hidden' },
    option: { padding: spacing[3], minHeight: 44, justifyContent: 'center' },
    optionSelected: { backgroundColor: palette.surfaceMuted }
  });
}

export type Styles = ReturnType<typeof createStyles>;

interface ThemeValue { scheme: ColorScheme; palette: Palette; styles: Styles; strings: UiStrings }
const cache: Record<ColorScheme, Styles | undefined> = { light: undefined, dark: undefined };
const stylesFor = (scheme: ColorScheme): Styles => (cache[scheme] ??= createStyles(colors[scheme], scheme));
const build = (scheme: ColorScheme, strings: UiStrings): ThemeValue => ({ scheme, palette: colors[scheme], styles: stylesFor(scheme), strings });

const ThemeContext = createContext<{ scheme?: ColorScheme; strings: UiStrings }>({ strings: defaultStrings });

/** Forces a scheme (e.g. a user preference) and supplies localized copy. Without it, the system scheme applies. */
export function UiProvider({ scheme, strings, children }: PropsWithChildren<{ scheme?: ColorScheme; strings?: Partial<UiStrings> }>) {
  const value = useMemo(() => ({ scheme, strings: { ...defaultStrings, ...strings } }), [scheme, strings]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Same tokens in both schemes: primitives never branch on the scheme, only the palette changes. */
export function useTheme(): ThemeValue {
  const system = useColorScheme();
  const { scheme, strings } = useContext(ThemeContext);
  const resolved: ColorScheme = scheme ?? (system === 'dark' ? 'dark' : 'light');
  return useMemo(() => build(resolved, strings), [resolved, strings]);
}

/** The active palette: the shortest way for a component to read a colour token. */
export function useColors(): Palette {
  return useTheme().palette;
}

/** The pastel pairs (`bg` + readable `fg`) of the active scheme: tags, status, icon grounds, illustration shapes. The only place hue appears. */
export function useTones(): Tones {
  return tones[useTheme().scheme];
}

const sheets = new WeakMap<object, Partial<Record<ColorScheme, unknown>>>();

/**
 * Style sheet derived from the active palette, built once per scheme and shared by every component that uses the same
 * `factory` (declare it at module level). Never create a `StyleSheet` at module level from a palette: it would freeze one scheme.
 */
export function useThemedStyles<TStyles>(factory: (palette: Palette, scheme: ColorScheme) => TStyles): TStyles {
  const { scheme, palette } = useTheme();
  const perScheme = sheets.get(factory) ?? {};
  sheets.set(factory, perScheme);
  return (perScheme[scheme] ??= factory(palette, scheme)) as TStyles;
}
