import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { brand, colors } from '@rsvp/design-tokens';
import { AvatarMark, BrandBand, HeroArt, IdentityCatalog, Illustration, ILLUSTRATION_NAMES, MomentBackdrop, UiProvider, WeavePattern } from './index';
import { HERO_ART, MOMENT_ART, WEAVE_OPACITY, WEAVE_SHAPES, stepDiamond } from './brand-art';
import { ILLUSTRATIONS, ILLUSTRATION_COLORS, ILLUSTRATION_GROUPS, ILLUSTRATION_VIEWBOX, resolveTone, type ResolvedTone } from './illustrations';

afterEach(cleanup);

const TONES: readonly ResolvedTone[] = ['brand', 'night', 'onDark', 'onBrand'];
const channel = (value: number): number => { const c = value / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
const luminance = (hex: string): number => { const [r, g, b] = rgb(hex); return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b); };
const contrast = (a: string, b: string): number => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]; return (hi + 0.05) / (lo + 0.05); };
/** The ground with the hairline fully covering it: the worst case for text laid over the weave. */
const blend = (ground: string, ink: string, opacity: number): string => `#${rgb(ground).map((g, i) => Math.round(g + (rgb(ink)[i]! - g) * opacity).toString(16).padStart(2, '0')).join('')}`;

