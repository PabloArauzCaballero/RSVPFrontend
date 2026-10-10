import { describe, expect, it } from 'vitest';
import { colors, radius, spacing, typography } from './index';

describe('design tokens', () => {
  it('keeps complete light and dark semantic palettes', () => {
    expect(Object.keys(colors.light)).toEqual(Object.keys(colors.dark));
    expect(colors.light.primary).not.toBe(colors.dark.primary);
  });
  it('exposes the required token scales', () => {
    expect(spacing[4]).toBe(16);
    expect(radius.lg).toBe(12);
    expect(typography.fontSize.base).toBe(16);
  });
});
