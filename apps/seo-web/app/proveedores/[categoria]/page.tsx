import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { siteI18n } from "../../../lib/site-locale";
import { CityLinks, PageTop, ProviderResults } from "../../../components/provider-directory";
import { categoryBySlug, pageParam, PROVIDER_CATEGORIES, searchProviders } from "../../../lib/providers";
import { routeMetadata } from "../../../lib/seo";
import { isSupported } from "../../../lib/locale-negotiation";

/** B2 · Listing by category, server-rendered, with crawlable ?page=N pagination. */
export const revalidate = 300;

interface Props {
  readonly params: Promise<{ readonly categoria: string }>;
  readonly searchParams: Promise<{ readonly page?: string | string[] }>;
}

export function generateStaticParams() {
  return PROVIDER_CATEGORIES.map((category) => ({ categoria: category.slug }));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { t, locale } = await siteI18n();
  const category = categoryBySlug((await params).categoria);
  if (!category) return { robots: { index: false } };
  const page = pageParam((await searchParams).page);
  const name = t(`directory.category.${category.code}`);
  const results = await searchProviders({ category: category.code, verifiedOnly: true, page });
  const metadata = routeMetadata({ path: `/proveedores/${category.slug}`, locale: isSupported(locale) ? locale : "es-BO", query: page > 1 ? { page: String(page) } : {}, title: t("directory.categoryTitle", { category: name }), description: t("directory.categoryDescription", { category: name }) });
  // A category with nothing published is a thin page: it stays reachable but out of the index until it has providers.
  return results.available && results.items.length === 0 ? { ...metadata, robots: { index: false, follow: true } } : metadata;
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { t, locale } = await siteI18n();
  const category = categoryBySlug((await params).categoria);
  if (!category) notFound();
  const page = pageParam((await searchParams).page);
  const results = await searchProviders({ category: category.code, verifiedOnly: true, page });
  const name = t(`directory.category.${category.code}`);
  return (
    <main className="dir-page">
      <PageTop t={t} items={[{ label: name }]} title={t("directory.categoryTitle", { category: name })} lead={t("directory.categoryDescription", { category: name })} />
      <div className="dir-body">
        <ProviderResults page={results} t={t} locale={locale} path={`/proveedores/${category.slug}`} query={page > 1 ? `page=${page}` : ""} summary={results.available && results.total > 0 ? t("directory.intro", { count: results.total, category: name.toLocaleLowerCase(locale), place: "Bolivia" }) : undefined} />
        <section aria-labelledby="dir-cities"><h2 id="dir-cities">{t("directory.citiesHeading")}</h2><CityLinks t={t} categorySlug={category.slug} categoryCode={category.code} /></section>
      </div>
    </main>
  );
}
