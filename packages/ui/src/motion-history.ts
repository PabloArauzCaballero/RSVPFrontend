/**
 * What the previous screen was, kept for the life of the page/app. expo-router mounts a new `Screen` for every route file,
 * so "did the route change?" cannot live in component state: the first ScreenTransition of the session is the initial load
 * (no animation, no focus move), later ones are navigations, and a different `groupKey` (destination) means a bigger change
 * than moving between sibling tabs.
 */
let mounted = false;
let lastGroup: string | undefined;

export type ScreenChange = { initial: boolean; kind: 'screen' | 'section' };

/** Pure read, safe to call in render (StrictMode calls it twice). */
export function peekScreenChange(groupKey?: string): ScreenChange {
  return { initial: !mounted, kind: mounted && groupKey !== undefined && lastGroup !== undefined && groupKey !== lastGroup ? 'screen' : 'section' };
}

/** Call from an effect once the screen is on stage. */
export function commitScreenChange(groupKey?: string): void {
  mounted = true;
  if (groupKey !== undefined) lastGroup = groupKey;
}

export function resetScreenHistory(): void {
  mounted = false;
  lastGroup = undefined;
}
