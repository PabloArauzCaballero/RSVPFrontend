import { act, cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button, Celebrate, CheckMark, EmptyState, ILLUSTRATION_NAMES, Illustration, PageIntro, SuccessNote, UiProvider } from './index';
import { CHECK_LENGTH } from './check-geometry';

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

const matchMedia = (reduce: boolean) => vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query.includes('reduce'), media: query, addEventListener: () => undefined, removeEventListener: () => undefined }));
const pathOf = (container: HTMLElement): SVGPathElement => container.querySelector('svg path') as SVGPathElement;

describe('CheckMark', () => {
  it('draws the tick once: hidden at first, then offset 0 with a 250-450 ms ease-out transition', async () => {
    matchMedia(false);
    vi.useFakeTimers();
    const onDone = vi.fn();
    const { container } = render(<CheckMark onDone={onDone} />);
    expect(pathOf(container).getAttribute('stroke-dashoffset')).toBe(String(CHECK_LENGTH));
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    const path = pathOf(container);
    expect(path.getAttribute('stroke-dashoffset')).toBe('0');
    const duration = Number(/(\d+)ms/.exec(path.style.transition)?.[1]);
    expect(duration).toBeGreaterThanOrEqual(250);
    expect(duration).toBeLessThanOrEqual(450);
    expect(path.style.transition).toContain('cubic-bezier');
    expect(path.style.animationIterationCount).toBe('');
    await act(async () => { await vi.advanceTimersByTimeAsync(duration); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('appears already drawn, with no transition, under prefers-reduced-motion', () => {
    matchMedia(true);
    const { container } = render(<CheckMark />);
    expect(pathOf(container).getAttribute('stroke-dashoffset')).toBe('0');
    expect(pathOf(container).style.transition).toBe('');
  });

  it('is decorative unless it has a label', () => {
    matchMedia(true);
    const { container, rerender } = render(<CheckMark />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    rerender(<CheckMark label="Guardado" />);
    expect(screen.getByRole('img', { name: 'Guardado' })).toBeTruthy();
  });
});

describe('Illustration', () => {
  it.each(ILLUSTRATION_NAMES)('%s is a decorative SVG in brand colours, sized by token', (name) => {
    const { container } = render(<Illustration name={name} size="sm" />);
    const svg = container.querySelector('svg') as SVGElement;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('width')).toBe('64');
    expect(svg.querySelectorAll('path').length).toBeGreaterThan(2);
    const colours = [...svg.querySelectorAll('path')].flatMap((path) => [path.getAttribute('stroke'), path.getAttribute('fill')]).filter((value) => value && value !== 'none');
    for (const colour of colours) expect(['#1F3BFF', '#E9EDFF', '#FFFFFF', '#FFB020']).toContain(colour);
  });

  it('switches palette per tone and exposes a name only when asked', () => {
    const { container } = render(<><Illustration name="gift" tone="night" size={40} /><Illustration name="gift" tone="onDark" label="Regalo" /></>);
    expect(container.querySelector('svg[width="40"] path[stroke="#0A1033"]')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Regalo' }).querySelector('path[stroke="#8FA6FF"]')).toBeTruthy();
  });
});

describe('EmptyState, PageIntro, SuccessNote, Celebrate', () => {
  it('EmptyState answers what, why and the first tap, and has no axe violations', async () => {
    matchMedia(true);
    const { container } = render(<UiProvider scheme="light"><main><h1>Invitados</h1><PageIntro>Aquí ves quién viene.</PageIntro><EmptyState illustration="table" title="Aún no hay invitados" body="Agrega a las primeras personas y mándales el enlace." action={<Button>Agregar invitados</Button>} /></main></UiProvider>);
    expect(screen.getByRole('heading', { name: 'Aún no hay invitados' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Agregar invitados' })).toBeTruthy();
    expect(screen.getByText('Aquí ves quién viene.')).toBeTruthy();
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });

  it('SuccessNote and Celebrate are polite status regions with the tick inside', async () => {
    matchMedia(true);
    const { container } = render(<main><SuccessNote message="Guardado" detail="Tus invitados ya lo ven." /><Celebrate title="Tu invitación está publicada" body="Ya puedes compartir el enlace." /></main>);
    const statuses = screen.getAllByRole('status');
    expect(statuses).toHaveLength(2);
    expect(statuses[0]?.textContent).toContain('Guardado');
    expect(container.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(2);
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });
});
