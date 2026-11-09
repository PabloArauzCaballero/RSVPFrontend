import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { MOTION, staggerDelay, type MotionDirection } from './motion';
import { Enter } from './enter';

export interface StaggerProps {
  children?: ReactNode;
  /** How many rows animate (default 8). Rows beyond the cap appear in place: a long list never delays its tail. */
  max?: number;
  stepMs?: number;
  from?: MotionDirection;
}

/**
 * A list that arrives as a list: each row enters 70 ms after the previous one, up to `max` rows (8 by default, 560 ms in
 * total). Rows keep their `key`, so a refetch that only updates data does not replay it; a row added later enters on its own.
 * Never blocks interaction: rows are in the tree and readable from the first frame.
 */
export function Stagger({ children, max = MOTION.staggerMax, stepMs = MOTION.staggerMs, from = 'down' }: StaggerProps) {
  const rows = Children.toArray(children);
  return (
    <>
      {rows.map((row, index) => {
        const key = isValidElement(row) && row.key !== null ? row.key : index;
        const delay = staggerDelay(index, max, stepMs);
        return delay === undefined ? <Fragment key={key}>{row}</Fragment> : <Enter key={key} from={from} delay={delay}>{row}</Enter>;
      })}
    </>
  );
}
