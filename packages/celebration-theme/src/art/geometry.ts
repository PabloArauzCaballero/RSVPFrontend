/**
 * Path builders for the invitation art, on the 120-unit grid of DOne's illustrations. `circle`, `ellipse`, `rect`, `poly` and
 * `capsule` write exactly the same path strings as `packages/ui/src/illustrations.ts` (pinned by
 * `apps/universal/test/invitation-art-sync.test.ts`), so a drawing can move between the two libraries unchanged. This package
 * cannot import `@rsvp/ui` because the public site (`apps/seo-web`) renders invitations and must not depend on the app kit.
 *
 * `shape` adds what the app set never needed: a figure written once as absolute M/L/C/Q/Z commands that can be rotated,
 * mirrored or moved (two bells, the two sides of a bow) without hand-computing every control point.
 */
export const n = (value: number): string => String(Math.round(value * 100) / 100);
export type Pt = readonly [number, number];

export const circle = (cx: number, cy: number, r: number): string => `M${n(cx - r)} ${n(cy)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0Z`;
export const ellipse = (cx: number, cy: number, rx: number, ry: number): string => `M${n(cx - rx)} ${n(cy)}a${n(rx)} ${n(ry)} 0 1 0 ${n(2 * rx)} 0a${n(rx)} ${n(ry)} 0 1 0 ${n(-2 * rx)} 0Z`;
export const rect = (x: number, y: number, w: number, h: number, r: number): string =>
  `M${n(x + r)} ${n(y)}H${n(x + w - r)}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(r)}V${n(y + h - r)}a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(r)}H${n(x + r)}a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(-r)}V${n(y + r)}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(-r)}Z`;
export const poly = (points: readonly Pt[], close = false): string => `M${points.map(([x, y]) => `${n(x)} ${n(y)}`).join("L")}${close ? "Z" : ""}`;
/** A pill whose axis runs from (x1, y1) to (x2, y2). */
export const capsule = (x1: number, y1: number, x2: number, y2: number, r: number): string => {
  const len = Math.hypot(x2 - x1, y2 - y1); const nx = ((y2 - y1) / len) * r; const ny = (-(x2 - x1) / len) * r;
  return `M${n(x1 + nx)} ${n(y1 + ny)}L${n(x2 + nx)} ${n(y2 + ny)}A${n(r)} ${n(r)} 0 0 1 ${n(x2 - nx)} ${n(y2 - ny)}L${n(x1 - nx)} ${n(y1 - ny)}A${n(r)} ${n(r)} 0 0 1 ${n(x1 + nx)} ${n(y1 + ny)}Z`;
};

/** One absolute command: `["M", x, y]`, `["L", x, y]`, `["Q", cx, cy, x, y]`, `["C", c1x, c1y, c2x, c2y, x, y]` or `["Z"]`. */
export type Cmd = readonly ["M" | "L", number, number] | readonly ["Q", number, number, number, number] | readonly ["C", number, number, number, number, number, number] | readonly ["Z"];
export type Transform = (point: Pt) => Pt;

