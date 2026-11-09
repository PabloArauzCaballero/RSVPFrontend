import { useEffect, useState, type ReactNode, type RefObject } from 'react';
import { AccessibilityInfo, findNodeHandle } from 'react-native';
import { MOTION } from './motion';
import { commitScreenChange, peekScreenChange } from './motion-history';
import { Enter } from './enter';
import type { ScreenTransitionProps } from './screen-transition';

export { resetScreenHistory } from './motion-history';

export interface NativeScreenTransitionProps extends ScreenTransitionProps {
  /** The screen's heading (`Text` of the title): accessibility focus goes there after navigating. */
  headingRef?: RefObject<unknown>;
  /** The screen's `ScrollView`: back to the top after navigating. */
  scrollRef?: RefObject<{ scrollTo?: (options: { y: number; animated: boolean }) => void } | null>;
}

function Panel({ groupKey, title, headingRef, scrollRef, focusHeading, resetScroll, children }: Omit<NativeScreenTransitionProps, 'routeKey'>) {
  const [change] = useState(() => peekScreenChange(groupKey));
  useEffect(() => {
    if (!change.initial) {
      if (resetScroll !== false) scrollRef?.current?.scrollTo?.({ y: 0, animated: false });
      if (focusHeading !== false) {
        const handle = headingRef?.current ? findNodeHandle(headingRef.current as Parameters<typeof findNodeHandle>[0]) : null;
        if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
        else if (title) AccessibilityInfo.announceForAccessibility(title);
      }
    }
    commitScreenChange(groupKey);
  }, [change.initial, groupKey, title, headingRef, scrollRef, focusHeading, resetScroll]);
  if (change.initial) return <>{children}</>;
  const rise = change.kind === 'screen';
  return <Enter grow from={rise ? 'down' : 'none'} distance={MOTION.screenDistance} durationMs={rise ? MOTION.screenMs : MOTION.sectionMs}>{children}</Enter>;
}

/** Native: same contract as web. Heading focus uses VoiceOver/TalkBack (`setAccessibilityFocus`), falling back to announcing the title. */
export function ScreenTransition({ routeKey, ...rest }: NativeScreenTransitionProps): ReactNode {
  return <Panel key={routeKey} {...rest} />;
}