describe('illustration set', () => {
  it('has the 8 original and 24 situation illustrations, all grouped, with unique names', () => {
    expect(ILLUSTRATION_NAMES.length).toBeGreaterThanOrEqual(32);
    expect(new Set(ILLUSTRATION_NAMES).size).toBe(ILLUSTRATION_NAMES.length);
    for (const name of ['guestsEmpty', 'firstReply', 'noGifts', 'giftReserved', 'published', 'deadlineClosed', 'linkExpired', 'noAccess', 'searching', 'noOffers', 'offerPublished', 'freeAgenda', 'newClient', 'verifying', 'verified', 'suspended', 'nothingPending', 'importDone', 'serverError', 'maintenance', 'notFound', 'welcomeHost', 'welcomeProvider', 'welcomeGuest']) {
      expect(ILLUSTRATION_NAMES).toContain(name);
      expect(ILLUSTRATION_GROUPS[name as keyof typeof ILLUSTRATION_GROUPS]).toBeTruthy();
    }
  });

  it.each(ILLUSTRATION_NAMES)('%s draws well-formed shapes, always with an amber detail and never a bare colour', (name) => {
    const shapes = ILLUSTRATIONS[name];
    expect(shapes.length).toBeGreaterThan(2);
    expect(shapes.some((shape) => shape.layer === 'accent' || shape.layer === 'accentFill')).toBe(true);
    for (const shape of shapes) {
      expect(shape.d).not.toMatch(/NaN|undefined|Infinity/);
      const numbers = (shape.d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
      expect(numbers.every((value) => Number.isFinite(value))).toBe(true);
    }
    // Drawn inside the grid (arc radii and flags are small; this guards against a mis-scaled shape).
    const absolute = shapes.flatMap((shape) => (shape.d.match(/[ML]\s?-?\d+(\.\d+)?\s-?\d+(\.\d+)?/g) ?? []).map((pair) => pair.slice(1).trim().split(/\s/).map(Number)));
    for (const [x, y] of absolute) { expect(x).toBeGreaterThanOrEqual(-4); expect(x).toBeLessThanOrEqual(ILLUSTRATION_VIEWBOX + 4); expect(y).toBeGreaterThanOrEqual(-4); expect(y).toBeLessThanOrEqual(ILLUSTRATION_VIEWBOX + 4); }
  });

  it.each(ILLUSTRATION_NAMES)('%s is decorative by default in every tone and uses only the tone colours', (name) => {
    for (const tone of TONES) {
      const { container, unmount } = render(<Illustration name={name} tone={tone} size="sm" />);
      const svg = container.querySelector('svg') as SVGElement;
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('data-illustration')).toBe(name);
      const allowed = Object.values(ILLUSTRATION_COLORS[tone]);
      const used = [...svg.querySelectorAll('path')].flatMap((path) => [path.getAttribute('stroke'), path.getAttribute('fill')]).filter((value) => value && value !== 'none');
      expect(used.length).toBeGreaterThan(0);
      for (const colour of used) expect(allowed).toContain(colour);
      unmount();
    }
  });

  it('gives a name only when asked, and `auto` follows the colour scheme', () => {
    const { container } = render(<><UiProvider scheme="dark"><Illustration name="verified" tone="auto" size={40} /></UiProvider><UiProvider scheme="light"><Illustration name="verified" tone="auto" size={41} /></UiProvider><Illustration name="verified" label="Verificado" /></>);
    expect(container.querySelector('svg[width="40"] path[fill="#8FA6FF"]')).toBeTruthy();
    expect(container.querySelector('svg[width="41"] path[fill="#1F3BFF"]')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Verificado' })).toBeTruthy();
    expect(resolveTone('auto', 'dark')).toBe('onDark');
    expect(resolveTone('onBrand', 'dark')).toBe('onBrand');
  });

  it('keeps every tone palette inside the brand: amber only as accent, nothing else off the kit', () => {
    const kit = new Set<string>([...Object.values(brand), '#FFFFFF', colors.dark.surfaceMuted]);
    for (const tone of TONES) {
      const palette = ILLUSTRATION_COLORS[tone];
      for (const value of Object.values(palette)) expect(kit.has(value)).toBe(true);
      expect(palette.accent).toBe(brand.ambar);
      expect(palette.accentFill).toBe(brand.ambar);
    }
  });
});

describe('weave pattern and brand art', () => {
  it('weave is a hairline tile of stepped rhombi that closes on itself', () => {
    expect(stepDiamond(24, 24, 3, 3).startsWith('M24 15')).toBe(true);
    expect(stepDiamond(24, 24, 3, 3).endsWith('Z')).toBe(true);
    for (const shape of WEAVE_SHAPES) expect(shape.w === undefined || shape.w <= 1.5).toBe(true);
  });

  it('WeavePattern is a hidden, pointer-less SVG pattern with a unique id per instance, no raster and no filters', () => {
    const { container } = render(<><div><WeavePattern tone="onDark" /></div><div><WeavePattern tone="onBrand" /></div></>);
    const svgs = [...container.querySelectorAll('svg')];
    expect(svgs).toHaveLength(2);
    for (const svg of svgs) { expect(svg.getAttribute('aria-hidden')).toBe('true'); expect(svg.querySelector('pattern')).toBeTruthy(); }
    const ids = [...container.querySelectorAll('pattern')].map((pattern) => pattern.id);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) expect(id).toMatch(/^weave-[a-zA-Z0-9]+$/);
    expect(container.querySelector('filter, image, img, feGaussianBlur')).toBeNull();
  });

  it('text over the weave keeps AA (worst case: the hairline covers the whole ground)', () => {
    const cases: [ResolvedTone, string, string][] = [['brand', '#FFFFFF', '#0A1033'], ['brand', '#F6F7FB', '#0A1033'], ['night', '#FFFFFF', '#0A1033'], ['onDark', brand.noche, '#FFFFFF'], ['onDark', colors.dark.canvas, '#FFFFFF'], ['onDark', colors.dark.surface, '#FFFFFF'], ['onBrand', '#1F3BFF', '#FFFFFF']];
    for (const [tone, ground, text] of cases) {
      const worst = blend(ground, ILLUSTRATION_COLORS[tone].line, WEAVE_OPACITY[tone]);
      expect(contrast(worst, text), `${tone} on ${ground}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each([...Object.keys(HERO_ART), ...Object.keys(MOMENT_ART)])('composition %s only uses layers of the tone and thin strokes', (key) => {
    const art = (HERO_ART as Record<string, { shapes: readonly { layer: string; w?: number; o?: number }[] }>)[key] ?? (MOMENT_ART as Record<string, { shapes: readonly { layer: string; w?: number; o?: number }[] }>)[key]!;
    expect(art.shapes.length).toBeGreaterThan(3);
    for (const shape of art.shapes) { expect(['soft', 'line', 'solid', 'knock', 'knockFill', 'accent', 'accentFill']).toContain(shape.layer); expect(shape.w ?? 3).toBeLessThanOrEqual(6); expect(shape.o ?? 1).toBeGreaterThan(0); }
  });

  it('HeroArt, MomentBackdrop and BrandBand art are decorative and light (inline SVG, no raster, no filter)', () => {
    const { container } = render(<><HeroArt variant="cover" /><HeroArt variant="auth" tone="onDark" /><HeroArt variant="ready" tone="auto" /><MomentBackdrop variant="confirmed" /><MomentBackdrop variant="published" tone="onBrand" /><BrandBand><p>Listo para vender</p></BrandBand></>);
    const svgs = [...container.querySelectorAll('svg')];
    expect(svgs).toHaveLength(6);
    for (const svg of svgs) expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('filter, image, img, feGaussianBlur, feDropShadow')).toBeNull();
    expect(screen.getByText('Listo para vender')).toBeTruthy();
  });

  it('BrandBand keeps its art only when the band is wide enough for the text to keep its room', () => {
    const wide = vi.spyOn(document.documentElement, 'clientWidth', 'get');
    try {
      wide.mockReturnValue(1000);
      window.dispatchEvent(new Event('resize'));
      const { container, unmount } = render(<BrandBand art="ready"><p>Texto</p></BrandBand>);
      expect(container.querySelector('[data-illustration="hero-ready"]')).toBeTruthy();
      unmount();
      wide.mockReturnValue(400);
      window.dispatchEvent(new Event('resize'));
      const narrow = render(<BrandBand art="ready"><p>Texto</p></BrandBand>);
      expect(narrow.container.querySelector('[data-illustration="hero-ready"]')).toBeNull();
      expect(screen.getByText('Texto')).toBeTruthy();
    } finally { wide.mockRestore(); }
  });
});

describe('AvatarMark', () => {
  it('is decorative, takes the shape of the D (0.86 : 1) and keeps the same ground for the same name', () => {
    const { container } = render(<><AvatarMark name="Flores y Eventos Sol" size={50} /><AvatarMark name="Flores y Eventos Sol" size={50} /></>);
    expect(screen.getAllByText('FE')).toHaveLength(2);
    const [first, second] = [...container.querySelectorAll('[aria-hidden="true"]')] as HTMLElement[];
    expect(first?.style.backgroundColor).toBe(second?.style.backgroundColor);
    expect(first?.style.width).toBe('43px');
    expect(first?.style.height).toBe('50px');
  });

  it('adapts its ground to the scheme and never leaves a blank mark', () => {
    const { container } = render(<><UiProvider scheme="light"><AvatarMark name="Ana" /></UiProvider><UiProvider scheme="dark"><AvatarMark name="Ana" /></UiProvider></>);
    const [light, dark] = [...container.querySelectorAll('[aria-hidden="true"]')] as HTMLElement[];
    expect(light?.style.backgroundColor).not.toBe(dark?.style.backgroundColor);
    expect(screen.getAllByText('A')).toHaveLength(2);
  });
});

describe('IdentityCatalog', () => {
  it('shows every illustration in light and dark, in both languages, with no axe violations', async () => {
    const { container, rerender } = render(<IdentityCatalog />);
    expect(container.querySelectorAll('[data-illustration]').length).toBeGreaterThanOrEqual(ILLUSTRATION_NAMES.length * 2);
    for (const name of ILLUSTRATION_NAMES) expect(container.querySelectorAll(`[data-illustration="${name}"]`).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('heading', { level: 1, name: 'Identidad visual de DOne' })).toBeTruthy();
    const { violations } = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(violations.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
    rerender(<IdentityCatalog locale="en-US" />);
    expect(screen.getByRole('heading', { level: 1, name: 'DOne visual identity' })).toBeTruthy();
  }, 60_000);
});
