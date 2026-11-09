import type { ReactNode } from 'react';
import { Platform, View, type ViewStyle } from 'react-native';
import { spacing } from '@rsvp/design-tokens';
import { ButtonAlignContext } from './press-visual';
import { useTheme } from './theme';

export interface StickyActionsProps {
  /** One primary button and, at most, one secondary or text action. They stack full-width on a phone and sit in a row from 640 px. */
  children: ReactNode;
  /** Optional line above the buttons (a total, "3 changes"). Keep it to one short line. */
  summary?: ReactNode;
  testID?: string;
}

/**
 * Bottom action bar for long forms on a phone. On web it sticks to the bottom of the scrolling area (`position: sticky`),
 * clears the home indicator (`env(safe-area-inset-bottom)`) and never covers the field being typed in, because it takes
 * its own space in the flow instead of floating over it. Native renders it in the flow after the form (the keyboard
 * avoidance belongs to the screen's scroll view). It has a top border and a surface colour so content never shows
 * through; reduced motion is irrelevant (it does not move).
 */
export function StickyActions({ children, summary, testID }: StickyActionsProps) {
  const { palette } = useTheme();
  const stick = Platform.OS === 'web'
    ? ({ position: 'sticky', bottom: 0, zIndex: 5, paddingBottom: 'max(12px, env(safe-area-inset-bottom))' } as unknown as ViewStyle)
    : { paddingBottom: spacing[3] };
  return (
    <View
      role="group"
      testID={testID}
      style={[{ backgroundColor: palette.canvas, borderTopWidth: 1, borderTopColor: palette.border, paddingTop: spacing[3], paddingHorizontal: spacing[4], gap: spacing[2], marginHorizontal: -spacing[4] }, stick]}
    >
      {summary}
      <ButtonAlignContext.Provider value="center">
        <View style={{ gap: spacing[2], flexDirection: 'column' }}>{children}</View>
      </ButtonAlignContext.Provider>
    </View>
  );
}
