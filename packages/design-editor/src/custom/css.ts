import postcss, { type ChildNode, type Declaration, type Rule } from "postcss";
import selectorParser, { type Node as SelectorNode, type Selector } from "postcss-selector-parser";
import valueParser, { type Node as ValueNode } from "postcss-value-parser";
import { design } from "@rsvp/celebration-theme";
import { DEFAULT_MEDIA_PREFIXES, MAX_HTML_LENGTH } from "./html.js";

/**
 * The stylesheet of the Advanced level (P2). Written by the host, so nothing in it is trusted: it is parsed (postcss), every
 * rule is rebuilt from an allowlist, and the output is only what survived. Guarantees, each with a test:
 *  - every selector is prefixed with the invitation's root class, so no rule can reach the app around it (no html, body, :root);
 *  - no rule can style the protected blocks (gifts and RSVP buttons): selectors end with :not(.rsvp-protected) and the rsvp-* classes are reserved;
 *  - no @import, @font-face, @keyframes, @container… (only @media with an allowlisted query), no escapes, no custom properties;
 *  - url() only toward the media store; no expression(), javascript:, image-set(), attr();
 *  - properties that could hide, move or cover the protected blocks by acting on an ancestor are not in the list at all
 *    (visibility, opacity, overflow, clip-path, filter, mask, pointer-events…), position is never fixed or sticky,
 *    z-index is capped below the layer the renderer gives protected blocks, offsets and negative margins are bounded,
 *    and text can never be smaller than 13 px.
 * The server runs the same checks when saving and the renderer scopes again when painting; this is the client's copy.
 */

export const MAX_CSS_LENGTH = MAX_HTML_LENGTH;
export const DEFAULT_SCOPE = ".rsvp-invitation";
export const PROTECTED_CLASS = "rsvp-protected";
/** z-index the renderer gives protected blocks; a stylesheet may never reach it. */
export const PROTECTED_Z_INDEX = 1000;
export const MAX_AUTHOR_Z_INDEX = 100;
export const MIN_FONT_PX = 13;
const MAX_RULES = 400;
const MAX_DECLARATIONS = 3_000;
const REM_PX = 16;

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
const RESERVED_CLASS = /^(rsvp|de)-/i;
const NTH_ARGUMENT = /^[\s0-9n+\-evnodd]*$/i;

const PROPERTIES: ReadonlySet<string> = new Set([
  "color", "background", "background-color", "background-image", "background-position", "background-size", "background-repeat", "background-clip", "background-origin",
  "border", "border-top", "border-right", "border-bottom", "border-left", "border-color", "border-style", "border-width", "border-radius",
  "border-top-left-radius", "border-top-right-radius", "border-bottom-left-radius", "border-bottom-right-radius", "border-collapse", "border-spacing",
  "outline", "outline-color", "outline-style", "outline-width", "outline-offset", "box-shadow", "text-shadow", "box-sizing",
  "margin", "margin-top", "margin-right", "margin-bottom", "margin-left", "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "width", "min-width", "max-width", "height", "min-height", "aspect-ratio", "object-fit", "object-position",
  "display", "position", "top", "right", "bottom", "left", "inset", "z-index", "float", "clear", "vertical-align",
  "flex", "flex-direction", "flex-wrap", "flex-flow", "flex-grow", "flex-shrink", "flex-basis", "order", "gap", "row-gap", "column-gap",
  "grid", "grid-template", "grid-template-columns", "grid-template-rows", "grid-template-areas", "grid-area", "grid-column", "grid-row", "grid-auto-flow", "grid-auto-columns", "grid-auto-rows",
  "align-items", "align-self", "align-content", "justify-content", "justify-items", "justify-self", "place-items", "place-content", "place-self",
  "font-family", "font-size", "font-weight", "font-style", "font-variant", "font-variant-numeric", "line-height", "letter-spacing", "word-spacing",
  "text-align", "text-transform", "text-decoration", "text-decoration-color", "text-decoration-style", "text-decoration-line", "text-underline-offset", "text-indent", "text-wrap",
  "white-space", "word-break", "overflow-wrap", "hyphens", "list-style", "list-style-type", "list-style-position", "content", "quotes",
  "transform", "transform-origin", "transition", "transition-property", "transition-duration", "transition-timing-function", "transition-delay", "columns", "column-count", "column-gap"
]);
const BACKGROUND_PROPERTIES: ReadonlySet<string> = new Set(["background", "background-image"]);
const BOUNDED_GEOMETRY: ReadonlySet<string> = new Set([
  "margin", "margin-top", "margin-right", "margin-bottom", "margin-left", "top", "right", "bottom", "left", "inset", "text-indent", "word-spacing", "outline-offset", "text-underline-offset"
]);
const FUNCTIONS: ReadonlySet<string> = new Set([
  "rgb", "rgba", "hsl", "hsla", "calc", "min", "max", "clamp", "var", "url", "linear-gradient", "radial-gradient", "conic-gradient", "repeating-linear-gradient", "repeating-radial-gradient",
  "cubic-bezier", "steps", "rotate", "scale", "scalex", "scaley", "repeat", "minmax", "fit-content"
]);
const DISPLAYS: ReadonlySet<string> = new Set(["block", "inline", "inline-block", "flex", "inline-flex", "grid", "inline-grid", "flow-root", "list-item"]);
const GENERIC_FAMILIES: ReadonlySet<string> = new Set(["serif", "sans-serif", "cursive", "monospace", "system-ui", "inherit"]);
const MEDIA_WORDS: ReadonlySet<string> = new Set([
  "screen", "print", "all", "and", "not", "only", "or", "min-width", "max-width", "width", "min-height", "max-height", "height", "orientation", "portrait", "landscape",
  "prefers-color-scheme", "light", "dark", "prefers-reduced-motion", "reduce", "no-preference", "hover", "any-hover", "none", "pointer", "fine", "coarse"
]);
const BAD_WORDS = /(javascript|vbscript|expression|behavior|binding|data:)/i;
const FAMILY_NAMES: ReadonlySet<string> = new Set(design.FONT_FAMILIES.map((family) => family.family.toLowerCase()));

