import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DateField } from './date-field.native';

// The platform picker is replaced by a stub that "selects" 2026-12-24 (a local-time Date, as the real module returns).
vi.mock('@react-native-community/datetimepicker', () => ({
  default: ({ value, onChange }: { value: Date; onChange: (event: { type: string }, date?: Date) => void }) => (
    <button data-current={value.getDate()} onClick={() => onChange({ type: 'set' }, new Date(2026, 11, 24, 23, 30))}>stub-picker</button>
  )
}));

describe('REQ-F03-01 · native DatePicker opens the system picker and keeps the ISO contract', () => {
  it('shows the value, opens the picker, and reports YYYY-MM-DD without a timezone shift', () => {
    const onChange = vi.fn();
    render(<DateField label="Fecha" value="2026-01-05" onChange={onChange} state="default" />);
    fireEvent.click(screen.getByRole('button', { name: 'Fecha: 2026-01-05' }));
    expect(screen.getByText('stub-picker').getAttribute('data-current')).toBe('5');
    fireEvent.click(screen.getByText('stub-picker'));
    expect(onChange).toHaveBeenCalledWith('2026-12-24');
  });
  it('disabled state does not open the picker', () => {
    render(<DateField label="Fecha" state="disabled" />);
    fireEvent.click(screen.getByRole('button', { name: /Fecha/ }));
    expect(screen.queryByText('stub-picker')).toBeNull();
  });
});
afterEach(cleanup);
