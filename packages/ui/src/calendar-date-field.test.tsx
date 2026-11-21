import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DateField } from './date-field';
import { stringsFor } from './strings';
import { UiProvider } from './theme';

const calendar = { locale: 'es-BO', timeZone: 'America/La_Paz' } as const;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('invitation calendar', () => {
  it('opens at the saved day, moves across leap February and sends an ISO date', async () => {
    const onChange = vi.fn();
    render(<DateField label="Fecha" value="2028-01-31" onChange={onChange} state="default" calendar={calendar} />);
    const trigger = screen.getByRole('button', { name: /^Fecha:/ });
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Fecha' });
    const active = within(dialog).getByTestId('calendar-day-2028-01-31');
    expect(active.closest('td')?.getAttribute('aria-selected')).toBe('true');
    await waitFor(() => expect(document.activeElement).toBe(active));
    fireEvent.keyDown(active, { key: 'PageDown' });
    const leap = within(dialog).getByTestId('calendar-day-2028-02-29');
    await waitFor(() => expect(document.activeElement).toBe(leap));
    fireEvent.click(leap);
    expect(onChange).toHaveBeenCalledWith('2028-02-29');
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('uses the event zone for Today and keeps the date on cancellation', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-20T02:00:00Z'));
    const onChange = vi.fn();
    render(<UiProvider strings={stringsFor('en-US')}><DateField label="Date" state="default" onChange={onChange} calendar={{ ...calendar, locale: 'en-US' }} /></UiProvider>);
    const trigger = screen.getByRole('button', { name: 'Date: Choose a date' });
    fireEvent.click(trigger);
    expect(screen.getByTestId('calendar-day-2026-11-19').getAttribute('aria-current')).toBe('date');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(onChange).toHaveBeenCalledWith('2026-11-19');
  });

  it('opens a saved historical date at the first allowed day and keeps keyboard navigation in range', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-20T02:00:00Z'));
    const onChange = vi.fn();
    render(<DateField label="Fecha" value="2026-10-12" minimumDate="2026-11-19" onChange={onChange} state="default" calendar={calendar} />);
    fireEvent.click(screen.getByRole('button', { name: /^Fecha:/ }));
    const minimum = screen.getByTestId('calendar-day-2026-11-19');
    const pastDay = screen.getByTestId<HTMLButtonElement>('calendar-day-2026-11-18');
    expect(pastDay.disabled).toBe(true);
    expect(screen.getByTestId('calendar-previous-month').getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(pastDay);
    expect(onChange).not.toHaveBeenCalled();
    await waitFor(() => expect(document.activeElement).toBe(minimum));
    fireEvent.keyDown(minimum, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(minimum);
    fireEvent.keyDown(minimum, { key: 'ArrowRight' });
    const next = screen.getByTestId('calendar-day-2026-11-20');
    await waitFor(() => expect(document.activeElement).toBe(next));
    fireEvent.click(next);
    expect(onChange).toHaveBeenCalledWith('2026-11-20');
  });
});
