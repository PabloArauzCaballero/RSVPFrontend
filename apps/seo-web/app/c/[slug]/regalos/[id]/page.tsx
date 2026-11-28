import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createTranslator } from "@rsvp/i18n/server";
import { GiftExperience } from "../../../../../components/gift/gift-experience";
import { loadGiftPage } from "../../../../../lib/gifts";
import { guestPageLocale, type GuestLanguageParams } from "../../../../../lib/request-locale";

/** A15 · Gift detail: the same live list narrowed to one gift, so status and the 409 stay truthful. */
export const dynamic = "force-dynamic";
interface Props { readonly params: Promise<{ readonly slug: string; readonly id: string }>; readonly searchParams?: GuestLanguageParams }

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const t = createTranslator(await guestPageLocale(searchParams));
  const { slug } = await params;
  const data = await loadGiftPage(slug);
  if (data.state === "not-found") return { title: t("gifts.notFound.title"), robots: { index: false, follow: false } };
  return { title: t("gifts.guest.title"), robots: { index: false, follow: false } };
}

export default async function GiftDetailPage({ params, searchParams }: Props) {
  const locale = await guestPageLocale(searchParams);
  const { slug, id } = await params;
  const data = await loadGiftPage(slug);
  if (data.state === "not-found") notFound();
  return <GiftExperience slug={slug} celebrationId={data.celebration.celebrationId} celebrationTitle={data.celebration.title} locale={locale} {...(data.celebration.eventType ? { eventType: data.celebration.eventType } : {})} onlyItemId={id} />;
}
