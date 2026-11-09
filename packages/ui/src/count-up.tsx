import { useEffect, useRef, useState } from 'react';
import { Text, type TextProps } from 'react-native';
import { useReducedMotion } from './motion';

export interface CountUpProps extends Omit<TextProps, 'children'> {
  value: number;
  /** Time the figure takes to arrive (ms). Default 700: long enough to read as counting, short enough never to make anyone wait. */
  durationMs?: number;
  /** Formats the figure on screen (thousands, units). The accessibility value is always the final one. */
  format?: (n: number) => string;
}

const OUT = (t: number): number => 1 - Math.pow(1 - t, 4);

/**
 * A figure that counts up to its value when it appears and glides from the old value to the new one when it changes (a reply arrives,
 * a guest is added): the screen shows that it is live. Reduce Motion shows the final value at once. It runs on the JS clock for ~700 ms
 * per change and only changes text, so it never moves layout when the figure uses tabular numbers.
 */
export function CountUp({ value, durationMs = 700, format = String, ...rest }: CountUpProps) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);
  const from = useRef(reduced ? value : 0);
  useEffect(() => {
    if (reduced || typeof requestAnimationFrame !== 'function') { setShown(value); from.current = value; return undefined; }
    const start = from.current;
    const began = Date.now();
    let frame = 0;
    const tick = (): void => {
      const progress = Math.min(1, (Date.now() - began) / durationMs);
      const next = Math.round(start + (value - start) * OUT(progress));
      from.current = next;
      setShown(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame); };
  }, [value, durationMs, reduced]);
  return <Text {...rest} accessibilityLabel={format(value)}>{format(shown)}</Text>;
}

