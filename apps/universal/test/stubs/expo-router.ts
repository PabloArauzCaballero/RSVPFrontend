/** Test stub: screens receive navigation as a callback, so only route files touch expo-router. */
import { createElement, type ComponentProps } from "react";

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
