import { useEffect, useRef, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { Keyboard, Platform, View, type KeyboardEvent, type StyleProp, type ViewStyle } from 'react-native';
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
 * `KeyboardAvoidingView`, whose frame is relative to its parent and ignores what sits above it). The bar rides on top of the
 * keyboard and the scroll area shrinks, so the field being typed in is never under the bar.
 */
export function ActionDock({ children, style }: PropsWithChildren<{ /** Layout of the dock's box; defaults to filling its parent. */ style?: StyleProp<ViewStyle> }>) {
  const [store] = useState(createDockStore);
  const [lift, setLift] = useState(0);
  const box = useRef<View>(null);
  useEffect(() => {
    const onFrame = (event: KeyboardEvent): void => {
      box.current?.measureInWindow((_x, y, _width, height) => setLift(keyboardOverlap(y + height, event.endCoordinates.screenY)));
    };
    const subscriptions = Platform.OS === 'ios'
      ? [Keyboard.addListener('keyboardWillChangeFrame', onFrame)]
      : [Keyboard.addListener('keyboardDidShow', onFrame), Keyboard.addListener('keyboardDidHide', () => setLift(0))];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, []);
  return (
    <ActionDockContext.Provider value={store}>
      <View ref={box} collapsable={false} style={[{ flex: 1, paddingBottom: lift }, style]}>
        {children}
        <DockedBar store={store} />
      </View>
    </ActionDockContext.Provider>
  );
}
