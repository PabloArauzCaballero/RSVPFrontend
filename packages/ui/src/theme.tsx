import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { colors, radius, spacing, typography, type ColorTheme } from '@rsvp/design-tokens';
import { defaultStrings, type UiStrings } from './strings';

export type Palette = (typeof colors)[ColorTheme];

export function createStyles(palette: Palette) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: palette.canvas, padding: spacing[4], gap: spacing[4] },
    title: { color: palette.text, fontSize: typography.fontSize.xl, lineHeight: typography.lineHeight.xl, fontWeight: '800', letterSpacing: -0.5 },
    body: { color: palette.textMuted, fontSize: typography.fontSize.base, lineHeight: typography.lineHeight.base },
    label: { color: palette.text, fontSize: typography.fontSize.sm, fontWeight: '700', marginBottom: spacing[1] },
    help: { color: palette.danger, fontSize: typography.fontSize.sm, marginTop: spacing[1] },
    button: { minHeight: 52, minWidth: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, paddingHorizontal: spacing[5], backgroundColor: palette.primary },
    buttonSecondary: { backgroundColor: palette.primaryMuted },
    buttonGhost: { backgroundColor: palette.surface, borderWidth: 1.5, borderColor: palette.fieldBorder },
    buttonDanger: { backgroundColor: palette.danger },
    buttonDisabled: { opacity: 0.55 },
    buttonText: { color: palette.onPrimary, fontSize: typography.fontSize.base, fontWeight: '700' },
    buttonTextSecondary: { color: palette.text },
    buttonTextDanger: { color: palette.onDanger },
    input: { minHeight: 52, borderWidth: 1.5, borderColor: palette.fieldBorder, borderRadius: radius.md, paddingHorizontal: spacing[4], color: palette.text, backgroundColor: palette.surface, fontSize: typography.fontSize.base },
    inputError: { borderColor: palette.danger, borderWidth: 2 },
    card: { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing[5], gap: spacing[2] },
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: palette.scrim },
    sheet: { backgroundColor: palette.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing[5], gap: spacing[3], width: '100%', maxWidth: 640, alignSelf: 'center' },
    modal: { margin: spacing[4], marginTop: 'auto', marginBottom: 'auto', backgroundColor: palette.surface, borderRadius: radius.lg, padding: spacing[5], gap: spacing[3], maxWidth: 520, alignSelf: 'center', width: '90%' },
    toast: { backgroundColor: palette.text, borderRadius: radius.md, padding: spacing[3], minHeight: 44, justifyContent: 'center' },
    toastSuccess: { backgroundColor: palette.success },
    toastError: { backgroundColor: palette.danger },
    toastText: { color: palette.surface },
    toastTextOnTone: { color: palette.onPrimary },
    tableHead: { flexDirection: 'row', backgroundColor: palette.surfaceMuted, borderRadius: radius.md },
    tableRow: { flexDirection: 'row', borderTopWidth: 1, borderColor: palette.border },
    cell: { flex: 1, padding: spacing[3], color: palette.text, fontSize: typography.fontSize.sm },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], minHeight: 44 },
    checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: palette.primary, alignItems: 'center', justifyContent: 'center' },
    selected: { backgroundColor: palette.primary },
    picker: { borderWidth: 1.5, borderColor: palette.fieldBorder, borderRadius: radius.md, overflow: 'hidden' },
    option: { padding: spacing[3], minHeight: 44, justifyContent: 'center' },
    optionSelected: { backgroundColor: palette.primaryMuted }
  });
}

export type Styles = ReturnType<typeof createStyles>;
export type ColorScheme = 'light' | 'dark';

interface ThemeValue { scheme: ColorScheme; palette: Palette; styles: Styles; strings: UiStrings }
const cache: Record<ColorScheme, Styles | undefined> = { light: undefined, dark: undefined };
const stylesFor = (scheme: ColorScheme): Styles => (cache[scheme] ??= createStyles(colors[scheme]));
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
