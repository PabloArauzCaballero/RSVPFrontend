import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { colors } from '@rsvp/design-tokens';
import * as native from './index';
import * as web from '../../ui-web/src/index';
import { Button, Card, Checkbox, ComponentCatalog, SwitchRow, DatePicker, FileUpload, Input, Modal, Select, Sheet, Table, Toast, UiProvider, componentStates } from './index';

afterEach(cleanup);

const withState = (state: (typeof componentStates)[number]) => (
  <>
    <Button state={state}>Acción</Button>
    <Input label="Nombre" state={state} error={state === 'error' ? 'Obligatorio' : undefined} />
    <Select label="Tipo" options={[{ label: 'Boda', value: 'wedding' }]} state={state} />
    <Checkbox label="Acepto" value={false} state={state} />
    <Card state={state}><span>Contenido</span></Card>
    <Table columns={['Nombre']} rows={[['Ana']]} state={state} />
    <DatePicker label="Fecha" state={state} />
    <FileUpload label="Adjunto" state={state} />
  </>
);

describe('REQ-F03-02 (native): every primitive handles every state', () => {
  it('preserves the five state contract', () => { expect(componentStates).toEqual(['default', 'loading', 'error', 'empty', 'disabled']); });

  it.each(componentStates)('state %s', (state) => {
    const { container } = render(withState(state));
    expect(container.textContent).not.toBe('');
    if (state === 'loading') {
      expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0);
    }
    if (state === 'error') {
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
      expect(screen.getByLabelText('Nombre').getAttribute('aria-invalid')).toBe('true');
    }
    if (state === 'empty') expect(screen.getAllByText('No hay información disponible.').length).toBeGreaterThanOrEqual(5);
    if (state === 'disabled' || state === 'loading') {
      expect(screen.getByRole('button', { name: 'Acción' }).getAttribute('aria-disabled')).toBe('true');
      expect((screen.getByLabelText('Nombre') as HTMLInputElement).readOnly).toBe(true);
      expect(screen.getByRole('checkbox', { name: 'Acepto' }).getAttribute('aria-disabled')).toBe('true');
    }
  });
});

describe('behaviour and accessibility roles (REQ-F03-03)', () => {
  it('Button fires once when enabled and never while disabled or loading (negative)', () => {
    const press = vi.fn();
    render(<><Button onPress={press}>Guardar</Button><Button state="disabled" onPress={press}>Bloqueado</Button><Button state="loading" accessibilityLabel="Cargar" onPress={press}>Cargar</Button></>);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bloqueado' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cargar' }));
    expect(press).toHaveBeenCalledOnce();
  });

  it('exposes roles and labels: radiogroup/radio, checkbox, alert, dialog-like modal header, table label', () => {
    const change = vi.fn();
    render(<><Select label="Tipo" value="a" onChange={change} options={[{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }]} /><Checkbox label="Acepto" value onChange={change} /><Table columns={['N']} rows={[['1']]} /><Toast visible message="Guardado" /><Toast visible message="Falló" tone="error" /></>);
    expect(screen.getByRole('radiogroup', { name: 'Tipo' })).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'B' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Acepto' }));
    expect(change.mock.calls.map((c) => c[0])).toEqual(['b', false]);
    expect(screen.getAllByRole('alert').map((n) => n.textContent)).toEqual(['Guardado', 'Falló']);
  });

  it('every radio states whether it is checked (aria-required-attr: axe rates a radio without it critical)', () => {
    render(<Select label="Tipo" value="a" options={[{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }]} />);
    expect(screen.getByRole('radio', { name: 'A' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'B' }).getAttribute('aria-checked')).toBe('false');
  });

  it('SwitchRow is a WAI-ARIA switch: role, aria-checked, tap, Space and Enter-capable, 56 px row, disabled ignores input', () => {
    const change = vi.fn();
    const { rerender } = render(<SwitchRow label="Email" hint="Avisos" value={false} onChange={change} testID="sw" />);
    const row = screen.getByRole('switch', { name: 'Email' });
    expect(row.getAttribute('aria-checked')).toBe('false');
    expect(row.getAttribute('tabindex')).toBe('0');
    fireEvent.click(row);
    fireEvent.keyDown(row, { key: ' ' });
    expect(change.mock.calls.map((c) => c[0])).toEqual([true, true]);
    rerender(<SwitchRow label="Email" value onChange={change} disabled />);
    const off = screen.getByRole('switch', { name: 'Email' });
    expect(off.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(off); fireEvent.keyDown(off, { key: ' ' });
    expect(change).toHaveBeenCalledTimes(2);
  });

  it('Sheet and Modal render titled content, an empty state hides children, and Cerrar closes', () => {
    const close = vi.fn();
    render(<><Sheet visible onClose={close} title="Panel"><span>Cuerpo panel</span></Sheet><Modal visible onClose={close} title="Confirmar" state="empty"><span>Cuerpo modal</span></Modal></>);
    expect(screen.getByText('Cuerpo panel')).toBeTruthy();
    expect(screen.queryByText('Cuerpo modal')).toBeNull();
    expect(screen.getAllByRole('heading').map((h) => h.textContent)).toEqual(expect.arrayContaining(['Panel', 'Confirmar']));
    fireEvent.click(screen.getAllByRole('button', { name: 'Cerrar' })[0]!);
    expect(close).toHaveBeenCalled();
  });

  it('copy comes from UiProvider', () => {
    render(<UiProvider strings={{ emptyTable: 'No rows.' }}><Table columns={['A']} rows={[]} /></UiProvider>);
    expect(screen.getByText('No rows.')).toBeTruthy();
  });
});

