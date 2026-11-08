import { circle, dShape, check, type Shape } from './illustrations';

/**
 * Brand art that is not a spot illustration: the woven texture, the hero compositions and the moment backdrops.
 * Same shape vocabulary (D, check, arch, steps) and the same tones as the illustrations; one source for web and native.
 * Everything is decorative: low opacity, thin strokes, no filters, no raster.
 */
const n = (value: number): string => String(Math.round(value * 100) / 100);
type Pt = readonly [number, number];
const poly = (points: readonly Pt[], close = false): string => `M${points.map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}${close ? 'Z' : ''}`;

/** A stepped rhombus ("escalones"): the geometry of a woven border, with `steps` steps of `step` units per quarter. */
export const stepDiamond = (cx: number, cy: number, steps: number, step: number): string => {
  const quarter: Pt[] = [];
  for (let i = 0; i < steps; i += 1) quarter.push([i * step, -(steps - i) * step], [(i + 1) * step, -(steps - i) * step], [(i + 1) * step, -(steps - i - 1) * step]);
  const turn = (points: readonly Pt[]): Pt[] => points.map(([x, y]) => [-y, x]);
  const second = turn(quarter); const third = turn(second); const fourth = turn(third);
  return poly([...quarter, ...second, ...third, ...fourth].map(([x, y]): Pt => [cx + x, cy + y]), true);
};

export const WEAVE_TILE = 48;
export const WEAVE_STROKE = 1.25;
/** One tile of the weave. Corner diamonds are drawn on all four corners so neighbouring tiles complete each other. */
export const WEAVE_SHAPES: readonly Shape[] = [
  { layer: 'line', w: WEAVE_STROKE, d: stepDiamond(24, 24, 6, 3) },
  { layer: 'line', w: WEAVE_STROKE, d: stepDiamond(24, 24, 3, 3) },
  { layer: 'solid', d: 'M22 22H26V26H22Z' },
  ...([[0, 0], [48, 0], [0, 48], [48, 48]] as const).map(([x, y]): Shape => ({ layer: 'line', w: WEAVE_STROKE, d: stepDiamond(x, y, 2, 3) }))
];
/** Opacity of the weave per tone: strong enough to read as texture, light enough that text over it keeps AA (checked in the tests). */
export const WEAVE_OPACITY = { brand: 0.1, night: 0.1, onDark: 0.16, onBrand: 0.2 } as const;

const arch = (x: number, y: number, w: number, h: number): string => `M${n(x)} ${n(y + h)}V${n(y + w / 2)}a${n(w / 2)} ${n(w / 2)} 0 0 1 ${n(w)} 0V${n(y + h)}`;
const archFill = (x: number, y: number, w: number, h: number): string => `${arch(x, y, w, h)}Z`;
const spark = (cx: number, cy: number, s: number, o?: number): Shape => ({ layer: 'accent', w: 4, ...(o ? { o } : {}), d: `M${n(cx)} ${n(cy - s)}V${n(cy + s)}M${n(cx - s)} ${n(cy)}H${n(cx + s)}` });
/** Stairs rising to the right: `steps` steps of `sw` by `sh`, starting at the bottom-left corner (x, y). */
const stairs = (x: number, y: number, steps: number, sw: number, sh: number): string => {
  const points: Pt[] = [[x, y]];
  for (let i = 0; i < steps; i += 1) points.push([x + i * sw, y - (i + 1) * sh], [x + (i + 1) * sw, y - (i + 1) * sh]);
  return poly(points);
};

export type HeroVariant = 'cover' | 'auth' | 'ready';
export interface ArtComposition { readonly width: number; readonly height: number; readonly shapes: readonly Shape[] }

export const HERO_ART: Record<HeroVariant, ArtComposition> = {
  /** Guest cover: a doorway of nested arches with the amber light of the party inside. */
  cover: {
    width: 480, height: 240,
    shapes: [
      { layer: 'soft', d: archFill(120, 30, 240, 260) },
      { layer: 'line', w: 3, o: 0.28, d: arch(88, 6, 304, 260) },
      { layer: 'line', w: 3, o: 0.45, d: arch(150, 52, 180, 260) },
      { layer: 'line', w: 3, o: 0.8, d: arch(200, 98, 80, 260) },
      { layer: 'accentFill', d: circle(240, 132, 14) },
      spark(84, 64, 8), spark(402, 156, 6), spark(376, 40, 5, 0.7)
    ]
  },
  /** Access panels: a large D cropped by the edge, the check inside, and the steps of the weave rising. */
  auth: {
    width: 360, height: 480,
    shapes: [
      { layer: 'soft', d: dShape(70, 60, 380) },
      { layer: 'line', w: 3, o: 0.5, d: dShape(40, 30, 380) },
      { layer: 'line', w: 6, o: 0.9, d: check(210, 220, 11) },
      { layer: 'line', w: 3, o: 0.35, d: stairs(10, 470, 5, 26, 14) },
      { layer: 'accentFill', d: circle(300, 70, 12) },
      spark(70, 110, 8), spark(320, 400, 6)
    ]
  },
  /** "Ready to sell" band (wide): a silhouette of steps rising to the check seal, under an amber sun. */
  ready: {
    width: 480, height: 180,
    shapes: [
      { layer: 'soft', d: `${stairs(24, 190, 6, 64, 22)}V190Z` },
      { layer: 'line', w: 3, o: 0.55, d: stairs(24, 190, 6, 64, 22) },
      { layer: 'solid', d: circle(376, 30, 26) },
      { layer: 'knock', w: 5, d: check(376, 30, 1.9) },
      { layer: 'accentFill', d: circle(76, 58, 11) },
      spark(300, 36, 7), spark(150, 24, 5, 0.7)
    ]
  }
};

export type MomentVariant = 'confirmed' | 'published';
/** Backdrops for a milestone: static rings of light behind the check (confirmed) or an arch of rays (published). */
export const MOMENT_ART: Record<MomentVariant, ArtComposition> = {
  confirmed: {
    width: 400, height: 400,
    shapes: [
      { layer: 'soft', d: circle(200, 200, 150) },
      { layer: 'line', w: 3, o: 0.5, d: circle(200, 200, 110) },
      { layer: 'line', w: 3, o: 0.3, d: circle(200, 200, 170) },
      { layer: 'line', w: 3, o: 0.16, d: circle(200, 200, 230) },
      spark(70, 90, 8), spark(330, 70, 6, 0.7), spark(352, 300, 7), spark(50, 320, 5, 0.7)
    ]
  },
  published: {
    width: 400, height: 400,
    shapes: [
      { layer: 'soft', d: archFill(80, 60, 240, 400) },
      { layer: 'line', w: 3, o: 0.5, d: arch(60, 40, 280, 400) },
      { layer: 'line', w: 3, o: 0.3, d: arch(30, 10, 340, 400) },
      { layer: 'accent', w: 4, d: 'M200 12V-6M104 38L92 24M296 38L308 24M44 100L28 92M356 100L372 92' },
      spark(60, 220, 7), spark(340, 250, 8, 0.7)
    ]
  }
};
