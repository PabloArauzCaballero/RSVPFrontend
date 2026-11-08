import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { chips, colors } from '@rsvp/design-tokens';
import { Avatar, Chip, StateHint, UiProvider, useColors, useThemedStyles, type Palette } from './index';
import { EmptyState, SuccessNote } from './personality';

afterEach(cleanup);

const rgb = (hex: string) => { const n = parseInt(hex.slice(1), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; };
const background = (el: Element) => getComputedStyle(el as HTMLElement).backgroundColor;

describe('theme-derived primitives', () => {
  it('useColors returns the palette of the forced scheme', () => {
    function Probe() { return <span data-testid="p" data-canvas={useColors().canvas} />; }
    const { rerender } = render(<UiProvider scheme="dark"><Probe /></UiProvider>);
    expect(screen.getByTestId('p').dataset.canvas).toBe(colors.dark.canvas);
    rerender(<UiProvider scheme="light"><Probe /></UiProvider>);
    expect(screen.getByTestId('p').dataset.canvas).toBe(colors.light.canvas);
  });

  it('useThemedStyles builds a sheet once per scheme and shares it between components', () => {
    const factory = vi.fn((palette: Palette) => ({ ground: palette.canvas }));
    function Probe() { return <span data-testid="s" data-ground={useThemedStyles(factory).ground} />; }
    render(<UiProvider scheme="dark"><Probe /><Probe /></UiProvider>);
    render(<UiProvider scheme="light"><Probe /></UiProvider>);
    expect(factory).toHaveBeenCalledTimes(2);
    expect(screen.getAllByTestId('s').map((el) => el.dataset.ground)).toEqual([colors.dark.canvas, colors.dark.canvas, colors.light.canvas]);
  });

  it('Chip and Avatar use the dark grounds in dark, never the light pill on a night page', () => {
    render(<UiProvider scheme="dark"><Chip tone="yes">Voy</Chip><Avatar name="Ana Pérez" /></UiProvider>);
    expect(background(screen.getByText('Voy').parentElement as Element)).toBe(rgb(chips.dark.yes.bg));
    render(<UiProvider scheme="light"><Chip tone="maybe">Quizá</Chip></UiProvider>);
    expect(background(screen.getByText('Quizá').parentElement as Element)).toBe(rgb(chips.light.maybe.bg));
  });

  it('SuccessNote tints with the scheme success ground and EmptyState keeps readable text tokens', () => {
    render(<UiProvider scheme="dark"><SuccessNote message="Guardado" /><EmptyState illustration="gift" title="Aquí verás tus regalos" body="Agrega el primero." /></UiProvider>);
    expect(background(screen.getByRole('status'))).toBe(rgb(colors.dark.successBg));
    expect(getComputedStyle(screen.getByText('Aquí verás tus regalos')).color).toBe(rgb(colors.dark.text));
  });

  it('the error hint keeps the dark danger token', () => {
    render(<UiProvider scheme="dark"><StateHint error="No se pudo guardar" /></UiProvider>);
    expect(getComputedStyle(screen.getByRole('alert')).color).toBe(rgb(colors.dark.danger));
  });
});
