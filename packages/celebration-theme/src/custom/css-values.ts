// DUPLICATED from packages/design-editor/src/custom/css-values.ts (FE #122, F5); see media-url.ts for why. Keep equal until shared.
import valueParser, { type Node as ValueNode } from "postcss-value-parser";
import { FONT_FAMILIES } from "../design/catalog.js";
import { isMediaStoreUrl } from "./media-url.js";

/**
 * Typed value grammar of the Advanced level's stylesheet (P22). Nothing here looks at words in isolation: every declaration is
 * parsed into tokens and each token is evaluated against the grammar of ITS property, in the worst case a screen can produce.
 *  - Only properties in SPECS exist; each carries the largest length it may reach (px), what 100% means for it, how many
 *    comma-separated layers it may have, and which units and functions it understands.
 *  - Lengths are evaluated as intervals in px: rem = 16, em/ch/ex up to the largest font a stylesheet may set (128 px),
 *    % against the largest box (1600 x 2000), vw/vh/vmin/vmax/cq* against viewports from 320 x 480 to 1600 x 2000.
 *    calc/min/max/clamp (depth up to 3, + and - between like types, * and / by numbers) are evaluated the same way; a sum
 *    of three 600 px terms is 1800 px, not three harmless words.
 *  - What cannot be evaluated is refused: var() outside --rsvp-* tokens, attr(), env(), unknown units or functions.
 */

export class Reject extends Error {}
export const reject = (message: string): never => { throw new Reject(message); };

export const MIN_FONT_PX = 13;
export const MAX_FONT_PX = 128;
export const MAX_AUTHOR_Z_INDEX = 100;
const REM_PX = 16;
const MAX_MATH_DEPTH = 3;
const MAX_FUNCTION_DEPTH = 4;
const MAX_MATH_TERMS = 64;
const MAX_GRID_REPEAT = 24;
const MAX_TOKENS = 64;
const MAX_TIME_SECONDS = 10;
const MAX_ROTATE_DEG = 180;
const MAX_TRANSLATE_PX = 800;
const MIN_ASPECT = 0.25;
const MAX_ASPECT = 4;
const MIN_LINE_HEIGHT_PX = 10;
const MAX_LINE_HEIGHT_PX = MAX_FONT_PX * 4;
const VIEWPORT = { minW: 320, maxW: 1600, minH: 480, maxH: 2000 } as const;

export interface Spec {
  /** Largest |length| in px any token may reach; absent means the property takes no lengths. */
  readonly cap?: number;
  /** Reference px for 100% (null: percentages are not accepted). */
  readonly pct?: number | null;
  /** Largest |unitless number|. */
  readonly max?: number;
  readonly strings?: boolean;
  readonly slash?: boolean;
  readonly time?: boolean;
  readonly angle?: boolean;
  readonly fr?: boolean;
  readonly fontRelative?: boolean;
  /** Comma-separated layers allowed (default 1). */
  readonly layers?: number;
  /** Most length tokens inside one layer. */
  readonly maxLengths?: number;
  readonly url?: boolean;
  readonly gradient?: boolean;
  /** Functions (besides colours, math and var) whose arguments follow the same grammar. */
  readonly fns?: ReadonlySet<string>;
  readonly special?: "position" | "display" | "z-index" | "font-size" | "font-family" | "line-height" | "transform" | "aspect-ratio" | "tracks" | "tracks-both" | "columns" | "content" | "color-only";
  /** Sum cap for grid track lists. */
  readonly sum?: number;
}

const length = (cap: number, pct: number | null = null, extra: Partial<Spec> = {}): Spec => ({ cap, pct, ...extra });
const KEYWORDS: Spec = {};
const BORDER = length(20);
const RADIUS = length(10_000, 1600, { slash: true });
const OFFSET = length(400, 400);
const PADDING = length(400, 1600);
const WIDTH = length(1600, 1600, { fns: new Set(["fit-content"]) });
const HEIGHT = length(2000, 2000, { fns: new Set(["fit-content"]) });
const GAP = length(200, 1600);
const SHADOW = length(100, null, { layers: 2, maxLengths: 4 });
const BACKGROUND = length(4000, 1600, { layers: 4, slash: true, url: true, gradient: true });
const BACKGROUND_PLAIN = length(4000, 1600, { layers: 4, slash: true });
const GRID_LINE = { max: MAX_GRID_REPEAT, slash: true } satisfies Spec;
const TRANSITION = { time: true, layers: 8, max: 100, fns: new Set(["cubic-bezier", "steps"]) } satisfies Spec;
const GRADIENT_ARGUMENTS = length(4000, 1600, { angle: true });
const TRACKS_COLUMNS = { special: "tracks", sum: 1600, cap: 1600, pct: 1600, fr: true, strings: true, slash: true, max: 100 } satisfies Spec;
const TRACKS_ROWS = { ...TRACKS_COLUMNS, sum: 2000, cap: 2000 } satisfies Spec;
const TRACKS_BOTH = { ...TRACKS_COLUMNS, special: "tracks-both", sum: 1600, cap: 2000 } satisfies Spec;

