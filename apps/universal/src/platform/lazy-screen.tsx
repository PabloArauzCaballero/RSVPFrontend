import { lazy, Suspense, type ComponentType, type LazyExoticComponent, type ReactNode } from "react";
import { View } from "react-native";
import { usePathname } from "expo-router";
import { spacing } from "@rsvp/design-tokens";
import { adminNav } from "../admin/routes";
import { hostNav } from "../host/routes";
import { Screen } from "../host/shell";
import { portalNav } from "../provider/routes";
import { LoadingContent } from "./loading-content";
import { loadingProfile } from "./loading-profiles";
import { useT } from "./providers";
import { useHostRoute } from "./route";

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

/** The same title, navigation and content column as the route, without mounting a screen or requesting its data. */
function ScreenLoading(): ReactNode {
  const t = useT();
  const profile = loadingProfile(usePathname());
  const { celebrationId, onNavigate } = useHostRoute();
  if (!profile) return <View style={{ padding: spacing[6] }} testID="screen-loading"><LoadingContent kind="list" /></View>;
  const nav = profile.area === "host" ? hostNav(t, celebrationId)
    : profile.area === "admin" ? adminNav(t)
    : profile.area === "portal" ? portalNav(t) : [];
  return (
    <View style={{ flex: 1 }} testID="screen-loading">
      <Screen title={t(profile.title)} {...(profile.intro ? { intro: t(profile.intro) } : {})} nav={nav} current={profile.current} onNavigate={onNavigate} animate={false}>
        <LoadingContent kind={profile.kind} />
      </Screen>
    </View>
  );
}
