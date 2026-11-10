import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TimeField, timeParts, timeValue } from './time-field';

describe('time field (web): the clock of the product', () => {
  it('reads and writes 24-hour HH:MM as the 12-hour clock people say', () => {
    expect(timeParts('00:05')).toEqual({ hour: 12, minute: 5, pm: false });
    expect(timeParts('12:00')).toEqual({ hour: 12, minute: 0, pm: true });
    expect(timeParts('19:30')).toEqual({ hour: 7, minute: 30, pm: true });
    expect(timeParts('')).toBeNull();
    expect(timeParts('25:00')).toBeNull();
    expect(timeValue({ hour: 12, minute: 0, pm: false })).toBe('00:00');
    expect(timeValue({ hour: 12, minute: 0, pm: true })).toBe('12:00');
    expect(timeValue({ hour: 7, minute: 30, pm: true })).toBe('19:30');
  });

  it('is a button that shows the time and opens a panel: hour, minutes and morning or afternoon are one tap each', () => {
    const onChange = vi.fn();
    const { rerender } = render(<TimeField label="Hora" value="" onChange={onChange} state="default" />);
    const trigger = screen.getByRole('button', { name: 'Hora: Elegir hora' });
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(document.querySelector('input[type=time]')).toBeNull();
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Hora' })).toBeTruthy();
    // the first tap completes the rest: on the hour, in the evening
    fireEvent.click(screen.getByTestId('time-hour-8'));
    expect(onChange).toHaveBeenLastCalledWith('20:00');
    rerender(<TimeField label="Hora" value="20:00" onChange={onChange} state="default" />);
    expect(screen.getByTestId('time-hour-8').getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByTestId('time-minute-30'));
    expect(onChange).toHaveBeenLastCalledWith('20:30');
    fireEvent.click(screen.getByTestId('time-am'));
    expect(onChange).toHaveBeenLastCalledWith('08:00');
    fireEvent.click(screen.getByTestId('time-done'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Hora: 8:00 p. m.' })).toBeTruthy();
  });

  it('keeps a minute that is not a multiple of five among the choices, and clears on request', () => {
    const onChange = vi.fn();
    render(<TimeField label="Hora" value="15:52" onChange={onChange} state="default" />);
    fireEvent.click(screen.getByRole('button', { name: 'Hora: 3:52 p. m.' }));
    expect(screen.getByTestId('time-minute-52').getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByTestId('time-clear'));
    expect(onChange).toHaveBeenLastCalledWith('');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
