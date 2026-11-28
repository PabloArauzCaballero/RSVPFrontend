import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { cleanup(); vi.resetModules(); vi.doUnmock('react-native'); });

/** The native files run here on react-native-web: the logic (reduced motion cache, props, a11y) is checked, the native driver is not. */
async function load(reduced: boolean) {
  vi.resetModules();
  const rn = await import('react-native');
  vi.doMock('react-native', () => ({
    ...rn,
    AccessibilityInfo: { ...rn.AccessibilityInfo, isReduceMotionEnabled: () => Promise.resolve(reduced), addEventListener: () => ({ remove: () => undefined }), announceForAccessibility: vi.fn(), setAccessibilityFocus: vi.fn() }
  }));
  const motion = await import('./motion.native');
  await act(async () => { await Promise.resolve(); });
  return { motion, rn: await import('react-native') };
}

describe('native motion', () => {
  it('caches the Reduce Motion answer app-wide so a later mount already knows it', async () => {
    const { motion } = await load(false);
    const Probe = () => <span data-testid="p">{String(motion.useReducedMotion())}</span>;
    const first = render(<Probe />);
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByTestId('p').textContent).toBe('false');
    first.unmount();
    render(<Probe />);
    expect(screen.getByTestId('p').textContent).toBe('false');
  });

  it('exposes the same tokens as web', async () => {
    const { motion } = await load(true);
    const web = await import('./motion');
    expect(motion.MOTION).toEqual(web.MOTION);
    expect(motion.staggerDelay(8)).toBeUndefined();
  });

  it('Enter shows its content and is in its final state under Reduce Motion', async () => {
    await load(true);
    const { Enter } = await import('./enter.native');
    render(<Enter testID="e">hola</Enter>);
    expect(screen.getByText('hola')).toBeTruthy();
    expect((screen.getByTestId('e') as HTMLElement).style.opacity).toBe('1');
  });

  describe('MV-B1: the content never stays at opacity 0 when the native driver does not deliver', () => {
    /** A native driver that accepts the animation and never moves or reports anything (the failure seen on the phone). */
    async function loadStuck(reduced: boolean) {
      vi.useFakeTimers();
      vi.resetModules();
      const rn = await import('react-native');
      const stuck = () => ({ start: () => undefined, stop: () => undefined, reset: () => undefined });
      vi.doMock('react-native', () => ({
        ...rn,
        Animated: { ...rn.Animated, timing: stuck },
        AccessibilityInfo: { ...rn.AccessibilityInfo, isReduceMotionEnabled: () => Promise.resolve(reduced), addEventListener: () => ({ remove: () => undefined }), announceForAccessibility: vi.fn(), setAccessibilityFocus: vi.fn() }
      }));
      await import('./motion.native');
      await act(async () => { await Promise.resolve(); });
    }
    afterEach(() => { vi.useRealTimers(); });

    it('Enter reaches opacity 1 on the JS clock even if the driver never starts', async () => {
      await loadStuck(false);
      const { Enter, ENTER_SETTLE_MARGIN_MS } = await import('./enter.native');
      const { MOTION } = await import('./motion');
      const onDone = vi.fn();
      render(<Enter testID="e" onDone={onDone}>hola</Enter>);
      expect((screen.getByTestId('e') as HTMLElement).style.opacity).toBe('0');
      await act(async () => { vi.advanceTimersByTime(MOTION.enterMs + ENTER_SETTLE_MARGIN_MS + 1); });
      expect((screen.getByTestId('e') as HTMLElement).style.opacity).toBe('1');
      expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('step 3 of a StepTransition is visible after 1 to 2 to 3 with a stuck driver, and the first step never was hidden', async () => {
      await loadStuck(false);
      const { StepTransition } = await import('./step-transition.native');
      const { Enter, ENTER_SETTLE_MARGIN_MS } = await import('./enter.native');
      const { MOTION } = await import('./motion');
      const view = (step: number) => (
        <>
          <Enter testID="preview">vista</Enter>
          <StepTransition step={step}><Enter testID={`body-${step}`}>{`paso ${step}`}</Enter></StepTransition>
        </>
      );
      const { rerender } = render(view(1));
      rerender(view(2));
      await act(async () => { vi.advanceTimersByTime(MOTION.stepMs + ENTER_SETTLE_MARGIN_MS + 1); });
      rerender(view(3));
      expect(screen.getByText('paso 3')).toBeTruthy();
      await act(async () => { vi.advanceTimersByTime(MOTION.stepMs + MOTION.enterMs + ENTER_SETTLE_MARGIN_MS + 1); });
      const outer = (screen.getByText('paso 3').parentElement as HTMLElement);
      expect(outer.style.opacity).toBe('1');
      expect((screen.getByTestId('preview') as HTMLElement).style.opacity).toBe('1');
    });

    it('an unmounted Enter does not settle afterwards (no state update after unmount)', async () => {
      await loadStuck(false);
      const { Enter, ENTER_SETTLE_MARGIN_MS } = await import('./enter.native');
      const onDone = vi.fn();
      const { unmount } = render(<Enter onDone={onDone}>x</Enter>);
      unmount();
      await act(async () => { vi.advanceTimersByTime(5000 + ENTER_SETTLE_MARGIN_MS); });
      expect(onDone).not.toHaveBeenCalled();
    });

    it('an exit (play false) is not forced back to visible', async () => {
      await loadStuck(false);
      const { Enter, ENTER_SETTLE_MARGIN_MS } = await import('./enter.native');
      render(<Enter testID="e" play={false}>x</Enter>);
      await act(async () => { vi.advanceTimersByTime(5000 + ENTER_SETTLE_MARGIN_MS); });
      expect((screen.getByTestId('e') as HTMLElement).style.opacity).toBe('0');
    });
  });

  it('PressFeedback keeps the 44 point target and the button role', async () => {
    await load(false);
    const { PressFeedback } = await import('./press-feedback.native');
    render(<PressFeedback accessibilityLabel="Guardar"><span>x</span></PressFeedback>);
    const button = screen.getByRole('button', { name: 'Guardar' });
    expect(button.style.minWidth).toBe('44px');
    expect(button.style.minHeight).toBe('44px');
  });

  it('SkeletonList is one busy region named by the loading text', async () => {
    await load(true);
    const { SkeletonList } = await import('./skeleton.native');
    render(<SkeletonList label="Cargando invitados" count={2} />);
    expect(screen.getByLabelText('Cargando invitados')).toBeTruthy();
  });

  it('StepTransition announces the step on change and leaves the first one alone', async () => {
    const { rn } = await load(true);
    const { StepTransition } = await import('./step-transition.native');
    const { rerender } = render(<StepTransition step={1} announce="Paso 1 de 3">uno</StepTransition>);
    expect(rn.AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
    rerender(<StepTransition step={2} announce="Paso 2 de 3">dos</StepTransition>);
    expect(rn.AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Paso 2 de 3');
  });

  it('ScreenTransition announces the title after navigating, never on the first screen', async () => {
    const { rn } = await load(true);
    const { ScreenTransition, resetScreenHistory } = await import('./screen-transition.native');
    resetScreenHistory();
    const { rerender } = render(<ScreenTransition routeKey="a" groupKey="g" title="Inicio">x</ScreenTransition>);
    expect(rn.AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
    rerender(<ScreenTransition routeKey="b" groupKey="g" title="Invitados">y</ScreenTransition>);
    expect(rn.AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Invitados');
  });
});
