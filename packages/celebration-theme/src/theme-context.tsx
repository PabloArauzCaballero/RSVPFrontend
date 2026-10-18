"use client";

import { createContext, useContext, type PropsWithChildren, type ReactNode } from "react";
import { layoutOf, themeFromTemplate } from "./theme.js";
import type { CelebrationTheme, LayoutSpec } from "./types.js";

/** The theme as React context: React Native reads it where the web uses CSS variables (REQ-F09-04). */
export interface ThemeContextValue {
  readonly theme: CelebrationTheme;
  readonly layout: LayoutSpec;
}

const fallback = themeFromTemplate(null, []);
const ThemeContext = createContext<ThemeContextValue>({ theme: fallback, layout: layoutOf(fallback) });

export function CelebrationThemeProvider({ theme, children }: PropsWithChildren<{ readonly theme: CelebrationTheme }>): ReactNode {
  return <ThemeContext.Provider value={{ theme, layout: layoutOf(theme) }}>{children}</ThemeContext.Provider>;
}

export function useCelebrationTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