/** The whole property allowlist: a property that is not a key here does not survive. */
export const SPECS: Readonly<Record<string, Spec>> = {
  color: { special: "color-only" }, "background-color": { special: "color-only" }, "border-color": { special: "color-only" }, "outline-color": { special: "color-only" }, "text-decoration-color": { special: "color-only" },
  background: BACKGROUND, "background-image": BACKGROUND, "background-position": BACKGROUND_PLAIN, "background-size": BACKGROUND_PLAIN, "background-repeat": { layers: 4 }, "background-clip": { layers: 4 }, "background-origin": { layers: 4 },
  border: BORDER, "border-top": BORDER, "border-right": BORDER, "border-bottom": BORDER, "border-left": BORDER, "border-style": KEYWORDS, "border-width": BORDER,
  "border-radius": RADIUS, "border-top-left-radius": RADIUS, "border-top-right-radius": RADIUS, "border-bottom-left-radius": RADIUS, "border-bottom-right-radius": RADIUS,
  "border-collapse": KEYWORDS, "border-spacing": BORDER,
  outline: BORDER, "outline-style": KEYWORDS, "outline-width": BORDER, "outline-offset": OFFSET,
  "box-shadow": SHADOW, "text-shadow": SHADOW, "box-sizing": KEYWORDS,
  margin: OFFSET, "margin-top": OFFSET, "margin-right": OFFSET, "margin-bottom": OFFSET, "margin-left": OFFSET,
  padding: PADDING, "padding-top": PADDING, "padding-right": PADDING, "padding-bottom": PADDING, "padding-left": PADDING,
  width: WIDTH, "min-width": WIDTH, "max-width": WIDTH, height: HEIGHT, "min-height": HEIGHT, "max-height": HEIGHT,
  "aspect-ratio": { special: "aspect-ratio" }, "object-fit": KEYWORDS, "object-position": BACKGROUND_PLAIN,
  display: { special: "display" }, position: { special: "position" }, top: OFFSET, right: OFFSET, bottom: OFFSET, left: OFFSET, inset: OFFSET, "z-index": { special: "z-index" },
  float: KEYWORDS, clear: KEYWORDS, "vertical-align": KEYWORDS,
  flex: length(1600, 1600, { max: 100 }), "flex-direction": KEYWORDS, "flex-wrap": KEYWORDS, "flex-flow": KEYWORDS, "flex-grow": { max: 100 }, "flex-shrink": { max: 100 }, "flex-basis": length(1600, 1600), order: { max: 100 },
  gap: GAP, "row-gap": GAP, "column-gap": GAP,
  grid: TRACKS_BOTH, "grid-template": TRACKS_BOTH, "grid-template-columns": TRACKS_COLUMNS, "grid-template-rows": TRACKS_ROWS, "grid-template-areas": { strings: true },
  "grid-auto-columns": TRACKS_COLUMNS, "grid-auto-rows": TRACKS_ROWS, "grid-auto-flow": KEYWORDS, "grid-area": GRID_LINE, "grid-column": GRID_LINE, "grid-row": GRID_LINE,
  "align-items": KEYWORDS, "align-self": KEYWORDS, "align-content": KEYWORDS, "justify-content": KEYWORDS, "justify-items": KEYWORDS, "justify-self": KEYWORDS, "place-items": KEYWORDS, "place-content": KEYWORDS, "place-self": KEYWORDS,
  "font-family": { special: "font-family" }, "font-size": { special: "font-size" }, "font-weight": { max: 1000 }, "font-style": KEYWORDS, "font-variant": KEYWORDS, "font-variant-numeric": KEYWORDS,
  "line-height": { special: "line-height" }, "letter-spacing": length(20), "word-spacing": length(40),
  "text-align": KEYWORDS, "text-transform": KEYWORDS, "text-decoration": length(20), "text-decoration-style": KEYWORDS, "text-decoration-line": KEYWORDS, "text-underline-offset": OFFSET, "text-indent": OFFSET, "text-wrap": KEYWORDS,
  "white-space": KEYWORDS, "word-break": KEYWORDS, "overflow-wrap": KEYWORDS, hyphens: KEYWORDS, "list-style": KEYWORDS, "list-style-type": KEYWORDS, "list-style-position": KEYWORDS,
  content: { special: "content" }, quotes: { strings: true },
  transform: { special: "transform" }, "transform-origin": OFFSET, transition: TRANSITION, "transition-property": TRANSITION, "transition-duration": TRANSITION, "transition-timing-function": TRANSITION, "transition-delay": TRANSITION,
  columns: length(1600, null, { max: 4, special: "columns" }), "column-count": { max: 4 }
};

