import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StateHint, Surface, SwitchWithConsequence, UiProvider } from './index';

afterEach(cleanup);

describe('StateHint and Surface', () => {
  it('announces errors as alerts, loading as a progress indicator, and renders nothing for the default state', () => {
    const { container, rerender } = render(<StateHint error="No se pudo guardar" />);
    expect(screen.getByRole('alert').textContent).toBe('No se pudo guardar');
    rerender(<StateHint state="error" />);
    expect(screen.getByRole('alert').textContent).not.toBe('');
    rerender(<StateHint state="loading" />);
    expect(screen.getByRole('progressbar')).toBeTruthy();
    rerender(<StateHint state="empty" />);
    expect(container.textContent).not.toBe('');
    rerender(<StateHint />);
    expect(container.textContent).toBe('');
  });

  it('Surface is a titled page', () => {
    render(<Surface title="Panel" description="Resumen" />);
    expect(screen.getByRole('heading', { name: 'Panel' })).toBeTruthy();
    expect(screen.getByText('Resumen')).toBeTruthy();
  });
});

describe('SwitchWithConsequence', () => {
  it('only commits after the consequence is confirmed, and can be cancelled', () => {
    const onChange = vi.fn();
    render(<UiProvider><SwitchWithConsequence label="Aprobación manual" value={false} consequence="Cambia cómo se aprueban las reservas." onChange={onChange} /></UiProvider>);
    fireEvent.click(screen.getByRole('switch', { name: 'Aprobación manual' }));
    expect(screen.getByRole('alert').textContent).toContain('solicitudes futuras');
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('button')[1] as HTMLElement);
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(screen.getByRole('switch', { name: 'Aprobación manual' }));
    fireEvent.click(screen.getAllByRole('button')[0] as HTMLElement);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('says how many pending requests are left untouched', () => {
    render(<SwitchWithConsequence label="Modo" value consequence="x" pendingCount={3} onChange={() => undefined} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Modo' }));
    expect(screen.getByRole('alert').textContent).toContain('3 solicitudes pendientes');
  });
});
