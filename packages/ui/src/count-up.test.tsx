import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CountUp, UiProvider } from './index';

afterEach(cleanup);

/** The figure arrives by counting and settles on the exact value; the accessible value is the final one from the first frame. */
describe('CountUp', () => {
  it('starts below its value, ends exactly on it, and labels the final value from the start', async () => {
    render(<UiProvider scheme="light"><CountUp value={41} durationMs={120} testID="n" /></UiProvider>);
    const node = screen.getByTestId('n');
    expect(node.getAttribute('aria-label')).toBe('41');
    expect(Number(node.textContent)).toBeLessThan(41);
    await waitFor(() => expect(node.textContent).toBe('41'));
  });
  it('glides from the old value to a new one instead of jumping', async () => {
    const { rerender } = render(<UiProvider scheme="light"><CountUp value={10} durationMs={120} testID="n" /></UiProvider>);
    await waitFor(() => expect(screen.getByTestId('n').textContent).toBe('10'));
    act(() => { rerender(<UiProvider scheme="light"><CountUp value={20} durationMs={120} testID="n" /></UiProvider>); });
    expect(Number(screen.getByTestId('n').textContent)).toBeLessThan(20);
    await waitFor(() => expect(screen.getByTestId('n').textContent).toBe('20'));
  });
});
