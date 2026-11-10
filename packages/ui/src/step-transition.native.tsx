import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';
import { MOTION } from './motion';
import { Enter } from './enter';
import type { StepDirection, StepTransitionProps } from './step-transition';

/** Native: the same slide through `Enter`; the step name is announced because there is no DOM focus to move. */
export function StepTransition({ step, direction, announce, children }: StepTransitionProps): ReactNode {
  const [track, setTrack] = useState<{ step: number; dir: StepDirection | 'none' }>({ step, dir: 'none' });
  let current = track;
  if (track.step !== step) {
    current = { step, dir: direction ?? (step > track.step ? 'forward' : 'back') };
    setTrack(current);
  }
  const said = useRef(announce);
  said.current = announce;
  useEffect(() => {
    if (current.dir !== 'none' && said.current) AccessibilityInfo.announceForAccessibility(said.current);
  }, [current.dir, current.step]);
  if (current.dir === 'none') return <>{children}</>;
  return <Enter key={step} from={current.dir === 'forward' ? 'right' : 'left'} distance={MOTION.stepDistance} durationMs={MOTION.stepMs}>{children}</Enter>;
}
