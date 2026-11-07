import type { Metadata } from "next";
import { Landing } from "../components/landing";
import { routeMetadata } from "../lib/seo";
import { siteI18n } from "../lib/site-locale";
import { isSupported } from "../lib/locale-negotiation";

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await siteI18n();
  return routeMetadata({ path: "/", locale: isSupported(locale) ? locale : "es-BO", title: t("landing.meta.title"), description: t("landing.meta.description"), absoluteTitle: true });
}

/** Public home: the promise, the three taps, who it is for, what is true and what is not, one way in. */
export default async function Home() {
  const { t, locale } = await siteI18n();
  return <Landing t={t} locale={locale} />;
}
