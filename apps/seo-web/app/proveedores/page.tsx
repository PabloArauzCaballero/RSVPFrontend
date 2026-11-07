import type { Metadata } from "next";
import { siteI18n } from "../../lib/site-locale";
import { Breadcrumbs, CategoryLinks, SearchForm } from "../../components/provider-directory";
import { siteUrl } from "../../lib/metadata";
import { PROVIDER_CITIES } from "../../lib/providers";

/** B1 · Directory home: categories, featured cities and the search form. */
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await siteI18n();
  return {
    title: t("directory.title"),
    description: t("directory.description"),
    alternates: { canonical: `${siteUrl()}/proveedores` },
    openGraph: { type: "website", title: t("directory.title"), description: t("directory.description"), url: `${siteUrl()}/proveedores` }
  };
}

export default async function DirectoryHome() {
  const { t } = await siteI18n();
  return (
    <main className="directory">
      <Breadcrumbs t={t} items={[]} />
      <h1>{t("directory.title")}</h1>
      <p>{t("directory.description")}</p>
      <SearchForm t={t} values={{}} />
      <h2>{t("directory.categoriesHeading")}</h2>
      <CategoryLinks t={t} />
      <h2>{t("directory.citiesHeading")}</h2>
      <ul className="directory-links">
        {PROVIDER_CITIES.filter((city) => city.featured).map((city) => <li key={city.slug}><a href={`/proveedores/buscar?ciudad=${city.slug}`}>{city.name}</a></li>)}
      </ul>
    </main>
  );
}
