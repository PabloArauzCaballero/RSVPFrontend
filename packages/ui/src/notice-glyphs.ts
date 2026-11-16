// Shared by notice-mark.tsx (web) and notice-mark.native.tsx; see motion-tokens.ts for why native files must not import './notice-mark'.
export type NoticeMarkTone = 'error' | 'info';
export interface NoticeMarkProps { tone?: NoticeMarkTone; size?: number }

/** The glyph of each tone, in the 48-unit box of the D's check: a stem and a dot (`!` for an error, `i` for information), same stroke and round caps. */
export const NOTICE_GLYPHS: Record<NoticeMarkTone, { stem: string; dot: readonly [number, number] }> = {
  error: { stem: 'M24 14 V27', dot: [24, 34] },
  info: { stem: 'M24 21 V34', dot: [24, 14] }
};
