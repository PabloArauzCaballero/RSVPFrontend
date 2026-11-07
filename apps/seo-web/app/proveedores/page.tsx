import type { Metadata } from "next";
import { siteI18n } from "../../lib/site-locale";
import { CategoryLinks, PageTop, QuoteSteps, SearchForm } from "../../components/provider-directory";
import { PROVIDER_CITIES } from "../../lib/providers";
import { routeMetadata } from "../../lib/seo";
import { isSupported } from "../../lib/locale-negotiation";

/** B1 · Directory home: what you can find, the search, the cities, and how a quote request works. */
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await siteI18n();
  return routeMetadata({ path: "/proveedores", locale: isSupported(locale) ? locale : "es-BO", title: t("directory.title"), description: t("directory.description") });
}

export default async function DirectoryHome() {
  const { t } = await siteI18n();
  return (
    <main className="dir-page">
      <PageTop t={t} items={[]} title={t("directory.title")} lead={t("directory.lead")} />
      <div className="dir-body">
        <SearchForm t={t} values={{}} />
        <section aria-labelledby="dir-categories"><h2 id="dir-categories">{t("directory.categoriesHeading")}</h2><CategoryLinks t={t} /></section>
        <section aria-labelledby="dir-cities">
          <h2 id="dir-cities">{t("directory.citiesHeading")}</h2>
          <ul className="directory-links directory-links--cities">
            {PROVIDER_CITIES.filter((city) => city.featured).map((city) => <li key={city.slug}><a href={`/proveedores/buscar?ciudad=${city.slug}`}>{city.name}</a></li>)}
          </ul>
        </section>
        <QuoteSteps t={t} />
      </div>
    </main>
  );
}