const toPx = (value: number, unit: string): number | null => {
  switch (unit.toLowerCase()) {
    case "px": return value;
    case "rem": case "em": return value * REM_PX;
    default: return null;
  }
};

class Reject extends Error {}
const reject = (message: string): never => { throw new Reject(message); };

interface Context { readonly issues: CssIssue[]; readonly prefixes: readonly string[]; readonly scope: string; counters: { rules: number; declarations: number } }

function dimension(node: ValueNode): { readonly number: number; readonly unit: string } | null {
  if (node.type !== "word") return null;
  const parsed = valueParser.unit(node.value);
  if (!parsed) return null;
  const number = Number(parsed.number);
  return Number.isFinite(number) ? { number, unit: parsed.unit } : null;
}

function checkUrl(node: ValueNode, property: string, prefixes: readonly string[]): void {
  if (node.type !== "function" || node.value.toLowerCase() !== "url") return;
  if (!BACKGROUND_PROPERTIES.has(property)) reject("url() only in background");
  const argument = node.nodes[0];
  const target = argument && (argument.type === "string" || argument.type === "word") ? argument.value.trim() : "";
  const prefix = prefixes.find((candidate) => target.startsWith(candidate));
  if (!prefix || target.includes("..") || target.includes("\\") || target.slice(prefix.length).includes("//") || /[()'"\s]/.test(target.slice(prefix.length))) reject("url() outside the media store");
}

function checkBounded(property: string, nodes: readonly ValueNode[]): void {
  for (const node of nodes) {
    if (node.type === "space" || node.type === "div") continue;
    if (node.type !== "word") reject(`${property}: only plain lengths`);
    if (node.type === "word" && ["auto", "0", "normal", "inherit", "initial", "unset"].includes(node.value.toLowerCase())) continue;
    const parsed = dimension(node);
    if (!parsed) reject(`${property}: not a length`);
    const { number, unit } = parsed as { number: number; unit: string };
    const lower = unit.toLowerCase();
    const limit = lower === "px" ? 400 : lower === "rem" || lower === "em" ? 25 : lower === "%" || lower === "vw" || lower === "vh" ? 100 : null;
    if (limit === null) reject(`${property}: unit ${unit}`);
    if (Math.abs(number) > (limit as number)) reject(`${property}: ${number}${unit} is out of bounds`);
  }
}

function checkFontSize(nodes: readonly ValueNode[]): void {
  const first = nodes.find((node) => node.type !== "space");
  if (!first) return reject("font-size: empty");
  if (nodes.filter((node) => node.type !== "space").length !== 1) return reject("font-size: one value");
  if (first.type === "function" && first.value.toLowerCase() === "clamp") {
    const smallest = first.nodes.find((node) => node.type === "word");
    return smallest ? checkFontSize([smallest]) : reject("font-size: clamp");
  }
  const parsed = dimension(first);
  const px = parsed ? toPx(parsed.number, parsed.unit) : null;
  if (px === null || px < MIN_FONT_PX) reject(`font-size: at least ${MIN_FONT_PX}px`);
}

function checkFontFamily(nodes: readonly ValueNode[]): void {
  for (const node of nodes) {
    if (node.type === "div" || node.type === "space") continue;
    const text = node.type === "string" ? node.value : node.type === "word" ? node.value : reject("font-family: unexpected value");
    const names = String(text).split(/\s+/).filter(Boolean).join(" ").toLowerCase();
    if (!GENERIC_FAMILIES.has(names) && !FAMILY_NAMES.has(names)) reject(`font-family: ${String(text)} is not in the catalogue`);
  }
}

function checkValue(property: string, value: string, context: Context): string {
  if (BAD_WORDS.test(value) || value.includes("\\") || value.includes("\0")) reject("forbidden text in value");
  const parsed = valueParser(value);
  parsed.walk((node) => {
    if (node.type === "function") {
      const name = node.value.toLowerCase();
      if (!FUNCTIONS.has(name)) reject(`function ${node.value}()`);
      if (name === "var") {
        const variable = node.nodes[0];
        if (!variable || variable.type !== "word" || !/^--rsvp-[a-z0-9-]+$/i.test(variable.value)) reject("var() only for --rsvp-* tokens");
      }
      checkUrl(node, property, context.prefixes);
    }
    if (node.type === "unicode-range" || node.type === "comment") reject("not allowed in a value");
  });
  const top = parsed.nodes;
  switch (property) {
    case "position": if (!["static", "relative", "absolute"].includes(value.trim().toLowerCase())) reject("position: fixed and sticky are not allowed"); break;
    case "display": if (!DISPLAYS.has(value.trim().toLowerCase())) reject("display: none and table layouts are not allowed"); break;
    case "z-index": {
      const number = Number(value.trim());
      if (!Number.isInteger(number) || number > MAX_AUTHOR_Z_INDEX || number < -MAX_AUTHOR_Z_INDEX) reject(`z-index above ${MAX_AUTHOR_Z_INDEX}`);
      break;
    }
    case "font-size": checkFontSize(top); break;
    case "font-family": checkFontFamily(top); break;
    case "content": if (top.some((node) => node.type !== "string" && node.type !== "space")) reject("content: only text"); break;
    case "transform": {
      for (const node of top) {
        if (node.type === "space") continue;
        if (node.type !== "function" || !["rotate", "scale", "scalex", "scaley"].includes(node.value.toLowerCase())) reject("transform: only rotate and scale");
        const fn = node as Extract<ValueNode, { type: "function" }>;
        const name = fn.value.toLowerCase();
        for (const argument of fn.nodes.filter((entry) => entry.type === "word")) {
          const parsedArgument = dimension(argument);
          if (!parsedArgument) reject("transform: bad argument");
          const { number, unit } = parsedArgument as { number: number; unit: string };
          if (name === "rotate" && (unit.toLowerCase() !== "deg" || Math.abs(number) > 180)) reject("transform: rotate within 180deg");
          if (name !== "rotate" && (unit !== "" || number < 0.5 || number > 2)) reject("transform: scale between 0.5 and 2");
        }
      }
      break;
    }
    default: if (BOUNDED_GEOMETRY.has(property)) checkBounded(property, top);
  }
  return valueParser.stringify(parsed.nodes).trim();
}

function transformDeclaration(declaration: Declaration, context: Context): string | null {
  const property = declaration.prop.toLowerCase();
  try {
    context.counters.declarations += 1;
    if (context.counters.declarations > MAX_DECLARATIONS) reject("too many declarations");
    if (property.startsWith("--") || property.startsWith("-")) reject("custom and vendor properties");
    if (declaration.prop.includes("\\")) { context.issues.push({ code: "ESCAPE_REJECTED", detail: property }); return null; }
    if (!PROPERTIES.has(property)) { context.issues.push({ code: "PROPERTY_REJECTED", detail: property }); return null; }
    if (declaration.value.includes("\\")) { context.issues.push({ code: "ESCAPE_REJECTED", detail: property }); return null; }
    const value = checkValue(property, declaration.value, context);
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

/** The selector rewritten under the scope with the protected-block guard on its last compound, or null (with the reason in `reason`). */
function scopeSelector(selector: Selector, scope: string): string {
  const parts: string[] = [];
  let lastCombinator = -1;
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
  const guard = `:not(.${PROTECTED_CLASS}):not(.${PROTECTED_CLASS} *)`;
  if (guardAt === -1) parts.push(guard); else parts.splice(guardAt, 0, guard);
  return `${scope} ${parts.join("").replace(/\s+/g, " ").trim()}`;
}

function transformRule(rule: Rule, context: Context): string | null {
  context.counters.rules += 1;
  if (context.counters.rules > MAX_RULES) { if (context.counters.rules === MAX_RULES + 1) context.issues.push({ code: "TOO_MANY_RULES", detail: `more than ${MAX_RULES}` }); return null; }
  if (rule.selector.includes("\\")) { context.issues.push({ code: "ESCAPE_REJECTED", detail: rule.selector.slice(0, 60) }); return null; }
  const selectors: string[] = [];
  try {
    selectorParser((root) => {
      root.each((selector) => {
        try { selectors.push(scopeSelector(selector, context.scope)); }
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
  return { css: transformNodes(root.nodes, context, false).join("\n"), issues: context.issues };
}
