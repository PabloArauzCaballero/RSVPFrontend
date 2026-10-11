import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://rsvp.example";

export function celebrationMetadata(input: { slug: string; title: string; description: string; image?: string }): Metadata {
  const url = `${siteUrl}/c/${input.slug}`;
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    openGraph: { type: "website", url, title: input.title, description: input.description, images: input.image ? [{ url: input.image }] : undefined }
  };
}
