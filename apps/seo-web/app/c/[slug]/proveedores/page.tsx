import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createTranslator } from "@rsvp/i18n/server";
import { GuestMarketplace } from "../../../../components/marketplace/guest-marketplace";
import { loadMarketplace } from "../../../../lib/marketplace";
import { guestPageLocale } from "../../../../lib/request-locale";

/**
 * «Proveedores para tu evento»: the guest's tab of a celebration. Private by construction, like the personal RSVP page: noindex, no-referrer (also in next.config.js,
 * for the response header), never cached, and it reads nothing of the guest: no link credential, no guest id. The address carries only the language, the category,
 * the city and the page. Off unless the deployment sets GUEST_MARKETPLACE=on (then it is a plain 404, like an unpublished celebration).
 */
export const dynamic = "force-dynamic";
interface Props {
  readonly params: Promise<{ readonly slug: string }>;
  readonly searchParams: Promise<{ readonly lang?: string | string[]; readonly categoria?: string | string[]; readonly ciudad?: string | string[]; readonly pagina?: string | string[] }>;
}
const first = (value: string | string[] | undefined): string | undefined => (Array.isArray(value) ? value[0] : value);

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const t = createTranslator(await guestPageLocale(searchParams));
  const { slug } = await params;
  return { title: t("directory.guestMarketplace.metaTitle", { name: slug }), description: t("directory.guestMarketplace.metaDescription"), robots: { index: false, follow: false, nocache: true }, referrer: "no-referrer" };
}

export default async function GuestMarketplacePage({ params, searchParams }: Props) {
  const locale = await guestPageLocale(searchParams);
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const page = Number(first(query.pagina));
  const data = await loadMarketplace({ slug, locale, category: first(query.categoria), city: first(query.ciudad), page: Number.isInteger(page) && page > 1 ? page : 1 });
  if (data.state === "disabled" || data.state === "not-found") notFound();
  return <GuestMarketplace data={data} t={createTranslator(locale)} locale={locale} lang={locale} />;
}
