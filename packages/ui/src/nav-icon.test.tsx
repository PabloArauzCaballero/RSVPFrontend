import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { NavIcon } from './index';
import { NAV_ICONS } from './nav-icon-shapes';

afterEach(cleanup);

/** The menus of the host, the provider and the admin share one icon set: every destination key draws, decoratively, in one stroke style. */
describe('NavIcon', () => {
  const keys = ['home', 'guests', 'gifts', 'invitation', 'alerts', 'settings', 'overview', 'offers', 'agenda', 'clients', 'profile', 'review', 'catalog', 'people', 'operation', 'more'];
  it.each(keys)('%s is drawn as a decorative 24-unit line icon', (key) => {
    const { container } = render(<NavIcon name={key} color="#111111" />);
    const svg = container.querySelector(`svg[data-nav-icon="${key}"]`)!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.querySelectorAll('path, circle, rect').length).toBeGreaterThan(0);
    for (const node of svg.querySelectorAll('path, circle, rect')) { expect(node.getAttribute('stroke')).toBe('#111111'); expect(node.getAttribute('fill')).toBe('none'); }
  });
  it('an unknown key draws nothing and every set entry has shapes', () => {
    const { container } = render(<NavIcon name="nope" color="#111111" />);
    expect(container.querySelector('svg')).toBeNull();
    for (const [key, shapes] of Object.entries(NAV_ICONS)) expect(shapes.length, key).toBeGreaterThan(0);
  });
});
