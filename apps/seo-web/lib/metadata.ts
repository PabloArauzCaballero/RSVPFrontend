import type { Metadata } from "next";
import { formatDate, readContent, type GalleryImage, type PublicCelebrationView, type SectionId } from "@rsvp/celebration-theme";
import type { Translate } from "@rsvp/i18n/server";

const DEFAULT_SITE_URL = "http://localhost:3000";
const OG_LOCALE_SEPARATOR = "_";
const MAX_DESCRIPTION = 160;

// One trailing slash. "https://rsvp.bo/" → "https://rsvp.bo"; "https://rsvp.bo" is unchanged.
// https://regex101.com/?flavor=javascript&regex=%5C%2F%24&flags=gm&testString=https%3A%2F%2Frsvp.bo%2F%0Ahttps%3A%2F%2Frsvp.bo
const TRAILING_SLASH = /\/$/;

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL).replace(TRAILING_SLASH, "");
}

export function celebrationPath(slug: string, sectionPath?: string): string {
  return sectionPath ? `/c/${slug}/${sectionPath}` : `/c/${slug}`;
}

/** "Boda · sábado, 19 de diciembre de 2026 · Hacienda El Prado", or the generic line when data is missing. */
export function celebrationDescription(view: PublicCelebrationView, t: Translate): string {
  const content = readContent(view);
  if (!content.eventDate) return t("celebration.meta.fallbackDescription");
  const text = t("celebration.meta.description", { eventType: view.eventType.name, date: formatDate(content.eventDate, view.timeZone, view.locale), venue: content.venueName });
  return text.slice(0, MAX_DESCRIPTION);
}

/**
 * Title, description, canonical, hreflang alternates and the Open Graph card WhatsApp shows when
 * the link is pasted (REQ-F08-02/03).
 */
export function celebrationMetadata(view: PublicCelebrationView, gallery: readonly GalleryImage[], t: Translate, section?: { readonly id: SectionId; readonly path: string }): Metadata {
  const content = readContent(view);
  const path = celebrationPath(view.slug, section?.path);
  const url = `${siteUrl()}${path}`;
  // Every language has its own explicit address and the page is canonical to the one it renders, so the canonical is always in the hreflang set.
  const own = `${url}?lang=${view.locale}`;
  const title = section ? t("celebration.meta.sectionTitle", { section: t(`celebration.sections.${section.id}`), title: content.title }) : content.title;
  const description = celebrationDescription(view, t);
  const cover = gallery.find((image) => image.isCover) ?? gallery[0];
  const image = cover?.variants.full ?? cover?.variants.medium;
  return {
    title,
    description,
    alternates: {
      canonical: own,
      languages: Object.fromEntries(view.availableLocales.map((locale) => [locale, `${url}?lang=${locale}`]))
    },
    openGraph: {
      type: "website",
      url: own,
      title,
      description,
      siteName: "RSVP",
      locale: view.locale.replace("-", OG_LOCALE_SEPARATOR),
      ...(image ? { images: [{ url: image, width: cover?.width ?? undefined, height: cover?.height ?? undefined, alt: content.title }] } : {})
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, ...(image ? { images: [image] } : {}) },
    robots: { index: true, follow: true }
  };
}
