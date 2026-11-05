import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createTranslator, defaultLocale } from "@rsvp/i18n/server";
import { GiftExperience } from "../../../../../components/gift/gift-experience";
import { loadGiftPage } from "../../../../../lib/gifts";

/** A15 · Gift detail: the same live list narrowed to one gift, so status and the 409 stay truthful. */
export const dynamic = "force-dynamic";
const t = createTranslator(defaultLocale);
interface Props { readonly params: Promise<{ readonly slug: string; readonly id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadGiftPage(slug);
  if (data.state === "not-found") return { title: t("gifts.notFound.title"), robots: { index: false, follow: false } };
  return { title: t("gifts.title"), robots: { index: false, follow: false } };
}

export default async function GiftDetailPage({ params }: Props) {
  const { slug, id } = await params;
  const data = await loadGiftPage(slug);
  if (data.state === "not-found") notFound();
  return <GiftExperience slug={slug} celebrationId={data.celebration.celebrationId} celebrationTitle={data.celebration.title} locale={defaultLocale} onlyItemId={id} />;
}
