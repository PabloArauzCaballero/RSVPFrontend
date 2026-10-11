import { PublicCelebration } from "../../../components/public-celebration";
import { celebrationFor } from "../../../lib/celebration";
import { celebrationMetadata } from "../../../lib/metadata";
import { eventJsonLd } from "../../../lib/json-ld";

export const revalidate = 300;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) { const celebration = celebrationFor((await params).slug); return celebrationMetadata({ slug: celebration.slug, title: celebration.title, description: celebration.description }); }
export default async function CelebrationPage({ params }: { params: Promise<{ slug: string }> }) {
  const celebration = celebrationFor((await params).slug);
  const jsonLd = eventJsonLd({ name: celebration.title.replace(" | RSVP", ""), startDate: celebration.startsAt, location: celebration.venue, url: `/c/${celebration.slug}` });
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /><PublicCelebration celebration={celebration} /></>;
}
