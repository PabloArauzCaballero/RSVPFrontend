import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createTranslator, defaultLocale } from "@rsvp/i18n/server";
import { GiftExperience } from "../../../../components/gift/gift-experience";
import { loadGiftPage } from "../../../../lib/gifts";

/** A14 · Public gift list. The shell is server-rendered; the list loads in the browser with the guest's link credential (no anonymous read exists). */
export const dynamic = "force-dynamic";
const t = createTranslator(defaultLocale);
interface Props { readonly params: Promise<{ readonly slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadGiftPage(slug);
  if (data.state === "not-found") return { title: t("gifts.notFound.title"), robots: { index: false, follow: false } };
  return { title: t("gifts.meta.title", { name: data.celebration.title }), description: t("gifts.meta.description", { name: data.celebration.title }), robots: { index: false, follow: false } };
}

export default async function GiftsPage({ params }: Props) {
  const { slug } = await params;
  const data = await loadGiftPage(slug);
  if (data.state === "not-found") notFound();
  return <GiftExperience slug={slug} celebrationId={data.celebration.celebrationId} celebrationTitle={data.celebration.title} locale={defaultLocale} />;
}
