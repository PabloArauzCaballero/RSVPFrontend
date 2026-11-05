import { useCallback, useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { spacing } from "@rsvp/design-tokens";
import { useMyProviders, useProviderProfile, type Provider } from "@rsvp/query-hooks";
import { useApiClient, useClaims, useT } from "../platform/providers";
import { readLocal, writeLocal } from "../platform/local-store";
import { ActionButton, ErrorNotice, Loading, Notice, Screen } from "../host/ui";

/** Provider portal URLs. They live under /portal so the (provider) route guard covers them all. */
export const PORTAL_ROUTES = { home: "/portal", onboarding: "/portal/alta", services: "/portal/servicios", products: "/portal/productos", delivery: "/portal/entrega", destinations: "/portal/destinos", agenda: "/portal/agenda", leads: "/portal/leads", metrics: "/portal/metricas", microsite: "/portal/perfil", documents: "/portal/documentos" } as const;
export type PortalRoute = keyof typeof PORTAL_ROUTES;
const NAV: readonly PortalRoute[] = ["home", "services", "products", "delivery", "microsite", "documents", "destinations", "agenda", "leads", "metrics"];

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

/** Frame of every portal screen: navigation, loading of the provider, and the "register first" state. Children receive the provider. */
export function PortalScreen({ title, current, requireProvider = true, children }: { readonly title: string; readonly current: PortalRoute; readonly requireProvider?: boolean; readonly children: (provider: Provider, refetch: () => void) => ReactNode }): ReactNode {
  const t = useT();
  const router = useRouter();
  const client = useApiClient();
  const { providerId } = useProviderId();
  const profile = useProviderProfile(client, providerId ?? undefined);
  const nav = NAV.map((key) => ({ key, label: t(`portal.nav.${key}`), href: PORTAL_ROUTES[key] }));
  const frame = (body: ReactNode): ReactNode => <Screen title={title} nav={nav} current={current} onNavigate={(href) => router.push(href as Href)}>{body}</Screen>;
  if (providerId === undefined) return frame(<Loading />);
  if (!providerId) return frame(requireProvider ? <View style={{ gap: spacing[3] }}><Notice>{t("portal.errors.noProvider")}</Notice><ActionButton label={t("portal.errors.goOnboarding")} onPress={() => router.push(PORTAL_ROUTES.onboarding as Href)} testID="go-onboarding" /></View> : children({} as Provider, () => undefined));
  if (profile.isPending) return frame(<Loading />);
  if (profile.isError || !profile.data) return frame(<ErrorNotice error={profile.error} onReload={() => { void profile.refetch(); }} />);
  return frame(children(profile.data, () => { void profile.refetch(); }));
}
