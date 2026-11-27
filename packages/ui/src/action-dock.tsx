import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

/**
 * Web: nothing to dock. `StickyActions` sticks to the bottom of the scrolling area with `position: sticky` and clears the home
 * indicator with `env(safe-area-inset-bottom)`, so the dock is a transparent pass-through here. The native variant
 * (`action-dock.native.tsx`) lays the bar out under the scroll area.
 */
export function ActionDock({ children }: PropsWithChildren<{ /** Layout of the dock's box (native only). */ style?: StyleProp<ViewStyle> }>) {
  return <>{children}</>;
}
