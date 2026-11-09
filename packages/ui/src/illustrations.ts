import { colors, ink, tones, type ToneName } from '@rsvp/design-tokens';

/**
 * Line illustrations of DOne (minimalist system): a continuous ink line on a flat ground with ONE offset geometric shape in a
 * muted pastel from `tones`. Used only in empty states and welcomes. Thin rounded strokes on a 120-unit grid; the seal keeps the
 * check of the symbol. One data source for web and native.
 *
 * Shape vocabulary: the D (a rounded rectangle closed by a half circle), the check, the envelope, the arch (door, window,
 * invitation card). No second accent colour and no sparkles: the pastel shape is the only colour.
 */
export type IllustrationName =
  // Original set
  | 'invitation' | 'gift' | 'calendar' | 'table' | 'provider' | 'offline' | 'emptySearch' | 'success'
  // Host
  | 'guestsEmpty' | 'firstReply' | 'noGifts' | 'giftReserved' | 'published' | 'deadlineClosed' | 'welcomeHost'
  // Guest
  | 'linkExpired' | 'welcomeGuest'
  // Provider
  | 'noOffers' | 'offerPublished' | 'freeAgenda' | 'newClient' | 'verifying' | 'verified' | 'suspended' | 'welcomeProvider'
  // Admin
  | 'nothingPending' | 'importDone'
  // Access and system
  | 'noAccess' | 'searching' | 'serverError' | 'maintenance' | 'notFound';

/**
 * Semantic tone, never a hex. `ink` draws dark ink on a light ground, `onDark` draws light ink on a dark ground and `auto`
 * follows the active colour scheme (use it in screens). The pastel shape is chosen per illustration group (see `ILLUSTRATION_PASTEL`).
 */
export type IllustrationTone = 'auto' | 'ink' | 'onDark';
export type ResolvedTone = Exclude<IllustrationTone, 'auto'>;
/** `knockFill` is a small filled detail in the ground colour of its seal (the glyph inside a solid disc). */
export type Layer = 'soft' | 'line' | 'solid' | 'knock' | 'knockFill' | 'accent' | 'accentFill' | 'spark';
/** `w` overrides the stroke width (small glyphs inside seals); `o` is the opacity (patterns). */
export interface Shape { readonly d: string; readonly layer: Layer; readonly w?: number; readonly o?: number }

export type IllustrationGroup = 'host' | 'guest' | 'provider' | 'admin' | 'access' | 'system';
export const ILLUSTRATION_GROUPS: Record<IllustrationName, IllustrationGroup> = {
  invitation: 'host', gift: 'host', calendar: 'host', table: 'host', provider: 'provider', offline: 'system', emptySearch: 'system', success: 'system',
  guestsEmpty: 'host', firstReply: 'host', noGifts: 'host', giftReserved: 'host', published: 'host', deadlineClosed: 'guest', welcomeHost: 'host',
  linkExpired: 'guest', welcomeGuest: 'guest',
  noOffers: 'provider', offerPublished: 'provider', freeAgenda: 'provider', newClient: 'provider', verifying: 'provider', verified: 'provider', suspended: 'provider', welcomeProvider: 'provider',
  nothingPending: 'admin', importDone: 'admin',
  noAccess: 'access', searching: 'system', serverError: 'system', maintenance: 'system', notFound: 'system'
};
export const ILLUSTRATION_NAMES = Object.keys(ILLUSTRATION_GROUPS) as IllustrationName[];
export const ILLUSTRATION_VIEWBOX = 120;
export const ILLUSTRATION_STROKE = 3.5;
export const ILLUSTRATION_SIZES = { sm: 64, md: 104, lg: 148 } as const;

/** The pastel of each group: the one hue an illustration carries. */
export const ILLUSTRATION_PASTEL: Record<IllustrationGroup, ToneName> = { host: 'yellow', guest: 'blue', provider: 'green', admin: 'gray', access: 'red', system: 'gray' };

