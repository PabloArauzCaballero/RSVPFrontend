import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createTranslator, defaultLocale } from "@rsvp/i18n/server";
import { PublicCelebration } from "../../../components/public-celebration";
import { loadPublicPage } from "../../../lib/celebration";
import { requestedLanguage, uiLocale } from "../../../lib/locale";
import { celebrationMetadata } from "../../../lib/metadata";

/** A1 · Portada. Data is cached per URL and language for 60 s; the HTML is rendered on the server. */

interface Props {
  readonly params: Promise<{ readonly slug: string }>;
  readonly searchParams: Promise<{ readonly lang?: string | string[] }>;
}

async function load({ params, searchParams }: Props) {
  const [{ slug }, { lang }, requestHeaders] = await Promise.all([params, searchParams, headers()]);
  return loadPublicPage(slug, requestedLanguage(lang, requestHeaders.get("accept-language")));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const page = await load(props);
  if (!page) return { title: createTranslator(defaultLocale)("celebration.notFound.title"), robots: { index: false, follow: false } };
  return celebrationMetadata(page.view, page.gallery, createTranslator(uiLocale(page.view.locale)));
}

export default async function CelebrationPage(props: Props) {
  const page = await load(props);
  if (!page) notFound();
  return <PublicCelebration page={page} />;
}
