import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createTranslator, defaultLocale } from "@rsvp/i18n/server";
import { Agenda } from "../../../../components/provider/agenda";
import { loadPartnerContext, todayIn } from "../../../../lib/partner-context";

/** B10/B11 · Availability calendar in the provider's time zone and date request. */
export const dynamic = "force-dynamic";
const t = createTranslator(defaultLocale);
interface Props { readonly params: Promise<{ readonly slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const context = await loadPartnerContext(slug);
  return { title: context.state === "ok" ? t("agenda.title", { name: context.partner.name }) : t("partner.notFound.title"), robots: { index: false, follow: false } };
}

export default async function AgendaPage({ params }: Props) {
  const { slug } = await params;
  const context = await loadPartnerContext(slug);
  if (context.state === "not-found") notFound();
  if (context.state === "unavailable") return <main className="directory partner"><h1>{t("partner.unavailable.title")}</h1><p role="status">{t("quote.unavailable")}</p></main>;
  return <Agenda slug={slug} providerId={context.providerId} providerName={context.partner.name} timeZone={context.profile.timeZone} locale={defaultLocale} initialMonth={todayIn(context.profile.timeZone).month} />;
}
