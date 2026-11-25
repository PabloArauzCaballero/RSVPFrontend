// DUPLICATED from packages/design-editor/src/custom/css.ts (FE #122, F5); see media-url.ts for why. Keep equal until shared.
import postcss, { type ChildNode, type Declaration, type Rule } from "postcss";
import selectorParser, { type Node as SelectorNode, type Selector } from "postcss-selector-parser";
import { DEFAULT_MEDIA_PREFIXES, MAX_HTML_LENGTH } from "./media-url.js";
import { MAX_AUTHOR_Z_INDEX, MIN_FONT_PX, Reject, SPECS, checkDeclarationValue, reject } from "./css-values.js";

export { MAX_AUTHOR_Z_INDEX, MIN_FONT_PX };

/**
 * The stylesheet of the Advanced level (P2). Written by the host, so nothing in it is trusted: it is parsed (postcss), every
 * rule is rebuilt from an allowlist, and the output is only what survived. Guarantees, each with a test:
 *  - every selector is prefixed with the invitation's root class, so no rule can reach the app around it (no html, body, :root);
 *  - no rule can style the protected blocks (gifts and RSVP buttons): selectors end with :not(.rsvp-protected) and the rsvp-* classes are reserved;
 *  - no @import, @font-face, @keyframes, @container… (only @media with an allowlisted query), no escapes, no custom properties;
 *  - url() only toward the media store; no expression(), javascript:, image-set(), attr();
 *  - properties that could hide, move or cover the protected blocks by acting on an ancestor are not in the list at all
 *    (visibility, opacity, overflow, clip-path, filter, mask, pointer-events…), position is never fixed or sticky,
 *    z-index is capped (100) below the layer the renderer gives protected blocks (1000 for the blocks and their page, 2000 for the dock: styles.css, R2-M1), offsets and negative margins are bounded,
 *    and text can never be smaller than 13 px.
 * Values are typed per property (see css-values.ts): only properties in SPECS exist, and every length is evaluated as an interval in px in
 * the worst case (em up to 128 px, % against the largest box, vw/vh against the largest screen, calc/min/max/clamp evaluated, sums added up),
 * so no bound can be dodged by a unit, a sum, a product or a second layer. What cannot be evaluated is refused.
 * Markup safety (R3-M1): "<" never appears in a value, a string or a selector, and ">" never in a value, so the output cannot end a <style> element it is
 * inlined in. No serialiser in this package puts the output into a page; the renderer (F6) that does must still treat it as text: build the <style> element
 * with textContent (or, if it builds a string, escape "</style" and "<!--"), never splice it into an HTML string.
 * The editor checks this on the client and the renderer scopes again when painting. The server does not accept custom CSS yet
 * (it answers 422 to `custom`), so nothing here is a copy of a server check.
 * Idempotent: scoping its own output returns the same text (the scope prefix and the guard it adds are recognised and dropped first).
 */

export const MAX_CSS_LENGTH = MAX_HTML_LENGTH;
export const DEFAULT_SCOPE = ".rsvp-invitation";
export const PROTECTED_CLASS = "rsvp-protected";
/** z-index the renderer gives protected blocks (styles.css, with `!important`, which a stylesheet cannot use: it is stripped); a stylesheet may never reach it. */
export const PROTECTED_Z_INDEX = 1000;
const MAX_RULES = 400;
const MAX_DECLARATIONS = 3_000;

export type CssIssueCode =
  | "TOO_LONG" | "SYNTAX" | "AT_RULE_REMOVED" | "SELECTOR_REJECTED" | "PROPERTY_REJECTED" | "VALUE_REJECTED" | "IMPORTANT_REMOVED" | "ESCAPE_REJECTED" | "TOO_MANY_RULES" | "MEDIA_REJECTED";
export interface CssIssue { readonly code: CssIssueCode; readonly detail: string }
export interface ScopeCssOptions {
  readonly scope?: string;
  readonly mediaPrefixes?: readonly string[];
}
export interface ScopedCss { readonly css: string; readonly issues: readonly CssIssue[] }

