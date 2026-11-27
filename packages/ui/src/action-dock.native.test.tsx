import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { Keyboard } from 'react-native';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActionDock } from './action-dock.native';
import { createDockStore, keyboardOverlap, pickEntry } from './action-dock-shared';
import { Button, UiProvider } from './index';
import { StickyActions } from './sticky-actions';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const entry = (id: number, priority: number) => ({ id, priority, node: null });

describe('MV-A2 dock store: which bar is fixed at the bottom', () => {
  it('the highest priority wins, and among equals the most recently mounted', () => {
    expect(pickEntry([])).toBeNull();
    expect(pickEntry([entry(1, 0), entry(2, 1)])?.id).toBe(2);
    expect(pickEntry([entry(3, 0), entry(1, 1)])?.id).toBe(1);
    expect(pickEntry([entry(1, 1), entry(2, 1)])?.id).toBe(2);
  });

  it('publishing replaces, withdrawing hands the bar back to the next one, and listeners hear each real change', () => {
    const store = createDockStore();
    const heard = vi.fn();
    const stop = store.subscribe(heard);
    const screenBar = store.claim();
    const formBar = store.claim();
    store.publish(screenBar, 0, 'screen');
    store.publish(formBar, 1, 'form');
    expect(store.snapshot()?.node).toBe('form');
    store.publish(formBar, 1, 'form 2');
    expect(store.snapshot()?.node).toBe('form 2');
    store.withdraw(formBar);
    expect(store.snapshot()?.node).toBe('screen');
    store.withdraw(screenBar);
    expect(store.snapshot()).toBeNull();
    const calls = heard.mock.calls.length;
    store.withdraw(screenBar);
    expect(heard.mock.calls.length).toBe(calls);
    stop();
  });
});

describe('MV-A2 keyboardOverlap', () => {
  it('is how far the keyboard reaches over the bottom of the box, never negative', () => {
    expect(keyboardOverlap(800, 500)).toBe(300);
    expect(keyboardOverlap(800, 844)).toBe(0);
    expect(keyboardOverlap(800, 800)).toBe(0);
    expect(keyboardOverlap(Number.NaN, 500)).toBe(0);
  });
});

function Form() {
  const [name, setName] = useState('Ana');
  return (
    <div data-testid="scroll">
      <input aria-label="Nombre" value={name} onChange={(event) => setName(event.target.value)} />
      <StickyActions testID="bar"><Button>{`Guardar ${name}`}</Button></StickyActions>
    </div>
  );
}

describe('MV-A2 native ActionDock draws the bar under the scroll area', () => {
  it('renders the bar outside the scroll container, after it, and nothing where StickyActions sits', () => {
    render(<UiProvider scheme="light"><ActionDock><Form /></ActionDock></UiProvider>);
    const scroll = screen.getByTestId('scroll');
    const bar = screen.getByTestId('bar');
    expect(scroll.contains(bar)).toBe(false);
    expect(bar.getAttribute('role')).toBe('group');
    expect(scroll.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(scroll.parentElement).toBe(bar.parentElement);
    expect(getComputedStyle(bar).position).not.toBe('sticky');
  });

  it('keeps the docked buttons in step with the form state and tapping them still works', () => {
    render(<UiProvider scheme="light"><ActionDock><Form /></ActionDock></UiProvider>);
    expect(screen.getByRole('button', { name: 'Guardar Ana' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Luis' } });
    expect(screen.getByRole('button', { name: 'Guardar Luis' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Guardar Ana' })).toBeNull();
  });

  it('removes the bar when its form unmounts and lets the screen own action (priority 0) come back', () => {
    const screenAction = <StickyActions testID="screen-bar" priority={0}><Button>Siguiente</Button></StickyActions>;
    const view = (open: boolean) => <UiProvider scheme="light"><ActionDock><div>{screenAction}{open ? <StickyActions testID="form-bar"><Button>Crear</Button></StickyActions> : null}</div></ActionDock></UiProvider>;
    const { rerender } = render(view(false));
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeTruthy();
    rerender(view(true));
    expect(screen.queryByRole('button', { name: 'Siguiente' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Crear' })).toBeTruthy();
    rerender(view(false));
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Crear' })).toBeNull();
  });

  it('lifts the box by what the keyboard covers and drops it when the keyboard hides', async () => {
    const handlers = new Map<string, (event: unknown) => void>();
    vi.spyOn(Keyboard, 'addListener').mockImplementation(((name: string, handler: (event: unknown) => void) => { handlers.set(name, handler); return { remove: () => handlers.delete(name) }; }) as unknown as typeof Keyboard.addListener);
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 100, top: 100, left: 0, right: 390, bottom: 800, width: 390, height: 700, toJSON: () => ({}) });
    const { unmount } = render(<UiProvider scheme="light"><ActionDock><Form /></ActionDock></UiProvider>);
    const box = screen.getByTestId('scroll').parentElement as HTMLElement;
    expect(handlers.has('keyboardDidShow') || handlers.has('keyboardWillChangeFrame')).toBe(true);
    act(() => { (handlers.get('keyboardDidShow') ?? handlers.get('keyboardWillChangeFrame'))?.({ endCoordinates: { screenY: 500, height: 344 } }); });
    await waitFor(() => expect(getComputedStyle(box).paddingBottom).toBe('300px'));
    act(() => { handlers.get('keyboardDidHide')?.({}); });
    await waitFor(() => expect(getComputedStyle(box).paddingBottom).toBe('0px'));
    unmount();
    expect(handlers.size).toBe(0);
  });
});
