import type { Translate } from "@rsvp/i18n";
import type { NavItem } from "../host/shell";

export const ADMIN_ROUTES = {
  dashboard: "/admin",
  templates: "/admin/templates",
  eventTypes: "/admin/tipos-evento",
  categories: "/admin/categorias",
  geography: "/admin/geografia",
  verification: "/admin/verificacion",
  moderation: "/admin/moderacion",
  reports: "/admin/denuncias",
  users: "/admin/usuarios",
  organizations: "/admin/organizaciones",
  partners: "/admin/partners",
  metrics: "/admin/metricas",
  operations: "/admin/operacion"
} as const;
export type AdminRoute = keyof typeof ADMIN_ROUTES;

/** Four destinations, with each module a tab of its group. */
const ADMIN_GROUPS: readonly { readonly key: string; readonly tabs: readonly AdminRoute[] }[] = [
  { key: "review", tabs: ["verification", "moderation", "reports"] },
  { key: "catalog", tabs: ["categories", "geography", "eventTypes", "templates"] },
  { key: "people", tabs: ["users", "organizations", "partners"] },
  { key: "operation", tabs: ["dashboard", "metrics", "operations"] }
];

export function adminNav(t: Translate): NavItem[] {
  return ADMIN_GROUPS.map((group) => {
    const tabs = group.tabs.map((key) => ({ key, label: t(`admin.nav.${key}`), href: ADMIN_ROUTES[key] }));
    return { key: group.key, label: t(`admin.dest.${group.key}`), href: tabs[0]?.href ?? ADMIN_ROUTES.dashboard, tabs };
  });
}
