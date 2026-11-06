import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createTranslator, defaultLocale } from "@rsvp/i18n/server";
import { Breadcrumbs, ProviderResults } from "../../../../components/provider-directory";
import { siteUrl } from "../../../../lib/metadata";
import { categoryBySlug, cityBySlug, pageParam, PROVIDER_CATEGORIES, PROVIDER_CITIES, searchProviders } from "../../../../lib/providers";

/** B3 · Long-tail landing: "salones de eventos en Santa Cruz de la Sierra", with its own metadata. */
export const revalidate = 300;
const t = createTranslator(defaultLocale);

interface Props {
  readonly params: Promise<{ readonly categoria: string; readonly ciudad: string }>;
  readonly searchParams: Promise<{ readonly page?: string | string[] }>;
}

export function generateStaticParams() {
  return PROVIDER_CATEGORIES.flatMap((category) => PROVIDER_CITIES.map((city) => ({ categoria: category.slug, ciudad: city.slug })));
}

async function resolve(params: Props["params"]) {
  const { categoria, ciudad } = await params;
  const category = categoryBySlug(categoria);
  const city = cityBySlug(ciudad);
  return category && city ? { category, city } : null;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const found = await resolve(params);
  if (!found) return { robots: { index: false } };
  const page = pageParam((await searchParams).page);
  const values = { category: t(`directory.category.${found.category.code}`), city: found.city.name };
  const url = `${siteUrl()}/proveedores/${found.category.slug}/${found.city.slug}${page > 1 ? `?page=${page}` : ""}`;
  return { title: t("directory.cityTitle", values), description: t("directory.cityDescription", values), alternates: { canonical: url }, openGraph: { type: "website", url, title: t("directory.cityTitle", values) } };
}

export default async function CategoryCityPage({ params, searchParams }: Props) {
  const found = await resolve(params);
  if (!found) notFound();
  const page = pageParam((await searchParams).page);
  const results = await searchProviders({ category: found.category.code, city: found.city.slug, verifiedOnly: true, page });
  const name = t(`directory.category.${found.category.code}`);
  const values = { category: name, city: found.city.name };
  return (
    <main className="directory">
      <Breadcrumbs t={t} items={[{ label: name, href: `/proveedores/${found.category.slug}` }, { label: found.city.name }]} />
      <h1>{t("directory.cityTitle", values)}</h1>
      <p>{t("directory.cityDescription", values)}</p>
      <ProviderResults page={results} t={t} locale={defaultLocale} path={`/proveedores/${found.category.slug}/${found.city.slug}`} query={page > 1 ? `page=${page}` : ""} />
    </main>
  );
}
