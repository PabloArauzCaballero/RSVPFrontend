import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Avatar, Chip, Input, Logo } from './index';

afterEach(cleanup);

describe('DOne brand primitives', () => {
  it('Logo draws the wordmark and the symbol as labelled SVG, or hides itself when decorative', () => {
    const { container } = render(<><Logo /><Logo variant="mark" tone="white" label="Símbolo" /><Logo decorative /></>);
    expect(screen.getByRole('img', { name: 'DOne' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Símbolo' }).getAttribute('viewBox')).toBe('0 0 86 100');
    expect(container.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(1);
  });

  it('Chip says the status in words, never colour alone', () => {
    render(<Chip tone="yes">Confirmó</Chip>);
    expect(screen.getByText('Confirmó')).toBeTruthy();
  });

  it('Avatar shows initials and keeps the same ground for the same name', () => {
    const { container } = render(<><Avatar name="Marta Quispe" /><Avatar name="Marta Quispe" /></>);
    expect(screen.getAllByText('MQ')).toHaveLength(2);
    const [first, second] = [...container.querySelectorAll('div[style*="border-radius"]')] as HTMLElement[];
    expect(first?.style.backgroundColor).toBe(second?.style.backgroundColor);
  });

  it('Input keeps its own style when the caller passes a style (regression: it used to be replaced)', () => {
    render(<Input label="Notas" style={{ minHeight: 120 }} />);
    const field = screen.getByLabelText('Notas') as HTMLInputElement;
    expect(field.style.minHeight).toBe('120px');
    expect(field.className).toMatch(/r-/); // the base input style still applies (atomic classes)
  });
});