const ALLOWED_TAGS: ReadonlySet<string> = new Set([
  "a", "abbr", "address", "article", "aside", "b", "blockquote", "br", "caption", "cite", "code", "dd", "details", "dfn", "div", "dl", "dt", "em", "figcaption", "figure", "footer",
  "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "i", "img", "kbd", "li", "mark", "ol", "p", "pre", "q", "s", "samp", "section", "small", "span", "strong", "sub", "summary", "sup",
  "table", "tbody", "td", "tfoot", "th", "thead", "time", "tr", "u", "ul"
]);
const PSEUDO_CLASSES: ReadonlySet<string> = new Set([
  ":hover", ":focus", ":focus-visible", ":focus-within", ":active", ":first-child", ":last-child", ":only-child", ":first-of-type", ":last-of-type", ":only-of-type",
  ":nth-child", ":nth-last-child", ":nth-of-type", ":nth-last-of-type", ":empty", ":not"
]);
const PSEUDO_ELEMENTS: ReadonlySet<string> = new Set(["::before", "::after", "::first-line", "::first-letter", "::marker", "::selection", ":before", ":after", ":first-line", ":first-letter"]);
const MEDIA_WORDS: ReadonlySet<string> = new Set([
  "screen", "print", "all", "and", "not", "only", "or", "min-width", "max-width", "width", "min-height", "max-height", "height", "orientation", "portrait", "landscape",
  "prefers-color-scheme", "light", "dark", "prefers-reduced-motion", "reduce", "no-preference", "hover", "any-hover", "none", "pointer", "fine", "coarse"
]);
const RESERVED_CLASS = /^(rsvp|de)-/i;
const NTH_ARGUMENT = /^[\s0-9n+\-evnodd]*$/i;


interface Context { readonly issues: CssIssue[]; readonly prefixes: readonly string[]; readonly scope: string; counters: { rules: number; declarations: number } }

function transformDeclaration(declaration: Declaration, context: Context): string | null {
  const property = declaration.prop.toLowerCase();
  try {
    context.counters.declarations += 1;
    if (context.counters.declarations > MAX_DECLARATIONS) reject("too many declarations");
    if (property.startsWith("--") || property.startsWith("-")) reject("custom and vendor properties");
    if (declaration.prop.includes("\\")) { context.issues.push({ code: "ESCAPE_REJECTED", detail: property }); return null; }
    if (!Object.hasOwn(SPECS, property)) { context.issues.push({ code: "PROPERTY_REJECTED", detail: property }); return null; }
    if (declaration.value.includes("\\")) { context.issues.push({ code: "ESCAPE_REJECTED", detail: property }); return null; }
    const value = checkDeclarationValue(property, declaration.value, context.prefixes);
    if (value === "") reject("empty value");
    if (declaration.important) context.issues.push({ code: "IMPORTANT_REMOVED", detail: property });
    return `${property}:${value}`;
  } catch (error) {
    if (!(error instanceof Reject)) throw error;
    context.issues.push({ code: "VALUE_REJECTED", detail: `${property}: ${error.message}` });
    return null;
  }
}

function checkSimpleSelector(node: SelectorNode): void {
  switch (node.type) {
    case "class": if (RESERVED_CLASS.test(node.value)) reject(`reserved class .${node.value}`); return;
    case "tag": if (!ALLOWED_TAGS.has(node.value.toLowerCase())) reject(`tag ${node.value}`); return;
    case "universal": return;
    case "combinator": reject("combinator inside :not()"); return;
    case "pseudo": {
      const name = node.value.toLowerCase();
      if (!PSEUDO_CLASSES.has(name) || name === ":not") reject(`pseudo ${node.value}`);
      return;
    }
    default: reject(`selector part ${node.type}`);
  }
}

const GUARD = `:not(.${PROTECTED_CLASS}):not(.${PROTECTED_CLASS} *)`;

