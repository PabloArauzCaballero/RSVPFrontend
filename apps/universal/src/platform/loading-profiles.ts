import { ADMIN_ROUTES, type AdminRoute } from "../admin/routes";
import { HOST_ROUTES, type HostRoute } from "../host/routes";
import { PORTAL_ROUTES, portalActiveRoute, type PortalRoute } from "../provider/routes";
import type { LoadingKind } from "./loading-content";

interface Profile {
  readonly kind: LoadingKind;
  readonly title: string;
  readonly intro?: string;
  readonly current?: string;
}

export const HOST_LOADING = {
  celebrations: { kind: "list", title: "host.picker.title", intro: "host.picker.intro" },
  onboarding: { kind: "form", title: "host.onboarding.title", intro: "host.onboarding.intro" },
  editor: { kind: "form", title: "host.editor.title", intro: "host.editor.intro" },
  gallery: { kind: "gallery", title: "host.gallery.title", intro: "host.gallery.intro" },
  translations: { kind: "form", title: "host.translations.title", intro: "host.translations.intro" },
  templates: { kind: "preview", title: "host.templates.title", intro: "host.templates.intro" },
  preview: { kind: "preview", title: "host.preview.title", intro: "host.preview.intro" },
  publish: { kind: "checklist", title: "host.publish.title", intro: "host.publish.intro" },
  settings: { kind: "form", title: "host.settings.title", intro: "host.settings.intro" },
  modes: { kind: "modes", title: "host.modes.title", intro: "host.modes.intro" },
  summary: { kind: "summary", title: "guests.summary.title", intro: "guests.summary.intro" },
  guests: { kind: "people", title: "guests.list.title", intro: "guests.list.intro" },
  guestNew: { kind: "form", title: "guests.form.title", intro: "guests.form.intro", current: "guests" },
  guestImport: { kind: "form", title: "guests.import.title", intro: "guests.import.intro", current: "guests" },
  guestGroups: { kind: "list", title: "guests.groups.title", intro: "guests.groups.intro", current: "guests" },
  report: { kind: "summary", title: "guests.report.title", intro: "guests.report.intro" },
  requests: { kind: "list", title: "guests.requests.title", intro: "guests.requests.intro" },
  notifications: { kind: "list", title: "guests.notifications.title", intro: "guests.notifications.intro" },
  preferences: { kind: "form", title: "guests.preferences.title", intro: "guests.preferences.intro" },
  push: { kind: "checklist", title: "guests.push.title", intro: "guests.push.intro", current: "preferences" },
  gifts: { kind: "gifts", title: "gifts.host.title", intro: "gifts.host.intro" },
  giftCatalog: { kind: "gifts", title: "gifts.host.add.title", intro: "gifts.host.add.intro", current: "gifts" },
  giftProviders: { kind: "gifts", title: "gifts.host.add.title", intro: "gifts.host.add.intro", current: "gifts" },
  giftExternal: { kind: "form", title: "gifts.host.add.title", intro: "gifts.host.add.intro", current: "gifts" },
  giftInbox: { kind: "list", title: "gifts.host.title", intro: "gifts.host.inbox.intro" },
  organizations: { kind: "list", title: "org.title" },
  invitations: { kind: "list", title: "org.inbox.title", current: "organizations" },
  guestSettings: { kind: "form", title: "guests.settings.title", intro: "guests.settings.intro", current: "guests" }
} as const satisfies Record<HostRoute, Profile>;

const ADMIN_LOADING = {
  dashboard: { kind: "summary", title: "admin.dashboard.title" },
  templates: { kind: "gallery", title: "admin.templates.title" },
  eventTypes: { kind: "list", title: "admin.eventTypes.title" },
  categories: { kind: "list", title: "admin.categories.title" },
  geography: { kind: "form", title: "admin.geography.title" },
  verification: { kind: "list", title: "admin.verification.title" },
  moderation: { kind: "list", title: "admin.moderation.title" },
  users: { kind: "people", title: "admin.users.title" },
  organizations: { kind: "form", title: "admin.organizations.title" },
  partners: { kind: "list", title: "admin.partners.title" },
  metrics: { kind: "summary", title: "admin.metrics.title" },
  operations: { kind: "summary", title: "admin.operations.title" }
} as const satisfies Record<AdminRoute, Profile>;

export const PORTAL_LOADING = {
  home: { kind: "summary", title: "portal.home.title" },
  onboarding: { kind: "form", title: "portal.onboarding.title" },
  services: { kind: "gifts", title: "portal.services.title" },
  products: { kind: "gifts", title: "portal.nav.products" },
  delivery: { kind: "gifts", title: "portal.nav.delivery" },
  destinations: { kind: "form", title: "portal.destinations.title" },
  agenda: { kind: "agenda", title: "portal.agenda.title" },
  quotes: { kind: "list", title: "portal.quotes.title" },
  leads: { kind: "list", title: "portal.leads.title" },
  metrics: { kind: "summary", title: "portal.metrics.title" },
  microsite: { kind: "form", title: "portal.microsite.title" },
  documents: { kind: "list", title: "portal.documents.title" }
} as const satisfies Record<PortalRoute, Profile>;

interface LoadingRoute extends Profile {
  readonly area: "host" | "admin" | "portal" | "focused";
  readonly current: string;
}

const profiles = new Map<string, LoadingRoute>();

for (const key of Object.keys(HOST_ROUTES) as HostRoute[]) {
  const profile: Profile = HOST_LOADING[key];
  profiles.set(HOST_ROUTES[key], { ...profile, area: key === "onboarding" ? "focused" : "host", current: profile.current ?? key });
}
for (const key of Object.keys(ADMIN_ROUTES) as AdminRoute[]) {
  profiles.set(ADMIN_ROUTES[key], { ...ADMIN_LOADING[key], area: "admin", current: key });
}
for (const key of Object.keys(PORTAL_ROUTES) as PortalRoute[]) {
  profiles.set(PORTAL_ROUTES[key], { ...PORTAL_LOADING[key], area: "portal", current: portalActiveRoute(key) });
}

const GUEST_DETAIL: LoadingRoute = { area: "host", current: "guests", kind: "form", title: "guests.detail.title", intro: "guests.detail.intro" };

export function loadingProfile(pathname: string): LoadingRoute | undefined {
  const path = pathname.replace(/\/+$/, "");
  const exact = profiles.get(path);
  if (exact) return exact;
  if (/^\/invitados\/[^/]+$/.test(path)) return GUEST_DETAIL;
  if (/^\/editor\/[^/]+$/.test(path)) return profiles.get(HOST_ROUTES.editor);
  if (/^\/onboarding\/[^/]+$/.test(path)) return profiles.get(HOST_ROUTES.onboarding);
  return undefined;
}
