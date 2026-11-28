/** Test stub: screens receive navigation as a callback, so only route files touch expo-router. */
import { createContext, createElement, useContext, type ComponentProps, type PropsWithChildren } from "react";

export const Link = (props: ComponentProps<"a">) => createElement("a", props);
/** Navigation a screen asked for, in order, so a test can assert where it went (reset with `resetRouter`). */
export const routerCalls: { readonly method: "push" | "replace" | "setParams"; readonly target: unknown }[] = [];
let searchParams: Record<string, string> = {};
export const setSearchParams = (next: Record<string, string>): void => { searchParams = next; };
export const resetRouter = (): void => { routerCalls.length = 0; searchParams = {}; };
export const useLocalSearchParams = () => searchParams;
export const useGlobalSearchParams = () => ({});
export const usePathname = () => "/celebraciones";
export const useRouter = () => ({
  push: (target: unknown) => { routerCalls.push({ method: "push", target }); },
  replace: (target: unknown) => { routerCalls.push({ method: "replace", target }); },
  setParams: (target: unknown) => { routerCalls.push({ method: "setParams", target }); }
});
export const Redirect = ({ href }: { href: string }) => `redirect:${href}` as unknown as null;
export const Stack = () => null;
export type Href = string;

type FocusEvent = "focus" | "blur";
/** One route's navigation as the navigator hands it out: the same object for the life of the route, with real focus and blur events. */
export interface TestNavigation {
  isFocused(): boolean;
  addListener(event: FocusEvent, listener: () => void): () => void;
  /** The navigator brings this route to the front (or sends it behind): the screen stays mounted and gets the event. */
  setFocused(focused: boolean): void;
}
export function createTestNavigation(initiallyFocused = true): TestNavigation {
  let focused = initiallyFocused;
  const listeners: Record<FocusEvent, Set<() => void>> = { focus: new Set(), blur: new Set() };
  return {
    isFocused: () => focused,
    addListener: (event, listener) => { listeners[event].add(listener); return () => { listeners[event].delete(listener); }; },
    setFocused: (next) => { if (next === focused) return; focused = next; listeners[next ? "focus" : "blur"].forEach((listener) => listener()); }
  };
}
const alwaysFocused = createTestNavigation();
const NavigationContext = createContext<TestNavigation>(alwaysFocused);
/** Gives a screen its own route, as each screen of a `Stack` has. Outside one, every screen is the single focused route. */
export const TestRoute = ({ navigation, children }: PropsWithChildren<{ readonly navigation: TestNavigation }>) => createElement(NavigationContext.Provider, { value: navigation }, children);
export const useNavigation = (): TestNavigation => useContext(NavigationContext);