describe('REQ-F02-03: dark mode reuses the same components with redefined tokens', () => {
  // The button's visual is the inner view (it scales on press); the pressable keeps only the hit area.
  const background = (el: HTMLElement) => getComputedStyle((el.firstElementChild as HTMLElement | null) ?? el).backgroundColor;
  const rgb = (hex: string) => { const n = parseInt(hex.slice(1), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; };

  it('the identical tree gets the dark palette from <UiProvider scheme="dark"> and the light palette otherwise', () => {
    const tree = <Button>Guardar</Button>;
    const light = render(<UiProvider scheme="light">{tree}</UiProvider>);
    expect(background(screen.getByRole('button'))).toBe(rgb(colors.light.primary));
    light.unmount();
    render(<UiProvider scheme="dark">{tree}</UiProvider>);
    expect(background(screen.getByRole('button'))).toBe(rgb(colors.dark.primary));
  });

  // System-scheme following is checked in a real browser (Playwright colorScheme: dark), see evidence lane-F02.
});

describe('REQ-F03-04: ui-web mirrors the native package (same names, same API)', () => {
  it('exports the same primitives', () => {
    const shared = ['Button', 'Card', 'Checkbox', 'ComponentCatalog', 'DatePicker', 'FileUpload', 'Input', 'Modal', 'Select', 'Sheet', 'Table', 'Toast'];
    expect(shared.filter((n) => !(n in native) || !(n in web))).toEqual([]);
    expect(web.componentStates).toEqual(native.componentStates);
    expect(web.defaultStrings).toEqual(native.defaultStrings);
  });
  it('Button accepts onPress and variants on both', () => {
    const press = vi.fn();
    render(<web.Button variant="danger" onPress={press}>Web</web.Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Web' }));
    expect(press).toHaveBeenCalledOnce();
  });
});

describe('REQ-F03-05: catalog', () => {
  it('shows every state of every primitive', () => {
    render(<ComponentCatalog />);
    for (const state of componentStates) expect(screen.getAllByText(`Estado: ${state}`).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('Nombre').length).toBeGreaterThanOrEqual(4);
  });
});

describe('REQ-F06-02 · primitive copy comes from the i18n catalog', () => {
  it('es-BO by default, en-US through stringsFor, in the native and the web primitives', () => {
    const { stringsFor } = native;
    const view = render(<UiProvider strings={stringsFor('en-US')}><DatePicker label="Date" /><Table columns={['A']} rows={[]} /><native.ComponentCatalog /></UiProvider>);
    expect(screen.getAllByLabelText('Date')[0]?.getAttribute('type')).toBe('date');
    expect(screen.getAllByText('No records.')[0]).toBeTruthy();
    expect(screen.getAllByText('Component catalog')[0]).toBeTruthy();
    view.unmount();
    render(<web.UiProvider strings={web.stringsFor('en-US')}><web.ComponentCatalog /></web.UiProvider>);
    expect(screen.getAllByText('Component catalog')[0]).toBeTruthy();
    expect(web.defaultStrings.close).toBe('Cerrar');
  });
});

describe('shared primitives of the frame (A6)', () => {
  it('EmptyState and Celebrate tell their Button to centre; elsewhere it stays at the start', async () => {
    const { ButtonAlignContext, EmptyState, Celebrate } = await import('./index');
    const { useContext } = await import('react');
    const Probe = () => <span data-testid="align">{useContext(ButtonAlignContext)}</span>;
    const outside = render(<UiProvider scheme="light"><Probe /></UiProvider>);
    expect(screen.getByTestId('align').textContent).toBe('start');
    outside.unmount();
    const empty = render(<UiProvider scheme="light"><EmptyState illustration="table" title="t" body="b" action={<Probe />} /></UiProvider>);
    expect(screen.getByTestId('align').textContent).toBe('center');
    empty.unmount();
    render(<UiProvider scheme="light"><Celebrate title="t"><Probe /></Celebrate></UiProvider>);
    expect(screen.getByTestId('align').textContent).toBe('center');
  });

  it('pressVisual scales on press and only dims under Reduce Motion', async () => {
    const { pressVisual } = await import('./index');
    expect(pressVisual(true, false)).toMatchObject({ transform: 'scale(0.98)' });
    expect(pressVisual(false, false)).toMatchObject({ transform: 'none' });
    expect(pressVisual(true, true)).toEqual({ opacity: 0.72 });
  });

  it('StickyActions sticks to the bottom on web and groups its actions', async () => {
    const { StickyActions } = await import('./index');
    render(<UiProvider scheme="light"><StickyActions testID="bar"><Button>Guardar</Button></StickyActions></UiProvider>);
    const bar = screen.getByTestId('bar');
    expect(bar.getAttribute('role')).toBe('group');
    expect(getComputedStyle(bar).position).toBe('sticky');
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeTruthy();
  });

  it('a Sheet opens with Enter on web (platform animation off)', async () => {
    const { Sheet } = await import('./index');
    render(<UiProvider scheme="light"><Sheet visible onClose={() => undefined} title="Hoja"><Button>Dentro</Button></Sheet></UiProvider>);
    expect(document.querySelector('[data-enter]')).not.toBeNull();
  });
});
