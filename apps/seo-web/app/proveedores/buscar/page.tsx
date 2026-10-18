import type { Metadata } from "next";
import { createTranslator, defaultLocale } from "@rsvp/i18n/server";
import { Breadcrumbs, ProviderResults, SearchForm } from "../../../components/provider-directory";
import { categoryBySlug, cityBySlug, pageParam, searchProviders } from "../../../lib/providers";

/** B4 · Filtered results. Filter combinations are endless, so this page is not indexed (but its links are followed). */
const t = createTranslator(defaultLocale);
const MINOR_PER_UNIT = 100;

export const metadata: Metadata = { title: t("directory.searchTitle"), description: t("directory.searchDescription"), robots: { index: false, follow: true } };

type Params = Readonly<Record<string, string | string[] | undefined>>;
const first = (value: string | string[] | undefined): string => (Array.isArray(value) ? value[0] ?? "" : value ?? "");

export default async function SearchPage({ searchParams }: { readonly searchParams: Promise<Params> }) {
  const params = await searchParams;
  const values = { categoria: first(params["categoria"]), ciudad: first(params["ciudad"]), precioMax: first(params["precioMax"]), fecha: first(params["fecha"]), verificado: first(params["verificado"]) };
  const maxPrice = Number(values.precioMax);
  const results = await searchProviders({
    category: categoryBySlug(values.categoria)?.code,
    city: cityBySlug(values.ciudad)?.name,
    verifiedOnly: values.verificado === "1",
    maxPriceMinor: values.precioMax && Number.isInteger(maxPrice) && maxPrice >= 0 ? maxPrice * MINOR_PER_UNIT : undefined,
    date: values.fecha || undefined,
    page: pageParam(params["page"])
  });
  const query = new URLSearchParams(Object.entries(values).filter(([, value]) => value)).toString();
  return (
    <main className="directory">
      <Breadcrumbs t={t} items={[{ label: t("directory.searchTitle") }]} />
      <h1>{t("directory.searchTitle")}</h1>
      <SearchForm t={t} values={values} />
      <ProviderResults page={results} t={t} locale={defaultLocale} path="/proveedores/buscar" query={query} />
    </main>
  );
}
