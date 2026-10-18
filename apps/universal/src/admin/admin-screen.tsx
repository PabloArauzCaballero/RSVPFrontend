import type { PropsWithChildren, ReactNode } from "react";
import type { Translate } from "@rsvp/i18n";
import { useClaims, useT } from "../platform/providers";
import { Notice, Screen, type NavItem } from "../host/ui";

/** Platform administration shell: only ADMIN gets past it (REQ-F14-06). */

export const ADMIN_ROUTES = {
  dashboard: "/admin",
  templates: "/admin/templates",
  eventTypes: "/admin/tipos-evento",
  categories: "/admin/categorias",
  geography: "/admin/geografia",
  verification: "/admin/verificacion",
  moderation: "/admin/moderacion",
  users: "/admin/usuarios",
  organizations: "/admin/organizaciones",
  metrics: "/admin/metricas",
  operations: "/admin/operacion"
} as const;
export type AdminRoute = keyof typeof ADMIN_ROUTES;

export const isPlatformAdmin = (roles: readonly string[]): boolean => roles.includes("ADMIN");

export function adminNav(t: Translate): NavItem[] {
  return (Object.keys(ADMIN_ROUTES) as AdminRoute[]).map((key) => ({ key, label: t(`admin.nav.${key}`), href: ADMIN_ROUTES[key] }));
}

export function AdminScreen({ title, current, onNavigate, children }: PropsWithChildren<{ readonly title: string; readonly current: AdminRoute; readonly onNavigate: (href: string) => void }>): ReactNode {
  const t = useT();
  const claims = useClaims();
  if (!isPlatformAdmin(claims.roles)) return <Screen title={t("admin.title")}><Notice kind="error">{t("admin.denied")}</Notice></Screen>;
  return <Screen title={title} nav={adminNav(t)} current={current} onNavigate={onNavigate}>{children}</Screen>;
}

/** A module whose backend API is owned by another lane and not published yet: say so, invent nothing. */
export function UnavailableModule({ service }: { readonly service: string }): ReactNode {
  const t = useT();
  return <Notice>{t("admin.unavailable", { service })}</Notice>;
}

export const splitList = (value: string): string[] => value.split(",").map((item) => item.trim()).filter(Boolean);
