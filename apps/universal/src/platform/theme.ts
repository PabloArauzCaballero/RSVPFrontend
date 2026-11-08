import { useEffect, useSyncExternalStore } from "react";
import { colors, type ColorTheme } from "@rsvp/design-tokens";
import { createThemeStore, THEME_PREFERENCES, type Scheme, type ThemePreference } from "./theme-core";
import { themeEnvironment } from "./theme-storage";

export { useTheme, useColors, useThemedStyles, type ColorScheme, type Palette } from "@rsvp/ui";
export { THEME_PREFERENCES, type Scheme, type ThemePreference } from "./theme-core";

/** The one store of the app. Created on import so the web document has the right scheme before React paints. */
export const themeStore = createThemeStore(themeEnvironment);

/** The resolved scheme right now (for style sheets that are chosen at render time). */
export const currentScheme = (): Scheme => themeStore.getScheme();
export const paletteFor = (scheme: ColorTheme): (typeof colors)[ColorTheme] => colors[scheme];

/** The resolved scheme, re-read when the person or the system changes it. */
export function useScheme(): Scheme {
  return useSyncExternalStore(themeStore.subscribe, themeStore.getScheme, themeStore.getScheme);
}

/** The person's choice (system, light or dark), the scheme it resolves to and the way to change it; the choice is remembered. */
export function useThemePreference(): { readonly preference: ThemePreference; readonly scheme: Scheme; readonly setPreference: (preference: ThemePreference) => void; readonly options: readonly ThemePreference[] } {
  const scheme = useScheme();
  const preference = useSyncExternalStore(themeStore.subscribe, themeStore.getPreference, themeStore.getPreference);
  return { preference, scheme, setPreference: themeStore.setPreference, options: THEME_PREFERENCES };
}

/** Loads the stored choice once (native storage is async). */
export function useThemeHydration(): void {
  useEffect(() => { void themeStore.hydrate(); }, []);
}