const GENERIC_FAMILIES: ReadonlySet<string> = new Set(["serif", "sans-serif", "cursive", "monospace", "system-ui", "inherit"]);
const FAMILY_NAMES: ReadonlySet<string> = new Set(FONT_FAMILIES.map((family) => family.family.toLowerCase()));
const BAD_WORDS = /(javascript|vbscript|expression|behavior|binding|data:)/i;
/**
 * Nothing that can open or close markup is ever a value (R3-M1): a string such as "</style><script>…" would end a <style> element
 * it is inlined in. "<" and ">" are never needed in a value (a combinator ">" lives in selectors, not here), and "-->" needs ">".
 */
const MARKUP = /[<>]/;
/** Narrowest a column of `columns` may be: 1600 / 400 = 4 columns at most (R3-m3). */
const MIN_COLUMN_WIDTH_PX = 400;
const COLOR_FUNCTIONS: ReadonlySet<string> = new Set(["rgb", "rgba", "hsl", "hsla"]);
const MATH_FUNCTIONS: ReadonlySet<string> = new Set(["", "calc", "min", "max", "clamp"]);
const GRADIENTS: ReadonlySet<string> = new Set(["linear-gradient", "radial-gradient", "conic-gradient", "repeating-linear-gradient", "repeating-radial-gradient"]);
const DISPLAYS: ReadonlySet<string> = new Set(["block", "inline", "inline-block", "flex", "inline-flex", "grid", "inline-grid", "flow-root", "list-item"]);
const FONT_KEYWORDS: ReadonlySet<string> = new Set(["small", "medium", "large", "x-large", "xx-large", "xxx-large", "inherit", "initial", "unset"]);
const TRANSFORM_FUNCTIONS: ReadonlySet<string> = new Set(["rotate", "translate", "translatex", "translatey", "scale", "scalex", "scaley"]);
const KEYWORD = /^\[?[a-z][a-z0-9_-]*\]?$/i;
const HEX = /^#[0-9a-f]{3,8}$/i;
const ABSOLUTE_PX: Readonly<Record<string, number>> = { px: 1, cm: 37.8, mm: 3.78, in: 96, pt: 4 / 3, pc: 16, q: 0.945 };
const TIME_SECONDS: Readonly<Record<string, number>> = { s: 1, ms: 0.001 };
const ANGLE_DEG: Readonly<Record<string, number>> = { deg: 1, grad: 0.9, rad: 180 / Math.PI, turn: 360 };

const VIEWPORT_RANGE: Readonly<Record<string, readonly [number, number]>> = (() => {
  const out: Record<string, readonly [number, number]> = {};
  const width = [VIEWPORT.minW / 100, VIEWPORT.maxW / 100] as const;
  const height = [VIEWPORT.minH / 100, VIEWPORT.maxH / 100] as const;
  const smaller = [Math.min(VIEWPORT.minW, VIEWPORT.minH) / 100, Math.min(VIEWPORT.maxW, VIEWPORT.maxH) / 100] as const;
  const larger = [Math.max(VIEWPORT.minW, VIEWPORT.minH) / 100, Math.max(VIEWPORT.maxW, VIEWPORT.maxH) / 100] as const;
  for (const prefix of ["", "s", "l", "d"]) {
    out[`${prefix}vw`] = width; out[`${prefix}vi`] = width; out[`${prefix}vh`] = height; out[`${prefix}vb`] = height; out[`${prefix}vmin`] = smaller; out[`${prefix}vmax`] = larger;
  }
  out.cqw = width; out.cqi = width; out.cqh = height; out.cqb = height; out.cqmin = smaller; out.cqmax = larger;
  return out;
})();

type FunctionNode = Extract<ValueNode, { type: "function" }>;
/** A value as an interval of px (len) or of plain numbers. */
interface Val { readonly len: boolean; readonly lo: number; readonly hi: number }
interface Budget { terms: number }
interface Environment { readonly property: string; readonly prefixes: readonly string[] }

/** Every operation ends here, so a NaN or an Infinity (1e308 * 1e308 * 0) is refused instead of being read as "inside the bound" (R3-m1). */
const interval = (len: boolean, a: number, b: number): Val => {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return reject("math: the result is not a finite number");
  return { len, lo: Math.min(a, b), hi: Math.max(a, b) };
};
const magnitude = (value: Val): number => Math.max(Math.abs(value.lo), Math.abs(value.hi));

