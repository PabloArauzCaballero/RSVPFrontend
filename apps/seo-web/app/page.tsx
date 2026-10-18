import { createTranslator, defaultLocale } from "@rsvp/i18n/server";

export const revalidate = 3600;

/** Public home: what RSVP is, and the entry to the provider directory. */
export default function Home() {
  const t = createTranslator(defaultLocale);
  return (
    <main className="seo-home">
      <h1>{t("celebration.site.title")}</h1>
      <p>{t("celebration.site.tagline")}</p>
      <p>{t("celebration.site.description")}</p>
      <a className="rsvp-button" href="/proveedores">{t("celebration.site.directory")}</a>
    </main>
  );
}
