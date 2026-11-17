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
  giftInbox: "/bandeja/regalos",
  organizations: "/organizaciones",
  guestSettings: "/invitados/ajustes"
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

/**
 * Host navigation in two levels (brief §2): six destinations, each owning the screens that used to be separate menu
 * entries. Every existing route stays where it is; a screen reports its own route key as `current` and the frame
 * works out the destination and the tab. Routes outside the table (guest form, import, groups, guest settings,
 * push permissions, guest detail) keep reporting their parent tab's key.
 */
type HostDestination = "home" | "guests" | "gifts" | "invitation" | "alerts" | "settings";
const DESTINATIONS: readonly { readonly key: HostDestination; readonly tabs: readonly HostRoute[] }[] = [
  { key: "home", tabs: ["summary"] },
  { key: "guests", tabs: ["guests", "report", "requests"] },
  { key: "gifts", tabs: ["gifts", "giftInbox"] },
  { key: "invitation", tabs: ["editor", "gallery", "translations", "templates", "preview"] },
  { key: "alerts", tabs: ["notifications", "preferences"] },
  // "Ajustes" opens on Configuración (the first tab is the destination's landing); publishing keeps its own tab and header action.
  { key: "settings", tabs: ["settings", "publish", "modes", "celebrations", "organizations"] }
];

/** Routes that are not scoped to one celebration (`?c=` would be noise). */
const ACCOUNT_ROUTES: readonly HostRoute[] = ["celebrations", "organizations"];

/** The address a screen key opens: the editor has no page of its own, it opens on its first section. */
export const routePath = (key: HostRoute): string => (key === "editor" ? editorPath("general") : HOST_ROUTES[key]);
const tabPath = routePath;

export function hostNav(t: Translate, celebrationId: string | undefined): NavItem[] {
  return DESTINATIONS.map((destination) => {
    const tabs = destination.tabs.map((key) => ({ key, label: t(`host.tabs.${key}`), href: ACCOUNT_ROUTES.includes(key) ? tabPath(key) : withCelebration(tabPath(key), celebrationId) }));
    return { key: destination.key, label: t(`host.dest.${destination.key}`), href: tabs[0]?.href ?? HOST_ROUTES.summary, tabs };
  });
}
