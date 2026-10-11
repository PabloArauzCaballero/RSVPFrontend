import { notFound } from "next/navigation";
import { PublicCelebration } from "../../../../components/public-celebration";
import { celebrationFor } from "../../../../lib/celebration";
import { celebrationMetadata } from "../../../../lib/metadata";

const sections = ["story", "schedule", "venues", "gallery", "dressCode", "faq", "recommendations"] as const;
type Section = (typeof sections)[number];
function sectionFor(value: string): Section | undefined { return sections.find((section) => section === value); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string; section: string }> }) { const route = await params; const celebration = celebrationFor(route.slug); return celebrationMetadata({ slug: `${celebration.slug}/${route.section}`, title: `${route.section} | ${celebration.title}`, description: celebration.description }); }
export default async function CelebrationSectionPage({ params }: { params: Promise<{ slug: string; section: string }> }) { const route = await params; const section = sectionFor(route.section); if (!section) notFound(); return <PublicCelebration celebration={celebrationFor(route.slug)} only={section} />; }
