import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/metadata";

/** Private surfaces and guest magic links are never crawled; the redirector (/r/) only records clicks; partner microsites (/p/) stay crawlable. */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [{ userAgent: "*", allow: ["/"], disallow: ["/admin", "/api", "/panel", "/catalogo", "/r/", "/c/*/rsvp", "/rsvp/", "/proveedores/buscar"] }],
    sitemap: `${base}/sitemap.xml`,
    host: base
  };
}
