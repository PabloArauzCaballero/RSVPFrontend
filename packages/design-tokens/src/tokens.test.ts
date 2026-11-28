import { describe, expect, it } from 'vitest';
import { colors, motion, radius, spacing, typography } from './index';

describe('design tokens', () => {
  it('keeps complete light and dark semantic palettes', () => {
    expect(Object.keys(colors.light)).toEqual(Object.keys(colors.dark));
    expect(colors.light.primary).not.toBe(colors.dark.primary);
    expect(colors.light.canvas).toBe('#FFFFFF');
  });
  it('exposes the required token scales', () => {
    expect(spacing[4]).toBe(16);
    expect(radius.lg).toBe(12);
    expect(typography.fontSize.base).toBe(16);
  });
  it('keeps motion bounded: nothing a guest waits on lasts more than two and a half seconds, and the curves are CSS timing functions', () => {
    for (const ms of Object.values(motion.duration)) expect(ms).toBeGreaterThan(0);
    expect(Math.max(...Object.values(motion.duration))).toBeLessThanOrEqual(2500);
    for (const curve of Object.values(motion.easing)) expect(curve).toMatch(/^cubic-bezier\(/);
  });
});
