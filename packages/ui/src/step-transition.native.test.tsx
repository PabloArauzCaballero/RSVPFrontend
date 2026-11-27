import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.spyOn(console, 'warn').mockImplementation(() => undefined); // the expected `useNativeDriver` fallback notice of react-native-web

afterEach(() => { cleanup(); vi.resetModules(); vi.doUnmock('react-native'); vi.doUnmock('./enter'); vi.doUnmock('./motion'); });

type Listener = (reduced: boolean) => void;

/**
 * Runs the NATIVE files (`step-transition.native`, `enter.native`, `motion.native`) on react-native-web. Vitest does not resolve
 * `.native`, so `./enter` and `./motion` are redirected to their native twins for this file only; without that the web Enter would be tested.
 * Limit: `useNativeDriver: true` falls back to the JS driver on react-native-web, so the native (iOS/Android) driver itself is NOT exercised.
 */
async function load(initial: boolean) {
  vi.resetModules();
  const rn = await import('react-native');
  const listeners: Listener[] = [];
  // react-native-web swaps `Animated` for an instant mock whenever NODE_ENV is "test"; the real implementation (JS driver) is what lets opacity be observed mid-animation.
  // @ts-expect-error react-native-web ships no types for its vendored Animated files
  const real = (await import('react-native-web/dist/vendor/react-native/Animated/AnimatedImplementation')).default;
  // @ts-expect-error react-native-web ships no types for its vendored Animated files
  const AnimatedView = (await import('react-native-web/dist/vendor/react-native/Animated/components/AnimatedView')).default;
  vi.doMock('react-native', () => ({
    ...rn,
    Animated: { ...real, View: AnimatedView },
    AccessibilityInfo: { ...rn.AccessibilityInfo, isReduceMotionEnabled: () => Promise.resolve(initial), addEventListener: (_: string, l: Listener) => { listeners.push(l); return { remove: () => undefined }; }, announceForAccessibility: vi.fn(), setAccessibilityFocus: vi.fn() }
  }));
  vi.doMock('./motion', () => import('./motion.native'));
  vi.doMock('./enter', () => import('./enter.native'));
  await import('./motion.native');
  await act(async () => { await Promise.resolve(); });
  const { StepTransition } = await import('./step-transition.native');
  const { Enter } = await import('./enter.native');
  return { StepTransition, Enter, system: (reduced: boolean) => act(async () => { listeners.forEach((l) => l(reduced)); }) };
}

/** Opacity of the Animated.View that directly wraps the element (the native Enter), not of any ancestor. */
const opacityOf = (id: string): number => {
  const wrapper = screen.getByTestId(id).parentElement as HTMLElement;
  return Number(wrapper.style.opacity === '' ? 'NaN' : wrapper.style.opacity);
};
const settled = (id: string): boolean => (screen.getByTestId(id).parentElement as HTMLElement).style.transform === 'translateX(0px) translateY(0px)';
const wait = (ms: number) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const step = (n: number, StepTransition: Awaited<ReturnType<typeof load>>['StepTransition'], extra = 0) => (
  <StepTransition step={n}><span data-testid="body">{`paso ${n} ${extra}`}</span></StepTransition>
);

describe('native StepTransition (real enter.native / motion.native, JS driver)', () => {
  it('without Reduce Motion the new step starts transparent, is partly visible mid-way and ends at 1', async () => {
    const { StepTransition } = await load(false);
    const view = render(step(1, StepTransition));
    view.rerender(step(2, StepTransition));
    view.rerender(step(3, StepTransition));
    expect(opacityOf('body')).toBe(0);
    await wait(120);
    const mid = opacityOf('body');
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    await waitFor(() => expect(opacityOf('body')).toBe(1), { timeout: 2000 });
    expect(screen.getByText('paso 3 0')).toBeTruthy();
    expect(settled('body')).toBe(true);
  });

  it('with Reduce Motion the step is at 1 from the first frame', async () => {
    const { StepTransition } = await load(true);
    const view = render(step(1, StepTransition));
    view.rerender(step(2, StepTransition));
    view.rerender(step(3, StepTransition));
    expect(opacityOf('body')).toBe(1);
    expect(settled('body')).toBe(true);
  });

  it('a Reduce Motion answer that arrives after the first render never strands the step at 0', async () => {
    const { StepTransition, system } = await load(false);
    const view = render(step(1, StepTransition));
    view.rerender(step(2, StepTransition));
    await system(false);
    view.rerender(step(3, StepTransition));
    await system(true);
    expect(opacityOf('body')).toBe(1);
    await system(false);
    await waitFor(() => expect(opacityOf('body')).toBe(1), { timeout: 2000 });
  });

  it('keeps animating to 1 under StrictMode while the parent re-renders mid-animation', async () => {
    const { StepTransition, Enter } = await load(false);
    const ui = (n: number, extra: number) => (
      <StrictMode>
        <Enter grow from="down"><span data-testid="outer">x</span><StepTransition step={n}><span data-testid="body">{`paso ${n} ${extra}`}</span></StepTransition></Enter>
      </StrictMode>
    );
    const view = render(ui(2, 0));
    await waitFor(() => expect(opacityOf('body')).toBe(1), { timeout: 2000 });
    view.rerender(ui(3, 0));
    expect(opacityOf('body')).toBe(0);
    for (let n = 1; n < 4; n++) { await wait(30); view.rerender(ui(3, n)); }
    await waitFor(() => expect(opacityOf('body')).toBe(1), { timeout: 2000 });
    expect(opacityOf('outer')).toBe(1);
  });
});