function dimension(value: string): { readonly number: number; readonly unit: string } | null {
  const parsed = valueParser.unit(value);
  if (!parsed) return null;
  const number = Number(parsed.number);
  return Number.isFinite(number) ? { number, unit: parsed.unit.toLowerCase() } : null;
}

function splitCommas(nodes: readonly ValueNode[]): ValueNode[][] {
  const groups: ValueNode[][] = [[]];
  for (const node of nodes) {
    if (node.type === "div" && node.value === ",") groups.push([]);
    else (groups[groups.length - 1] as ValueNode[]).push(node);
  }
  return groups;
}

/** A length, percentage or plain number as an interval in px, in the worst case. */
function unitValue(number: number, unit: string, spec: Spec): Val {
  if (unit === "") return interval(false, number, number);
  if (unit === "%") {
    if (spec.pct === null || spec.pct === undefined) return reject("percentages are not accepted here");
    return interval(true, 0, (number * spec.pct) / 100);
  }
  const absolute = ABSOLUTE_PX[unit];
  if (absolute !== undefined) return interval(true, number * absolute, number * absolute);
  if (unit === "rem") return interval(true, number * REM_PX, number * REM_PX);
  if (unit === "em" || unit === "ch" || unit === "ex") {
    if (spec.fontRelative === false) return reject(`${unit} is not accepted here`);
    const low = unit === "em" ? MIN_FONT_PX : 0;
    return interval(true, number * low, number * MAX_FONT_PX);
  }
  const range = VIEWPORT_RANGE[unit];
  if (range) return interval(true, number * range[0], number * range[1]);
  return reject(`unit ${unit}`);
}

const add = (a: Val, b: Val): Val => (a.len === b.len ? interval(a.len, a.lo + b.lo, a.hi + b.hi) : reject("math: cannot add a length and a number"));
const subtract = (a: Val, b: Val): Val => (a.len === b.len ? interval(a.len, a.lo - b.hi, a.hi - b.lo) : reject("math: cannot subtract a length and a number"));
function multiply(a: Val, b: Val): Val {
  if (a.len && b.len) return reject("math: a length times a length");
  const products = [a.lo * b.lo, a.lo * b.hi, a.hi * b.lo, a.hi * b.hi];
  return interval(a.len || b.len, Math.min(...products), Math.max(...products));
}
function divide(a: Val, b: Val): Val {
  if (b.len || (b.lo <= 0 && b.hi >= 0) || Math.min(Math.abs(b.lo), Math.abs(b.hi)) < 0.01) return reject("math: division only by a plain number away from zero");
  const quotients = [a.lo / b.lo, a.lo / b.hi, a.hi / b.lo, a.hi / b.hi];
  return interval(a.len, Math.min(...quotients), Math.max(...quotients));
}

function evaluateSum(nodes: readonly ValueNode[], spec: Spec, depth: number, budget: Budget): Val {
  const items = nodes.filter((node) => node.type !== "space");
  if (items.length === 0) return reject("math: empty");
  let position = 0;
  const peek = (): string | null => {
    const node = items[position];
    if (!node) return null;
    if (node.type === "word" && (node.value === "+" || node.value === "-" || node.value === "*" || node.value === "/")) return node.value;
    if (node.type === "div" && node.value === "/") return "/";
    return null;
  };
  const operand = (): Val => {
    const node = items[position];
    position += 1;
    budget.terms += 1;
    if (budget.terms > MAX_MATH_TERMS) return reject("math: too many terms");
    if (!node) return reject("math: missing operand");
    if (node.type === "function" && MATH_FUNCTIONS.has(node.value.toLowerCase())) return evaluateMath(node, spec, depth + 1, budget);
    if (node.type === "word") {
      const parsed = dimension(node.value);
      if (!parsed) return reject("math: cannot evaluate a term");
      return unitValue(parsed.number, parsed.unit, spec);
    }
    return reject("math: only lengths, numbers and nested math");
  };
  const term = (): Val => {
    let value = operand();
    for (let op = peek(); op === "*" || op === "/"; op = peek()) { position += 1; const right = operand(); value = op === "*" ? multiply(value, right) : divide(value, right); }
    return value;
  };
  let value = term();
  for (let op = peek(); op === "+" || op === "-"; op = peek()) { position += 1; const right = term(); value = op === "+" ? add(value, right) : subtract(value, right); }
  if (position !== items.length) return reject("math: unexpected token");
  return value;
}

