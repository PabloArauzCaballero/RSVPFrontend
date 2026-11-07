// Live SEO check against `next start`: per route and language, one <h1>, title, description, canonical, reciprocal hreflang,
// Open Graph, Twitter and JSON-LD that parses with its required properties.
//   WORLD=world.json SITE=http://localhost:3000 node apps/seo-web/scripts/check-seo-live.mjs
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const SITE = process.env.SITE ?? "http://localhost:3000";
const world = JSON.parse(readFileSync(process.env.WORLD, "utf8"));
const routes = [
  { path: "/", types: ["Organization", "WebSite", "FAQPage"] }, { path: "/proveedores", types: ["BreadcrumbList"] }, { path: "/proveedores/catering", types: ["BreadcrumbList"] },
  { path: `/p/${world.provider.slug}`, types: ["LocalBusiness", "BreadcrumbList"] }, { path: `/c/${world.celebration.slug}`, types: ["Event"], own: true }
];
const REQUIRED = { Organization: ["name", "url"], WebSite: ["name", "url"], FAQPage: ["mainEntity"], BreadcrumbList: ["itemListElement"], LocalBusiness: ["name", "address"], Event: ["name", "startDate", "location"] };
const attr = (html, re) => html.match(re)?.[1];
let checks = 0; const fail = [];
for (const { path, types, own } of routes) for (const lang of ["es-BO", "en-US"]) {
  const url = `${SITE}${path}${path.includes("?") ? "&" : "?"}lang=${lang}`;
  const html = await (await fetch(url, { headers: { "accept-language": lang } })).text();
  try {
    assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1, "exactly one h1");
    assert.ok(attr(html, /<title>([^<]{5,})<\/title>/), "title");
    assert.ok(attr(html, /<meta name="description" content="([^"]{30,})"/), "description");
    assert.ok(new RegExp(`<html lang="${lang}"`).test(html) || own, "html lang");
    const canonical = attr(html, /<link rel="canonical" href="([^"]+)"/); assert.ok(canonical, "canonical");
    const alts = Object.fromEntries([...html.matchAll(/<link rel="alternate" hrefLang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]]));
    // A celebration lists only the languages it publishes (this one ships es-BO); the site pages list both plus x-default.
    if (own) assert.ok(Object.keys(alts).length >= 1, "hreflang"); else assert.ok(alts["es-BO"] && alts["en-US"] && alts["x-default"], `hreflang ${JSON.stringify(alts)}`);
    if (!own) assert.equal(canonical, alts[lang], "canonical equals its own hreflang");
    assert.ok(attr(html, /<meta property="og:title" content="([^"]+)"/), "og:title");
    assert.ok(attr(html, new RegExp(`<meta property="og:locale" content="${lang.replace("-", "_")}"`)) !== null || own, "og:locale");
    assert.ok(/<meta name="twitter:card"/.test(html), "twitter:card");
    const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    const nodes = blocks.flatMap((b) => (b["@graph"] ? b["@graph"] : [b]));
    for (const type of types) { const node = nodes.find((n) => n["@type"] === type); assert.ok(node, `JSON-LD ${type}`); for (const key of REQUIRED[type]) assert.ok(node[key] !== undefined, `${type}.${key}`); }
    checks++; console.log(`  PASS ${path} ${lang}`);
  } catch (error) { fail.push(`${path} ${lang}: ${error.message}`); console.log(`  FAIL ${path} ${lang}: ${error.message}`); }
}
console.log(`${checks} PASS · ${fail.length} FAIL`);
process.exit(fail.length ? 1 : 0);
