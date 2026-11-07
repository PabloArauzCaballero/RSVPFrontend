import type { Metadata } from "next";
import { siteI18n } from "../lib/site-locale";
import { LostArt } from "../components/brand/illustrations";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await siteI18n();
  return { title: t("landing.notFound.title"), robots: { index: false, follow: false } };
}

/** Any unknown address: the same words in the visitor's language, a drawing of the unfinished check, and the way back. */
export default async function NotFound() {
  const { t } = await siteI18n();
  return (
    <main className="state-page">
      <LostArt className="state__art" />
      <h1>{t("landing.notFound.title")}</h1>
      <p>{t("landing.notFound.body")}</p>
      <a className="btn btn--solid" href="/">{t("landing.notFound.home")}</a>
    </main>
  );
}
