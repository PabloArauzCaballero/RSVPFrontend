import { createElement } from 'react';
import type { CheckTone } from './check-geometry';
import { CheckMark as DrawnCheck, type CheckMarkProps as DrawnProps } from './check-mark';
import { useTheme } from './theme';

export type CheckMarkTone = 'ink' | 'success';
export type CheckMarkProps = Omit<DrawnProps, 'tone'> & {
  /** `ink` (default): ink tick on a pastel green disc. `success`: green tick on the same disc. Both follow the colour scheme. */
  tone?: CheckMarkTone;
};

/** The drawn check, scheme-aware: the tokens of the light or dark scheme are picked here so a screen never names a colour. */
export function CheckMark({ tone = 'ink', ...props }: CheckMarkProps) {
  const { scheme } = useTheme();
  const resolved: CheckTone = `${tone}${scheme === 'dark' ? 'Dark' : 'Light'}`;
  return createElement(DrawnCheck, { ...props, tone: resolved });
}
