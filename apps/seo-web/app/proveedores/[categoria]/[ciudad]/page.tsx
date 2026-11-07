import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { siteI18n } from "../../../../lib/site-locale";
import { PageTop, ProviderResults } from "../../../../components/provider-directory";
import { routeMetadata } from "../../../../lib/seo";
import { isSupported } from "../../../../lib/locale-negotiation";
import { categoryBySlug, cityBySlug, pageParam, PROVIDER_CATEGORIES, PROVIDER_CITIES, searchProviders } from "../../../../lib/providers";

/** B3 · Long-tail landing: "salones de eventos en Santa Cruz de la Sierra", with its own metadata. */
export const revalidate = 300;

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
  const { t, locale } = await siteI18n();
  const found = await resolve(params);
  if (!found) return { robots: { index: false } };
  const page = pageParam((await searchParams).page);
  const values = { category: t(`directory.category.${found.category.code}`), city: found.city.name };
  const results = await searchProviders({ category: found.category.code, city: found.city.slug, verifiedOnly: true, page });
  const metadata = routeMetadata({ path: `/proveedores/${found.category.slug}/${found.city.slug}`, locale: isSupported(locale) ? locale : "es-BO", query: page > 1 ? { page: String(page) } : {}, title: t("directory.cityTitle", values), description: t("directory.cityDescription", values) });
  // 99 category x city pages exist; only those with providers are worth indexing (no thin pages).
  return results.available && results.items.length === 0 ? { ...metadata, robots: { index: false, follow: true } } : metadata;
}

export default async function CategoryCityPage({ params, searchParams }: Props) {
  const { t, locale } = await siteI18n();
  const found = await resolve(params);
  if (!found) notFound();
  const page = pageParam((await searchParams).page);
  const results = await searchProviders({ category: found.category.code, city: found.city.slug, verifiedOnly: true, page });
  const name = t(`directory.category.${found.category.code}`);
  const values = { category: name, city: found.city.name };
  return (
    <main className="dir-page">
      <PageTop t={t} items={[{ label: name, href: `/proveedores/${found.category.slug}` }, { label: found.city.name }]} title={t("directory.cityTitle", values)} lead={t("directory.cityDescription", values)} />
      <div className="dir-body">
        <ProviderResults page={results} t={t} locale={locale} path={`/proveedores/${found.category.slug}/${found.city.slug}`} query={page > 1 ? `page=${page}` : ""} />
      </div>
    </main>
  );
}
