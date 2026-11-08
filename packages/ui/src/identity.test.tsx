import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it } from 'vitest';
import { colors, ink, tones } from '@rsvp/design-tokens';
import { AvatarMark, IdentityCatalog, Illustration, ILLUSTRATION_NAMES, UiProvider } from './index';
import { ILLUSTRATIONS, ILLUSTRATION_GROUPS, ILLUSTRATION_PASTEL, ILLUSTRATION_VIEWBOX, illustrationColors, resolveTone, type ResolvedTone } from './illustrations';

afterEach(cleanup);

const TONES: readonly ResolvedTone[] = ['ink', 'onDark'];

describe('illustration set', () => {
  it('has the 8 original and 24 situation illustrations, all grouped, with unique names', () => {
    expect(ILLUSTRATION_NAMES.length).toBeGreaterThanOrEqual(32);
    expect(new Set(ILLUSTRATION_NAMES).size).toBe(ILLUSTRATION_NAMES.length);
    for (const name of ['guestsEmpty', 'firstReply', 'noGifts', 'giftReserved', 'published', 'deadlineClosed', 'linkExpired', 'noAccess', 'searching', 'noOffers', 'offerPublished', 'freeAgenda', 'newClient', 'verifying', 'verified', 'suspended', 'nothingPending', 'importDone', 'serverError', 'maintenance', 'notFound', 'welcomeHost', 'welcomeProvider', 'welcomeGuest']) {
      expect(ILLUSTRATION_NAMES).toContain(name);
      expect(ILLUSTRATION_GROUPS[name as keyof typeof ILLUSTRATION_GROUPS]).toBeTruthy();
    }
  });

  it.each(ILLUSTRATION_NAMES)('%s draws well-formed shapes: one pastel shape, the rest ink, no sparkles', (name) => {
    const shapes = ILLUSTRATIONS[name];
    expect(shapes.length).toBeGreaterThan(2);
    expect(shapes.filter((shape) => shape.layer === 'soft').length).toBe(1);
    expect(shapes.some((shape) => shape.layer === 'spark')).toBe(false);
    for (const shape of shapes) {
      expect(shape.d).not.toMatch(/NaN|undefined|Infinity/);
      const numbers = (shape.d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
      expect(numbers.every((value) => Number.isFinite(value))).toBe(true);
    }
    // Drawn inside the grid (arc radii and flags are small; this guards against a mis-scaled shape).
    const absolute = shapes.flatMap((shape) => (shape.d.match(/[ML]\s?-?\d+(\.\d+)?\s-?\d+(\.\d+)?/g) ?? []).map((pair) => pair.slice(1).trim().split(/\s/).map(Number)));
    for (const [x, y] of absolute) { expect(x).toBeGreaterThanOrEqual(-4); expect(x).toBeLessThanOrEqual(ILLUSTRATION_VIEWBOX + 4); expect(y).toBeGreaterThanOrEqual(-4); expect(y).toBeLessThanOrEqual(ILLUSTRATION_VIEWBOX + 4); }
  });

  it.each(ILLUSTRATION_NAMES)('%s is decorative by default in every tone and uses only ink plus its group pastel', (name) => {
    for (const tone of TONES) {
      const { container, unmount } = render(<Illustration name={name} tone={tone} size="sm" />);
      const svg = container.querySelector('svg') as SVGElement;
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('data-illustration')).toBe(name);
      const allowed = Object.values(illustrationColors(tone, ILLUSTRATION_PASTEL[ILLUSTRATION_GROUPS[name]]));
      const used = [...svg.querySelectorAll('path')].flatMap((path) => [path.getAttribute('stroke'), path.getAttribute('fill')]).filter((value) => value && value !== 'none');
      expect(used.length).toBeGreaterThan(0);
      for (const colour of used) expect(allowed).toContain(colour);
      unmount();
    }
  });

  it('gives a name only when asked, `auto` follows the colour scheme and `pastel` overrides the group hue', () => {
    const { container } = render(<><UiProvider scheme="dark"><Illustration name="verified" size={40} /></UiProvider><UiProvider scheme="light"><Illustration name="verified" size={41} /></UiProvider><Illustration name="verified" label="Verificado" /><Illustration name="verified" pastel="red" size={42} /></>);
    expect(container.querySelector(`svg[width="40"] path[stroke="${colors.dark.text}"]`)).toBeTruthy();
    expect(container.querySelector(`svg[width="41"] path[stroke="${ink}"]`)).toBeTruthy();
    expect(container.querySelector(`svg[width="42"] path[fill="${tones.light.red.bg}"]`)).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Verificado' })).toBeTruthy();
    expect(resolveTone('auto', 'dark')).toBe('onDark');
    expect(resolveTone('ink', 'dark')).toBe('ink');
  });

  it('keeps every tone palette on the kit: ink or the light ink, a pastel from `tones`, and the ground for the knocked-out tick', () => {
    for (const tone of TONES) {
      const palette = illustrationColors(tone, 'blue');
      expect(palette.line).toBe(tone === 'ink' ? ink : colors.dark.text);
      expect(palette.soft).toBe((tone === 'ink' ? tones.light : tones.dark).blue.bg);
      expect(palette.accent).toBe(palette.line);
      expect(palette.knock).toBe(tone === 'ink' ? colors.light.canvas : colors.dark.canvas);
    }
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
