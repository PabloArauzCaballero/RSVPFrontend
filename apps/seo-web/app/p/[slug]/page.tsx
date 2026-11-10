import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createTranslator, defaultLocale } from "@rsvp/i18n/server";
import { PartnerMicrosite, PartnerUnavailable } from "../../../components/partner-microsite";
import { siteUrl } from "../../../lib/metadata";
import { loadPartner } from "../../../lib/partner";

/** B5 · Partner microsite: the indexable destination for partners without a site of their own. */
export const revalidate = 300;
const t = createTranslator(defaultLocale);

interface Props { readonly params: Promise<{ readonly slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const lookup = await loadPartner(slug);
  // Unknown, unverified, suspended or unreachable: nothing to index and nothing revealed.
  if (lookup.state !== "ok") return { title: t("partner.notFound.title"), robots: { index: false, follow: false } };
  const { partner } = lookup;
  const values = { name: partner.name, category: t(`directory.category.${partner.category}`), city: partner.city };
  const url = `${siteUrl()}/p/${encodeURIComponent(slug)}`;
  const description = (partner.summary ?? t("partner.meta.description", values)).slice(0, 160);
  return {
    title: t("partner.meta.title", values),
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", url, title: t("partner.meta.title", values), description, siteName: "DOne", ...(partner.imageUrl ? { images: [{ url: partner.imageUrl, alt: partner.name }] } : {}) },
    twitter: { card: partner.imageUrl ? "summary_large_image" : "summary", title: t("partner.meta.title", values), description },
    robots: { index: true, follow: true }
  };
}

export default async function PartnerPage({ params }: Props) {
  const { slug } = await params;
  const lookup = await loadPartner(slug);
  if (lookup.state === "not-found") notFound();
  if (lookup.state === "unavailable") return <PartnerUnavailable t={t} />;
  return <PartnerMicrosite partner={lookup.partner} t={t} locale={defaultLocale} />;
}
