import type { CSSProperties, ReactNode } from "react";

export const layoutIds = ["classic", "minimal", "editorial", "festive", "corporate"] as const;
export type LayoutId = (typeof layoutIds)[number];
export type CelebrationSection = "story" | "schedule" | "venues" | "gallery" | "dressCode" | "faq" | "recommendations";

export interface CelebrationTheme {
  id: string;
  name: string;
  layout: LayoutId;
  eventTypes: readonly string[];
  colors: { canvas: string; surface: string; text: string; accent: string };
  fontFamily: string;
  sectionOrder: readonly CelebrationSection[];
  enabledSections: readonly CelebrationSection[];
}

export function supportsEventType(theme: CelebrationTheme, eventType: string): boolean {
  return theme.eventTypes.includes(eventType);
}

export function compatibleThemes(themes: readonly CelebrationTheme[], eventType: string): CelebrationTheme[] {
  return themes.filter((theme) => supportsEventType(theme, eventType));
}

export function themeStyle(theme: CelebrationTheme): CSSProperties {
  return {
    "--celebration-canvas": theme.colors.canvas,
    "--celebration-surface": theme.colors.surface,
    "--celebration-text": theme.colors.text,
    "--celebration-accent": theme.colors.accent,
    fontFamily: theme.fontFamily,
    background: "var(--celebration-canvas)",
    color: "var(--celebration-text)"
  } as CSSProperties;
}

export function CelebrationRenderer({ theme, sections }: { theme: CelebrationTheme; sections: Partial<Record<CelebrationSection, ReactNode>> }) {
  return <article data-layout={theme.layout} style={themeStyle(theme)}>
    {theme.sectionOrder.filter((section) => theme.enabledSections.includes(section)).map((section) => sections[section] ? <section key={section} data-section={section}>{sections[section]}</section> : null)}
  </article>;
}
