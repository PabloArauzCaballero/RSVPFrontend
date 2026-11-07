import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { siteI18n } from "../../../lib/site-locale";
import { Breadcrumbs, CityLinks, ProviderResults } from "../../../components/provider-directory";
import { siteUrl } from "../../../lib/metadata";
import { categoryBySlug, pageParam, PROVIDER_CATEGORIES, searchProviders } from "../../../lib/providers";

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
  const { t } = await siteI18n();
  const category = categoryBySlug((await params).categoria);
  if (!category) return { robots: { index: false } };
  const page = pageParam((await searchParams).page);
  const name = t(`directory.category.${category.code}`);
  const url = `${siteUrl()}/proveedores/${category.slug}${page > 1 ? `?page=${page}` : ""}`;
  return { title: t("directory.categoryTitle", { category: name }), description: t("directory.categoryDescription", { category: name }), alternates: { canonical: url }, openGraph: { type: "website", url, title: t("directory.categoryTitle", { category: name }) } };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { t, locale } = await siteI18n();
  const category = categoryBySlug((await params).categoria);
  if (!category) notFound();
  const page = pageParam((await searchParams).page);
  const results = await searchProviders({ category: category.code, verifiedOnly: true, page });
  const name = t(`directory.category.${category.code}`);
  return (
    <main className="directory">
      <Breadcrumbs t={t} items={[{ label: name }]} />
      <h1>{t("directory.categoryTitle", { category: name })}</h1>
      <p>{t("directory.categoryDescription", { category: name })}</p>
      <ProviderResults page={results} t={t} locale={locale} path={`/proveedores/${category.slug}`} query={page > 1 ? `page=${page}` : ""} />
      <h2>{t("directory.citiesHeading")}</h2>
      <CityLinks t={t} categorySlug={category.slug} categoryCode={category.code} />
    </main>
  );
}
