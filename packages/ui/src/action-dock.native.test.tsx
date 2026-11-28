import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActionDock } from './action-dock.native';
import { createDockStore, keyboardOverlap, pickEntry } from './action-dock-shared';
import { Button, Modal, UiProvider } from './index';
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

function Form({ onSave }: { readonly onSave?: () => void }) {
  const [name, setName] = useState('Ana');
  return (
    <div data-testid="scroll">
      <input aria-label="Nombre" value={name} onChange={(event) => setName(event.target.value)} />
      <StickyActions testID="bar"><Button onPress={onSave}>{`Guardar ${name}`}</Button></StickyActions>
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

  it('a tap on the docked button reaches the screen handler with the current state', () => {
    const save = vi.fn();
    render(<UiProvider scheme="light"><ActionDock><Form onSave={save} /></ActionDock></UiProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Ana' }));
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('the docked bar takes its horizontal padding from the dock inset', () => {
    render(<UiProvider scheme="light"><ActionDock inset={24}><Form /></ActionDock></UiProvider>);
    expect(getComputedStyle(screen.getByTestId('bar')).paddingLeft).toBe('24px');
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

  it('a StickyActions inside a Modal stays in the modal instead of landing behind it in the screen dock', () => {
    render(<UiProvider scheme="light"><ActionDock><div data-testid="scroll" /><Modal visible onClose={() => undefined} title="Hoja"><StickyActions testID="modal-bar"><Button>Dentro</Button></StickyActions></Modal></ActionDock></UiProvider>);
    const bar = screen.getByTestId('modal-bar');
    expect(bar.closest('[aria-modal=true], [role=dialog]')).not.toBeNull();
    expect(screen.getByTestId('scroll').parentElement?.contains(bar)).toBe(false);
  });

  const bounds = () => vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 100, top: 100, left: 0, right: 390, bottom: 800, width: 390, height: 700, toJSON: () => ({}) });
  const listeners = () => {
    const handlers = new Map<string, (event: unknown) => void>();
    vi.spyOn(Keyboard, 'addListener').mockImplementation(((name: string, handler: (event: unknown) => void) => { handlers.set(name, handler); return { remove: () => handlers.delete(name) }; }) as unknown as typeof Keyboard.addListener);
    return handlers;
  };

  it('Android: lifts the box by what the keyboard covers and drops it when the keyboard hides', async () => {
    const handlers = listeners();
    bounds();
    const { unmount } = render(<UiProvider scheme="light"><ActionDock><Form /></ActionDock></UiProvider>);
    const box = screen.getByTestId('scroll').parentElement as HTMLElement;
    expect([...handlers.keys()].sort()).toEqual(['keyboardDidHide', 'keyboardDidShow']);
    act(() => { handlers.get('keyboardDidShow')?.({ endCoordinates: { screenY: 500, height: 344 } }); });
    await waitFor(() => expect(getComputedStyle(box).paddingBottom).toBe('300px'));
    act(() => { handlers.get('keyboardDidHide')?.({}); });
    await waitFor(() => expect(getComputedStyle(box).paddingBottom).toBe('0px'));
    unmount();
    expect(handlers.size).toBe(0);
  });

  it('iOS: follows keyboardWillChangeFrame, including the frame that hides the keyboard', async () => {
    const handlers = listeners();
    bounds();
    const original = Platform.OS;
    Platform.OS = 'ios';
    try {
      render(<UiProvider scheme="light"><ActionDock><Form /></ActionDock></UiProvider>);
      const box = screen.getByTestId('scroll').parentElement as HTMLElement;
      expect([...handlers.keys()]).toEqual(['keyboardWillChangeFrame']);
      act(() => { handlers.get('keyboardWillChangeFrame')?.({ endCoordinates: { screenY: 560, height: 284 } }); });
      await waitFor(() => expect(getComputedStyle(box).paddingBottom).toBe('240px'));
      act(() => { handlers.get('keyboardWillChangeFrame')?.({ endCoordinates: { screenY: 844, height: 0 } }); });
      await waitFor(() => expect(getComputedStyle(box).paddingBottom).toBe('0px'));
    } finally { Platform.OS = original; }
  });

  it('a keyboard that is already open when the dock mounts lifts the bar at once (no event will come)', async () => {
    listeners();
    bounds();
    vi.spyOn(Keyboard, 'isVisible').mockReturnValue(true);
    (Keyboard as unknown as { metrics: () => unknown }).metrics = () => ({ screenX: 0, screenY: 480, width: 390, height: 364 });
    try {
      render(<UiProvider scheme="light"><ActionDock><Form /></ActionDock></UiProvider>);
      const box = screen.getByTestId('scroll').parentElement as HTMLElement;
      await waitFor(() => expect(getComputedStyle(box).paddingBottom).toBe('320px'));
    } finally { delete (Keyboard as unknown as { metrics?: unknown }).metrics; }
  });
});

describe('StickyActions ground (bar inside a card)', () => {
  const colorOf = (ground?: 'canvas' | 'surface'): string => {
    render(<UiProvider scheme="dark"><StickyActions testID="bar" {...(ground ? { ground } : {})}><Button>Ok</Button></StickyActions></UiProvider>);
    const color = getComputedStyle(screen.getByTestId('bar')).backgroundColor;
    cleanup();
    return color;
  };
  it('in the flow it paints the colour of the card it sits in, canvas by default', () => {
    const canvas = colorOf();
    const surface = colorOf('surface');
    expect(colorOf('canvas')).toBe(canvas);
    expect(surface).not.toBe(canvas);
  });
});
