import type { Metadata } from "next";
import { siteI18n } from "../../../lib/site-locale";
import { Breadcrumbs, ProviderResults, SearchForm } from "../../../components/provider-directory";
import { categoryBySlug, cityBySlug, pageParam, parseGeo, searchProviders } from "../../../lib/providers";

/** B4 · Filtered results. Filter combinations are endless, so this page is not indexed (but its links are followed). */
const MINOR_PER_UNIT = 100;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await siteI18n();
  return { title: t("directory.searchTitle"), description: t("directory.searchDescription"), robots: { index: false, follow: true } };
}

type Params = Readonly<Record<string, string | string[] | undefined>>;
const first = (value: string | string[] | undefined): string => (Array.isArray(value) ? value[0] ?? "" : value ?? "");

export default async function SearchPage({ searchParams }: { readonly searchParams: Promise<Params> }) {
  const { t, locale } = await siteI18n();
  const params = await searchParams;
  const values = { categoria: first(params["categoria"]), ciudad: first(params["ciudad"]), precioMax: first(params["precioMax"]), fecha: first(params["fecha"]), verificado: first(params["verificado"]), lat: first(params["lat"]), lng: first(params["lng"]), radio: first(params["radio"]) };
  const maxPrice = Number(values.precioMax);
  // Proximity wins when the coordinates are valid; otherwise the city filter is the fallback.
  const near = parseGeo(values.lat, values.lng, values.radio);
  const effective = near ? { ...values, lat: String(near.lat), lng: String(near.lng), radio: String(near.radiusKm) } : { ...values, lat: "", lng: "", radio: "" };
  const results = await searchProviders({
    category: categoryBySlug(values.categoria)?.code,
    city: cityBySlug(values.ciudad)?.slug,
    near,
    verifiedOnly: values.verificado === "1",
    maxPriceMinor: values.precioMax && Number.isInteger(maxPrice) && maxPrice >= 0 ? maxPrice * MINOR_PER_UNIT : undefined,
    date: values.fecha || undefined,
    page: pageParam(params["page"])
  });
  const query = new URLSearchParams(Object.entries(effective).filter(([, value]) => value)).toString();
  return (
    <main className="directory">
      <Breadcrumbs t={t} items={[{ label: t("directory.searchTitle") }]} />
      <h1>{t("directory.searchTitle")}</h1>
      <SearchForm t={t} values={effective} />
      <ProviderResults page={results} t={t} locale={locale} path="/proveedores/buscar" query={query} />
    </main>
  );
}
