import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button, Card, Checkbox, DatePicker, FileUpload, Input, Modal, Select, Sheet, Table, Toast } from './index';

afterEach(cleanup);

describe('UI web primitives', () => {
  it('renders Button states and prevents activation while unavailable', () => {
    const onClick = vi.fn();
    render(<><Button onClick={onClick}>Guardar</Button><Button state="loading">Cargar</Button><Button state="disabled">Bloqueado</Button></>);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Cargando…' }).getAttribute('aria-busy')).toBe('true');
    expect((screen.getByRole('button', { name: 'Bloqueado' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders entry primitives with labels, errors and empty state', () => {
    const change = vi.fn();
    render(<><Input label="Nombre" state="error" error="Obligatorio" /><Select label="Tipo" options={[{ label: 'Boda', value: 'wedding' }]} onChange={change} /><Checkbox label="Acepto" value={false} onChange={change} /><DatePicker label="Fecha" state="empty" /><FileUpload label="Adjunto" state="empty" /></>);
    expect(screen.getByRole('textbox', { name: 'Nombre' }).getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toContain('Obligatorio');
    fireEvent.change(screen.getByRole('combobox', { name: 'Tipo' }), { target: { value: 'wedding' } });
    expect(change).toHaveBeenCalledWith('wedding');
    expect((screen.getByRole('checkbox', { name: 'Acepto' }) as HTMLInputElement).checked).toBe(false);
    expect(screen.getAllByText('No hay información disponible.')).toHaveLength(2);
  });

  it('renders containers, feedback and complex primitives in usable states', () => {
    render(<><Card>Contenido</Card><Card state="error" /><Sheet visible onClose={vi.fn()} title="Panel">Contenido del panel</Sheet><Modal visible onClose={vi.fn()} title="Confirmar">Contenido modal</Modal><Toast visible message="Guardado" /><Table columns={['Nombre']} rows={[]} state="empty" /><DatePicker label="Fecha elegida" value="2026-01-01" /><FileUpload label="Archivo" /></>);
    expect(screen.getByText('Contenido')).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'Panel' })).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'Confirmar' })).toBeTruthy();
    expect(screen.getByText('Guardado')).toBeTruthy();
    expect(screen.getByRole('table').textContent).toContain('No hay registros.');
    expect((screen.getByLabelText('Fecha elegida') as HTMLInputElement).value).toBe('2026-01-01');
    expect(screen.getByLabelText('Archivo').getAttribute('type')).toBe('file');
  });
});
