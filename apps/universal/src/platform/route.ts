import { useLocalSearchParams, useRouter, type Href } from "expo-router";

/** Route glue: the celebration in `?c=`, and navigation as a plain callback for the screens. */
export function useHostRoute(): { readonly celebrationId: string | undefined; readonly onNavigate: (href: string) => void; readonly params: Readonly<Record<string, string | undefined>> } {
  const params = useLocalSearchParams<Record<string, string>>();
  const router = useRouter();
  const first = (value: string | string[] | undefined): string | undefined => (Array.isArray(value) ? value[0] : value);
  // Expo Router accepts any app path as an Href string; paths come from HOST_ROUTES and ADMIN_ROUTES.
  return { celebrationId: first(params["c"]) || undefined, onNavigate: (href) => router.push(href as Href), params: Object.fromEntries(Object.entries(params).map(([key, value]) => [key, first(value)])) };
}