export const rotate = (cx: number, cy: number, degrees: number): Transform => {
  const rad = (degrees * Math.PI) / 180; const cos = Math.cos(rad); const sin = Math.sin(rad);
  return ([x, y]) => [cx + (x - cx) * cos - (y - cy) * sin, cy + (x - cx) * sin + (y - cy) * cos];
};
export const mirrorX = (axis: number): Transform => ([x, y]) => [2 * axis - x, y];
export const move = (dx: number, dy: number): Transform => ([x, y]) => [x + dx, y + dy];
export const scaleAt = (cx: number, cy: number, k: number): Transform => ([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k];
const identity: Transform = (point) => point;

/** Writes commands as a path string, every point passed through `t` (identity by default). */
export function shape(commands: readonly Cmd[], t: Transform = identity): string {
  return commands.map((command) => {
    if (command[0] === "Z") return "Z";
    const values = command.slice(1) as number[];
    const points: string[] = [];
    for (let index = 0; index < values.length; index += 2) {
      const [x, y] = t([values[index] ?? 0, values[index + 1] ?? 0]);
      points.push(`${n(x)} ${n(y)}`);
    }
    return `${command[0]}${points.join(" ")}`;
  }).join("");
}

/** A circle moved through a transform (its centre moves, its radius does not). */
export const circleAt = (center: Pt, r: number, t: Transform = identity): string => { const [x, y] = t(center); return circle(x, y, r); };
/** A filled teardrop pointing up, its round end centred on (cx, cy): flames, drops and leaves. */
export const drop = (cx: number, cy: number, r: number, height: number, t: Transform = identity): string =>
  shape([["M", cx, cy - height], ["C", cx + r * 0.55, cy - height * 0.55, cx + r, cy - r * 0.6, cx + r, cy], ["C", cx + r, cy + r * 1.35, cx - r, cy + r * 1.35, cx - r, cy], ["C", cx - r, cy - r * 0.6, cx - r * 0.55, cy - height * 0.55, cx, cy - height], ["Z"]], t);
/** A heart with its point at the bottom, `w` wide, top centre at (cx, cy). */
export const heart = (cx: number, cy: number, w: number, t: Transform = identity): string => {
  const k = w / 20;
  return shape([["M", cx, cy + 4 * k], ["C", cx - 2 * k, cy - 2 * k, cx - 10 * k, cy - 2 * k, cx - 10 * k, cy + 5 * k], ["C", cx - 10 * k, cy + 10 * k, cx - 4 * k, cy + 14 * k, cx, cy + 17 * k], ["C", cx + 4 * k, cy + 14 * k, cx + 10 * k, cy + 10 * k, cx + 10 * k, cy + 5 * k], ["C", cx + 10 * k, cy - 2 * k, cx + 2 * k, cy - 2 * k, cx, cy + 4 * k], ["Z"]], t);
};

/** A polygon with every corner rounded by `r` (never more than half an edge): the soft, filled figures of the set. */
export function rpoly(points: readonly Pt[], r: number, t: Transform = identity): string {
  const pts = points.map((point) => t(point));
  const count = pts.length;
  const parts: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const prev = pts[(index + count - 1) % count] as Pt; const here = pts[index] as Pt; const next = pts[(index + 1) % count] as Pt;
    const toPrev = Math.hypot(prev[0] - here[0], prev[1] - here[1]); const toNext = Math.hypot(next[0] - here[0], next[1] - here[1]);
    const d = Math.min(r, toPrev / 2, toNext / 2);
    const a: Pt = [here[0] + ((prev[0] - here[0]) / toPrev) * d, here[1] + ((prev[1] - here[1]) / toPrev) * d];
    const b: Pt = [here[0] + ((next[0] - here[0]) / toNext) * d, here[1] + ((next[1] - here[1]) / toNext) * d];
    parts.push(`${index === 0 ? "M" : "L"}${n(a[0])} ${n(a[1])}Q${n(here[0])} ${n(here[1])} ${n(b[0])} ${n(b[1])}`);
  }
  return `${parts.join("")}Z`;
}
/** A rounded rectangle that can be rotated (a tilted card). */
export const rrect = (x: number, y: number, w: number, h: number, r: number, t: Transform = identity): string => rpoly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], r, t);
/** `count` points of a quadratic curve, for building a smooth outline out of `rpoly`. */
export const arcPoints = (cx: number, cy: number, rx: number, ry: number, from: number, to: number, count: number): Pt[] =>
  Array.from({ length: count + 1 }, (_, index) => { const angle = ((from + ((to - from) * index) / count) * Math.PI) / 180; return [cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)] as Pt; });

/** Applies `first`, then `second`. */
export const after = (first: Transform, second: Transform): Transform => (point) => second(first(point));
/** A pointed leaf (a lens) of length `len` and half-width `w` starting at (x, y) and pointing at `degrees` (0 = right, 90 = down). */
export const leaf = (x: number, y: number, len: number, w: number, degrees: number): string =>
  shape([["M", 0, 0], ["C", len * 0.3, -w, len * 0.7, -w, len, 0], ["C", len * 0.7, w, len * 0.3, w, 0, 0], ["Z"]], after(rotate(0, 0, degrees), move(x, y)));
/** A point on a quadratic curve. */
export const quadAt = (a: Pt, b: Pt, c: Pt, t: number): Pt => {
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]];
};

/** `count` points of a cubic curve (the start point included), for building a filled outline with `band`. */
export const cubicPoints = (a: Pt, b: Pt, c: Pt, d: Pt, count = 10): Pt[] =>
  Array.from({ length: count + 1 }, (_, index) => {
    const t = index / count; const u = 1 - t;
    return [u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]] as Pt;
  });
/** A polyline through several cubic curves written as `[from, c1, c2, to]`, each starting where the last ended. */
export const trace = (curves: ReadonlyArray<readonly [Pt, Pt, Pt, Pt]>, count = 10): Pt[] =>
  curves.flatMap(([a, b, c, d], index) => cubicPoints(a, b, c, d, count).slice(index === 0 ? 0 : 1));
/** The points of a circle or an ellipse, from `from` degrees to `to` degrees (0 = right, 90 = down). */
export const arcTrace = (cx: number, cy: number, rx: number, ry: number, from: number, to: number, count = 24): Pt[] => arcPoints(cx, cy, rx, ry, from, to, count);

/**
 * A line turned into a FILLED shape: the polygon around a centre line `width` wide (round ends when open, an annulus when
 * `closed`). It is how a ring, a hanger or a numeral is drawn as a figure of ink instead of a thick stroke (the figure of the set
 * is never a stroke). Corners are mitred up to 1.8 times the half width.
 */
