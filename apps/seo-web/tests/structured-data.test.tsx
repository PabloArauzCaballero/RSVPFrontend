// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { createTranslator } from "@rsvp/i18n/server";
import { describe, expect, it } from "vitest";
import { Landing } from "../components/landing";
import { PartnerMicrosite } from "../components/partner-microsite";
import { Breadcrumbs } from "../components/provider-directory";
import { breadcrumbJsonLd, faqJsonLd, localBusinessJsonLd, minorToDecimal, siteGraphJsonLd } from "../lib/json-ld";
import { alternatesFor, localizedUrl, routeMetadata } from "../lib/seo";
import { withLanguage } from "../lib/locale-negotiation";
import { partnerFromListings } from "../lib/partner";

type Node = Record<string, unknown>;
const scripts = (html: string): Node[] => [...new DOMParser().parseFromString(`<body>${html}</body>`, "text/html").querySelectorAll('script[type="application/ld+json"]')].map((node) => JSON.parse(node.textContent ?? "{}") as Node);
const absolute = (value: unknown): boolean => typeof value === "string" && /^https?:\/\//.test(value);

/** Required properties per type (schema.org + Google): the offline validator every JSON-LD block goes through. */
const REQUIRED: Readonly<Record<string, readonly string[]>> = {
  Organization: ["name", "url"], WebSite: ["name", "url"], FAQPage: ["mainEntity"], Question: ["name", "acceptedAnswer"], Answer: ["text"],
  BreadcrumbList: ["itemListElement"], ListItem: ["position", "name"], LocalBusiness: ["name", "address"], Offer: ["itemOffered"], Service: ["name"], PriceSpecification: ["minPrice", "priceCurrency"]
};
function validate(node: unknown, path = "$"): string[] {
  if (Array.isArray(node)) return node.flatMap((child, index) => validate(child, `${path}[${index}]`));
  if (!node || typeof node !== "object") return [];
  const record = node as Node;
  const type = record["@type"];
  const errors: string[] = [];
  if (typeof type === "string") {
    for (const key of REQUIRED[type] ?? []) if (record[key] === undefined || record[key] === "") errors.push(`${path} ${type} lacks ${key}`);
    for (const key of ["url", "item", "logo"]) if (record[key] !== undefined && !absolute(record[key])) errors.push(`${path} ${type}.${key} is not an absolute URL`);
  }
  for (const [key, value] of Object.entries(record)) if (typeof value === "object") errors.push(...validate(value, `${path}.${key}`));
  return errors;
}

