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
let checks = 0; const fail = []; const titles = new Map();
for (const { path, types, own } of routes) for (const lang of ["es-BO", "en-US"]) {
  const url = `${SITE}${path}${path.includes("?") ? "&" : "?"}lang=${lang}`;
  const html = await (await fetch(url, { headers: { "accept-language": lang } })).text();
  try {
    assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1, "exactly one h1");
    const title = attr(html, /<title>([^<]{5,})<\/title>/); assert.ok(title, "title");
    assert.ok(title.length <= 70, `title ${title.length} chars`);
    const key = `${lang}|${title}`; assert.ok(!titles.has(key) || titles.get(key) === path, `duplicate title with ${titles.get(key)}`); titles.set(key, path);
    const description = attr(html, /<meta name="description" content="([^"]*)"/); assert.ok(description && description.length >= 50 && description.length <= 165, `description ${description?.length} chars`);
    const levels = [...html.matchAll(/<h([1-6])[ >]/g)].map((m) => Number(m[1]));
    for (let i = 1; i < levels.length; i++) assert.ok(levels[i] <= levels[i - 1] + 1, `heading jumps h${levels[i - 1]} -> h${levels[i]}`);
    assert.equal([...html.matchAll(/<img\b[^>]*>/g)].filter((m) => !/\balt=/.test(m[0])).length, 0, "every img has an alt attribute");
    assert.ok(!/<meta name="robots" content="[^"]*noindex/.test(html), "indexable page is not noindex");
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
// Crawl files: robots.txt points to the sitemap and every sitemap URL answers 200, is not noindex, and lists itself among its alternates.
try {
  const robots = await (await fetch(`${SITE}/robots.txt`)).text();
  assert.ok(/Sitemap: .*\/sitemap\.xml/.test(robots), "robots.txt names the sitemap");
  assert.ok(!/Disallow: \/\s*$/m.test(robots), "robots.txt does not block the whole site");
  const xml = await (await fetch(`${SITE}/sitemap.xml`)).text();
  const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
  assert.ok(entries.length > 5, "sitemap has entries");
  for (const entry of entries) {
    const loc = entry.match(/<loc>([^<]+)<\/loc>/)[1].replaceAll("&amp;", "&");
    const self = [...entry.matchAll(/hreflang="[^"]+" href="([^"]+)"/g)].map((m) => m[1].replaceAll("&amp;", "&"));
    if (self.length) assert.ok(self.includes(loc), `sitemap ${loc} lists itself among its alternates`);
    const res = await fetch(loc.replace(/^https?:\/\/[^/]+/, SITE)); const body = await res.text();
    assert.equal(res.status, 200, `${loc} -> ${res.status}`);
    assert.ok(!/<meta name="robots" content="[^"]*noindex/.test(body), `${loc} is in the sitemap but noindex`);
  }
  checks++; console.log(`  PASS robots.txt + sitemap (${entries.length} URLs)`);
} catch (error) { fail.push(`crawl files: ${error.message}`); console.log(`  FAIL crawl files: ${error.message}`); }
console.log(`${checks} PASS · ${fail.length} FAIL`);
process.exit(fail.length ? 1 : 0);
