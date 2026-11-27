import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { cleanup(); vi.resetModules(); vi.doUnmock('react-native'); });

type Listener = (reduced: boolean) => void;

/** The native files run on react-native-web: `Animated` runs on the JS driver, so the real opacity of the content can be read. */
async function load(initial: boolean) {
  vi.resetModules();
  const rn = await import('react-native');
  const listeners: Listener[] = [];
  vi.doMock('react-native', () => ({
    ...rn,
    AccessibilityInfo: { ...rn.AccessibilityInfo, isReduceMotionEnabled: () => Promise.resolve(initial), addEventListener: (_: string, l: Listener) => { listeners.push(l); return { remove: () => undefined }; }, announceForAccessibility: vi.fn(), setAccessibilityFocus: vi.fn() }
  }));
  await import('./motion.native');
  const { StepTransition } = await import('./step-transition.native');
  return { StepTransition, system: (reduced: boolean) => act(async () => { listeners.forEach((l) => l(reduced)); }) };
}

const opacityOf = (id: string): number => Number((screen.getByTestId(id).closest('[style*="opacity"]') as HTMLElement | null)?.style.opacity ?? 'NaN');

describe('native StepTransition keeps every step visible', () => {
  it.each([false, true])('shows the new step at full opacity after going 1 -> 2 -> 3 (Reduce Motion %s)', async (reduced) => {
    const { StepTransition } = await load(reduced);
    const ui = (step: number) => <StepTransition step={step}><span data-testid="body">{`paso ${step}`}</span></StepTransition>;
    const view = render(ui(1));
    view.rerender(ui(2));
    view.rerender(ui(3));
    await waitFor(() => expect(opacityOf('body')).toBe(1), { timeout: 2000 });
    expect(screen.getByText('paso 3')).toBeTruthy();
  });

  it('does not strand the step at opacity 0 when Reduce Motion flips while it is entering', async () => {
    const { StepTransition, system } = await load(false);
    const ui = (step: number) => <StepTransition step={step}><span data-testid="body">{`paso ${step}`}</span></StepTransition>;
    const view = render(ui(2));
    view.rerender(ui(3));
    await system(true);
    await system(false);
    await waitFor(() => expect(opacityOf('body')).toBe(1), { timeout: 2000 });
  });

  it('does not strand the step when the system answer arrives after the first render and a step change', async () => {
    const { StepTransition, system } = await load(false);
    const ui = (step: number) => <StepTransition step={step}><span data-testid="body">{`paso ${step}`}</span></StepTransition>;
    const view = render(ui(1));
    view.rerender(ui(2));
    await system(false);
    view.rerender(ui(3));
    await system(true);
    await system(false);
    await waitFor(() => expect(opacityOf('body')).toBe(1), { timeout: 2000 });
  });
});

describe('native StepTransition inside the screen entrance (the onboarding tree)', () => {
  it('keeps the step visible under StrictMode, with the parent re-rendering mid-animation and Reduce Motion flipping', async () => {
    const { StepTransition, system } = await load(false);
    const { StrictMode } = await import('react');
    const { Enter } = await import('./enter.native');
    const ui = (step: number, n: number) => (
      <StrictMode>
        <Enter grow from="down"><Enter key="preview" from="down"><span>vista previa</span></Enter><StepTransition step={step}><span data-testid="body">{`paso ${step} ${n}`}</span></StepTransition></Enter>
      </StrictMode>
    );
    const view = render(ui(2, 0));
    view.rerender(ui(3, 0));
    expect(opacityOf('body')).toBe(0);
    for (let n = 1; n < 4; n++) { await act(async () => { await new Promise((r) => setTimeout(r, 30)); }); view.rerender(ui(3, n)); }
    await system(true);
    await system(false);
    await waitFor(() => expect(opacityOf('body')).toBe(1), { timeout: 2000 });
    expect(screen.getByText('vista previa')).toBeTruthy();
  });
});
