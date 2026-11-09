export const spacing = { 0: 0, px: 1, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64, 20: 80, 24: 96 } as const;
/** Crisp corners (minimalist-ui): buttons 4-6, cards 8-12. `full` is only for small status tags and avatars, never for large containers. */
export const radius = { none: 0, sm: 4, button: 6, control: 10, md: 8, lg: 12, xl: 12, full: 9999 } as const;

/** Depth like a material, not a drop shadow: a contact line plus a long, soft ambient layer. Light mode only for resting surfaces; dark mode separates with a border and a lighter surface (see `depth` in @rsvp/ui). */
export const shadow = {
  sm: '0 1px 2px rgb(0 0 0 / 0.04)',
  md: '0 1px 2px rgb(0 0 0 / 0.04), 0 12px 32px -18px rgb(0 0 0 / 0.14)',
  lg: '0 2px 4px rgb(0 0 0 / 0.05), 0 28px 64px -20px rgb(0 0 0 / 0.28)'
} as const;
