import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://rsvp.example";
  return { rules: [{ userAgent: "*", allow: ["/"], disallow: ["/admin", "/api", "/panel"] }], sitemap: `${base}/sitemap.xml` };
}
