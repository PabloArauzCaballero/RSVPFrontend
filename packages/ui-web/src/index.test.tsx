import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button, Card, Checkbox, ComponentCatalog, DatePicker, FileUpload, Input, Modal, Select, Sheet, Table, Toast, UiProvider, componentStates } from './index';

afterEach(cleanup);

const withState = (state: (typeof componentStates)[number]) => (
  <>
    <Button state={state}>Acción</Button>
    <Input label="Nombre" state={state} error={state === 'error' ? 'Obligatorio' : undefined} />
    <Select label="Tipo" options={[{ label: 'Boda', value: 'wedding' }]} state={state} />
    <Checkbox label="Acepto" value={false} state={state} />
    <Card state={state}>Contenido</Card>
    <Table columns={['Nombre']} rows={[['Ana']]} state={state} />
    <DatePicker label="Fecha" state={state} />
    <FileUpload label="Adjunto" state={state} />
  </>
);

describe('REQ-F03-02: every primitive handles every state', () => {
  it.each(componentStates)('state %s renders without throwing and communicates itself', (state) => {
    const { container } = render(withState(state));
    expect(container.textContent).not.toBe('');
    if (state === 'loading') {
      expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: 'Cargando…' }).getAttribute('aria-busy')).toBe('true');
    }
    if (state === 'error') {
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
      expect(screen.getByRole('textbox', { name: 'Nombre' }).getAttribute('aria-invalid')).toBe('true');
      expect(screen.getByRole('textbox', { name: 'Nombre' }).getAttribute('aria-describedby')).toBe(screen.getByText('Obligatorio').id);
    }
    if (state === 'empty') {
      expect(screen.getAllByText('No hay información disponible.').length).toBeGreaterThanOrEqual(5);
      expect(screen.queryByRole('textbox', { name: 'Nombre' })).toBeNull();
    }
    if (state === 'disabled' || state === 'loading') {
      expect((screen.getByRole('textbox', { name: 'Nombre' }) as HTMLInputElement).disabled).toBe(true);
      expect((screen.getByRole('checkbox', { name: 'Acepto' }) as HTMLInputElement).disabled).toBe(true);
      expect((screen.getByLabelText('Adjunto') as HTMLInputElement).disabled).toBe(true);
    }
    if (state === 'default') expect((screen.getByRole('button', { name: 'Acción' }) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('behaviour', () => {
  it('Button fires onPress and onClick, and never while unavailable (negative)', () => {
    const press = vi.fn(); const click = vi.fn();
    render(<><Button onPress={press} onClick={click}>Guardar</Button><Button state="disabled" onPress={press}>Bloqueado</Button><Button state="loading" onPress={press}>Cargar</Button></>);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bloqueado' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cargando…' }));
    expect(press).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
  });

  it('variants are applied through class-variance-authority and merged with className', () => {
    render(<><Button variant="danger" className="w-full">Borrar</Button><Button variant="ghost">Ver</Button></>);
    expect(screen.getByRole('button', { name: 'Borrar' }).className).toContain('bg-danger');
    expect(screen.getByRole('button', { name: 'Borrar' }).className).toContain('w-full');
    expect(screen.getByRole('button', { name: 'Ver' }).className).toContain('bg-transparent');
  });

  it('Select, Checkbox, DatePicker and FileUpload report changes', () => {
    const change = vi.fn(); const pick = vi.fn();
    render(<><Select label="Tipo" options={[{ label: 'Boda', value: 'wedding' }]} onChange={change} /><Checkbox label="Acepto" value={false} onChange={change} /><DatePicker label="Fecha" onChange={change} /><FileUpload label="Archivo" onSelect={pick} /></>);
    fireEvent.change(screen.getByRole('combobox', { name: 'Tipo' }), { target: { value: 'wedding' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Acepto' }));
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-01-01' } });
    expect(change.mock.calls.map((c) => c[0])).toEqual(['wedding', true, '2026-01-01']);
    fireEvent.change(screen.getByLabelText('Archivo'), { target: { files: [new File(['x'], 'a.png')] } });
    expect(pick.mock.calls[0][0].name).toBe('a.png');
  });

  it('Modal and Sheet are real dialogs: labelled, close on Escape and via the Cerrar button', async () => {
    const onClose = vi.fn();
    const { rerender } = render(<><button>Abrir</button><Modal visible onClose={onClose} title="Confirmar">Contenido modal</Modal></>);
    expect(screen.getByRole('dialog', { name: 'Confirmar' })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
    rerender(<><button>Abrir</button><Modal visible={false} onClose={onClose} title="Confirmar">x</Modal></>);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    rerender(<Sheet visible onClose={onClose} title="Panel" state="loading">x</Sheet>);
    expect(screen.getByRole('dialog', { name: 'Panel' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Cargando…');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('Toast announces by tone, can be dismissed, auto-dismisses and renders nothing when hidden', () => {
    vi.useFakeTimers();
    const dismiss = vi.fn();
    const { rerender } = render(<Toast visible message="Guardado" onDismiss={dismiss} durationMs={1000} />);
    expect(screen.getByRole('status').textContent).toContain('Guardado');
    vi.advanceTimersByTime(1000);
    expect(dismiss).toHaveBeenCalledOnce();
    rerender(<Toast visible message="Algo falló" tone="error" />);
    expect(screen.getByRole('alert')).toBeTruthy();
    rerender(<Toast visible={false} message="x" />);
    expect(screen.queryByRole('alert')).toBeNull();
    vi.useRealTimers();
  });

  it('copy comes from UiProvider so apps can localize it', () => {
    render(<UiProvider strings={{ loading: 'Loading…', emptyTable: 'No rows.' }}><Button state="loading">Go</Button><Table columns={['A']} rows={[]} /></UiProvider>);
    expect(screen.getByRole('button', { name: 'Loading…' })).toBeTruthy();
    expect(screen.getByRole('table').textContent).toContain('No rows.');
  });
});

describe('REQ-F03-05/03: catalog renders every primitive and passes axe (structure rules)', () => {
  it('shows all five states and has no critical/serious axe violations', async () => {
    const { container } = render(<ComponentCatalog />);
    for (const state of componentStates) expect(screen.getByRole('heading', { name: `Estado: ${state}` })).toBeTruthy();
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(result.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious').map((v) => `${v.id}: ${v.nodes[0]?.html}`)).toEqual([]);
  });
});
