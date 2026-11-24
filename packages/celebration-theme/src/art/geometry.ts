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