function evaluateMath(node: FunctionNode, spec: Spec, depth: number, budget: Budget): Val {
  if (depth > MAX_MATH_DEPTH) return reject(`math nested deeper than ${MAX_MATH_DEPTH}`);
  const name = node.value.toLowerCase();
  const values = splitCommas(node.nodes).map((group) => evaluateSum(group, spec, depth, budget));
  const first = values[0] as Val;
  switch (name) {
    case "": case "calc": return values.length === 1 ? first : reject("math: one expression");
    case "min": case "max": {
      if (values.length < 1 || values.length > 8 || values.some((value) => value.len !== first.len)) return reject("math: min/max need like arguments");
      const pick = name === "min" ? Math.min : Math.max;
      return interval(first.len, pick(...values.map((value) => value.lo)), pick(...values.map((value) => value.hi)));
    }
    default: {
      if (values.length !== 3 || values.some((value) => value.len !== first.len)) return reject("math: clamp(min, value, max)");
      const [low, middle, high] = values as [Val, Val, Val];
      return interval(low.len, Math.max(low.lo, Math.min(middle.lo, high.lo)), Math.max(low.hi, Math.min(middle.hi, high.hi)));
    }
  }
}

/** A word or a math function as a Val; null when the node is something else. */
function evaluateToken(node: ValueNode, spec: Spec): Val | null {
  if (node.type === "word") {
    const parsed = dimension(node.value);
    return parsed ? unitValue(parsed.number, parsed.unit, spec) : null;
  }
  if (node.type === "function" && node.value !== "" && MATH_FUNCTIONS.has(node.value.toLowerCase())) return evaluateMath(node, spec, 1, { terms: 0 });
  return null;
}

function acceptValue(value: Val, spec: Spec, property: string): void {
  const size = magnitude(value);
  if (Number.isNaN(size)) reject(`${property}: not a finite number`);
  if (value.len) {
    if (!spec.cap) reject(`${property}: lengths are not accepted`);
    if (!(size <= (spec.cap as number))) reject(`${property}: up to ${size}px in the worst case, max ${spec.cap}px`);
  } else if (spec.cap !== undefined && spec.max === undefined) {
    // A bare number is no length: only 0 is one (quirks mode would read 1000 as 1000px) (R3-m2).
    if (size !== 0) reject(`${property}: a length needs a unit (only 0 may go without)`);
  } else if (!(size <= (spec.max ?? 1000))) reject(`${property}: number out of bounds`);
}