/**
 * Colour per layer. `soft` is the single pastel shape; every line, solid and accent is ink. `knock` is the glyph inside a
 * solid ink shape (the ground colour), so it contrasts with the ink whatever sits behind the illustration. `softEdge` is the
 * readable text colour of the pastel pair, drawn as a faint hairline so the flat pastel keeps an edge on a bone ground.
 */
export type IllustrationColors = Record<Layer | 'softEdge', string>;
export function illustrationColors(tone: ResolvedTone, pastel: ToneName): IllustrationColors {
  const dark = tone === 'onDark';
  const line = dark ? colors.dark.text : ink;
  const knock = dark ? colors.dark.canvas : colors.light.canvas;
  const pair = (dark ? tones.dark : tones.light)[pastel];
  return { soft: pair.bg, softEdge: pair.fg, line, solid: line, knock, knockFill: knock, accent: line, accentFill: line, spark: 'none' };
}
export const isFillLayer = (layer: Layer): boolean => layer === 'soft' || layer === 'solid' || layer === 'accentFill' || layer === 'knockFill';
export const resolveTone = (tone: IllustrationTone, scheme: 'light' | 'dark'): ResolvedTone => (tone === 'auto' ? (scheme === 'dark' ? 'onDark' : 'ink') : tone);

const n = (value: number): string => String(Math.round(value * 100) / 100);
export const circle = (cx: number, cy: number, r: number): string => `M${n(cx - r)} ${n(cy)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0Z`;
export const ellipse = (cx: number, cy: number, rx: number, ry: number): string => `M${n(cx - rx)} ${n(cy)}a${n(rx)} ${n(ry)} 0 1 0 ${n(2 * rx)} 0a${n(rx)} ${n(ry)} 0 1 0 ${n(-2 * rx)} 0Z`;
export const rect = (x: number, y: number, w: number, h: number, r: number): string =>
  `M${n(x + r)} ${n(y)}H${n(x + w - r)}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(r)}V${n(y + h - r)}a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(r)}H${n(x + r)}a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(-r)}V${n(y + r)}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(-r)}Z`;
type Pt = readonly [number, number];
const poly = (points: readonly Pt[], close = false): string => `M${points.map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}${close ? 'Z' : ''}`;
/** The D of the symbol: rounded left corners, a half circle on the right. 0.86 : 1 like the logo. */
export const dShape = (x: number, y: number, h: number): string => {
  const w = 0.86 * h; const r = 0.1 * h; const s = h / 2;
  return `M${n(x + r)} ${n(y)}H${n(x + w - s)}a${n(s)} ${n(s)} 0 0 1 0 ${n(h)}H${n(x + r)}a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(-r)}V${n(y + r)}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(-r)}Z`;
};
/** A card with an arched top (door, window, invitation). */
export const archCard = (x: number, y: number, w: number, h: number, r = 12): string =>
  `M${n(x)} ${n(y + h - r)}V${n(y + w / 2)}a${n(w / 2)} ${n(w / 2)} 0 0 1 ${n(w)} 0V${n(y + h - r)}a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(r)}H${n(x + r)}a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(-r)}Z`;
