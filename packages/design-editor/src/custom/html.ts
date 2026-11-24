import { parseFragment, serialize, defaultTreeAdapter, type DefaultTreeAdapterMap } from "parse5";

type Node = DefaultTreeAdapterMap["childNode"];
type Element = DefaultTreeAdapterMap["element"];
type Fragment = DefaultTreeAdapterMap["documentFragment"];

/**
 * Raw HTML of the Advanced level (P2). An allowlist, never a denylist: every tag and attribute not named here is dropped,
 * dangerous containers (script, style, iframe, form, svg…) are dropped with their content, and anything unknown is unwrapped.
 * The HTML is parsed with parse5 (the HTML spec's own algorithm, no DOM, so it runs the same in the browser, in Node and in
 * the server's render) and written back with parse5's serializer, then checked again until it no longer changes: a document
 * that re-parses into something different (the mutation-XSS trick) never leaves this module.
 */

export const MAX_HTML_LENGTH = 20_000;
const MAX_DEPTH = 24;
const MAX_NODES = 2_000;
const MAX_PASSES = 4;

/** Where an `<img src>` may point: the media store. Relative prefixes or absolute https prefixes. */
export const DEFAULT_MEDIA_PREFIXES: readonly string[] = ["/media/public/assets/"];

export type HtmlIssueCode =
  | "TOO_LONG" | "TAG_REMOVED" | "TAG_UNWRAPPED" | "ATTRIBUTE_REMOVED" | "URL_REJECTED" | "PROVIDER_LINK" | "TOO_DEEP" | "TOO_MANY_NODES" | "UNSTABLE";

export interface HtmlIssue { readonly code: HtmlIssueCode; readonly detail: string }
export interface SanitizeHtmlOptions {
  readonly mediaPrefixes?: readonly string[];
  /** Hosts of registered providers: a direct link to one loses its href (leads count only through /r/{listingId}). */
  readonly isProviderHost?: (host: string) => boolean;
}
export interface SanitizedHtml { readonly html: string; readonly issues: readonly HtmlIssue[] }

const ALLOWED_TAGS: ReadonlySet<string> = new Set([
  "a", "abbr", "address", "article", "aside", "b", "blockquote", "br", "caption", "cite", "code", "dd", "details", "dfn", "div", "dl", "dt", "em",
  "figcaption", "figure", "footer", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "i", "img", "kbd", "li", "mark", "ol", "p", "pre", "q", "s",
  "samp", "section", "small", "span", "strong", "sub", "summary", "sup", "table", "tbody", "td", "tfoot", "th", "thead", "time", "tr", "u", "ul", "wbr"
]);

/** Dropped together with everything inside: their content is code, markup of another language or form state. */
const DROP_WITH_CONTENT: ReadonlySet<string> = new Set([
  "script", "style", "iframe", "frame", "frameset", "object", "embed", "applet", "form", "input", "button", "textarea", "select", "option", "optgroup",
  "template", "noscript", "svg", "math", "link", "meta", "base", "title", "head", "canvas", "audio", "video", "source", "track", "picture", "map", "area",
  "dialog", "portal", "slot", "xmp", "plaintext", "listing", "noembed", "noframes", "fieldset", "label", "datalist", "output", "meter", "progress",
  "marquee", "bgsound", "isindex", "keygen", "menu", "menuitem", "image"
]);

