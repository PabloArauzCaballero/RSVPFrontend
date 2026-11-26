/**
 * Measures of an SVG path string for the art tests: how many sub-paths it has and its bounding box. It reads the commands the
 * library writes (M L H V C S Q T A Z, absolute and relative) and samples curves and arcs, so the box is the drawn extent
 * and not just the control points.
 */
export interface Box { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number }

const COMMAND = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
const NUMBER = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;

/** Number of sub-paths (`M`/`m`) of a path: a connected piece of ink has exactly one. */
export const subpathCount = (d: string): number => (d.match(/[Mm]/g) ?? []).length;

const arcPoints = (x1: number, y1: number, rxIn: number, ryIn: number, phiDeg: number, fa: number, fs: number, x2: number, y2: number): Array<readonly [number, number]> => {
  let rx = Math.abs(rxIn); let ry = Math.abs(ryIn);
  if (rx === 0 || ry === 0) return [[x2, y2]];
  const phi = (phiDeg * Math.PI) / 180; const cos = Math.cos(phi); const sin = Math.sin(phi);
  const dx = (x1 - x2) / 2; const dy = (y1 - y2) / 2;
  const x1p = cos * dx + sin * dy; const y1p = -sin * dx + cos * dy;
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) { rx *= Math.sqrt(lambda); ry *= Math.sqrt(lambda); }
  const numerator = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const denominator = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const factor = (fa === fs ? -1 : 1) * Math.sqrt(Math.max(0, numerator / denominator));
  const cxp = (factor * rx * y1p) / ry; const cyp = (-factor * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2; const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const angle = (ux: number, uy: number, vx: number, vy: number): number => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const theta = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let delta = angle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!fs && delta > 0) delta -= 2 * Math.PI;
  if (fs && delta < 0) delta += 2 * Math.PI;
  return Array.from({ length: 33 }, (_, index) => {
    const t = theta + (delta * index) / 32;
    return [cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin, cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos] as const;
  });
};

/** Bounding box of the drawn outline of a path (without its stroke width). */
export function pathBox(d: string): Box {
  const xs: number[] = []; const ys: number[] = [];
  const add = (x: number, y: number): void => { xs.push(x); ys.push(y); };
  let x = 0; let y = 0; let sx = 0; let sy = 0; let qx = 0; let qy = 0; let cx2 = 0; let cy2 = 0; let last = "";
  for (const match of d.matchAll(COMMAND)) {
    const cmd = match[1] ?? ""; const rel = cmd === cmd.toLowerCase(); const up = cmd.toUpperCase();
    const v = (match[2]?.match(NUMBER) ?? []).map(Number);
    const take = (size: number, run: (a: number[]) => void): void => { for (let i = 0; i + size <= v.length; i += size) run(v.slice(i, i + size)); };
    const ox = (): number => (rel ? x : 0); const oy = (): number => (rel ? y : 0);
    if (up === "Z") { x = sx; y = sy; last = up; continue; }
    if (up === "M") take(2, (a) => { x = ox() + a[0]!; y = oy() + a[1]!; sx = x; sy = y; add(x, y); });
    else if (up === "L") take(2, (a) => { x = ox() + a[0]!; y = oy() + a[1]!; add(x, y); });
    else if (up === "H") take(1, (a) => { x = ox() + a[0]!; add(x, y); });
    else if (up === "V") take(1, (a) => { y = oy() + a[0]!; add(x, y); });
    else if (up === "C" || up === "S") {
      const size = up === "C" ? 6 : 4;
      take(size, (a) => {
        const px = x; const py = y; const bx = ox(); const by = oy();
        const c1: [number, number] = up === "C" ? [bx + a[0]!, by + a[1]!] : (last === "C" || last === "S" ? [2 * x - cx2, 2 * y - cy2] : [x, y]);
        const o = up === "C" ? 2 : 0;
        const c2: [number, number] = [bx + a[o]!, by + a[o + 1]!]; const end: [number, number] = [bx + a[o + 2]!, by + a[o + 3]!];
        for (let i = 1; i <= 24; i += 1) {
          const t = i / 24; const u = 1 - t;
          add(u * u * u * px + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * end[0], u * u * u * py + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * end[1]);
        }
        cx2 = c2[0]; cy2 = c2[1]; x = end[0]; y = end[1];
      });
    } else if (up === "Q" || up === "T") {
      const size = up === "Q" ? 4 : 2;
      take(size, (a) => {
        const px = x; const py = y; const bx = ox(); const by = oy();
        const c: [number, number] = up === "Q" ? [bx + a[0]!, by + a[1]!] : (last === "Q" || last === "T" ? [2 * x - qx, 2 * y - qy] : [x, y]);
        const o = up === "Q" ? 2 : 0; const end: [number, number] = [bx + a[o]!, by + a[o + 1]!];
        for (let i = 1; i <= 16; i += 1) { const t = i / 16; const u = 1 - t; add(u * u * px + 2 * u * t * c[0] + t * t * end[0], u * u * py + 2 * u * t * c[1] + t * t * end[1]); }
        qx = c[0]; qy = c[1]; x = end[0]; y = end[1];
      });
    } else if (up === "A") {
      take(7, (a) => {
        const ex = ox() + a[5]!; const ey = oy() + a[6]!;
        for (const [px, py] of arcPoints(x, y, a[0]!, a[1]!, a[2]!, a[3]!, a[4]!, ex, ey)) add(px, py);
        x = ex; y = ey;
      });
    }
    last = up;
  }
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

/** The union of several boxes. */
export const unionBox = (boxes: readonly Box[]): Box => ({ x0: Math.min(...boxes.map((b) => b.x0)), y0: Math.min(...boxes.map((b) => b.y0)), x1: Math.max(...boxes.map((b) => b.x1)), y1: Math.max(...boxes.map((b) => b.y1)) });
