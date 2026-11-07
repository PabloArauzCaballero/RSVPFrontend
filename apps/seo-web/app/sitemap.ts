import type { MetadataRoute } from "next";
import { loadPublicSlugs, type PublicSlug } from "../lib/celebration";
import { celebrationPath, siteUrl } from "../lib/metadata";
import { loadPartnerSlugs } from "../lib/partner";
import { PROVIDER_CATEGORIES, searchProviders } from "../lib/providers";
import { alternatesFor, localizedUrl } from "../lib/seo";
import { SITE_LOCALES } from "../lib/locale-negotiation";

/**
 * Only public, indexable routes (REQ-F08-05): the home, the provider directory, every verified
 * partner microsite and every published celebration. Regenerated at most every 5 minutes, so a newly published
 * celebration appears without a deploy.
 */
export const revalidate = 300;

async function publishedSlugs(): Promise<readonly PublicSlug[]> {
  try {
    return await loadPublicSlugs();
  } catch {
    // The sitemap must still answer when the API is briefly unreachable; the next revalidation retries.
    return [];
  }
}

async function partnerSlugs(): Promise<readonly string[]> {
  try {
    return await loadPartnerSlugs();
  } catch {
    return [];
  }
}

/** One entry per language address, each listing every alternate (itself included), as hreflang in a sitemap requires. */
function siteEntries(path: string, changeFrequency: "daily" | "weekly", priority: number): MetadataRoute.Sitemap {
  return SITE_LOCALES.map((locale) => ({ url: localizedUrl(path, locale), changeFrequency, priority, alternates: { languages: alternatesFor(path, locale).languages as Record<string, string> } }));
}

/** Categories with nothing published are noindex (see app/proveedores/[categoria]/page.tsx), so they are not listed either. */
async function indexableCategories(): Promise<readonly (typeof PROVIDER_CATEGORIES)[number][]> {
  const checks = await Promise.all(PROVIDER_CATEGORIES.map(async (category) => ({ category, page: await searchProviders({ category: category.code, verifiedOnly: true }).catch(() => null) })));
  // When the catalogue cannot answer, keep the category (a transient outage must not shrink the sitemap).
  return checks.filter(({ page }) => !page || !page.available || page.total > 0).map(({ category }) => category);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const celebrations = (await publishedSlugs()).flatMap((item) => {
    const languages = Object.fromEntries(item.supportedLocales.map((locale) => [locale, `${base}${celebrationPath(item.slug)}?lang=${locale}`]));
    return item.supportedLocales.map((locale) => ({ url: `${base}${celebrationPath(item.slug)}?lang=${locale}`, lastModified: item.updatedAt, changeFrequency: "weekly" as const, priority: 0.7, alternates: { languages } }));
  });
  const directory = [...siteEntries("/proveedores", "daily", 0.9), ...(await indexableCategories()).flatMap((category) => siteEntries(`/proveedores/${category.slug}`, "daily", 0.8))];
  // Partner microsites (/p/{slug}) are indexable; /r/ (redirector), /proveedores/buscar and guest links are not listed.
  const partners = (await partnerSlugs()).flatMap((slug) => siteEntries(`/p/${encodeURIComponent(slug)}`, "weekly", 0.6));
  return [...siteEntries("/", "weekly", 1), ...directory, ...partners, ...celebrations];
}
