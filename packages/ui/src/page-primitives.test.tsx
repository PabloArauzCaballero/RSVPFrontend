import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FILTER_SELECT_THRESHOLD, FilterSelect, OverflowMenu, UiProvider, stringsFor } from './index';

afterEach(cleanup);

const items = () => [
  { key: 'import', label: 'Importar', onPress: vi.fn() },
  { key: 'off', label: 'No disponible', onPress: vi.fn(), disabled: true },
  { key: 'delete', label: 'Eliminar', onPress: vi.fn(), destructive: true }
];

describe('OverflowMenu', () => {
  it('opens upward when the items do not fit below the trigger, so focusing the first item never scrolls (a scroll closes the menu)', () => {
    render(<UiProvider><OverflowMenu items={items()} /></UiProvider>);
    const trigger = screen.getByRole('button', { name: 'Más opciones' });
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({ top: window.innerHeight - 60, bottom: window.innerHeight - 16, left: 0, right: 40, width: 44, height: 44, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.click(trigger);
    const menu = screen.getByRole('menu');
    expect(menu.style.bottom).not.toBe('');
    expect(menu.style.top).toBe('');
  });

  it('names the trigger from i18n in both languages and starts closed', () => {
    const { rerender } = render(<UiProvider strings={stringsFor('es-BO')}><OverflowMenu items={items()} /></UiProvider>);
    const trigger = screen.getByRole('button', { name: 'Más opciones' });
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('menu')).toBeNull();
    rerender(<UiProvider strings={stringsFor('en-US')}><OverflowMenu items={items()} /></UiProvider>);
    expect(screen.getByRole('button', { name: 'More options' })).toBeTruthy();
  });

  it('opens a menu, focuses the first item, skips disabled items with the arrows, wraps and supports Home/End', () => {
    render(<UiProvider><OverflowMenu items={items()} /></UiProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Más opciones' }));
    const menu = screen.getByRole('menu');
    const entries = within(menu).getAllByRole('menuitem');
    expect(entries).toHaveLength(3);
    expect(document.activeElement).toBe(entries[0]);
    fireEvent.keyDown(entries[0] as HTMLElement, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(entries[2]);
    fireEvent.keyDown(entries[2] as HTMLElement, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(entries[0]);
    fireEvent.keyDown(entries[0] as HTMLElement, { key: 'End' });
    expect(document.activeElement).toBe(entries[2]);
    fireEvent.keyDown(entries[2] as HTMLElement, { key: 'Home' });
    expect(document.activeElement).toBe(entries[0]);
  });

  it('Escape closes and returns the focus to the trigger; choosing an item runs it and closes', () => {
    const list = items();
    render(<UiProvider><OverflowMenu items={list} /></UiProvider>);
    const trigger = screen.getByRole('button', { name: 'Más opciones' });
    fireEvent.click(trigger);
    fireEvent.keyDown(within(screen.getByRole('menu')).getAllByRole('menuitem')[0] as HTMLElement, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Eliminar' }));
    expect(list[2]?.onPress).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('does not run a disabled item, closes on an outside press and on Tab, and renders nothing without items', () => {
    const list = items();
    const { container } = render(<UiProvider><OverflowMenu items={list} /></UiProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Más opciones' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'No disponible' }));
    expect(list[1]?.onPress).not.toHaveBeenCalled();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Más opciones' }));
    fireEvent.keyDown(screen.getAllByRole('menuitem')[0] as HTMLElement, { key: 'Tab' });
    expect(screen.queryByRole('menu')).toBeNull();
    cleanup();
    const empty = render(<OverflowMenu items={[]} />);
    expect(empty.container.textContent).toBe('');
    expect(container).toBeTruthy();
  });

  it('passes axe with the menu open (light and dark)', async () => {
    for (const scheme of ['light', 'dark'] as const) {
      const { container, unmount } = render(<UiProvider scheme={scheme}><OverflowMenu items={items()} /></UiProvider>);
      fireEvent.click(screen.getByRole('button', { name: 'Más opciones' }));
      const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
      expect(result.violations.map((violation) => violation.id)).toEqual([]);
      unmount();
    }
  });
});

const options = [
  { value: 'all', label: 'Todos', count: 12 },
  { value: 'pending', label: 'Sin responder', count: 5 },
  { value: 'yes', label: 'Confirmó' },
  { value: 'no', label: 'No asistirá', count: 0 }
];

describe('FilterSelect', () => {
  it('is a labelled native select with the selected value, optional counts and a 44 px minimum height', () => {
    render(<UiProvider><FilterSelect label="Filtrar invitados" options={options} value="pending" onChange={() => undefined} /></UiProvider>);
    const select = screen.getByRole('combobox', { name: 'Filtrar invitados' }) as HTMLSelectElement;
    expect(select.value).toBe('pending');
    expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual(['Todos (12)', 'Sin responder (5)', 'Confirmó', 'No asistirá (0)']);
    expect(select.style.minHeight).toBe('44px');
  });

  it('reports the chosen value and follows the controlled value', () => {
    const onChange = vi.fn();
    const { rerender } = render(<UiProvider><FilterSelect label="Filtrar" options={options} value="all" onChange={onChange} /></UiProvider>);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'yes' } });
    expect(onChange).toHaveBeenCalledWith('yes');
    rerender(<UiProvider><FilterSelect label="Filtrar" options={options} value="no" onChange={onChange} /></UiProvider>);
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('no');
  });

  it('themes the control per scheme, passes axe, renders nothing with no options and exposes the threshold', async () => {
    const light = render(<UiProvider scheme="light"><FilterSelect label="Filtrar" options={options} value="all" onChange={() => undefined} /></UiProvider>);
    const lightBg = (screen.getByRole('combobox') as HTMLElement).style.backgroundColor;
    light.unmount();
    const dark = render(<UiProvider scheme="dark"><FilterSelect label="Filtrar" options={options} value="all" onChange={() => undefined} /></UiProvider>);
    expect((screen.getByRole('combobox') as HTMLElement).style.backgroundColor).not.toBe(lightBg);
    expect((screen.getByRole('combobox') as HTMLElement).style.colorScheme).toBe('dark');
    const result = await axe.run(dark.container, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
    dark.unmount();
    expect(render(<FilterSelect label="x" options={[]} value="" onChange={() => undefined} />).container.textContent).toBe('');
    expect(FILTER_SELECT_THRESHOLD).toBe(3);
  });
});
