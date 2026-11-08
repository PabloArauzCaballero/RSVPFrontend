import { createElement } from 'react';
import { CheckMark as DrawnCheck, type CheckMarkProps } from './check-mark';
import { useTheme } from './theme';

export type { CheckMarkProps };

/**
 * The drawn check, tone-aware of the scheme: the blue of the D and the success green are drawn for light grounds, so on the
 * dark scheme `brand` becomes sky (`onDark`) and `success` white. `white` and `onDark` already suit a night ground and stay.
 */
export function CheckMark(props: CheckMarkProps) {
  const { scheme } = useTheme();
  const tone = props.tone ?? 'brand';
  const themed = scheme === 'dark' ? (tone === 'brand' ? 'onDark' : tone === 'success' ? 'white' : tone) : tone;
  return createElement(DrawnCheck, { ...props, tone: themed });
}
