import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it } from 'vitest';
import { colors, ink, shadow, tones } from '@rsvp/design-tokens';
import { Avatar, AvatarMark, Button, Celebrate, CheckMark, Checkbox, Chip, EmptyState, Input, Logo, Select, SwitchRow, Toast, UiProvider, fonts, useTones } from './index';
import { LOGO_TONES } from './logo';
import { createStyles } from './theme';

afterEach(cleanup);

const channel = (value: number): number => { const c = value / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const luminance = (hex: string): number => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]; return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b); };
const contrast = (a: string, b: string): number => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]; return (hi + 0.05) / (lo + 0.05); };

describe('fonts', () => {
  it('exposes the three stacks of the system, web names first with a safe fallback', () => {
    expect(fonts.sans).toMatch(/^'Geist',.*sans-serif$/);
    expect(fonts.display).toMatch(/^'Geist',.*sans-serif$/);
    expect(fonts.mono).toMatch(/^'Geist Mono',.*monospace$/);
    for (const stack of [fonts.sans, fonts.display, fonts.mono]) expect(stack).not.toMatch(/Inter|Roboto|Open Sans|Jakarta/);
  });
});

describe('Logo and CheckMark', () => {
  it('draws mark and word in one ink colour, light ink on dark, and `auto` follows the scheme', () => {
    expect(LOGO_TONES.ink).toEqual({ mark: ink, word: ink });
    expect(LOGO_TONES.onDark).toEqual({ mark: colors.dark.text, word: colors.dark.text });
    const { container } = render(<><UiProvider scheme="light"><Logo label="Claro" /></UiProvider><UiProvider scheme="dark"><Logo label="Oscuro" /></UiProvider><Logo tone="ink" label="Forzado" /></>);
    const fills = (name: string): (string | null)[] => [...screen.getByRole('img', { name }).querySelectorAll('path')].map((path) => path.getAttribute('fill'));
    expect(fills('Claro')).toEqual([ink, ink]);
    expect(fills('Oscuro')).toEqual([colors.dark.text, colors.dark.text]);
    expect(fills('Forzado')).toEqual([ink, ink]);
    expect(container.querySelectorAll('svg')).toHaveLength(3);
  });

  it('CheckMark is an ink tick on a pastel green disc (and green on green for `success`), per scheme', () => {
    const { container } = render(<><UiProvider scheme="light"><CheckMark play={false} /></UiProvider><UiProvider scheme="dark"><CheckMark play={false} tone="success" /></UiProvider><CheckMark play={false} ground={false} /></>);
    const [light, dark, bare] = [...container.querySelectorAll('svg')] as SVGElement[];
    expect(light?.querySelector('circle')?.getAttribute('fill')).toBe(tones.light.green.bg);
    expect(light?.querySelector('path')?.getAttribute('stroke')).toBe(colors.light.text);
    expect(dark?.querySelector('circle')?.getAttribute('fill')).toBe(tones.dark.green.bg);
    expect(dark?.querySelector('path')?.getAttribute('stroke')).toBe(tones.dark.green.fg);
    expect(bare?.querySelector('circle')).toBeNull();
  });
});

describe('pairs composed by the primitives', () => {
  it.each(['light', 'dark'] as const)('keep AA in %s: tone text on its pastel, danger button, toasts, labels and the primary button', (scheme) => {
    const palette = colors[scheme];
    const pairs: [string, string][] = [
      [palette.onPrimary, palette.primary], [palette.text, palette.canvas], [palette.text, palette.surface], [palette.textMuted, palette.surface], [palette.canvas, palette.text],
      [palette.danger, tones[scheme].red.bg], [tones[scheme].red.fg, tones[scheme].red.bg], [tones[scheme].green.fg, tones[scheme].green.bg], [palette.text, tones[scheme].green.bg]
    ];
    for (const [fg, bg] of pairs) expect(contrast(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    // Component outlines (inputs, secondary button, switch) reach 3:1 against the surface they sit on.
    expect(contrast(palette.fieldBorder, palette.surface)).toBeGreaterThanOrEqual(3);
  });

  it('styles carry the system: 1 px borders, cards with soft depth and flat buttons, sans titles at 500, 10 px 44 px-tall buttons, small uppercase labels', () => {
    const styles = createStyles(colors.light, 'light');
    const flat = (style: object): Record<string, unknown> => style as Record<string, unknown>;
    expect(flat(styles.card).borderWidth).toBe(1);
    expect(flat(styles.card).boxShadow).toBe(shadow.md);
    expect(flat(createStyles(colors.dark, 'dark').card).boxShadow).toMatch(/^inset 0 1px 0/);
    expect(flat(styles.button)).not.toHaveProperty('boxShadow');
    expect(flat(styles.button).borderRadius).toBe(10);
    expect(flat(styles.button).minHeight).toBe(44);
    expect(flat(styles.buttonText).fontSize).toBe(15);
    expect(flat(styles.button).backgroundColor).toBe(ink);
    expect(flat(styles.input).borderWidth).toBe(1);
    expect(flat(styles.title).fontWeight).toBe('500');
    expect(flat(styles.label).textTransform).toBe('uppercase');
    for (const style of Object.values(styles)) expect(['800', '900']).not.toContain(flat(style).fontWeight);
  });

  it('useTones reads the pastel pairs of the active scheme', () => {
    const Probe = () => <span>{useTones().red.bg}</span>;
    render(<UiProvider scheme="dark"><Probe /></UiProvider>);
    expect(screen.getByText(tones.dark.red.bg)).toBeTruthy();
  });
});

describe('themed primitives', () => {
  it.each(['light', 'dark'] as const)('have no axe violations in %s', async (scheme) => {
    const { container } = render(
      <UiProvider scheme={scheme}>
        <main>
          <h1>Invitados</h1>
          {(['primary', 'secondary', 'ghost', 'danger'] as const).map((variant) => <Button key={variant} variant={variant}>{variant}</Button>)}
          <Input label="Nombre" error="Escribe un nombre" />
          <Select label="Opción" value="uno" options={[{ label: 'Uno', value: 'uno' }, { label: 'Dos', value: 'dos' }]} />
          <Checkbox label="Acepto" value onChange={() => undefined} />
          <SwitchRow label="Recordatorios" hint="Un correo por semana" value onChange={() => undefined} />
          <Chip tone="yes">Confirmó</Chip><Chip tone="wait">Sin respuesta</Chip>
          <Avatar name="Marta Quispe" /><AvatarMark name="Flores Sol" />
          <Toast visible tone="success" message="Guardado" /><Toast visible tone="error" message="No se pudo guardar" />
          <EmptyState illustration="guestsEmpty" title="Aún no hay invitados" body="Agrega a las primeras personas." action={<Button>Agregar</Button>} />
          <Celebrate title="Publicada" body="Ya puedes compartir el enlace." />
        </main>
      </UiProvider>
    );
    const { violations } = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(violations.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
  }, 60_000);
});
