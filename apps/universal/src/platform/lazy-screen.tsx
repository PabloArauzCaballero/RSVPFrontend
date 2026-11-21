import { lazy, Suspense, type ComponentType, type LazyExoticComponent, type ReactNode } from "react";
import { View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { SkeletonList } from "@rsvp/ui";
import { useT } from "./providers";

/**
 * Code splitting by zone (M13). A route file of a zone that most visitors never open (administration, provider portal)
 * loads its screen with `lazyScreen(loadZone, (zone) => zone.Screen)`, where `loadZone` is `() => import("…/zone-screens")`.
 * Metro emits one web chunk per `import()` target, so every route of the zone shares one chunk that is fetched the first
 * time one of them opens; the rest of the app never downloads it. On native the import resolves from the same binary.
 *
 * A failed download (offline, a deploy replaced the chunk) rejects; the route's `ErrorBoundary` shows it with a retry,
 * and the next render asks for the chunk again instead of replaying the cached failure of `React.lazy`.
 */
export function lazyScreen<TZone, TProps extends object>(load: () => Promise<TZone>, pick: (zone: TZone) => ComponentType<TProps>): ComponentType<TProps> {
  const create = (): LazyExoticComponent<ComponentType<TProps>> =>
    lazy(() => load().then((zone) => ({ default: pick(zone) }), (error: unknown) => { current = create(); throw error; }));
  let current = create();
  function LazyScreen(props: TProps): ReactNode {
    const Screen = current;
    return <Suspense fallback={<ScreenLoading />}><Screen {...props} /></Suspense>;
  }
  return LazyScreen;
}

/** While the zone's code arrives: rows shaped like content, announced as loading (never a blank page or a lone spinner). */
function ScreenLoading(): ReactNode {
  const t = useT();
  return <View style={{ padding: spacing[6] }} testID="screen-loading"><SkeletonList count={3} row={{ minHeight: 64 }} label={t("common.loading")} /></View>;
}
