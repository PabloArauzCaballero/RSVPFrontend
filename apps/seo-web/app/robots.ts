import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/metadata";

/** Private surfaces and guest magic links are never crawled; the redirector only records clicks. */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [{ userAgent: "*", allow: ["/"], disallow: ["/admin", "/api", "/panel", "/catalogo", "/r/", "/c/*/rsvp", "/rsvp/"] }],
    sitemap: `${base}/sitemap.xml`,
    host: base
  };
}
