import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EASE, Enter, MOTION, MIN_TARGET, PressFeedback, ScreenTransition, SkeletonList, Stagger, StepTransition, UiProvider, cssEase, offsetFor, resetScreenHistory, staggerDelay } from './index';

const matchMedia = (reduce: boolean) => vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query.includes('reduce'), media: query, addEventListener: () => undefined, removeEventListener: () => undefined }));
const frames = async (ms = 100) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
const innerOf = (container: HTMLElement): HTMLElement => (container.querySelector('[role="button"]') as HTMLElement).firstElementChild as HTMLElement;
const el = (container: HTMLElement, selector: string): HTMLElement => container.querySelector(selector) as HTMLElement;

beforeEach(() => { vi.useFakeTimers(); resetScreenHistory(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('tokens', () => {
  it('keep every duration inside the brief: entrances 150-250 ms, press under 200, exits faster than entrances', () => {
    for (const ms of [MOTION.enterMs, MOTION.stepMs, MOTION.screenMs]) { expect(ms).toBeGreaterThanOrEqual(150); expect(ms).toBeLessThanOrEqual(250); }
    expect(MOTION.sectionMs).toBeLessThan(MOTION.screenMs);
    expect(MOTION.exitMs).toBeLessThan(MOTION.enterMs);
    expect(MOTION.pressInMs).toBeLessThanOrEqual(MOTION.pressOutMs);
    expect(MOTION.pressOutMs).toBeLessThanOrEqual(160);
    expect(MOTION.pressScale).toBeGreaterThanOrEqual(0.95);
    expect(MOTION.checkMs).toBe(360);
  });

  it('uses strong ease-out curves, never ease-in', () => {
    expect(cssEase('out')).toBe('cubic-bezier(0.23, 1, 0.32, 1)');
    expect(EASE.out[0]).toBeGreaterThan(0.1);
    expect(EASE.out[1]).toBe(1);
  });

  it('offsets point where the element comes from', () => {
    expect(offsetFor('down', 8)).toEqual({ x: 0, y: 8 });
    expect(offsetFor('up', 8)).toEqual({ x: 0, y: -8 });
    expect(offsetFor('right', 24)).toEqual({ x: 24, y: 0 });
    expect(offsetFor('left', 24)).toEqual({ x: -24, y: 0 });
    expect(offsetFor('none', 24)).toEqual({ x: 0, y: 0 });
  });

  it('caps the stagger: 40 ms per row, 8 rows, then no delay at all', () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(7)).toBe(280);
    expect(staggerDelay(8)).toBeUndefined();
    expect(staggerDelay(200)).toBeUndefined();
  });
});

describe('Enter', () => {
  it('starts hidden and offset, then transitions only opacity and transform to rest (transform none)', async () => {
    matchMedia(false);
    const onDone = vi.fn();
    const { container } = render(<Enter testID="e" onDone={onDone}>Hola</Enter>);
    const node = el(container, '[data-testid="e"]');
    expect(node.style.opacity).toBe('0');
    expect(node.style.transform).toBe('translate(0px, 8px)');
    await frames(100);
    expect(node.style.opacity).toBe('1');
    expect(node.style.transform).toBe('none');
    const transition = node.style.transition;
    expect(transition).toContain(`opacity ${MOTION.enterMs}ms`);
    expect(transition).toContain(`transform ${MOTION.enterMs}ms`);
    expect(transition).not.toMatch(/\ball\b|width|height|margin|top|left/);
    expect(node.style.animationName).toBe('');
    expect(onDone).not.toHaveBeenCalled();
    await frames(MOTION.enterMs);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('keeps the content in the DOM, in reading order, from the first frame', () => {
    matchMedia(false);
    render(<Enter><p>uno</p><p>dos</p></Enter>);
    expect(screen.getAllByText(/uno|dos/).map((node) => node.textContent)).toEqual(['uno', 'dos']);
  });

  it('shows the final state on the first paint, with no transition, under prefers-reduced-motion', () => {
    matchMedia(true);
    const onDone = vi.fn();
    const { container } = render(<Enter testID="e" onDone={onDone} from="right">Hola</Enter>);
    const node = el(container, '[data-testid="e"]');
    expect(node.style.opacity).toBe('1');
    expect(node.style.transform).toBe('none');
    expect(node.style.transition).toBe('');
    expect(node.getAttribute('data-enter')).toBe('in');
    expect(onDone).not.toHaveBeenCalled();
  });

  it('is interruptible: turning play off mid-entrance retargets at once, faster, without restarting', async () => {
    matchMedia(false);
    const onDone = vi.fn();
    const { container, rerender } = render(<Enter testID="e" onDone={onDone}>Hola</Enter>);
    const node = el(container, '[data-testid="e"]');
    await frames(100);
    expect(node.style.opacity).toBe('1');
    rerender(<Enter testID="e" onDone={onDone} play={false}>Hola</Enter>);
    await frames(1);
    expect(node.style.opacity).toBe('0');
    expect(node.style.transition).toContain(`opacity ${MOTION.exitMs}ms`);
    await frames(MOTION.enterMs * 2);
    expect(onDone).not.toHaveBeenCalled();
    rerender(<Enter testID="e" onDone={onDone} play>Hola</Enter>);
    await frames(100);
    expect(node.style.opacity).toBe('1');
    expect(node.style.transition).toContain(`opacity ${MOTION.enterMs}ms`);
  });

  it('applies the delay only when entering', async () => {
    matchMedia(false);
    const { container } = render(<Enter testID="e" delay={120}>Hola</Enter>);
    await frames(100);
    expect(el(container, '[data-testid="e"]').style.transitionDelay).toBe('120ms');
  });
});

describe('Stagger', () => {
  const rows = (n: number) => Array.from({ length: n }, (_, i) => <li key={i} data-row={i}>fila {i}</li>);

  it('animates at most 8 rows, 40 ms apart; the tail appears in place', async () => {
    matchMedia(false);
    const { container } = render(<ul><Stagger>{rows(30)}</Stagger></ul>);
    const wrappers = container.querySelectorAll('[data-enter]');
    expect(wrappers).toHaveLength(8);
    await frames(100);
    const delays = [...wrappers].map((node) => (node as HTMLElement).style.transitionDelay);
    expect(delays).toEqual(['', '40ms', '80ms', '120ms', '160ms', '200ms', '240ms', '280ms']);
    expect(container.querySelectorAll('[data-row]')).toHaveLength(30);
    expect(container.querySelectorAll('[data-row="29"]')).toHaveLength(1);
    expect(el(container, '[data-row="29"]').closest('[data-enter]')).toBeNull();
  });

  it('honours a custom cap and does not wrap anything when max is 0', () => {
    matchMedia(false);
    const { container } = render(<Stagger max={3}>{rows(5)}</Stagger>);
    expect(container.querySelectorAll('[data-enter]')).toHaveLength(3);
    cleanup();
    const none = render(<Stagger max={0}>{rows(5)}</Stagger>);
    expect(none.container.querySelectorAll('[data-enter]')).toHaveLength(0);
  });

  it('shows every row at once, untransitioned, under reduced motion', () => {
    matchMedia(true);
    const { container } = render(<Stagger>{rows(5)}</Stagger>);
    for (const node of container.querySelectorAll<HTMLElement>('[data-enter]')) {
      expect(node.style.opacity).toBe('1');
      expect(node.style.transition).toBe('');
    }
  });
});

describe('PressFeedback', () => {
  it('keeps a 44 px target and scales the inner content, not the hit area', () => {
    matchMedia(false);
    const { container } = render(<PressFeedback accessibilityLabel="Guardar" onPress={() => undefined}><span>Guardar</span></PressFeedback>);
    const button = screen.getByRole('button', { name: 'Guardar' });
    expect(MIN_TARGET).toBe(44);
    expect(button.style.minWidth).toBe('44px');
    expect(button.style.minHeight).toBe('44px');
    const inner = innerOf(container);
    expect(inner.style.transform).toBe('none');
    expect(inner.style.transitionProperty).toBe('transform');
    expect(inner.style.transitionDuration).toBe(`${MOTION.pressOutMs}ms`);
  });

  it('presses in at 0.97 in 90 ms, releases in 160 ms, and ignores presses while disabled', () => {
    matchMedia(false);
    const { container, rerender } = render(<PressFeedback accessibilityLabel="Guardar"><span>x</span></PressFeedback>);
    const button = screen.getByRole('button', { name: 'Guardar' });
    fireEvent.keyDown(button, { key: ' ' });
    expect(innerOf(container).style.transform).toBe('scale(0.97)');
    expect(innerOf(container).style.transitionDuration).toBe(`${MOTION.pressInMs}ms`);
    fireEvent.keyUp(button, { key: ' ' });
    expect(innerOf(container).style.transform).toBe('none');
    expect(innerOf(container).style.transitionDuration).toBe(`${MOTION.pressOutMs}ms`);
    rerender(<PressFeedback accessibilityLabel="Guardar" disabled><span>x</span></PressFeedback>);
    expect(innerOf(container).style.transform).toBe('none');
  });

  it('dims instead of scaling under reduced motion', () => {
    matchMedia(true);
    const { container } = render(<PressFeedback accessibilityLabel="Guardar"><span>x</span></PressFeedback>);
    const inner = innerOf(container);
    expect(inner.style.transform).toBe('');
    expect(inner.style.transitionDuration).toBe('');
    expect(inner.style.opacity).toBe('1');
  });
});

describe('SkeletonList', () => {
  it('is a polite status region named like the loading text, with decorative rows and one pulse on the group', async () => {
    matchMedia(false);
    vi.useRealTimers();
    const { container } = render(<UiProvider scheme="light"><main><h1>Invitados</h1><SkeletonList count={3} label="Cargando invitados" /></main></UiProvider>);
    const status = screen.getByRole('status');
    expect(status.textContent).toBe('Cargando invitados');
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(container.querySelectorAll('.rsvp-skeleton-pulse')).toHaveLength(1);
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(3);
    const css = document.head.querySelector('style[data-href="rsvp-motion-skeleton"]')?.textContent ?? document.querySelector('style')?.textContent ?? '';
    expect(css).toContain('infinite');
    expect(css).toContain('prefers-reduced-motion:reduce');
    expect(css).toMatch(/opacity:1\}to\{opacity:0\.55/);
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });

  it('defaults to the shared loading string and stops the pulse under reduced motion', () => {
    matchMedia(true);
    const { container } = render(<UiProvider scheme="light"><SkeletonList /></UiProvider>);
    expect(screen.getByRole('status').textContent).toBe('Cargando…');
    expect(container.querySelectorAll('.rsvp-skeleton-pulse')).toHaveLength(0);
    expect(el(container, '[data-skeleton]').getAttribute('data-skeleton')).toBe('still');
  });

  it('animates nothing but opacity', () => {
    const css = `${MOTION.skeletonMs}`;
    expect(Number(css)).toBeGreaterThan(1000);
  });
});

describe('StepTransition', () => {
  it('does not animate the first step', () => {
    matchMedia(false);
    const { container } = render(<StepTransition step={1} announce="Paso 1 de 3">uno</StepTransition>);
    const panel = el(container, '[data-step-direction]');
    expect(panel.getAttribute('data-step-direction')).toBe('none');
    expect(panel.style.transition).toBe('');
  });

  it('slides in from the right going forward and from the left going back, then rests with transform none', async () => {
    matchMedia(false);
    const { container, rerender } = render(<StepTransition step={1}>uno</StepTransition>);
    rerender(<StepTransition step={2} announce="Paso 2 de 3: Fecha">dos</StepTransition>);
    let panel = el(container, '[data-step-direction]');
    expect(panel.getAttribute('data-step-direction')).toBe('forward');
    expect(panel.style.transform).toBe('translate(24px, 0px)');
    expect(panel.style.opacity).toBe('0');
    await frames(100);
    expect(panel.style.transform).toBe('none');
    expect(panel.style.transition).toContain(`opacity ${MOTION.stepMs}ms`);
    rerender(<StepTransition step={1}>uno</StepTransition>);
    panel = el(container, '[data-step-direction]');
    expect(panel.getAttribute('data-step-direction')).toBe('back');
    expect(panel.style.transform).toBe('translate(-24px, 0px)');
  });

  it('keeps focus in the flow: the new step is a labelled group and receives focus', () => {
    matchMedia(false);
    const { rerender } = render(<StepTransition step={1}><button type="button">Siguiente</button></StepTransition>);
    screen.getByRole('button', { name: 'Siguiente' }).focus();
    rerender(<StepTransition step={2} announce="Paso 2 de 3: Fecha"><button type="button">Crear</button></StepTransition>);
    const group = screen.getByRole('group', { name: 'Paso 2 de 3: Fecha' });
    expect(document.activeElement).toBe(group);
  });

  it('swaps with no motion at all under reduced motion, but still moves focus', () => {
    matchMedia(true);
    const { container, rerender } = render(<StepTransition step={1}>uno</StepTransition>);
    rerender(<StepTransition step={2} announce="Paso 2 de 3">dos</StepTransition>);
    const panel = el(container, '[data-step-direction]');
    expect(panel.style.opacity).toBe('1');
    expect(panel.style.transform).toBe('none');
    expect(panel.style.transition).toBe('');
    expect(document.activeElement).toBe(panel);
  });
});

describe('ScreenTransition', () => {
  const Page = ({ routeKey, group, title = 'Invitados', children = 'contenido' }: { routeKey: string; group?: string; title?: string; children?: string }) => (
    <div id="scroller" style={{ overflow: 'auto' }}>
      <h1>{title}</h1>
      <ScreenTransition routeKey={routeKey} groupKey={group}>{children}</ScreenTransition>
    </div>
  );

  it('leaves the first screen of the session alone: no animation, no focus theft', async () => {
    matchMedia(false);
    const { container } = render(<Page routeKey="inicio" group="home" />);
    const panel = el(container, '[data-screen-transition]');
    expect(panel.getAttribute('data-screen-transition')).toBe('initial');
    expect(panel.style.transition).toBe('');
    expect(panel.style.opacity).toBe('');
    await frames(300);
    expect(document.activeElement).toBe(document.body);
  });

  it('fades between sibling tabs and rises 6 px between destinations; focus goes to the h1 and scroll returns to the top', async () => {
    matchMedia(false);
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    const { container, rerender } = render(<Page routeKey="inicio" group="home" />);
    await frames(10);
    const scroller = el(container, '#scroller');
    scroller.scrollTop = 120;
    rerender(<Page routeKey="invitados" group="guests" title="Invitados" />);
    let panel = el(container, '[data-screen-transition]');
    expect(panel.getAttribute('data-screen-transition')).toBe('screen');
    expect(panel.style.transform).toBe('translate(0px, 6px)');
    expect(panel.style.opacity).toBe('0');
    await frames(100);
    expect(panel.style.transform).toBe('none');
    expect(panel.style.transition).toContain(`opacity ${MOTION.screenMs}ms`);
    expect(scroller.scrollTop).toBe(0);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    expect(document.activeElement?.tagName).toBe('H1');
    expect(document.activeElement?.getAttribute('tabindex')).toBe('-1');

    rerender(<Page routeKey="agregar" group="guests" />);
    panel = el(container, '[data-screen-transition]');
    expect(panel.getAttribute('data-screen-transition')).toBe('section');
    expect(panel.style.transform).toBe('none');
    expect(panel.style.opacity).toBe('0');
    await frames(100);
    expect(panel.style.opacity).toBe('1');
    expect(panel.style.transition).toContain(`opacity ${MOTION.sectionMs}ms`);
    expect(panel.style.transition).not.toContain('translate');
  });

  it('under reduced motion shows the content at once yet still moves focus and scroll', async () => {
    matchMedia(true);
    vi.stubGlobal('scrollTo', vi.fn());
    const { container, rerender } = render(<Page routeKey="inicio" group="home" />);
    await frames(10);
    rerender(<Page routeKey="invitados" group="guests" />);
    const panel = el(container, '[data-screen-transition]');
    expect(panel.style.opacity).toBe('1');
    expect(panel.style.transform).toBe('none');
    expect(panel.style.transition).toBe('');
    await frames(10);
    expect(document.activeElement?.tagName).toBe('H1');
  });

  it('can opt out of focus and scroll', async () => {
    matchMedia(false);
    const { rerender } = render(<Page routeKey="a" group="g" />);
    await frames(10);
    rerender(<div><h1>x</h1><ScreenTransition routeKey="b" groupKey="g" focusHeading={false} resetScroll={false}>y</ScreenTransition></div>);
    await frames(10);
    expect(document.activeElement).toBe(document.body);
  });

  it('has no axe violations', async () => {
    matchMedia(true);
    vi.useRealTimers();
    const { container } = render(<main><Page routeKey="a" group="g" /></main>);
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });
});
