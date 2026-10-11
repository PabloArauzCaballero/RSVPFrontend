import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button, Checkbox, DatePicker, FileUpload, Input, Select, Table, componentStates } from './index';

describe('universal UI primitives', () => {
  it('preserves the five state contract', () => {
    expect(componentStates).toEqual(['default', 'loading', 'error', 'empty', 'disabled']);
  });

  it('renders accessible controls and honours loading and disabled states', () => {
    const press = vi.fn();
    render(<><Button onPress={press}>Guardar</Button><Button state="loading">Cargar</Button><Button state="disabled">Bloqueado</Button><Input label="Nombre" state="error" error="Obligatorio" /><Select label="Tipo" value="boda" options={[{ label: 'Boda', value: 'boda' }]} /><Checkbox label="Acepto" value={false} /><DatePicker label="Fecha" /><FileUpload label="Adjunto" /><Table columns={['Nombre']} rows={[]} state="empty" /></>);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(press).toHaveBeenCalledOnce();
    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Bloqueado' }).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByRole('alert').textContent).toContain('Obligatorio');
    expect(screen.getByRole('radiogroup', { name: 'Tipo' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Acepto' })).toBeTruthy();
    expect(screen.getByLabelText('Fecha')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Adjunto' })).toBeTruthy();
    expect(screen.getByText('No hay registros.')).toBeTruthy();
  });
});
