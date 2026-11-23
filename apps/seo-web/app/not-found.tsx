import type { Metadata } from "next";
import { siteI18n } from "../lib/site-locale";
import { LostArt } from "../components/brand/illustrations";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await siteI18n();
  return { title: t("notFound.title"), robots: { index: false, follow: false } };
}

/** Any unknown address: the app's own 404 words (`notFound.*`, the app's `NotFoundScreen`), its drawing and the way back. */
export default async function NotFound() {
  const { t } = await siteI18n();
  return (
    <main className="state-page">
      <LostArt className="state__art" />
      <h1>{t("notFound.title")}</h1>
      <p>{t("notFound.intro")}</p>
      <a className="btn btn--solid" href="/">{t("notFound.home")}</a>
    </main>
  );
}
