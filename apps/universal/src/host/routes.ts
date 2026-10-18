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
  modes: "/modos"
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

const NAV: readonly { readonly key: HostRoute; readonly label: string; readonly path: string }[] = [
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

export function hostNav(t: Translate, celebrationId: string | undefined): NavItem[] {
  return NAV.map((item) => ({ key: item.key, label: t(item.label), href: item.key === "celebrations" ? item.path : withCelebration(item.path, celebrationId) }));
}