export function band(points: readonly Pt[], width: number, closed = false): string {
  const half = width / 2;
  const pts = points.filter((point, index) => index === 0 || Math.hypot(point[0] - points[index - 1]![0], point[1] - points[index - 1]![1]) > 0.01);
  if (closed && pts.length > 1 && Math.hypot(pts[0]![0] - pts[pts.length - 1]![0], pts[0]![1] - pts[pts.length - 1]![1]) < 0.01) pts.pop();
  const count = pts.length;
  const unit = (from: Pt, to: Pt): Pt => { const len = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1; return [(to[0] - from[0]) / len, (to[1] - from[1]) / len]; };
  const side = (index: number, sign: 1 | -1): Pt => {
    const here = pts[index]!;
    const prev = closed ? pts[(index + count - 1) % count]! : pts[index - 1];
    const next = closed ? pts[(index + 1) % count]! : pts[index + 1];
    const normals: Pt[] = [];
    if (prev) { const d = unit(prev, here); normals.push([-d[1], d[0]]); }
    if (next) { const d = unit(here, next); normals.push([-d[1], d[0]]); }
    const sum: Pt = normals.length === 1 ? normals[0]! : [normals[0]![0] + normals[1]![0], normals[0]![1] + normals[1]![1]];
    const len = Math.hypot(sum[0], sum[1]) || 1;
    const dir: Pt = [sum[0] / len, sum[1] / len];
    const reach = Math.min(half / Math.max(dir[0] * normals[0]![0] + dir[1] * normals[0]![1], 0.001), half * 1.8);
    return [here[0] + sign * dir[0] * reach, here[1] + sign * dir[1] * reach];
  };
  const write = (list: readonly Pt[], close: boolean): string => `M${list.map((point) => `${n(point[0])} ${n(point[1])}`).join("L")}${close ? "Z" : ""}`;
  const left = pts.map((_, index) => side(index, 1));
  const right = pts.map((_, index) => side(index, -1));
  if (closed) return write(left, true) + write([...right].reverse(), true);
  const cap = (end: Pt, back: Pt): Pt[] => {
    const d = unit(back, end); const nx: Pt = [-d[1], d[0]];
    return Array.from({ length: 4 }, (_, step) => { const a = ((step + 1) * Math.PI) / 5; return [end[0] + half * (nx[0] * Math.cos(a) + d[0] * Math.sin(a)), end[1] + half * (nx[1] * Math.cos(a) + d[1] * Math.sin(a))] as Pt; });
  };
  return write([...left, ...cap(pts[count - 1]!, pts[count - 2]!), ...[...right].reverse(), ...cap(pts[0]!, pts[1]!)], true);
}
/** A soft flower: `petals` rounded points around (cx, cy), `r` to the tips and `inner` to the notches. One shape. */
export const flower = (cx: number, cy: number, r: number, inner: number, petals = 6, round = 3.2): string =>
  rpoly(Array.from({ length: petals * 2 }, (_, index) => { const a = ((index * 180) / petals - 90) * (Math.PI / 180); const d = index % 2 ? inner : r; return [cx + d * Math.cos(a), cy + d * Math.sin(a)] as Pt; }), round);
/** A bow: two triangles meeting at a knot, written as ONE outline (a single piece of colour). */
export const bowtie = (cx: number, cy: number, w: number, h: number, round = 1.5): string =>
  rpoly([[cx - w, cy - h], [cx - w * 0.18, cy - h * 0.22], [cx + w * 0.18, cy - h * 0.22], [cx + w, cy - h], [cx + w, cy + h], [cx + w * 0.18, cy + h * 0.22], [cx - w * 0.18, cy + h * 0.22], [cx - w, cy + h]], round);
/** A Latin cross as one outline: the vertical arm is `w` wide, the bar `w` tall. */
export const crossShape = (cx: number, top: number, height: number, span: number, w: number, barAt: number, round = 1.5): string =>
  rpoly([[cx - w / 2, top], [cx + w / 2, top], [cx + w / 2, top + barAt], [cx + span / 2, top + barAt], [cx + span / 2, top + barAt + w], [cx + w / 2, top + barAt + w], [cx + w / 2, top + height], [cx - w / 2, top + height], [cx - w / 2, top + barAt + w], [cx - span / 2, top + barAt + w], [cx - span / 2, top + barAt], [cx - w / 2, top + barAt]], round);
/** A balloon with its knot, as ONE outline (so it can be the single accent piece). */
export const balloonKnot = (cx: number, cy: number, rx: number, ry: number): string =>
  shape([["M", cx, cy - ry], ["C", cx + rx * 1.1, cy - ry, cx + rx * 1.1, cy + ry * 0.7, cx, cy + ry], ["L", cx + 4, cy + ry + 6], ["L", cx - 4, cy + ry + 6], ["L", cx, cy + ry], ["C", cx - rx * 1.1, cy + ry * 0.7, cx - rx * 1.1, cy - ry, cx, cy - ry], ["Z"]]);
