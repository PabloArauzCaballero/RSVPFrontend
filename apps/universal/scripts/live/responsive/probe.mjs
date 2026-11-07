// Shared probes for the responsive live matrices (Expo web and seo-web): i18n leaks, horizontal scroll, touch targets, axe.
// The app dictionaries are the source of truth: es-BO strings that differ from their en-US twin must never show in en-US,
// and no raw key ("auth.signIn") may ever show in either language.
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import AxeBuilder from "@axe-core/playwright";

const root = resolve(new URL("../../../../../", import.meta.url).pathname);

async function loadResources() {
  const dir = mkdtempSync(join(tmpdir(), "rsvp-i18n-"));
  const outfile = join(dir, "i18n.mjs");
  await build({ entryPoints: [join(root, "packages/i18n/src/server.ts")], bundle: true, format: "esm", platform: "node", outfile, logLevel: "silent", resolveExtensions: [".ts", ".js"], loader: { ".js": "js" }, plugins: [{ name: "js-to-ts", setup(b) { b.onResolve({ filter: /\.js$/ }, (args) => { if (!args.path.startsWith(".")) return; return { path: resolve(args.resolveDir, args.path.replace(/\.js$/, ".ts")) }; }); } }] });
  const mod = await import(pathToFileURL(outfile).href);
  rmSync(dir, { recursive: true, force: true });
  return mod.resources;
}

const flatten = (obj, prefix = "", out = {}) => { for (const [k, v] of Object.entries(obj)) { const key = prefix ? `${prefix}.${k}` : k; if (v && typeof v === "object") flatten(v, key, out); else out[key] = String(v); } return out; };

const resources = await loadResources();
export const es = flatten(resources["es-BO"]);
export const en = flatten(resources["en-US"]);
const keySet = new Set(Object.keys(es));
const spanishOnly = new Map(); // text -> key, for strings where es-BO differs from en-US and carries no interpolation
// Sample names ("Ana & Luis") are proper nouns shown in the product demo, not translatable copy.
const isSample = (key, value = "") => key.startsWith("admin.sample.") || /^[A-ZÁÉÍÓÚ][a-záéíóúñ]+ (&|y|and) [A-ZÁÉÍÓÚ][a-záéíóúñ]+$/.test(value);
for (const [key, value] of Object.entries(es)) if (!isSample(key, value) && en[key] !== undefined && en[key] !== value && !value.includes("{{") && value.trim().length >= 4) spanishOnly.set(value.trim(), key);
const englishOnly = new Map();
for (const [key, value] of Object.entries(en)) if (!isSample(key, value) && es[key] !== undefined && es[key] !== value && !value.includes("{{") && value.trim().length >= 4) englishOnly.set(value.trim(), key);

/** Visible text nodes of the page (leaf text of visible elements), plus aria-labels and placeholders. */
export async function visibleTexts(page) {
  return page.evaluate(() => {
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.replace(/\s+/g, " ").trim();
      const el = node.parentElement;
      if (!text || !el || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(el.tagName)) continue;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      out.push(text);
    }
    for (const el of document.querySelectorAll("[aria-label],[placeholder],[alt]")) for (const attr of ["aria-label", "placeholder", "alt"]) { const v = el.getAttribute(attr)?.trim(); if (v) out.push(v); }
    return out;
  });
}

/** Raw keys in any language; Spanish dictionary strings in en-US; English ones in es-BO. `lang` null = mixed page (site chrome in the visitor's language over a celebration in its own): raw keys only. */
export async function i18nLeaks(page, lang) {
  const texts = await visibleTexts(page);
  const leaks = [];
  for (const text of texts) {
    const bare = text.replace(/\s*\{.*$/, "");
    if (keySet.has(bare) || /^(auth|org|common|host|guests|gifts|landing|celebration|language|directory|partner|search|rsvp|quote|portal|admin|errors?)\.[A-Za-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)*$/.test(bare)) leaks.push(`raw key: ${text}`);
    else if (lang === "en-US" && spanishOnly.has(text)) leaks.push(`Spanish in en-US: ${text} (${spanishOnly.get(text)})`);
    else if (lang === "es-BO" && englishOnly.has(text)) leaks.push(`English in es-BO: ${text} (${englishOnly.get(text)})`);
  }
  return [...new Set(leaks)];
}

export const horizontalScroll = (page) => page.evaluate(() => {
  const doc = document.documentElement; const w = window.innerWidth;
  const wide = [...document.querySelectorAll("body *")].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > w + 1) && getComputedStyle(el).position !== "fixed" && !el.closest("[aria-hidden='true'],[hidden]"); }).slice(0, 3).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}@${Math.round(el.getBoundingClientRect().right)}`);
  return { overflow: doc.scrollWidth > w + 1 || document.body.scrollWidth > w + 1, scrollWidth: doc.scrollWidth, innerWidth: w, wide };
});

/** Interactive controls smaller than 44x44 CSS px (inline links inside running text are exempt, as in WCAG 2.5.8). */
export const smallTargets = (page, min = 44) => page.evaluate((limit) => {
  const sel = "a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=radio],[role=checkbox],[role=tab],[role=switch],[role=menuitem]";
  const bad = [];
  for (const el of document.querySelectorAll(sel)) {
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || el.closest("[aria-hidden='true']")) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || r.right < 0 || r.left > innerWidth + 1000 || r.bottom < -1000) continue;
    if (r.right < 0 || r.x < -500) continue; // off-screen skip links
    const inline = el.tagName === "A" && style.display === "inline" && el.parentElement && /^(P|LI|SPAN|SMALL|DD|DT|LABEL|STRONG|EM)$/.test(el.parentElement.tagName) && (el.parentElement.textContent ?? "").trim().length > (el.textContent ?? "").trim().length + 3;
    if (inline) continue;
    // a control wrapped by a bigger label/target counts through the wrapper
    if (r.width < limit - 0.5 || r.height < limit - 0.5) {
      const wrap = el.closest("label,[role=radio],[role=button],[role=switch],[role=checkbox],a[href],button");
      const wr = wrap && wrap !== el ? wrap.getBoundingClientRect() : null;
      if (wr && wr.width >= limit - 0.5 && wr.height >= limit - 0.5) continue;
      bad.push(`${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}[${(el.getAttribute("aria-label") || el.textContent || el.getAttribute("data-testid") || "").trim().slice(0, 30)}] ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
  }
  return bad;
}, min);

export async function axeSeriousOrCritical(page) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return result.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}(${v.impact},${v.nodes.length}) ${v.nodes[0]?.target?.join(" ")} :: ${v.nodes[0]?.html.slice(0, 110)}`);
}

/** Console errors that matter: the anonymous session refresh answers 401 by design and is the only exclusion. */
export function watchErrors(page, { expectNotFoundFor } = {}) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const url = message.location()?.url ?? "";
    if (/status of 401/.test(message.text()) && /\/auth\/refresh/.test(url)) return;
    // Services this local world does not deploy: template-media (/media, /templates answer 502) and push (/devices, /push-deliveries answer 503).
    // Only those URLs and only those statuses are excluded; any other 4xx/5xx still fails the check.
    if (/status of (502|503)/.test(message.text()) && /\/(media|templates)\b|\/notifications\/.*\/(devices|push-deliveries)\b/.test(url)) return;
    if (/status of 404/.test(message.text()) && expectNotFoundFor?.() === url) return; // the document of a route that must answer 404
    errors.push(`console.error: ${message.text().slice(0, 200)} ${url}`);
  });
  return errors;
}
