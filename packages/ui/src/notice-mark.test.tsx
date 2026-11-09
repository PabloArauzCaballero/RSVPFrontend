import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { colors } from '@rsvp/design-tokens';
import { NoticeMark, UiProvider } from './index';

afterEach(cleanup);

/** Every error or information notice pairs one drawn icon with its words: same box, same stroke, decorative, tinted by the scheme. */
describe('NoticeMark', () => {
  it.each(['error', 'info'] as const)('%s: a 24 px decorative svg in the shared 48-unit box with a stem and a dot', (tone) => {
    const { container } = render(<UiProvider scheme="light"><NoticeMark tone={tone} /></UiProvider>);
    const svg = container.querySelector(`svg[data-notice-mark="${tone}"]`)!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 48 48');
    expect(svg.getAttribute('width')).toBe('24');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.querySelectorAll('path')).toHaveLength(1);
    expect(svg.querySelectorAll('circle')).toHaveLength(2);
  });
  it('an error is drawn in the scheme danger colour, in light and in dark', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const { container, unmount } = render(<UiProvider scheme={scheme}><NoticeMark tone="error" /></UiProvider>);
      expect(container.querySelector('path')!.getAttribute('stroke')?.toLowerCase()).toBe(colors[scheme].danger.toLowerCase());
      unmount();
    }
  });
});