function checkUrl(node: FunctionNode, environment: Environment): void {
  const argument = node.nodes[0];
  const target = argument && (argument.type === "string" || argument.type === "word") ? argument.value.trim() : "";
  const prefix = environment.prefixes.find((candidate) => target.startsWith(candidate));
  if (!prefix || node.nodes.length !== 1 || !isMediaStoreUrl(target, environment.prefixes) || /[()'"\s]/.test(target.slice(prefix.length))) reject("url() outside the media store");
}

function checkColorFunction(node: FunctionNode): void {
  for (const argument of node.nodes) {
    if (argument.type === "space" || argument.type === "div") { if (argument.type === "div" && argument.value !== "," && argument.value !== "/") reject("colour: bad separator"); continue; }
    if (argument.type !== "word") return reject("colour: only numbers");
    if (argument.value.toLowerCase() === "none") continue;
    const parsed = dimension(argument.value);
    if (!parsed || !["", "%", "deg", "turn", "rad", "grad"].includes(parsed.unit) || Math.abs(parsed.number) > 100_000) reject("colour: bad argument");
  }
}

function checkVar(node: FunctionNode): void {
  const variable = node.nodes[0];
  if (node.nodes.length !== 1 || !variable || variable.type !== "word" || !/^--rsvp-[a-z0-9-]+$/i.test(variable.value)) reject("var() only for --rsvp-* tokens, with no fallback");
}

function scanFunction(node: FunctionNode, spec: Spec, depth: number, environment: Environment): number {
  const name = node.value.toLowerCase();
  if (depth > MAX_FUNCTION_DEPTH) return reject("functions nested too deep");
  if (name === "var") { checkVar(node); return 0; }
  if (COLOR_FUNCTIONS.has(name)) { checkColorFunction(node); return 0; }
  if (name !== "" && MATH_FUNCTIONS.has(name)) {
    const value = evaluateMath(node, spec, 1, { terms: 0 });
    acceptValue(value, spec, environment.property);
    return value.len ? 1 : 0;
  }
  if (name === "url") {
    if (!spec.url) return reject("url() only in background");
    checkUrl(node, environment);
    return 0;
  }
  if (spec.gradient && GRADIENTS.has(name)) {
    for (const group of splitCommas(node.nodes)) scanTokens(group, GRADIENT_ARGUMENTS, depth + 1, environment);
    return 0;
  }
  if (spec.fns?.has(name)) {
    let lengths = 0;
    for (const group of splitCommas(node.nodes)) lengths += scanTokens(group, spec, depth + 1, environment);
    return lengths;
  }
  return reject(`function ${node.value}()`);
}

/** Checks every token of one layer; returns how many lengths it held. */
function scanTokens(nodes: readonly ValueNode[], spec: Spec, depth: number, environment: Environment): number {
  let lengths = 0;
  let tokens = 0;
  for (const node of nodes) {
    if (node.type === "space") continue;
    tokens += 1;
    if (tokens > MAX_TOKENS) reject("too many tokens");
    if (node.type === "div") { if (node.value !== "/" || !spec.slash) reject(`separator ${node.value}`); continue; }
    if (node.type === "string") { if (!spec.strings || node.value.length > 200) reject("text not accepted here"); continue; }
    if (node.type === "function") { lengths += scanFunction(node, spec, depth, environment); continue; }
    if (node.type !== "word") return reject(`unexpected ${node.type}`);
    if (HEX.test(node.value) || KEYWORD.test(node.value)) continue;
    const parsed = dimension(node.value);
    if (!parsed) return reject(`cannot evaluate ${node.value}`);
    const time = TIME_SECONDS[parsed.unit];
    const angle = ANGLE_DEG[parsed.unit];
    if (time !== undefined) { if (!spec.time || Math.abs(parsed.number * time) > MAX_TIME_SECONDS) reject("time not accepted or too long"); continue; }
    if (angle !== undefined) { if (!spec.angle || Math.abs(parsed.number * angle) > 3600) reject("angle not accepted"); continue; }
    if (parsed.unit === "fr") { if (!spec.fr || parsed.number < 0 || parsed.number > 1000) reject("fr not accepted"); continue; }
    const value = unitValue(parsed.number, parsed.unit, spec);
    acceptValue(value, spec, environment.property);
    if (value.len) lengths += 1;
  }
  return lengths;
}

function scanLayers(nodes: readonly ValueNode[], spec: Spec, environment: Environment): void {
  const groups = splitCommas(nodes);
  if (groups.length > (spec.layers ?? 1)) reject(`${environment.property}: at most ${spec.layers ?? 1} comma-separated value(s)`);
  for (const group of groups) {
    if (!group.some((node) => node.type !== "space")) reject("empty value");
    const lengths = scanTokens(group, spec, 0, environment);
    if (spec.maxLengths !== undefined && lengths > spec.maxLengths) reject(`${environment.property}: too many lengths in a layer`);
  }
}

/** Sum of every track size of a grid template, repeat() counted, in px (fr and keywords weigh nothing). */
function trackSum(nodes: readonly ValueNode[], spec: Spec, depth: number, environment: Environment): number {
  let total = 0;
  for (const node of nodes) {
    if (node.type === "space" || node.type === "string") continue;
    if (node.type === "div") { if (node.value !== "/") reject("grid: bad separator"); continue; }
    if (node.type === "word") {
      if (KEYWORD.test(node.value)) continue;
      const parsed = dimension(node.value);
      if (!parsed) return reject(`grid: cannot evaluate ${node.value}`);
      if (parsed.unit === "fr") { if (parsed.number < 0 || parsed.number > 1000) reject("grid: fr out of bounds"); continue; }
      const value = unitValue(parsed.number, parsed.unit, spec);
      if (!value.len && parsed.number !== 0) reject("grid: a track size needs a unit (only 0 may go without)");
      acceptValue(value, spec, environment.property);
      total += value.len ? magnitude(value) : 0;
      continue;
    }
    if (node.type !== "function") return reject(`grid: unexpected ${node.type}`);
    const name = node.value.toLowerCase();
    if (name === "var") { checkVar(node); continue; }
    if (name === "repeat") {
      if (depth > 0) reject("grid: nested repeat()");
      const [head, ...rest] = splitCommas(node.nodes);
      const count = (head ?? []).filter((entry) => entry.type !== "space");
      const word = count[0];
      const auto = count.length === 1 && word?.type === "word" && /^(auto-fill|auto-fit)$/i.test(word.value);
      const times = auto ? 1 : count.length === 1 && word?.type === "word" && /^\d{1,3}$/.test(word.value) ? Number(word.value) : 0;
      if (times < 1 || times > MAX_GRID_REPEAT) return reject(`grid: repeat() count must be 1 to ${MAX_GRID_REPEAT}`);
      total += times * trackSum(rest.flat(), spec, depth + 1, environment);
      continue;
    }
    if (name === "minmax") {
      const parts = splitCommas(node.nodes);
      if (parts.length !== 2) return reject("grid: minmax() takes two values");
      total += Math.max(...parts.map((part) => trackSum(part, spec, depth + 1, environment)));
      continue;
    }
    if (name === "fit-content") { total += trackSum(node.nodes, spec, depth + 1, environment); continue; }
    if (MATH_FUNCTIONS.has(name) && name !== "") {
      const value = evaluateMath(node, spec, 1, { terms: 0 });
      if (!value.len && magnitude(value) !== 0) reject("grid: a track size needs a unit (only 0 may go without)");
      acceptValue(value, spec, environment.property);
      total += value.len ? magnitude(value) : 0;
      continue;
    }
    return reject(`grid: function ${node.value}()`);
  }
  return total;
}

function checkFontFamily(nodes: readonly ValueNode[]): void {
  for (const node of nodes) {
    if (node.type === "div" || node.type === "space") continue;
    const text = node.type === "string" ? node.value : node.type === "word" ? node.value : reject("font-family: unexpected value");
    const names = String(text).split(/\s+/).filter(Boolean).join(" ").toLowerCase();
    if (!GENERIC_FAMILIES.has(names) && !FAMILY_NAMES.has(names)) reject(`font-family: ${String(text)} is not in the catalogue`);
  }
}

function singleToken(nodes: readonly ValueNode[], property: string): ValueNode {
  const tokens = nodes.filter((node) => node.type !== "space");
  const [only] = tokens;
  return tokens.length === 1 && only ? only : reject(`${property}: one value`);
}

function checkFontSize(nodes: readonly ValueNode[]): void {
  const node = singleToken(nodes, "font-size");
  if (node.type === "word" && FONT_KEYWORDS.has(node.value.toLowerCase())) return;
  const spec: Spec = { cap: MAX_FONT_PX, pct: null, fontRelative: false };
  const value = evaluateToken(node, spec);
  if (!value || !value.len) return reject("font-size: a length in px, rem or viewport units");
  if (!(value.lo >= MIN_FONT_PX)) reject(`font-size: at least ${MIN_FONT_PX}px in the worst case (it can be ${value.lo}px)`);
  if (!(value.hi <= MAX_FONT_PX)) reject(`font-size: at most ${MAX_FONT_PX}px in the worst case (it can be ${value.hi}px)`);
}

function checkLineHeight(nodes: readonly ValueNode[]): void {
  const node = singleToken(nodes, "line-height");
  if (node.type === "word") {
    if (["normal", "inherit", "initial", "unset"].includes(node.value.toLowerCase())) return;
    const parsed = dimension(node.value);
    if (parsed && parsed.unit === "") { if (parsed.number < 0.8 || parsed.number > 4) reject("line-height: between 0.8 and 4"); return; }
    if (parsed && parsed.unit === "%") { if (parsed.number < 80 || parsed.number > 400) reject("line-height: between 80% and 400%"); return; }
  }
  const value = evaluateToken(node, { cap: MAX_LINE_HEIGHT_PX, pct: null });
  if (!value) return reject("line-height: not a value");
  if (!value.len) { if (!(value.lo >= 0.8 && value.hi <= 4)) reject("line-height: between 0.8 and 4"); return; }
  if (!(value.lo >= MIN_LINE_HEIGHT_PX && value.hi <= MAX_LINE_HEIGHT_PX)) reject(`line-height: between ${MIN_LINE_HEIGHT_PX}px and ${MAX_LINE_HEIGHT_PX}px in the worst case`);
}

function checkAspectRatio(nodes: readonly ValueNode[]): void {
  const tokens = nodes.filter((node) => node.type !== "space");
  const first = tokens[0];
  const rest = first?.type === "word" && first.value.toLowerCase() === "auto" ? tokens.slice(1) : tokens;
  if (rest.length === 0 && tokens.length > 0) return;
  const [numerator, slash, denominator] = rest;
  const shapeOk = (rest.length === 1 || (rest.length === 3 && slash?.type === "div" && slash.value === "/")) && numerator?.type === "word" && (rest.length === 1 || denominator?.type === "word");
  const parse = (node: ValueNode | undefined): number => {
    const parsed = node?.type === "word" ? dimension(node.value) : null;
    return parsed && parsed.unit === "" && parsed.number > 0 ? parsed.number : Number.NaN;
  };
  const ratio = shapeOk ? parse(numerator) / (rest.length === 3 ? parse(denominator) : 1) : Number.NaN;
  if (!(ratio >= MIN_ASPECT && ratio <= MAX_ASPECT)) reject("aspect-ratio: a number or a / b between 1/4 and 4");
}

function checkTransform(nodes: readonly ValueNode[], environment: Environment): void {
  const node = singleToken(nodes, "transform");
  if (node.type !== "function" || !TRANSFORM_FUNCTIONS.has(node.value.toLowerCase())) return reject("transform: a single rotate, translate or scale function");
  const name = node.value.toLowerCase();
  const args = splitCommas(node.nodes).map((group) => group.filter((entry) => entry.type !== "space"));
  if (args.some((group) => group.length !== 1)) return reject("transform: plain arguments");
  const numbers = args.map((group) => { const word = group[0]; return word?.type === "word" ? dimension(word.value) : null; });
  if (name === "rotate") {
    const parsed = numbers[0];
    if (args.length !== 1 || !parsed || parsed.unit !== "deg" || Math.abs(parsed.number) > MAX_ROTATE_DEG) reject(`transform: rotate within ${MAX_ROTATE_DEG}deg`);
    return;
  }
  if (name.startsWith("scale")) {
    if (args.length > (name === "scale" ? 2 : 1) || numbers.some((parsed) => !parsed || parsed.unit !== "" || parsed.number < 1 || parsed.number > 2)) reject("transform: scale between 1 and 2 (smaller would push text under the 13px floor)");
    return;
  }
  if (args.length > (name === "translate" ? 2 : 1)) reject("transform: translate arguments");
  for (const argument of args) scanTokens(argument, { cap: MAX_TRANSLATE_PX, pct: 1600 }, 1, environment);
}

/**
 * Evaluates one declaration against its property's grammar and returns the normalised value; throws Reject when the value
 * (or the property) is outside it.
 */
export function checkDeclarationValue(property: string, value: string, prefixes: readonly string[]): string {
  if (BAD_WORDS.test(value) || MARKUP.test(value) || value.includes("\\") || value.includes("\0")) reject("forbidden text in value");
  const spec = SPECS[property];
  if (!spec) return reject("property not allowed");
  const parsed = valueParser(value);
  for (const node of parsed.nodes) if (node.type === "comment" || node.type === "unicode-range") reject("not allowed in a value");
  const environment: Environment = { property, prefixes };
  const nodes = parsed.nodes;
  switch (spec.special) {
    case "position": if (!["static", "relative", "absolute"].includes(value.trim().toLowerCase())) reject("position: fixed and sticky are not allowed"); break;
    case "display": if (!DISPLAYS.has(value.trim().toLowerCase())) reject("display: none and table layouts are not allowed"); break;
    case "z-index": {
      const number = Number(value.trim());
      if (!Number.isInteger(number) || number > MAX_AUTHOR_Z_INDEX || number < -MAX_AUTHOR_Z_INDEX) reject(`z-index above ${MAX_AUTHOR_Z_INDEX}`);
      break;
    }
    case "font-size": checkFontSize(nodes); break;
    case "font-family": checkFontFamily(nodes); break;
    case "line-height": checkLineHeight(nodes); break;
    case "aspect-ratio": checkAspectRatio(nodes); break;
    case "transform": checkTransform(nodes, environment); break;
    case "content": if (nodes.some((node) => node.type !== "string" && node.type !== "space")) reject("content: only text"); break;
    case "color-only": scanLayers(nodes, { max: 0 }, environment); break;
    case "columns": {
      scanLayers(nodes, spec, environment);
      // With a count (<= 4, checked above) the width cannot make more columns; without one the width alone decides how many fit.
      const hasCount = nodes.some((node) => node.type === "word" && dimension(node.value)?.unit === "" && /^\d/.test(node.value));
      for (const node of nodes) {
        const width = node.type === "space" ? null : evaluateToken(node, spec);
        if (!hasCount && width?.len && !(width.lo >= MIN_COLUMN_WIDTH_PX)) reject(`columns: a width under ${MIN_COLUMN_WIDTH_PX}px needs a column count (4 at most), or it could make more than 4 columns`);
      }
      break;
    }
    case "tracks-both": {
      // grid / grid-template are "rows / columns": each side has its own bound, so rows cannot take the room of columns.
      const at = nodes.findIndex((node) => node.type === "div" && node.value === "/");
      if (nodes.filter((node) => node.type === "div" && node.value === "/").length > 1) reject(`${property}: one "/" at most`);
      const rows = trackSum(at === -1 ? nodes : nodes.slice(0, at), TRACKS_ROWS, 0, environment);
      const columns = at === -1 ? 0 : trackSum(nodes.slice(at + 1), TRACKS_COLUMNS, 0, environment);
      if (rows > TRACKS_ROWS.sum || columns > TRACKS_COLUMNS.sum) reject(`${property}: rows add up to ${Math.round(rows)}px (max ${TRACKS_ROWS.sum}), columns to ${Math.round(columns)}px (max ${TRACKS_COLUMNS.sum})`);
      break;
    }
    case "tracks": {
      const total = trackSum(nodes, spec, 0, environment);
      if (total > (spec.sum as number)) reject(`${property}: tracks add up to ${Math.round(total)}px, max ${spec.sum}px`);
      break;
    }
    default: scanLayers(nodes, spec, environment);
  }
  return valueParser.stringify(nodes).trim();
}
