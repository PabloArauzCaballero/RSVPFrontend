export const spacing = { 0: 0, px: 1, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64, 20: 80, 24: 96 } as const;
/** Crisp corners (minimalist-ui): buttons 4-6, cards 8-12. `full` is only for small status tags and avatars, never for large containers. */
export const radius = { none: 0, sm: 4, button: 6, md: 8, lg: 12, xl: 12, full: 9999 } as const;
/** Shadows are practically absent: a 1px border does the separating. `md`/`lg` are ultra-diffuse hover and overlay lifts (< 0.06). */
export const shadow = { sm: '0 0 0 rgb(0 0 0 / 0)', md: '0 2px 8px rgb(0 0 0 / 0.04)', lg: '0 8px 24px rgb(0 0 0 / 0.06)' } as const;
