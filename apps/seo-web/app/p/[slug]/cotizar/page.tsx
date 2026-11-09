import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { siteI18n } from "../../../../lib/site-locale";
import { QuoteCart } from "../../../../components/provider/quote-cart";
import { PROVIDER_CITIES } from "../../../../lib/providers";
import { loadPartnerContext, todayIn } from "../../../../lib/partner-context";

/** B8/B9 · Quote request for one or more offers of the partner. Never indexed: it is a form. */
export const dynamic = "force-dynamic";
interface Props { readonly params: Promise<{ readonly slug: string }>; readonly searchParams: Promise<{ readonly l?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { t } = await siteI18n();
  const { slug } = await params;
  const context = await loadPartnerContext(slug);
  return { title: context.state === "ok" ? t("quote.title", { name: context.partner.name }) : t("partner.notFound.title"), robots: { index: false, follow: false } };
}

export default async function QuotePage({ params, searchParams }: Props) {
  const { t, locale } = await siteI18n();
  const { slug } = await params;
  const { l } = await searchParams;
  const context = await loadPartnerContext(slug);
  if (context.state === "not-found") notFound();
  if (context.state === "unavailable") return <main className="directory partner"><h1>{t("partner.unavailable.title")}</h1><p role="status">{t("quote.unavailable")}</p></main>;
  const { partner, providerId, profile } = context;
  const offers = partner.listings.map((listing) => ({ listingId: listing.listingId, title: listing.summary ?? listing.name, ...(listing.priceFrom ? { priceFrom: listing.priceFrom } : {}), ...(listing.fulfillment ? { fulfillment: { responsible: listing.fulfillment.responsible, coverageZones: listing.fulfillment.coverageZones, leadTimeDays: listing.fulfillment.leadTimeDays } } : {}) }));
  return <QuoteCart slug={slug} providerId={providerId} providerName={partner.name} timeZone={profile.timeZone} offers={offers} {...(l ? { preselected: l } : {})} locale={locale} today={todayIn(profile.timeZone).date} cities={PROVIDER_CITIES.map(({ slug: citySlug, name }) => ({ slug: citySlug, name }))} />;
}
