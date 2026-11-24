import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComponentCatalog } from "@rsvp/ui-web";
import { componentCatalogEnabled } from "../../lib/dev-surfaces";

// L18 · Even where it exists (development, visual tests) the demo is never indexed; robots.txt also disallows it and the sitemap never lists it.
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Development-only demo of the UI primitives: outside `next dev` (or the visual test build) it is the site's 404. */
export default function CatalogPage() {
  if (!componentCatalogEnabled()) notFound();
  return <ComponentCatalog />;
}