/**
 * Scoping is idempotent: a selector this module already wrote ("<scope> a:not(.rsvp-protected):not(.rsvp-protected *)") is read
 * back as the author's selector, by dropping the leading scope and the guard (both are added again, in place, afterwards).
 * Anything else that starts with the scope is the author's own and is kept as a descendant of it.
 */
function ownOutputStripped(selector: Selector, scope: string): Selector {
  const text = selector.toString().trim();
  const lead = new RegExp(`^(?:${scope.replace(/[.\\-]/g, "\\$&")}\\s+)+`);
  if (!text.includes(GUARD) && !lead.test(text)) return selector;
  const stripped = text.split(GUARD).join("").replace(lead, "");
  let rebuilt: Selector | undefined;
  selectorParser((root) => { rebuilt = root.first; }).processSync(stripped);
  return rebuilt ?? selector;
}

/** The selector rewritten under the scope with the protected-block guard on its last compound, or null (with the reason in `reason`). */
function scopeSelector(selector: Selector, scope: string): string {
  const parts: string[] = [];
  let lastCombinator = -1;
  if (selector.first?.type === "combinator") reject("a selector cannot start with a combinator");
  // "a , b": the space before the comma parses as a trailing descendant combinator that would turn "a" into "a *"; a real trailing combinator ("a >") is refused.
  while (selector.last?.type === "combinator") {
    if (selector.last.value.trim() !== "") reject("a selector cannot end with a combinator");
    selector.last.remove();
  }
  selector.each((node, index) => { if (node.type === "combinator") lastCombinator = index; });
  let guardAt = -1;
  selector.each((node, index) => {
    switch (node.type) {
      case "class": case "universal": break;
      case "tag": break;
      case "combinator": if (![" ", ">", "+", "~"].includes(node.value.trim() === "" ? " " : node.value.trim())) reject("combinator"); break;
      case "pseudo": {
        const name = node.value.toLowerCase();
        if (PSEUDO_ELEMENTS.has(name)) { if (index <= lastCombinator) reject("pseudo-element before a combinator"); if (guardAt === -1) guardAt = index; break; }
        if (!PSEUDO_CLASSES.has(name)) reject(`pseudo ${node.value}`);
        if (name === ":not") {
          node.each((inner) => { inner.each((part) => checkSimpleSelector(part)); });
        } else if (name.startsWith(":nth")) {
          const argument = node.toString().replace(/^[^(]*\(/, "").replace(/\)$/, "");
          if (!NTH_ARGUMENT.test(argument)) reject("nth argument");
        }
        break;
      }
      default: reject(`selector part ${node.type}`);
    }
    if (node.type === "class" && RESERVED_CLASS.test(node.value)) reject(`reserved class .${node.value}`);
    if (node.type === "tag" && !ALLOWED_TAGS.has(node.value.toLowerCase())) reject(`tag ${node.value}`);
    parts.push(String(node));
  });
  if (parts.length === 0) reject("empty selector");
  parts[0] = (parts[0] as string).trimStart();
  parts[parts.length - 1] = (parts[parts.length - 1] as string).trimEnd();
  if (guardAt === -1) parts.push(GUARD); else parts.splice(guardAt, 0, GUARD);
  return `${scope} ${parts.join("").replace(/\s+/g, " ").trim()}`;
}

function transformRule(rule: Rule, context: Context): string | null {
  context.counters.rules += 1;
  if (context.counters.rules > MAX_RULES) { if (context.counters.rules === MAX_RULES + 1) context.issues.push({ code: "TOO_MANY_RULES", detail: `more than ${MAX_RULES}` }); return null; }
  if (rule.selector.includes("|")) { context.issues.push({ code: "SELECTOR_REJECTED", detail: "namespace selectors are not allowed" }); return null; }
  if (rule.selector.includes("<")) { context.issues.push({ code: "SELECTOR_REJECTED", detail: "markup characters are not allowed in a selector" }); return null; }
  if (rule.selector.includes("\\")) { context.issues.push({ code: "ESCAPE_REJECTED", detail: rule.selector.slice(0, 60) }); return null; }
  const selectors: string[] = [];
  try {
    selectorParser((root) => {
      root.each((selector) => {
        try { selectors.push(scopeSelector(ownOutputStripped(selector, context.scope), context.scope)); }
        catch (error) { if (!(error instanceof Reject)) throw error; context.issues.push({ code: "SELECTOR_REJECTED", detail: `${selector.toString().trim().slice(0, 60)}: ${error.message}` }); }
      });
    }).processSync(rule.selector);
  } catch (error) {
    if (error instanceof Reject) { context.issues.push({ code: "SELECTOR_REJECTED", detail: error.message }); return null; }
    context.issues.push({ code: "SELECTOR_REJECTED", detail: "unparseable selector" });
    return null;
  }
  if (selectors.length === 0) return null;
  const declarations: string[] = [];
  for (const child of rule.nodes) {
    if (child.type === "decl") { const done = transformDeclaration(child, context); if (done) declarations.push(done); }
    else if (child.type !== "comment") context.issues.push({ code: "AT_RULE_REMOVED", detail: `nested ${child.type}` });
  }
  return declarations.length === 0 ? null : `${selectors.join(",")}{${declarations.join(";")}}`;
}

function validMedia(params: string): boolean {
  if (params.length > 200 || params.includes("\\")) return false;
  const tokens = params.toLowerCase().match(/[a-z][a-z-]*|[0-9.]+[a-z%]*|[():,<>=/]|\s+/g);
  if (!tokens || tokens.join("") !== params.toLowerCase()) return false;
  return tokens.every((token) => /^\s+$/.test(token) || /^[():,<>=/]$/.test(token) || (/^[a-z]/.test(token) ? MEDIA_WORDS.has(token) : /^[0-9.]+(px|em|rem|%)?$/.test(token)));
}

function transformNodes(nodes: readonly ChildNode[], context: Context, insideMedia: boolean): string[] {
  const out: string[] = [];
  for (const node of nodes) {
    if (node.type === "comment") continue;
    if (node.type === "rule") { const rule = transformRule(node, context); if (rule) out.push(rule); continue; }
    if (node.type === "atrule") {
      if (node.name.toLowerCase() === "media" && !insideMedia && node.nodes) {
        if (!validMedia(node.params.trim())) { context.issues.push({ code: "MEDIA_REJECTED", detail: node.params.slice(0, 60) }); continue; }
        const inner = transformNodes(node.nodes, context, true);
        if (inner.length > 0) out.push(`@media ${node.params.trim().replace(/\s+/g, " ")}{${inner.join("")}}`);
      } else context.issues.push({ code: "AT_RULE_REMOVED", detail: `@${node.name}` });
      continue;
    }
    context.issues.push({ code: "AT_RULE_REMOVED", detail: "declaration outside a rule" });
  }
  return out;
}

/** The author's CSS rebuilt under the invitation's scope, and every thing that was left out. */
export function scopeCss(input: string, options: ScopeCssOptions = {}): ScopedCss {
  const scope = options.scope ?? DEFAULT_SCOPE;
  if (!/^\.[A-Za-z][A-Za-z0-9_-]*$/.test(scope)) throw new Error("The scope must be a single class selector");
  if (input.length > MAX_CSS_LENGTH) return { css: "", issues: [{ code: "TOO_LONG", detail: `${input.length} > ${MAX_CSS_LENGTH}` }] };
  const context: Context = { issues: [], prefixes: options.mediaPrefixes ?? DEFAULT_MEDIA_PREFIXES, scope, counters: { rules: 0, declarations: 0 } };
  let root;
  try { root = postcss.parse(input); } catch { return { css: "", issues: [{ code: "SYNTAX", detail: "the stylesheet does not parse" }] }; }
  const css = transformNodes(root.nodes, context, false).join("\n");
  // Last line of defence: whatever the parts let through, "<" never leaves this function.
  if (css.includes("<")) return { css: "", issues: [...context.issues, { code: "VALUE_REJECTED", detail: "markup characters in the output" }] };
  return { css, issues: context.issues };
}
