import type { Translate } from "@rsvp/i18n";
import type { NavItem } from "./ui";

/** Host workspace URLs (expo-router groups are not part of the path). `?c=` carries the celebration. */
export const HOST_ROUTES = {
  celebrations: "/celebraciones",
  onboarding: "/onboarding",
  editor: "/editor",
  gallery: "/editor/galeria",
  translations: "/editor/traducciones",
  templates: "/templates",
  preview: "/preview",
  publish: "/publicar",
  settings: "/configuracion",
  modes: "/modos",
  summary: "/inicio",
  guests: "/invitados",
  guestNew: "/invitados/nuevo",
  guestImport: "/invitados/importar",
  guestGroups: "/invitados/grupos",
  report: "/rsvp/reporte",
  requests: "/bandeja/acompanantes",
  notifications: "/notificaciones",
  preferences: "/preferencias",
  push: "/permisos-push",
  gifts: "/regalos",
  giftCatalog: "/regalos/catalogo",
  giftProviders: "/regalos/proveedores",
  giftExternal: "/regalos/externo",
  giftInbox: "/bandeja/regalos"
} as const;
export type HostRoute = keyof typeof HOST_ROUTES;

export const EDITOR_SECTIONS = ["general", "anfitriones", "lugares", "historia", "itinerario", "secciones"] as const;
export type EditorSection = (typeof EDITOR_SECTIONS)[number];

export const editorSectionLabel: Readonly<Record<EditorSection, string>> = {
  general: "host.editor.sections.general",
  anfitriones: "host.editor.sections.hosts",
  lugares: "host.editor.sections.venues",
  historia: "host.editor.sections.story",
  itinerario: "host.editor.sections.schedule",
  secciones: "host.editor.sections.sections"
};

export function withCelebration(path: string, celebrationId: string | undefined): string {
  return celebrationId ? `${path}?c=${encodeURIComponent(celebrationId)}` : path;
}

export const editorPath = (section: EditorSection): string => `${HOST_ROUTES.editor}/${section}`;

export const guestDetailPath = (guestId: string): string => `${HOST_ROUTES.guests}/${encodeURIComponent(guestId)}`;

const NAV: readonly { readonly key: HostRoute; readonly label: string; readonly path: string }[] = [
  { key: "summary", label: "guests.nav.summary", path: HOST_ROUTES.summary },
  { key: "guests", label: "guests.nav.guests", path: HOST_ROUTES.guests },
  { key: "report", label: "guests.nav.report", path: HOST_ROUTES.report },
  { key: "requests", label: "guests.nav.requests", path: HOST_ROUTES.requests },
  { key: "notifications", label: "guests.nav.notifications", path: HOST_ROUTES.notifications },
  { key: "preferences", label: "guests.nav.preferences", path: HOST_ROUTES.preferences },
  { key: "gifts", label: "gifts.host.nav", path: HOST_ROUTES.gifts },
  { key: "giftInbox", label: "gifts.host.inbox.title", path: HOST_ROUTES.giftInbox },
  { key: "editor", label: "host.nav.editor", path: editorPath("general") },
  { key: "gallery", label: "host.nav.gallery", path: HOST_ROUTES.gallery },
  { key: "translations", label: "host.nav.translations", path: HOST_ROUTES.translations },
  { key: "templates", label: "host.nav.templates", path: HOST_ROUTES.templates },
  { key: "preview", label: "host.nav.preview", path: HOST_ROUTES.preview },
  { key: "publish", label: "host.nav.publish", path: HOST_ROUTES.publish },
  { key: "settings", label: "host.nav.settings", path: HOST_ROUTES.settings },
  { key: "modes", label: "host.nav.modes", path: HOST_ROUTES.modes },
  { key: "celebrations", label: "host.nav.celebrations", path: HOST_ROUTES.celebrations }
];

const NAV_GROUP: Readonly<Partial<Record<HostRoute, string>>> = {
  summary: "guests", guests: "guests", report: "guests", requests: "guests", notifications: "guests", preferences: "guests",
  gifts: "gifts", giftInbox: "gifts",
  editor: "celebration", gallery: "celebration", translations: "celebration", templates: "celebration", preview: "celebration", publish: "celebration", settings: "celebration", modes: "celebration",
  celebrations: "account"
};

export function hostNav(t: Translate, celebrationId: string | undefined): NavItem[] {
  return NAV.map((item) => {
    const group = NAV_GROUP[item.key];
    return { key: item.key, label: t(item.label), href: item.key === "celebrations" ? item.path : withCelebration(item.path, celebrationId), ...(group ? { group: t(`host.navGroups.${group}`) } : {}) };
  });
}
