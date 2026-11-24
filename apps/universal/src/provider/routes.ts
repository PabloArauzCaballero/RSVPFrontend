import type { Translate } from "@rsvp/i18n";
import type { NavItem } from "../host/shell";

/** The (provider) route group guards all portal paths. */
export const PORTAL_ROUTES = { home: "/portal", onboarding: "/portal/alta", services: "/portal/servicios", products: "/portal/productos", delivery: "/portal/entrega", destinations: "/portal/destinos", agenda: "/portal/agenda", quotes: "/portal/cotizaciones", leads: "/portal/leads", metrics: "/portal/metricas", microsite: "/portal/perfil", documents: "/portal/documentos" } as const;
export type PortalRoute = keyof typeof PORTAL_ROUTES;

const NAV: readonly { readonly key: string; readonly tabs: readonly PortalRoute[] }[] = [
  { key: "overview", tabs: ["home"] },
  { key: "offers", tabs: ["services"] },
  { key: "agenda", tabs: ["agenda"] },
  { key: "clients", tabs: ["quotes", "leads", "metrics"] },
  { key: "profile", tabs: ["microsite", "documents", "destinations"] }
];

export const portalNav = (t: Translate): NavItem[] => NAV.map((destination) => {
  const tabs = destination.tabs.map((key) => ({ key, label: t(`portal.nav.${key}`), href: PORTAL_ROUTES[key] }));
  return { key: destination.key, label: t(`portal.dest.${destination.key}`), href: tabs[0]?.href ?? PORTAL_ROUTES.home, tabs };
});

/** The three legacy offer links highlight the same tab. */
export function portalActiveRoute(current: PortalRoute): PortalRoute {
  if (current === "products" || current === "delivery") return "services";
  if (current === "onboarding") return "home";
  return current;
}
