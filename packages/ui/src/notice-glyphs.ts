/*
 * What the web (`notice-mark.tsx`) and native (`notice-mark.native.tsx`) notice icons share, in a file without a platform
 * variant: importing it from './notice-mark' inside the native file resolved to the native file itself on iOS/Android.
 */
export type NoticeMarkTone = 'error' | 'info';
export interface NoticeMarkProps { tone?: NoticeMarkTone; size?: number }

/** The glyph of each tone, in the 48-unit box of the D's check: a stem and a dot (`!` for an error, `i` for information), same stroke and round caps. */
export const NOTICE_GLYPHS: Record<NoticeMarkTone, { stem: string; dot: readonly [number, number] }> = {
  error: { stem: 'M24 14 V27', dot: [24, 34] },
  info: { stem: 'M24 21 V34', dot: [24, 14] }
};
