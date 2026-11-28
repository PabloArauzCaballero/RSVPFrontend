import { useEffect, useMemo, useState, type PropsWithChildren, type ReactNode } from "react";
import { Stack } from "expo-router";
import { useReducedMotion } from "@rsvp/ui";
import { PersistentShell, ShellStore, type NavItem } from "../host/shell";

/**
 * Navigation of the signed-in areas (host, provider, admin).
 *  - The frame (sidebar / top bar / bottom bar) is mounted once by the group layout: a tab change swaps only the content.
 *  - Top-level destinations and their section tabs swap with no slide (the content's own fade, `ScreenTransition`, is the only motion).
 *  - Drill-down screens (a guest, a catalogue item) use the platform push and its back gesture.
 *  - Reduce Motion: no slide anywhere.
 */

/** Route name of expo-router (`invitados/index`, `invitados/[guestId]`) as the path it serves. */
export const routePathOf = (routeName: string): string => `/${routeName.replace(/\/index$/, "").replace(/^index$/, "")}`;

/** Paths of the destinations and section tabs of a menu: the screens a person moves between without "going deeper". */
export function topLevelPaths(nav: readonly NavItem[]): ReadonlySet<string> {
  const paths = new Set<string>();
  const add = (href: string): void => { paths.add(href.split("?")[0] ?? href); };
  for (const item of nav) { add(item.href); item.tabs?.forEach((tab) => add(tab.href)); }
  return paths;
}

export type StackAnimation = "none" | "default";

/** `none` for a swap between top-level screens and always under Reduce Motion; the platform push otherwise. */
export function stackAnimation(routeName: string, topLevel: ReadonlySet<string>, reducedMotion: boolean): StackAnimation {
  return reducedMotion || topLevel.has(routePathOf(routeName)) ? "none" : "default";
}

/** Loads the area's screens in the background once the frame is up, so the first tab change never waits for a chunk. */
export function usePrefetchZone(load: () => Promise<unknown>): void {
  useEffect(() => { void load().catch(() => undefined); }, [load]);
}

/** The persistent frame plus a `Stack` whose animation follows the rules above. `nav` is the area's menu (any celebration: only the paths matter). */
export function ShellStack({ nav, load, children }: PropsWithChildren<{ readonly nav: readonly NavItem[]; readonly load: () => Promise<unknown> }>): ReactNode {
  const reduced = useReducedMotion();
  const [store] = useState(() => new ShellStore());
  const topLevel = useMemo(() => topLevelPaths(nav), [nav]);
  usePrefetchZone(load);
  return (
    <PersistentShell store={store}>
      <Stack screenOptions={({ route }) => ({ headerShown: false, gestureEnabled: true, animation: stackAnimation(route.name, topLevel, reduced) })} />
      {children}
    </PersistentShell>
  );
}