/** The tick of the symbol, centred on (cx, cy); `k` scales it (the seal uses 15/15 = 1). */
export const check = (cx: number, cy: number, k: number): string => poly([[cx - 7 * k, cy], [cx - 2 * k, cy + 5 * k], [cx + 7 * k, cy - 6 * k]]);
/** Sparkles of the previous identity: kept in the data so the shapes stay put, never drawn (see `ILLUSTRATIONS`). */
const spark = (cx: number, cy: number, s = 6): Shape => ({ layer: 'spark', d: `M${n(cx)} ${n(cy - s)}V${n(cy + s)}M${n(cx - s)} ${n(cy)}H${n(cx + s)}` });
/** The seal: a solid disc with the knocked-out check of the symbol. */
const seal = (cx: number, cy: number, r: number): Shape[] => {
  const k = r / 15;
  return [{ layer: 'solid', d: circle(cx, cy, r) }, { layer: 'knock', d: check(cx, cy, k) }];
};
/** The D as a mark: the outline of the D with the tick of the logo inside, all in ink line. */
const dMark = (x: number, y: number, h: number): Shape[] => [
  { layer: 'line', d: dShape(x, y, h) },
  { layer: 'line', d: check(x + 0.43 * h, y + 0.5 * h, h / 28), w: Math.max(3, h * 0.07) }
];
/** A pill whose axis runs from (x1, y1) to (x2, y2): the rounded link of a chain. */
const capsule = (x1: number, y1: number, x2: number, y2: number, r: number): string => {
  const len = Math.hypot(x2 - x1, y2 - y1); const nx = ((y2 - y1) / len) * r; const ny = (-(x2 - x1) / len) * r;
  return `M${n(x1 + nx)} ${n(y1 + ny)}L${n(x2 + nx)} ${n(y2 + ny)}A${n(r)} ${n(r)} 0 0 1 ${n(x2 - nx)} ${n(y2 - ny)}L${n(x1 - nx)} ${n(y1 - ny)}A${n(r)} ${n(r)} 0 0 1 ${n(x1 + nx)} ${n(y1 + ny)}Z`;
};
/** An arc of the circle (cx, cy, r) between two angles in degrees, clockwise on screen: a seat around a table. */
const arcAt = (cx: number, cy: number, r: number, from: number, to: number): string => {
  const at = (deg: number): string => `${n(cx + r * Math.cos((deg * Math.PI) / 180))} ${n(cy + r * Math.sin((deg * Math.PI) / 180))}`;
  return `M${at(from)}A${n(r)} ${n(r)} 0 0 1 ${at(to)}`;
};
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const quad = (a: Pt, b: Pt, c: Pt, t: number): Pt => lerp(lerp(a, b, t), lerp(b, c, t), t);
/** A pennant hanging from point `p`. */
const flag = (p: Pt, layer: 'line'): Shape => ({ layer, d: poly([[p[0] - 9, p[1] + 2], [p[0] + 9, p[1] + 2], [p[0], p[1] + 20]], true) });
const offset = (d: string, dx: number, dy: number): string => d.replace(/^M([\d.-]+) ([\d.-]+)/, (_m, x: string, y: string) => `M${n(Number(x) + dx)} ${n(Number(y) + dy)}`);

const GIFT: readonly Shape[] = [
  { layer: 'soft', d: rect(28, 60, 76, 50, 12) },
  { layer: 'line', d: rect(22, 54, 76, 50, 12) },
  { layer: 'line', d: rect(16, 40, 88, 18, 9) },
  { layer: 'line', d: 'M60 40V104' },
  { layer: 'line', d: 'M60 40C50 14 26 22 36 34C40 38 50 40 60 40ZM60 40C70 14 94 22 84 34C80 38 70 40 60 40Z' }
];
const TAG = poly([[24, 22], [58, 22], [98, 62], [62, 98], [24, 60]], true);
const VERIFY_D = { x: 24, y: 18, h: 84 };

