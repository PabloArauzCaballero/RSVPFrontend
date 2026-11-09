import type { Metadata } from "next";
import { SITE_LOCALES, type SiteLocale } from "./locale-negotiation";
import { siteUrl } from "./metadata";

/**
 * Canonical and hreflang for pages whose language is negotiated (middleware.ts: `?lang=`, cookie, Accept-Language).
 * Every language has one stable address: the default (es-BO) is the bare URL, the others add `?lang=`. A page is canonical to its own
 * language's address, and each address lists all the others, so the alternates are reciprocal and a crawler never sees two canonicals.
 */
const DEFAULT_LOCALE: SiteLocale = "es-BO";
const OG_LOCALE: Readonly<Record<SiteLocale, string>> = { "es-BO": "es_BO", "en-US": "en_US" };

export type SearchParamsInit = Readonly<Record<string, string | undefined>>;

export function localizedUrl(path: string, locale: SiteLocale, query: SearchParamsInit = {}): string {
  const params = new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1])));
  if (locale !== DEFAULT_LOCALE) params.set("lang", locale);
  const search = params.toString();
  return `${siteUrl()}${path}${search ? `?${search}` : ""}`;
}

export function alternatesFor(path: string, locale: SiteLocale, query: SearchParamsInit = {}): NonNullable<Metadata["alternates"]> {
  return {
    canonical: localizedUrl(path, locale, query),
    languages: { ...Object.fromEntries(SITE_LOCALES.map((option) => [option, localizedUrl(path, option, query)])), "x-default": localizedUrl(path, DEFAULT_LOCALE, query) }
  };
}

export interface RouteMetadataInput {
  readonly path: string;
  readonly locale: SiteLocale;
  readonly title: string;
  readonly description: string;
  readonly query?: SearchParamsInit;
  readonly image?: { readonly url: string; readonly alt: string } | undefined;
  /** Landing and other pages whose title already says "DOne" skip the "· DOne" template. */
  readonly absoluteTitle?: boolean;
}

/** Title, description, canonical + hreflang, Open Graph and Twitter for an indexable, language-negotiated page. */
export function routeMetadata(input: RouteMetadataInput): Metadata {
  const alternates = alternatesFor(input.path, input.locale, input.query);
  const url = String(alternates.canonical);
  const other = SITE_LOCALES.filter((option) => option !== input.locale).map((option) => OG_LOCALE[option]);
  const images = input.image ? [{ url: input.image.url, alt: input.image.alt }] : undefined;
  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description: input.description,
    alternates,
    openGraph: { type: "website", url, title: input.title, description: input.description, siteName: "DOne", locale: OG_LOCALE[input.locale], alternateLocale: other, ...(images ? { images } : {}) },
    twitter: { card: "summary_large_image", title: input.title, description: input.description, ...(images ? { images: images.map((image) => image.url) } : {}) },
    robots: { index: true, follow: true }
  };
}