describe("structured data validates offline", () => {
  for (const locale of ["es-BO", "en-US"] as const) {
    const t = createTranslator(locale);
    it(`${locale} · home carries Organization, WebSite and a FAQ that is visible on the page`, () => {
      const html = renderToStaticMarkup(<Landing t={t} locale={locale} />);
      const blocks = scripts(html);
      const graph = blocks.find((block) => Array.isArray(block["@graph"]))?.["@graph"] as Node[];
      expect(graph.map((node) => node["@type"])).toEqual(["Organization", "WebSite"]);
      const faq = blocks.find((block) => block["@type"] === "FAQPage") as Node;
      const questions = faq["mainEntity"] as Node[];
      expect(questions.length).toBeGreaterThanOrEqual(4);
      const visible = new DOMParser().parseFromString(html, "text/html").body.textContent ?? "";
      for (const question of questions) expect(visible).toContain(String(question["name"]));
      expect(blocks.flatMap((block) => validate(block))).toEqual([]);
      expect(new DOMParser().parseFromString(html, "text/html").querySelectorAll("h1")).toHaveLength(1);
    });
  }

  it("breadcrumbs mirror the visible trail and end on the current page without an item", () => {
    const t = createTranslator("es-BO");
    const html = renderToStaticMarkup(<Breadcrumbs t={t} items={[{ label: "Catering" }]} />);
    const list = scripts(html)[0] as Node;
    const items = list["itemListElement"] as Node[];
    expect(items.map((item) => item["name"])).toEqual(["Inicio", "Proveedores", "Catering"]);
    expect(items[2]).not.toHaveProperty("item");
    expect(validate(list)).toEqual([]);
    expect(breadcrumbJsonLd([{ name: "A", url: "https://x/" }])).toMatchObject({ "@type": "BreadcrumbList" });
  });

  it("a partner is a LocalBusiness whose services are Offers with a minimum price, never a rating", () => {
    const t = createTranslator("es-BO");
    const card = { listingId: "7d1c1a34-5d4c-4a39-9a2e-0f4f2d3d7b11", destinations: ["WHATSAPP"], providerSlug: "hotel-andino", name: "Hotel Andino", category: "ACCOMMODATION", city: "La Paz", department: "La Paz", verified: true, priceFrom: { amountMinor: 1250000, currency: "BOB" }, summary: "Habitaciones." };
    const partner = partnerFromListings("hotel-andino", [card]);
    if (!partner) throw new Error("expected partner");
    const html = renderToStaticMarkup(<PartnerMicrosite partner={partner} t={t} locale="es-BO" />);
    const blocks = scripts(html);
    const business = blocks.find((block) => block["@type"] === "LocalBusiness") as Node;
    expect(JSON.stringify(business)).toContain('"minPrice":"12500.00"');
    expect(JSON.stringify(business)).not.toMatch(/aggregateRating|review/i);
    expect(blocks.flatMap((block) => validate(block))).toEqual([]);
    expect(blocks.some((block) => block["@type"] === "BreadcrumbList")).toBe(true);
  });

  it("helpers", () => {
    expect(minorToDecimal(5)).toBe("0.05");
    expect(localBusinessJsonLd({ name: "A", url: "https://x/p/a", category: "C" })).not.toHaveProperty("hasOfferCatalog");
    expect(siteGraphJsonLd({ description: "d", locale: "es-BO" })["@graph"]).toHaveLength(2);
    expect(faqJsonLd([{ question: "q", answer: "a" }])["@type"]).toBe("FAQPage");
  });
});

describe("canonical and hreflang are reciprocal and match the language negotiation", () => {
  it("es-BO is the bare URL, en-US adds ?lang=, x-default is the bare URL", () => {
    expect(localizedUrl("/proveedores", "es-BO")).toBe("http://localhost:3000/proveedores");
    expect(localizedUrl("/proveedores", "en-US", { page: "2" })).toBe("http://localhost:3000/proveedores?page=2&lang=en-US");
    const alt = alternatesFor("/proveedores/catering", "en-US");
    expect(alt.canonical).toBe("http://localhost:3000/proveedores/catering?lang=en-US");
    expect(alt.languages).toEqual({ "es-BO": "http://localhost:3000/proveedores/catering", "en-US": "http://localhost:3000/proveedores/catering?lang=en-US", "x-default": "http://localhost:3000/proveedores/catering" });
    for (const locale of ["es-BO", "en-US"] as const) expect(Object.values(alternatesFor("/", locale).languages ?? {})).toContain(alternatesFor("/", locale).canonical);
  });

  it("route metadata sets title, description, Open Graph locale and Twitter card", () => {
    const meta = routeMetadata({ path: "/", locale: "en-US", title: "T", description: "D", absoluteTitle: true });
    expect(meta.title).toEqual({ absolute: "T" });
    expect(meta.openGraph).toMatchObject({ locale: "en_US", alternateLocale: ["es_BO"], siteName: "DOne" });
    expect(meta.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("the language switcher keeps filters and pagination", () => {
    expect(withLanguage("/proveedores/buscar?ciudad=la-paz&page=2", "en-US")).toBe("/proveedores/buscar?ciudad=la-paz&page=2&lang=en-US");
    expect(withLanguage("/", "es-BO")).toBe("/?lang=es-BO");
  });
});
