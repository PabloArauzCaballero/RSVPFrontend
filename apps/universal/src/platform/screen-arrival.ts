import { useEffect, useLayoutEffect, useSyncExternalStore, type RefObject } from "react";
import { Platform } from "react-native";
import { useNavigation } from "expo-router";
import { moveScreenFocus, screenFocusWasLost } from "@rsvp/ui";

/**
 * What happens when a screen comes to the front. A `Stack` keeps earlier screens mounted, so "mounted" says nothing about
 * what the person sees: going back shows a screen that never mounts again, and a hidden one re-renders on its own queries.
 * Everything here follows the navigator's focus instead (docs/design/motion.md §8).
 */

/** Whether this screen is the one in front. Re-renders on the navigator's `focus` and `blur`. */
export function useScreenFocused(): { readonly focused: boolean; readonly route: object } {
  const navigation = useNavigation();
  const focused = useSyncExternalStore(
    (notify) => { const unfocus = navigation.addListener("blur", notify); const focus = navigation.addListener("focus", notify); return () => { unfocus(); focus(); }; },
    () => navigation.isFocused(),
    () => true
  );
  // The navigation object is one per route: it identifies the screen across redraws.
  return { focused, route: navigation };
}

type Target = "heading" | "tab";
interface Arrival { readonly route: object; readonly target: Target; readonly node: unknown }

let last: Arrival | undefined;
let requestedTab: string | undefined;

/** A section tab was activated: the screen it opens keeps focus on its own copy of that tab, not on the title. */
export function requestTabFocus(key: string): void { requestedTab = key; }

/** Tests: the next screen is the first one of the session again. */
export function resetScreenArrivals(): void {
  last = undefined;
  requestedTab = undefined;
  baseTitle = undefined;
}

interface ArrivalTargets { readonly heading: RefObject<unknown>; readonly tab: RefObject<unknown> }

function arrive(route: object, current: string | undefined, title: string, { heading, tab }: ArrivalTargets): void {
  const move = (target: Target): Arrival => ({ route, target, node: moveScreenFocus(target === "tab" ? tab.current : heading.current, title) });
  if (last?.route === route) {
    // The same screen drawn anew (the code-loading frame gave way to the screen): give focus back only if it went with the old one.
    if (screenFocusWasLost(last.node)) last = move(last.target);
    return;
  }
  const wanted = requestedTab;
  requestedTab = undefined;
  // The first screen of the session keeps the browser's own focus: moving it on load would be focus theft.
  if (!last) { last = { route, target: "heading", node: null }; return; }
  last = move(wanted !== undefined && wanted === current && tab.current ? "tab" : "heading");
}

let baseTitle: string | undefined;

/** Web: the tab, the history and screen readers name the screen in front. Returns the undo (only if nobody renamed it since). */
function nameDocument(title: string): () => void {
  baseTitle ??= document.title;
  const base = baseTitle;
  const name = base ? `${title} · ${base}` : title;
  document.title = name;
  return () => { if (document.title === name) document.title = base; };
}

/**
 * Called by `Screen`. While in front, names the document after the screen; each time it comes to the front after a
 * navigation (menu, link, browser back and forward) moves focus to its title, or to the section tab that opened it.
 * Redraws that are not a navigation (a resize across the breakpoint, new data) move nothing.
 */
export function useScreenArrival(focused: boolean, route: object, title: string, current: string | undefined, targets: ArrivalTargets): void {
  useLayoutEffect(() => (focused && Platform.OS === "web" ? nameDocument(title) : undefined), [focused, title]);
  useEffect(() => { if (focused) arrive(route, current, title, targets); }, [focused, route]);
}
