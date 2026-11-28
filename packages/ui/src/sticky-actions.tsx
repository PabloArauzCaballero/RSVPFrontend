import { useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { Platform, View, type ViewStyle } from 'react-native';
import { spacing } from '@rsvp/design-tokens';
import { ActionDockContext } from './action-dock-shared';
import { ButtonAlignContext } from './press-visual';
import { useTheme } from './theme';

export interface StickyActionsProps {
  /** One primary button and, at most, one secondary or text action. They stack full-width on a phone and sit in a row from 640 px. */
  children: ReactNode;
  /** Optional line above the buttons (a total, "3 changes"). Keep it to one short line. */
  summary?: ReactNode;
  testID?: string;
  /**
   * How far the bar reaches past its column on each side (default `spacing[4]`, for screens whose content sits 16 px from
   * the edge). Pass 0 in a centred column with its own padding, so the top line lines up with the fields above it. Only the
   * in-flow bar (web, or native without an `ActionDock`) uses it: a docked bar is full width with the dock's `inset` as horizontal padding.
   */
  bleed?: number;
  /**
   * Which bar wins when several are mounted under one dock (native only): the highest priority, then the most recently mounted.
   * Default 1; the screen shell's own header action uses 0 so a form's "Save" replaces it while the form is open.
   */
  priority?: number;
  /**
   * Colour behind the in-flow bar: `surface` when it sits inside a card (a form `Section`), so it does not draw a darker band across it.
   * A docked bar lives outside the cards, on the page `canvas`, and ignores it.
   */
  ground?: 'canvas' | 'surface';
}

/** Widest a docked bar's content grows (a tablet): the buttons keep a phone-like width instead of spanning the screen. */
const DOCKED_MAX_WIDTH = 560;

/**
 * Bottom action bar for long forms on a phone (decision MV-D1: the action is always fixed at the bottom, the content scrolls).
 *
 * - Web: sticks to the bottom of the scrolling area (`position: sticky`), clears the home indicator
 *   (`env(safe-area-inset-bottom)`) and never covers the field being typed in, because it takes its own space in the flow.
 * - Native, under an `ActionDock` (the screen shells): the bar is drawn by the dock under the scroll area, fixed at the bottom
 *   edge above the safe area, and this component renders nothing where it sits. The keyboard lifts it (see `ActionDock`).
 * - Native without a dock: renders in the flow after the form, as before.
 *
 * It has a top border and an opaque surface colour so content never shows through; reduced motion is irrelevant (it does not move).
 * The docked bar is rebuilt from this component's props on every render, so state used by its buttons stays current; React
 * contexts provided between the dock and this component are not visible to the buttons, only those above the dock.
 */
export function StickyActions({ children, summary, testID, bleed = spacing[4], priority = 1, ground = 'canvas' }: StickyActionsProps) {
  const { palette } = useTheme();
  const dock = useContext(ActionDockContext);
  const [slot] = useState(() => dock?.claim() ?? 0);
  const buttons = (
    <ButtonAlignContext.Provider value="center">
      <View style={{ gap: spacing[2], flexDirection: 'column' }}>{children}</View>
    </ButtonAlignContext.Provider>
  );
  const docked = dock ? (
    <View role="group" testID={testID} style={{ backgroundColor: palette.canvas, borderTopWidth: 1, borderTopColor: palette.border, paddingTop: spacing[3], paddingBottom: spacing[3], paddingHorizontal: dock.inset }}>
      <View style={{ width: '100%', maxWidth: DOCKED_MAX_WIDTH, alignSelf: 'center', gap: spacing[2] }}>
        {summary}
        {buttons}
      </View>
    </View>
  ) : null;
  // Every render republishes, in a layout effect so the dock paints the same frame as the form (busy/disabled never lag).
  useLayoutEffect(() => { if (dock && docked) dock.publish(slot, priority, docked); });
  useEffect(() => () => { dock?.withdraw(slot); }, [dock, slot]);
  if (dock) return null;
  const stick = Platform.OS === 'web'
    ? ({ position: 'sticky', bottom: 0, zIndex: 5, paddingBottom: 'max(12px, env(safe-area-inset-bottom))', backdropFilter: 'saturate(180%) blur(20px)', WebkitBackdropFilter: 'saturate(180%) blur(20px)' } as unknown as ViewStyle)
    : { paddingBottom: spacing[3] };
  return (
    <View
      role="group"
      testID={testID}
      style={[{ backgroundColor: Platform.OS === 'web' ? `${palette[ground]}E6` : palette[ground], borderTopWidth: 1, borderTopColor: palette.border, paddingTop: spacing[3], paddingHorizontal: bleed, gap: spacing[2], marginHorizontal: -bleed }, stick]}
    >
      {summary}
      {buttons}
    </View>
  );
}
