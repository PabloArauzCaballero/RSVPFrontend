import type { MetadataRoute } from "next";
import { loadPublicSlugs, type PublicSlug } from "../lib/celebration";
import { celebrationPath, siteUrl } from "../lib/metadata";
import { PROVIDER_CATEGORIES } from "../lib/providers";

/**
 * Only public, indexable routes (REQ-F08-05): the home, the provider directory and every
 * published celebration. Regenerated at most every 5 minutes, so a newly published
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const celebrations = (await publishedSlugs()).map((item) => ({
    url: `${base}${celebrationPath(item.slug)}`,
    lastModified: item.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
    alternates: { languages: Object.fromEntries(item.supportedLocales.map((locale) => [locale, `${base}${celebrationPath(item.slug)}?lang=${locale}`])) }
  }));
  const directory = [{ url: `${base}/proveedores`, changeFrequency: "daily" as const, priority: 0.9 }, ...PROVIDER_CATEGORIES.map((category) => ({ url: `${base}/proveedores/${category.slug}`, changeFrequency: "daily" as const, priority: 0.8 }))];
  return [{ url: base, changeFrequency: "weekly", priority: 1 }, ...directory, ...celebrations];
}
