import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { Keyboard, Platform, View, type KeyboardEvent, type KeyboardMetrics, type StyleProp, type ViewStyle } from 'react-native';
import { ActionDockContext, createDockStore, keyboardOverlap, type DockStore } from './action-dock-shared';

function DockedBar({ store }: { readonly store: DockStore }) {
  const entry = useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);
  return entry ? <>{entry.node}</> : null;
}

/**
 * Wraps a screen's scroll area. The bar published by a `StickyActions` below it is drawn under the scroll area, full width, so
 * the scroll area simply ends where the bar begins: the content scrolls above it and nothing is covered, and the bar stays at
 * the bottom edge on every step. The bottom safe area (home indicator) is already kept clear by the root `SafeFrame`.
 *
 * Keyboard: the box lifts by however far the keyboard reaches over its bottom edge (measured in window coordinates, not
 * `KeyboardAvoidingView`, whose frame is relative to its parent and ignores what sits above it), so the bar rides on top of the
 * keyboard. A keyboard that is already open when the dock mounts (a step change that keeps the field focused) is read from
 * `Keyboard.metrics()`, and the lift is measured again whenever the box is laid out again (rotation, split view).
 * NOT handled: scrolling the focused field into the visible part of the scroll area (see docs/design/primitives.md).
 *
 * `inset` is the bar's horizontal padding: pass the screen's own content gutter.
 */
export function ActionDock({ children, style, inset }: PropsWithChildren<{ /** Layout of the dock's box; defaults to filling its parent. */ style?: StyleProp<ViewStyle>; inset?: number }>) {
  const [store] = useState(() => createDockStore(inset));
  const [lift, setLift] = useState(0);
  const box = useRef<View>(null);
  const keyboard = useRef<KeyboardMetrics | undefined>(undefined);
  const measure = useCallback(() => {
    const metrics = keyboard.current;
    if (!metrics) { setLift(0); return; }
    box.current?.measureInWindow((_x, y, _width, height) => setLift(keyboardOverlap(y + height, metrics.screenY)));
  }, []);
  useEffect(() => {
    const onFrame = (event: KeyboardEvent): void => { keyboard.current = event.endCoordinates; measure(); };
    const onHide = (): void => { keyboard.current = undefined; setLift(0); };
    const subscriptions = Platform.OS === 'ios'
      ? [Keyboard.addListener('keyboardWillChangeFrame', onFrame)]
      : [Keyboard.addListener('keyboardDidShow', onFrame), Keyboard.addListener('keyboardDidHide', onHide)];
    if (Keyboard.isVisible()) { keyboard.current = Keyboard.metrics(); measure(); }
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [measure]);
  return (
    <ActionDockContext.Provider value={store}>
      <View ref={box} collapsable={false} onLayout={measure} style={[{ flex: 1, paddingBottom: lift }, style]}>
        {children}
        <DockedBar store={store} />
      </View>
    </ActionDockContext.Provider>
  );
}
