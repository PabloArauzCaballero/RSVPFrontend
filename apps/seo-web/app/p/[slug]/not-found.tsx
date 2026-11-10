import { createTranslator, defaultLocale } from "@rsvp/i18n/server";

/** B14 · Partner not verified, suspended or unknown: a controlled 404 with a way back, nothing about the partner. */
const t = createTranslator(defaultLocale);

export default function PartnerNotFound() {
  return (
    <main className="directory partner">
      <h1>{t("partner.notFound.title")}</h1>
      <p>{t("partner.notFound.body")}</p>
      <a className="rsvp-button" href="/proveedores">{t("partner.backToDirectory")}</a>
    </main>
  );
}
