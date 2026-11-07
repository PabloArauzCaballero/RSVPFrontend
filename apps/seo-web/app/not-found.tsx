import type { Metadata } from "next";
import { siteI18n } from "../lib/site-locale";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await siteI18n();
  return { title: t("landing.notFound.title"), robots: { index: false, follow: false } };
}

/** Any unknown address: the same words in the visitor's language and a way back, instead of the framework's English default. */
export default async function NotFound() {
  const { t } = await siteI18n();
  return (
    <main className="directory">
      <h1>{t("landing.notFound.title")}</h1>
      <p>{t("landing.notFound.body")}</p>
      <a className="rsvp-button" href="/">{t("landing.notFound.home")}</a>
    </main>
  );
}
