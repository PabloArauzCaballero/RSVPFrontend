import { siteI18n } from "../../../lib/site-locale";

/** B14 · Partner not verified, suspended or unknown: a controlled 404 with a way back, nothing about the partner. */

export default async function PartnerNotFound() {
  const { t } = await siteI18n();
  return (
    <main className="directory partner">
      <h1>{t("partner.notFound.title")}</h1>
      <p>{t("partner.notFound.body")}</p>
      <a className="rsvp-button" href="/proveedores">{t("partner.backToDirectory")}</a>
    </main>
  );
}