const RAW: Record<IllustrationName, readonly Shape[]> = {
  invitation: [
    { layer: 'soft', d: rect(18, 38, 96, 68, 16) },
    { layer: 'line', d: 'M32 32V26a8 8 0 0 1 8-8H76a8 8 0 0 1 8 8V32' },
    { layer: 'line', d: rect(10, 30, 96, 68, 16) },
    { layer: 'line', d: 'M16 44L58 74L100 44' },
    ...seal(94, 90, 15),
    spark(104, 16)
  ],
  gift: [...GIFT, spark(104, 20), spark(14, 22, 4)],
  calendar: [
    { layer: 'soft', d: rect(22, 32, 88, 78, 16) },
    { layer: 'line', d: rect(16, 26, 88, 78, 16) },
    { layer: 'line', d: 'M16 50H104M40 16V34M80 16V34' },
    { layer: 'line', d: 'M42 78L54 90L80 62' },
    spark(108, 14)
  ],
  table: [
    { layer: 'soft', d: ellipse(66, 90, 44, 14) },
    { layer: 'line', d: ellipse(60, 86, 44, 14) },
    { layer: 'line', d: circle(28, 42, 10) },
    { layer: 'line', d: circle(60, 30, 11) },
    { layer: 'line', d: circle(92, 42, 10) },
    { layer: 'line', d: 'M12 70C12 56 44 56 44 70M44 60C44 48 76 48 76 60M76 70C76 56 108 56 108 70' },
    spark(104, 14, 5)
  ],
  provider: [
    { layer: 'soft', d: rect(24, 22, 84, 88, 16) },
    { layer: 'line', d: rect(16, 14, 84, 88, 16) },
    { layer: 'line', d: circle(58, 44, 13) },
    { layer: 'line', d: 'M36 78H80M44 90H72' },
    ...seal(96, 96, 15),
    spark(108, 14)
  ],
  offline: [
    { layer: 'soft', d: circle(66, 70, 44) },
    { layer: 'line', d: 'M18 52C42 30 78 30 102 52M36 70C50 57 70 57 84 70' },
    { layer: 'solid', d: circle(60, 88, 6) },
    { layer: 'accent', d: 'M26 102L94 26' }
  ],
  emptySearch: [
    { layer: 'soft', d: circle(60, 60, 34) },
    { layer: 'line', d: circle(52, 52, 32) },
    { layer: 'line', d: 'M76 76L102 102' },
    { layer: 'solid', d: `${circle(42, 46, 3.5)}${circle(62, 46, 3.5)}` },
    { layer: 'line', d: 'M42 62C48 67 56 67 62 62' },
    spark(100, 28, 5)
  ],
  success: [
    { layer: 'soft', d: circle(66, 66, 42) },
    { layer: 'line', d: circle(60, 60, 42) },
    { layer: 'line', d: 'M40 62L54 76L82 44' },
    spark(100, 16), spark(18, 26, 4), spark(106, 98, 4)
  ],

  // ---- Host ------------------------------------------------------------------------------------------------------
  /** A round table seen from above with an empty chair: the first guest goes here. */
  guestsEmpty: [
    { layer: 'soft', d: circle(66, 66, 24) },
    { layer: 'line', d: circle(60, 60, 24) },
    { layer: 'line', d: 'M60 51V69M51 60H69' },
    { layer: 'line', d: arcAt(60, 60, 42, -124, -56) },
    { layer: 'line', d: arcAt(60, 60, 42, -34, 34) },
    { layer: 'line', d: arcAt(60, 60, 42, 146, 214) },
    { layer: 'accent', d: arcAt(60, 60, 42, 56, 124) },
    spark(106, 18, 5)
  ],
  /** A speech bubble with the check: someone answered. */
  firstReply: [
    { layer: 'soft', d: rect(20, 28, 92, 58, 18) },
    { layer: 'line', d: rect(14, 22, 92, 58, 18) },
    { layer: 'line', d: 'M34 80L30 102L54 80' },
    { layer: 'line', d: check(60, 51, 2.3) },
    spark(106, 12, 6), spark(14, 12, 4)
  ],
  /** The gift box with the lid lifted and nothing inside yet. */
  noGifts: [
    { layer: 'soft', d: rect(18, 60, 76, 50, 12) },
    { layer: 'line', d: rect(12, 54, 76, 50, 12) },
    { layer: 'line', d: 'M50 54V104' },
    { layer: 'line', d: rect(28, 18, 84, 18, 9) },
    { layer: 'line', d: 'M70 18V36' },
    spark(18, 30, 6)
  ],
  /** The gift with the seal: someone reserved it. */
  giftReserved: [...GIFT, ...seal(96, 92, 16), spark(104, 14), spark(14, 22, 4)],
  /** An arched invitation card with the D on it, and the light of "it is out". */
  published: [
    { layer: 'soft', d: archCard(34, 18, 64, 92) },
    { layer: 'line', d: archCard(28, 12, 64, 92) },
    ...dMark(46, 38, 34),
    { layer: 'line', d: 'M44 88H76M52 97H68' },
    spark(106, 16, 6), spark(12, 40, 4)
  ],
  /** A clock with the lock: the deadline passed. */
  deadlineClosed: [
    { layer: 'soft', d: circle(58, 62, 38) },
    { layer: 'line', d: circle(52, 56, 38) },
    { layer: 'line', d: 'M52 56V34M52 56L68 66' },
    { layer: 'line', d: 'M52 22V26M52 86V90M18 56H22M82 56H86' },
    { layer: 'solid', d: circle(92, 92, 17) },
    { layer: 'knockFill', d: rect(85.5, 91, 13, 10, 2.5) },
    { layer: 'knock', w: 3, d: 'M88.5 91V88a3.5 3.5 0 0 1 7 0V91' },
    spark(100, 18, 6)
  ],
  /** Garland, then the D: the host's welcome. */
  welcomeHost: ((): readonly Shape[] => {
    const a: Pt = [6, 10]; const b: Pt = [60, 34]; const c: Pt = [114, 10];
    const at = (t: number): Pt => quad(a, b, c, t);
    return [
      { layer: 'line', d: `M${a[0]} ${a[1]}Q${b[0]} ${b[1]} ${c[0]} ${c[1]}` },
      flag(at(0.16), 'line'), flag(at(0.38), 'line'), flag(at(0.62), 'line'), flag(at(0.84), 'line'),
      { layer: 'soft', d: dShape(44, 54, 56) },
      ...dMark(35.9, 48, 56)
    ];
  })(),

  // ---- Guest -----------------------------------------------------------------------------------------------------
  /** A chain whose links came apart: the link no longer works. */
  linkExpired: [
    { layer: 'soft', d: capsule(24, 106, 50, 80, 14) + capsule(82, 52, 108, 26, 14) },
    { layer: 'line', d: capsule(18, 100, 44, 74, 14) },
    { layer: 'line', d: capsule(76, 46, 102, 20, 14) },
    { layer: 'accent', d: 'M52 52L68 68' },
    spark(100, 82, 5), spark(18, 30, 4)
  ],
  /** The invitation rising out of its envelope for a guest who just arrived. */
  welcomeGuest: [
    { layer: 'soft', d: 'M16 62V100a8 8 0 0 0 8 8H104a8 8 0 0 0 8-8V62Z' },
    { layer: 'line', d: 'M32 67V26a10 10 0 0 1 10-10H78a10 10 0 0 1 10 10V67' },
    { layer: 'line', d: check(60, 38, 2) },
    { layer: 'line', d: 'M10 54L60 84L110 54V96a10 10 0 0 1-10 10H20a10 10 0 0 1-10-10Z' },
    spark(104, 14, 6), spark(16, 24, 4)
  ],

  // ---- Provider --------------------------------------------------------------------------------------------------
  /** A price tag with nothing on it yet. */
  noOffers: [
    { layer: 'soft', d: offset(TAG, 6, 6) },
    { layer: 'line', d: TAG },
    { layer: 'line', d: circle(41, 39, 5) },
    spark(62, 58, 8)
  ],
  /** The tag with the seal: the offer is live. */
  offerPublished: [
    { layer: 'soft', d: offset(TAG, 6, 6) },
    { layer: 'line', d: TAG },
    { layer: 'line', d: circle(41, 39, 5) },
    ...seal(92, 90, 16),
    spark(104, 24, 5)
  ],
  /** An open calendar: free days, and the spot for the first booking. */
  freeAgenda: [
    { layer: 'soft', d: rect(22, 32, 88, 78, 16) },
    { layer: 'line', d: rect(16, 26, 88, 78, 16) },
    { layer: 'line', d: 'M16 50H104M40 16V34M80 16V34' },
    { layer: 'solid', d: [[36, 68], [60, 68], [84, 68], [36, 86], [60, 86]].map(([x, y]) => circle(x!, y!, 3.5)).join('') },
    { layer: 'line', d: circle(84, 86, 6) }
  ],
  /** A person with the plus: a new client. */
  newClient: [
    { layer: 'soft', d: circle(62, 40, 17) },
    { layer: 'line', d: circle(56, 34, 17) },
    { layer: 'line', d: 'M20 104C20 78 38 66 56 66C74 66 92 78 92 104' },
    { layer: 'solid', d: circle(94, 40, 16) },
    { layer: 'knock', w: 4, d: 'M94 32V48M86 40H102' },
    spark(104, 82, 5)
  ],
  /** The D drawn halfway: the check is on its way. */
  verifying: ((): readonly Shape[] => {
    const { x, y, h } = VERIFY_D; const k = h / 28;
    const cx = x + 0.43 * h; const cy = y + 0.5 * h;
    // The three points of the check (see `check`), so the dots follow the second leg that is still to be drawn.
    const p0: Pt = [cx - 7 * k, cy]; const p1: Pt = [cx - 2 * k, cy + 5 * k]; const p2: Pt = [cx + 7 * k, cy - 6 * k];
    const dots = [0.3, 0.58, 0.86].map((t) => lerp(p1, p2, t));
    return [
      { layer: 'soft', d: dShape(x + 6, y + 6, h) },
      { layer: 'line', d: dShape(x, y, h) },
      { layer: 'line', w: 7, d: poly([p0, p1]) },
      { layer: 'line', d: dots.map(([dx, dy]) => circle(dx, dy, 3.6)).join('') }
    ];
  })(),
  /** The D, solid, with the check knocked out: verified. */
  verified: [
    { layer: 'soft', d: dShape(VERIFY_D.x + 8, VERIFY_D.y + 8, VERIFY_D.h) },
    ...dMark(VERIFY_D.x, VERIFY_D.y, VERIFY_D.h),
    spark(106, 14, 6), spark(12, 100, 4)
  ],
  /** Paused: a quiet circle with two bars. Sober, nothing alarming. */
  suspended: [
    { layer: 'soft', d: circle(60, 60, 38) },
    { layer: 'line', d: circle(54, 54, 38) },
    { layer: 'line', d: 'M44 40V68M64 40V68' },
    { layer: 'line', d: circle(100, 20, 4.5) }
  ],
  /** The stall: awning and counter. */
  welcomeProvider: [
    { layer: 'line', d: 'M40 14H60V38a12 12 0 0 1-24 0Z' },
    { layer: 'soft', d: rect(24, 64, 84, 44, 10) },
    { layer: 'line', d: 'M20 14H100L108 38H12Z' },
    { layer: 'line', d: 'M12 38a12 12 0 0 0 24 0a12 12 0 0 0 24 0a12 12 0 0 0 24 0a12 12 0 0 0 24 0' },
    { layer: 'line', d: 'M40 14L36 38M60 14V38M80 14L84 38' },
    { layer: 'line', d: 'M18 64V96a8 8 0 0 0 8 8H94a8 8 0 0 0 8-8V64' },
    ...seal(60, 84, 14),
    spark(110, 12, 5)
  ],

  // ---- Admin -----------------------------------------------------------------------------------------------------
  /** An inbox with the check above it: all caught up. */
  nothingPending: [
    { layer: 'soft', d: 'M18 80L32 52H100L114 80V102a8 8 0 0 1-8 8H26a8 8 0 0 1-8-8Z' },
    { layer: 'line', d: 'M12 74L26 46H94L108 74V96a8 8 0 0 1-8 8H20a8 8 0 0 1-8-8Z' },
    { layer: 'line', d: 'M12 74H42a18 18 0 0 0 36 0H108' },
    { layer: 'line', d: check(60, 24, 2.2) },
    spark(104, 18, 6)
  ],
  /** A sheet of people with the seal: the import finished. */
  importDone: [
    { layer: 'soft', d: rect(24, 18, 66, 88, 12) },
    { layer: 'line', d: rect(18, 12, 66, 88, 12) },
    { layer: 'line', d: circle(36, 36, 6.5) }, { layer: 'line', d: 'M50 36H70' },
    { layer: 'line', d: circle(36, 58, 6.5) }, { layer: 'line', d: 'M50 58H70' },
    { layer: 'line', d: circle(36, 80, 6.5) }, { layer: 'line', d: 'M50 80H62' },
    ...seal(88, 92, 17)
  ],

  // ---- Access and system -----------------------------------------------------------------------------------------
  /** A closed padlock with a keyhole: you do not have access here. */
  noAccess: [
    { layer: 'soft', d: rect(32, 56, 68, 54, 14) },
    { layer: 'line', d: rect(26, 50, 68, 54, 14) },
    { layer: 'line', d: 'M40 50V38a20 20 0 0 1 40 0V50' },
    { layer: 'line', d: circle(60, 74, 7) },
    { layer: 'line', d: 'M60 78V90' },
    spark(104, 20, 6)
  ],
  /** A lens over a person: looking for someone. */
  searching: [
    { layer: 'soft', d: circle(56, 56, 32) },
    { layer: 'line', d: circle(50, 50, 32) },
    { layer: 'line', d: circle(50, 42, 8) },
    { layer: 'line', d: 'M34 68C36 57 64 57 66 68' },
    { layer: 'line', d: 'M74 74L102 102' },
    { layer: 'accent', d: 'M30 36A22 22 0 0 1 38 28' },
    spark(100, 24, 5)
  ],
  /** Two server units and a crack between them. */
  serverError: [
    { layer: 'soft', d: rect(24, 20, 84, 30, 10) + rect(24, 76, 84, 30, 10) },
    { layer: 'line', d: rect(18, 14, 84, 30, 10) },
    { layer: 'line', d: rect(18, 70, 84, 30, 10) },
    { layer: 'solid', d: circle(34, 29, 3.5) }, { layer: 'line', d: 'M50 29H84' },
    { layer: 'solid', d: circle(34, 85, 3.5) }, { layer: 'line', d: 'M50 85H72' },
    { layer: 'accent', d: 'M62 44L54 53L66 60L58 70' }
  ],
  /** A traffic cone with two stripes: back soon. */
  maintenance: [
    { layer: 'soft', d: poly([[58, 20], [74, 20], [96, 104], [36, 104]], true) },
    { layer: 'line', d: poly([[52, 14], [68, 14], [90, 98], [30, 98]], true) },
    { layer: 'line', d: rect(20, 98, 80, 12, 6) },
    { layer: 'accent', d: 'M47 48H73M40 74H80' }
  ],
  /** A compass that lost the north: the page is not here. */
  notFound: [
    { layer: 'soft', d: circle(64, 64, 40) },
    { layer: 'line', d: circle(58, 58, 40) },
    { layer: 'line', d: 'M58 22V27M58 89V94M22 58H27M89 58H94' },
    { layer: 'line', d: poly([[58, 30], [70, 58], [46, 58]], true) },
    { layer: 'line', d: poly([[46, 58], [58, 86], [70, 58]]) },
    { layer: 'solid', d: circle(58, 58, 3) }
  ]
};

/** The shapes of each illustration, without the sparkles. */
export const ILLUSTRATIONS = Object.fromEntries(
  (Object.entries(RAW) as [IllustrationName, readonly Shape[]][]).map(([name, shapes]) => [name, shapes.filter((shape) => shape.layer !== 'spark')])
) as unknown as Record<IllustrationName, readonly Shape[]>;
