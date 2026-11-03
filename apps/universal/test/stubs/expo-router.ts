/** Test stub: screens receive navigation as a callback, so only route files touch expo-router. */
export const useLocalSearchParams = () => ({});
export const useGlobalSearchParams = () => ({});
export const usePathname = () => "/celebraciones";
export const useRouter = () => ({ push: () => undefined, replace: () => undefined });
export const Redirect = ({ href }: { href: string }) => `redirect:${href}` as unknown as null;
export const Stack = () => null;
export type Href = string;
