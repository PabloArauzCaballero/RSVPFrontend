import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { spacing } from "@rsvp/design-tokens";
import { useMyProviders, useProviderProfile, type Provider } from "@rsvp/query-hooks";
import { LoadingContent } from "../platform/loading-content";
import { PORTAL_LOADING } from "../platform/loading-profiles";
import { useApiClient, useClaims, useT } from "../platform/providers";
import { readLocal, writeLocal } from "../platform/local-store";
import { ActionButton, ErrorNotice, Notice, OverflowMenu, Screen } from "../host/ui";
import { PORTAL_ROUTES, portalActiveRoute, portalNav, type PortalRoute } from "./routes";

export { PORTAL_ROUTES, portalNav, type PortalRoute } from "./routes";

const storageKey = (userId: string): string => `rsvp.provider.${userId}`;

/**
 * "My provider": GET /providers/mine (provider-catalog 2.1.0) is the source of truth. The id remembered on this device only
 * chooses among several providers, and still works when the endpoint is not reachable (older gateway).
 */
export function useProviderId(): { readonly providerId: string | null | undefined; readonly providers: readonly Provider[]; readonly remember: (id: string) => Promise<void> } {
  const { userId } = useClaims();
  const client = useApiClient();
  const mine = useMyProviders(client, Boolean(userId));
  const [stored, setStored] = useState<string | null | undefined>(undefined);
  useEffect(() => { if (!userId) return; let alive = true; void readLocal(storageKey(userId)).then((value) => { if (alive) setStored(value); }); return () => { alive = false; }; }, [userId]);
  const remember = useCallback(async (id: string) => { if (userId) await writeLocal(storageKey(userId), id); setStored(id); }, [userId]);
  const providers = mine.data?.items ?? [];
  if (stored === undefined || (mine.isPending && !stored)) return { providerId: undefined, providers, remember };
  const chosen = providers.find((provider) => provider.id === stored)?.id ?? providers[0]?.id ?? stored;
  return { providerId: chosen, providers, remember };
}

/** The one primary action of a screen (top right of the header; bottom bar on a phone). */
export interface HeaderPrimary { readonly icon?: string; readonly label: string; readonly onPress: () => void; readonly testID?: string; readonly busy?: boolean; readonly disabled?: boolean }
/** A secondary action, kept behind the "⋯" menu. */
export interface HeaderMenuItem { readonly key: string; readonly label: string; readonly onPress: () => void; readonly destructive?: boolean; readonly disabled?: boolean }
interface HeaderSpec { readonly primary?: HeaderPrimary | undefined; readonly menu?: readonly HeaderMenuItem[] | undefined }
const HeaderSlot = createContext<((spec: HeaderSpec | null) => void) | null>(null);

/**
 * A screen body declares its header actions here and the frame renders them in `Screen` (`actions` + `menu`). Only the plain data
 * (labels, flags) is compared, so a handler that changes every render never loops; the latest handler is always the one called.
 */
export function usePortalHeader(primary: HeaderPrimary | undefined, menu?: readonly HeaderMenuItem[]): void {
  const set = useContext(HeaderSlot);
  const latest = useRef({ primary, menu });
  latest.current = { primary, menu };
  const signature = JSON.stringify([primary ? [primary.icon, primary.label, primary.testID, primary.busy, primary.disabled] : null, (menu ?? []).map((item) => [item.key, item.label, item.destructive, item.disabled])]);
  useEffect(() => {
    if (!set) return undefined;
    const current = latest.current;
    set({
      primary: current.primary ? { ...current.primary, onPress: () => latest.current.primary?.onPress() } : undefined,
      menu: (current.menu ?? []).map((item, index) => ({ ...item, onPress: () => latest.current.menu?.[index]?.onPress() }))
    });
    return () => set(null);
  }, [signature, set]);
}

/** Frame of every portal screen: navigation, loading of the provider, and the "register first" state. Children receive the provider. */
export function PortalScreen({ title, current, requireProvider = true, children }: { readonly title: string; readonly current: PortalRoute; readonly requireProvider?: boolean; readonly children: (provider: Provider, refetch: () => void) => ReactNode }): ReactNode {
  const t = useT();
  const router = useRouter();
  const client = useApiClient();
  const { providerId } = useProviderId();
  const profile = useProviderProfile(client, providerId ?? undefined);
  const nav = portalNav(t);
  // Services, products and delivery terms are one list of offers: the three routes stay (shared links) and light the one tab.
  const active = portalActiveRoute(current);
  const [header, setHeader] = useState<HeaderSpec | null>(null);
  const actions = header?.primary ? <ActionButton {...(header.primary.icon ? { icon: header.primary.icon } : {})} label={header.primary.label} onPress={header.primary.onPress} busy={header.primary.busy ?? false} disabled={header.primary.disabled ?? false} {...(header.primary.testID ? { testID: header.primary.testID } : {})} /> : undefined;
  const menu = header?.menu?.length ? <OverflowMenu testID="more-options" items={header.menu} /> : undefined;
  const frame = (body: ReactNode): ReactNode => <HeaderSlot.Provider value={setHeader}><Screen title={title} nav={nav} current={active} onNavigate={(href) => router.push(href as Href)} {...(actions ? { actions } : {})} {...(menu ? { menu } : {})}>{body}</Screen></HeaderSlot.Provider>;
  const loading = <LoadingContent kind={PORTAL_LOADING[!requireProvider && current === "home" ? "onboarding" : current].kind} />;
  if (providerId === undefined) return frame(loading);
  if (!providerId) return frame(requireProvider ? <View style={{ gap: spacing[3] }}><Notice>{t("portal.errors.noProvider")}</Notice><ActionButton icon="arrow" label={t("portal.errors.goOnboarding")} onPress={() => router.push(PORTAL_ROUTES.onboarding as Href)} testID="go-onboarding" /></View> : children({} as Provider, () => undefined));
  if (profile.isPending) return frame(loading);
  if (profile.isError || !profile.data) return frame(<ErrorNotice error={profile.error} onReload={() => { void profile.refetch(); }} />);
  return frame(children(profile.data, () => { void profile.refetch(); }));
}
