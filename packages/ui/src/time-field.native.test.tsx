import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TimeField } from './time-field.native';

// The platform clock is replaced by a stub that "selects" 07:05 (a local-time Date, as the real module returns).
vi.mock('@react-native-community/datetimepicker', () => ({
  default: ({ value, mode, onChange }: { value: Date; mode: string; onChange: (event: { type: string }, date?: Date) => void }) => (
    <button data-mode={mode} data-current={`${value.getHours()}:${value.getMinutes()}`} onClick={() => onChange({ type: 'set' }, new Date(2026, 11, 24, 7, 5))}>stub-clock</button>
  )
}));

describe('native TimePicker opens the system clock and keeps the HH:MM contract', () => {
  it('shows the value, opens the clock at that time, and reports a zero-padded 24-hour time', () => {
    const onChange = vi.fn();
    render(<TimeField label="Hora" value="17:30" onChange={onChange} state="default" />);
    fireEvent.click(screen.getByRole('button', { name: 'Hora: 17:30' }));
    expect(screen.getByText('stub-clock').getAttribute('data-mode')).toBe('time');
    expect(screen.getByText('stub-clock').getAttribute('data-current')).toBe('17:30');
    fireEvent.click(screen.getByText('stub-clock'));
    expect(onChange).toHaveBeenCalledWith('07:05');
  });
  it('without a value it invites to choose and starts the clock at noon', () => {
    render(<TimeField label="Hora" state="default" />);
    fireEvent.click(screen.getByRole('button', { name: 'Hora: Elegir hora' }));
    expect(screen.getByText('stub-clock').getAttribute('data-current')).toBe('12:0');
  });
  it('disabled state does not open the clock', () => {
    render(<TimeField label="Hora" state="disabled" />);
    fireEvent.click(screen.getByRole('button', { name: /Hora/ }));
    expect(screen.queryByText('stub-clock')).toBeNull();
  });
});
afterEach(cleanup);