const GLOBAL_ATTRIBUTES: ReadonlySet<string> = new Set(["class", "title", "lang", "dir", "aria-label", "aria-hidden"]);
const TAG_ATTRIBUTES: Readonly<Record<string, ReadonlySet<string>>> = {
  a: new Set(["href"]),
  img: new Set(["src", "alt", "width", "height"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan", "scope"]),
  time: new Set(["datetime"]),
  ol: new Set(["start", "reversed"]),
  details: new Set(["open"])
};
const CLASS_NAME = /^[A-Za-z_][A-Za-z0-9_-]{0,63}$/;
const MAX_CLASSES = 12;
const DIMENSION = /^\d{1,4}$/;
const SCHEME = /^([a-z][a-z0-9+.-]*):/i;
/** Control characters and whitespace the URL parser ignores inside a scheme ("java\tscript:"). */
// eslint-disable-next-line no-control-regex
const URL_NOISE = /[\u0000-\u0020\u007f-\u009f\u00ad\u200b-\u200f\u2028\u2029\ufeff]/g;

const isElement = (node: Node): node is Element => defaultTreeAdapter.isElementNode(node);

function lowerHost(value: string): string | null {
  try { return new URL(value).hostname.toLowerCase(); } catch { return null; }
}

function cleanLink(raw: string, options: SanitizeHtmlOptions, issues: HtmlIssue[]): string | null {
  const value = raw.replace(URL_NOISE, "");
  if (value === "") return null;
  const scheme = SCHEME.exec(value)?.[1]?.toLowerCase();
  if (scheme === undefined) {
    if (value.startsWith("#") || (value.startsWith("/") && !value.startsWith("//"))) return value;
    issues.push({ code: "URL_REJECTED", detail: "relative link" });
    return null;
  }
  if (scheme === "mailto" || scheme === "tel") return value;
  if (scheme !== "https") { issues.push({ code: "URL_REJECTED", detail: scheme }); return null; }
  const host = lowerHost(value);
  if (host === null) { issues.push({ code: "URL_REJECTED", detail: "https" }); return null; }
  if (options.isProviderHost?.(host)) { issues.push({ code: "PROVIDER_LINK", detail: host }); return null; }
  return value;
}

function cleanImageSource(raw: string, prefixes: readonly string[], issues: HtmlIssue[]): string | null {
  const value = raw.replace(URL_NOISE, "");
  const prefix = prefixes.find((candidate) => value.startsWith(candidate));
  const ok = prefix !== undefined && !value.includes("..") && !value.includes("\\") && !value.slice(prefix.length).includes("//");
  if (!ok) issues.push({ code: "URL_REJECTED", detail: "img src outside the media store" });
  return ok ? value : null;
}

function cleanAttributes(element: Element, options: SanitizeHtmlOptions, issues: HtmlIssue[]): boolean {
  const tag = element.tagName;
  const allowed = TAG_ATTRIBUTES[tag];
  const kept: { name: string; value: string }[] = [];
  for (const attribute of element.attrs) {
    const name = attribute.name.toLowerCase();
    if (!GLOBAL_ATTRIBUTES.has(name) && !allowed?.has(name)) { issues.push({ code: "ATTRIBUTE_REMOVED", detail: `${tag}[${name}]` }); continue; }
    if (name === "class") {
      const classes = attribute.value.split(/\s+/).filter(Boolean);
      const valid = classes.filter((entry) => CLASS_NAME.test(entry)).slice(0, MAX_CLASSES);
      if (valid.length !== classes.length) issues.push({ code: "ATTRIBUTE_REMOVED", detail: "class name" });
      if (valid.length > 0) kept.push({ name, value: valid.join(" ") });
    } else if (name === "href") {
      const link = cleanLink(attribute.value, options, issues);
      if (link !== null) kept.push({ name, value: link });
    } else if (name === "src") {
      const source = cleanImageSource(attribute.value, options.mediaPrefixes ?? DEFAULT_MEDIA_PREFIXES, issues);
      if (source !== null) kept.push({ name, value: source });
    } else if ((name === "width" || name === "height" || name === "colspan" || name === "rowspan" || name === "start") && !DIMENSION.test(attribute.value)) {
      issues.push({ code: "ATTRIBUTE_REMOVED", detail: `${tag}[${name}]` });
    } else if (name === "dir" && !["ltr", "rtl", "auto"].includes(attribute.value)) {
      issues.push({ code: "ATTRIBUTE_REMOVED", detail: "dir" });
    } else if (name === "aria-hidden" && !["true", "false"].includes(attribute.value)) {
      issues.push({ code: "ATTRIBUTE_REMOVED", detail: "aria-hidden" });
    } else if (name === "scope" && !["row", "col", "rowgroup", "colgroup"].includes(attribute.value)) {
      issues.push({ code: "ATTRIBUTE_REMOVED", detail: "scope" });
    } else kept.push({ name, value: attribute.value });
  }
  if (tag === "img" && !kept.some((attribute) => attribute.name === "src")) return false;
  if (tag === "img") {
    if (!kept.some((attribute) => attribute.name === "alt")) kept.push({ name: "alt", value: "" });
    kept.push({ name: "loading", value: "lazy" }, { name: "decoding", value: "async" });
  }
  if (tag === "a") {
    if (kept.some((attribute) => attribute.name === "href" && /^https:/i.test(attribute.value))) kept.push({ name: "rel", value: "noopener noreferrer nofollow ugc" });
  }
  element.attrs = kept;
  return true;
}

interface Walk { nodes: number; tooDeep: boolean; tooMany: boolean }

function clean(parent: Fragment | Element, depth: number, walk: Walk, options: SanitizeHtmlOptions, issues: HtmlIssue[]): void {
  const next: Node[] = [];
  for (const child of parent.childNodes) {
    walk.nodes += 1;
    if (walk.nodes > MAX_NODES) { walk.tooMany = true; break; }
    if (defaultTreeAdapter.isTextNode(child)) { next.push(child); continue; }
    if (!isElement(child)) continue; // comments, doctypes, processing instructions
    const tag = child.tagName;
    if (DROP_WITH_CONTENT.has(tag)) { issues.push({ code: "TAG_REMOVED", detail: tag }); continue; }
    if (depth + 1 > MAX_DEPTH) { walk.tooDeep = true; continue; }
    clean(child, depth + 1, walk, options, issues);
    if (!ALLOWED_TAGS.has(tag)) { issues.push({ code: "TAG_UNWRAPPED", detail: tag }); next.push(...child.childNodes); continue; }
    if (child.namespaceURI !== "http://www.w3.org/1999/xhtml") { issues.push({ code: "TAG_REMOVED", detail: tag }); continue; }
    if (!cleanAttributes(child, options, issues)) { issues.push({ code: "TAG_REMOVED", detail: tag }); continue; }
    next.push(child);
  }
  parent.childNodes = next;
  for (const node of next) node.parentNode = parent;
}

function onePass(html: string, options: SanitizeHtmlOptions, issues: HtmlIssue[]): string {
  const fragment = parseFragment(html);
  const walk: Walk = { nodes: 0, tooDeep: false, tooMany: false };
  clean(fragment, 0, walk, options, issues);
  if (walk.tooDeep) issues.push({ code: "TOO_DEEP", detail: `deeper than ${MAX_DEPTH}` });
  if (walk.tooMany) issues.push({ code: "TOO_MANY_NODES", detail: `more than ${MAX_NODES}` });
  return serialize(fragment);
}

/** The safe subset of `input`, and what was taken out. Idempotent: sanitising the result returns the same text. */
export function sanitizeHtml(input: string, options: SanitizeHtmlOptions = {}): SanitizedHtml {
  const issues: HtmlIssue[] = [];
  if (input.length > MAX_HTML_LENGTH) return { html: "", issues: [{ code: "TOO_LONG", detail: `${input.length} > ${MAX_HTML_LENGTH}` }] };
  let current = onePass(input, options, issues);
  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    const again = onePass(current, options, []);
    if (again === current) return { html: current, issues };
    current = again;
  }
  // Still changing after several passes: it is not stable markup. Refuse it rather than ship something that re-parses differently.
  return { html: "", issues: [...issues, { code: "UNSTABLE", detail: "the markup changes every time it is parsed" }] };
}
