import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

// react-native-svg is replaced by DOM elements that keep every prop, so the native files can be inspected without a device.
vi.mock('react-native-svg', () => {
  const tag = (name: string) => ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => {
    const data = Object.fromEntries(Object.entries(props).filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value)).map(([key, value]) => [`data-${key.toLowerCase()}`, String(value)]));
    return <div data-native={name} {...data}>{children}</div>;
  };
  return { default: tag('Svg'), Path: tag('Path'), Defs: tag('Defs'), Pattern: tag('Pattern'), Rect: tag('Rect') };
});

// Metro resolves `./art-svg` to its `.native` file; Vitest does not, so the same resolution is made explicit here.
vi.mock('./art-svg', async () => import('./art-svg.native'));

import { Illustration } from './illustration.native';
import { WeavePattern } from './pattern.native';
import { ArtSvg } from './art-svg.native';
import { ILLUSTRATIONS, ILLUSTRATION_COLORS, ILLUSTRATION_NAMES } from './illustrations';
import { WEAVE_SHAPES } from './brand-art';

afterEach(cleanup);

describe('native identity', () => {
  it.each(ILLUSTRATION_NAMES)('%s: same shapes as the web version, hidden from assistive technology by default', (name) => {
    const { container } = render(<Illustration name={name} tone="onDark" size="sm" />);
    const svg = container.querySelector('[data-native="Svg"]') as HTMLElement;
    expect(svg.getAttribute('data-accessibilityelementshidden')).toBe('true');
    expect(svg.getAttribute('data-width')).toBe('64');
    const paths = [...container.querySelectorAll('[data-native="Path"]')];
    expect(paths).toHaveLength(ILLUSTRATIONS[name].length);
    // The shared source of shapes: the web version draws the very same `d` strings (see identity.test.tsx).
    expect(paths.map((path) => path.getAttribute('data-d'))).toEqual(ILLUSTRATIONS[name].map((shape) => shape.d));
    const allowed = Object.values(ILLUSTRATION_COLORS.onDark);
    for (const path of paths) for (const key of ['data-fill', 'data-stroke'] as const) { const value = path.getAttribute(key); if (value && value !== 'none') expect(allowed).toContain(value); }
  });

  it('gets an accessible name only when asked', () => {
    const { container } = render(<ArtSvg shapes={ILLUSTRATIONS.success} tone="brand" viewWidth={120} viewHeight={120} width={40} height={40} label="Listo" />);
    expect(container.querySelector('[data-native="Svg"]')?.getAttribute('data-accessibilitylabel')).toBe('Listo');
  });

  it('WeavePattern draws the same tile in a Pattern, hidden, with a unique id', () => {
    const { container } = render(<><WeavePattern tone="onBrand" /><WeavePattern tone="onDark" /></>);
    const patterns = [...container.querySelectorAll('[data-native="Pattern"]')];
    expect(patterns).toHaveLength(2);
    expect(new Set(patterns.map((pattern) => pattern.getAttribute('data-id'))).size).toBe(2);
    expect(patterns[0]?.querySelectorAll('[data-native="Path"]')).toHaveLength(WEAVE_SHAPES.length);
    expect(container.querySelector('[data-native="Svg"]')?.getAttribute('data-accessibilityelementshidden')).toBe('true');
  });
});
