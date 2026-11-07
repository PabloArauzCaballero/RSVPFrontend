import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { siteI18n } from "../../../lib/site-locale";
import { PartnerMicrosite, PartnerUnavailable } from "../../../components/partner-microsite";
import { routeMetadata } from "../../../lib/seo";
import { isSupported } from "../../../lib/locale-negotiation";
import { loadPartner } from "../../../lib/partner";

/** B5 · Partner microsite: the indexable destination for partners without a site of their own. */
export const revalidate = 300;

interface Props { readonly params: Promise<{ readonly slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { t, locale } = await siteI18n();
  const { slug } = await params;
  const lookup = await loadPartner(slug);
  // Unknown, unverified, suspended or unreachable: nothing to index and nothing revealed.
  if (lookup.state !== "ok") return { title: t("partner.notFound.title"), robots: { index: false, follow: false } };
  const { partner } = lookup;
  const values = { name: partner.name, category: t(`directory.category.${partner.category}`), city: partner.city };
  const description = (partner.summary ?? t("partner.meta.description", values)).slice(0, 160);
  return routeMetadata({ path: `/p/${encodeURIComponent(slug)}`, locale: isSupported(locale) ? locale : "es-BO", title: t("partner.meta.title", values), description, image: partner.imageUrl ? { url: partner.imageUrl, alt: partner.name } : undefined });
}

export default async function PartnerPage({ params }: Props) {
  const { t, locale } = await siteI18n();
  const { slug } = await params;
  const lookup = await loadPartner(slug);
  if (lookup.state === "not-found") notFound();
  if (lookup.state === "unavailable") return <PartnerUnavailable t={t} />;
  return <PartnerMicrosite partner={lookup.partner} t={t} locale={locale} />;
}
