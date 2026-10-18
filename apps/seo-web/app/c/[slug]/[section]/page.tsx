import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { hasSectionContent, readContent, sectionForPath, themeFromTemplate, type SectionId } from "@rsvp/celebration-theme";
import { createTranslator, defaultLocale } from "@rsvp/i18n/server";
import { PublicCelebration } from "../../../../components/public-celebration";
import { loadPublicPage, type PublicPage } from "../../../../lib/celebration";
import { requestedLanguage, uiLocale } from "../../../../lib/locale";
import { celebrationMetadata } from "../../../../lib/metadata";

/**
 * A2–A8 · historia, itinerario, lugares, galeria, dress-code, faq, recomendaciones.
 * A section the template does not place, the event type does not enable, or that has no
 * content answers 404, so search engines never index an empty page.
 */

interface Props {
  readonly params: Promise<{ readonly slug: string; readonly section: string }>;
  readonly searchParams: Promise<{ readonly lang?: string | string[] }>;
}

async function load({ params, searchParams }: Props): Promise<{ readonly page: PublicPage; readonly section: SectionId; readonly path: string } | null> {
  const [{ slug, section: path }, { lang }, requestHeaders] = await Promise.all([params, searchParams, headers()]);
  const section = sectionForPath(path);
  if (!section) return null;
  const page = await loadPublicPage(slug, requestedLanguage(lang, requestHeaders.get("accept-language")));
  if (!page) return null;
  const visible = themeFromTemplate(page.template, page.view.enabledSections).sections.includes(section);
  return visible && hasSectionContent(section, readContent(page.view), page.gallery) ? { page, section, path } : null;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const found = await load(props);
  if (!found) return { title: createTranslator(defaultLocale)("celebration.notFound.title"), robots: { index: false, follow: false } };
  return celebrationMetadata(found.page.view, found.page.gallery, createTranslator(uiLocale(found.page.view.locale)), { id: found.section, path: found.path });
}

export default async function CelebrationSectionPage(props: Props) {
  const found = await load(props);
  if (!found) notFound();
  return <PublicCelebration page={found.page} only={found.section} />;
}
