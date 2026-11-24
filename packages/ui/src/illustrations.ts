import { colors, illustrationTokens, ink, tones, type ToneName } from '@rsvp/design-tokens';

/**
 * Illustrations of DOne, drawn as small scenes: a stone disc, a flat contact shadow, the object as a filled ink figure and
 * ONE accent piece in a muted pastel from `tones` (the group's). The construction follows the "paper, ink and a single
 * light" drawing style; the colours are DOne's own tokens and nothing else. Used in empty states, welcomes, friendly errors
 * and milestones. One data source for web and native, on a 120-unit grid.
 *
 * Shape vocabulary: the D (a rounded rectangle closed by a half circle), the check, the envelope, the arch (door, window,
 * invitation card). No outlines around the figure, no gradients, no blur, no sparkles: the pastel piece is the only colour.
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
  | 'noAccess' | 'searching' | 'serverError' | 'maintenance' | 'notFound'
  // Public home (site and web app): the promise and the three taps
  | 'landingSend' | 'landingCreate' | 'landingShare' | 'landingReplies';

/**
 * Semantic tone, never a hex. `ink` draws dark ink on a light ground, `onDark` draws light ink on a dark ground and `auto`
 * follows the active colour scheme (use it in screens). The pastel shape is chosen per illustration group (see `ILLUSTRATION_PASTEL`).
 */
export type IllustrationTone = 'auto' | 'ink' | 'onDark';
export type ResolvedTone = Exclude<IllustrationTone, 'auto'>;
/** `knockFill` is a small filled detail in the ground colour of its seal (the glyph inside a solid disc). */
export type Layer = 'ground' | 'shadow' | 'stone' | 'soft' | 'line' | 'solid' | 'knock' | 'knockFill' | 'accent' | 'accentFill' | 'spark';
/** `w` overrides the stroke width (small glyphs inside seals); `o` is the opacity (patterns). */
export interface Shape { readonly d: string; readonly layer: Layer; readonly w?: number; readonly o?: number }

export type IllustrationGroup = 'host' | 'guest' | 'provider' | 'admin' | 'access' | 'system';
export const ILLUSTRATION_GROUPS: Record<IllustrationName, IllustrationGroup> = {
  invitation: 'host', gift: 'host', calendar: 'host', table: 'host', provider: 'provider', offline: 'system', emptySearch: 'system', success: 'system',
  guestsEmpty: 'host', firstReply: 'host', noGifts: 'host', giftReserved: 'host', published: 'host', deadlineClosed: 'guest', welcomeHost: 'host',
  linkExpired: 'guest', welcomeGuest: 'guest',
  noOffers: 'provider', offerPublished: 'provider', freeAgenda: 'provider', newClient: 'provider', verifying: 'provider', verified: 'provider', suspended: 'provider', welcomeProvider: 'provider',
  nothingPending: 'admin', importDone: 'admin',
  noAccess: 'access', searching: 'system', serverError: 'system', maintenance: 'system', notFound: 'system',
  landingSend: 'guest', landingCreate: 'host', landingShare: 'guest', landingReplies: 'host'
};
export const ILLUSTRATION_NAMES = Object.keys(ILLUSTRATION_GROUPS) as IllustrationName[];
export const ILLUSTRATION_VIEWBOX = 120;
export const ILLUSTRATION_STROKE = 3.5;
export const ILLUSTRATION_SIZES = { sm: 64, md: 104, lg: 148 } as const;

/** The pastel of each group: the one hue an illustration carries. */
export const ILLUSTRATION_PASTEL: Record<IllustrationGroup, ToneName> = { host: 'yellow', guest: 'blue', provider: 'green', admin: 'gray', access: 'red', system: 'gray' };

/**
 * Colour per layer, all from DOne's tokens. `ground` is the stone disc behind the scene, `shadow` the flat contact shadow
 * under the object and `stone` the secondary pieces of the figure: the roles of `illustrationTokens` (@rsvp/design-tokens),
 * resolved in the active scheme and shared with the public site's `.art__*` classes. `soft` is the single pastel piece; every line, solid and accent is ink. `knock` is the glyph inside a
 * solid ink shape (the ground colour), so it contrasts with the ink whatever sits behind the illustration. `softEdge` is the
 * readable text colour of the pastel pair, drawn as a faint hairline so the flat pastel keeps an edge on a bone ground.
 */
export type IllustrationColors = Record<Layer | 'softEdge', string>;
export function illustrationColors(tone: ResolvedTone, pastel: ToneName): IllustrationColors {
  const dark = tone === 'onDark';
  const line = dark ? colors.dark.text : ink;
  const knock = dark ? colors.dark.canvas : colors.light.canvas;
  const pair = (dark ? tones.dark : tones.light)[pastel];
  const scheme = dark ? colors.dark : colors.light;
  return {
    ground: scheme[illustrationTokens.ground], shadow: scheme[illustrationTokens.shadow], stone: scheme[illustrationTokens.stone],
    soft: pair.bg, softEdge: pair.fg, line, solid: line, knock, knockFill: knock, accent: line, accentFill: line, spark: 'none'
  };
}
export const isFillLayer = (layer: Layer): boolean => layer === 'ground' || layer === 'shadow' || layer === 'stone' || layer === 'soft' || layer === 'solid' || layer === 'accentFill' || layer === 'knockFill';
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
/** A pill whose axis runs from (x1, y1) to (x2, y2): the rounded link of a chain. */
const capsule = (x1: number, y1: number, x2: number, y2: number, r: number): string => {
  const len = Math.hypot(x2 - x1, y2 - y1); const nx = ((y2 - y1) / len) * r; const ny = (-(x2 - x1) / len) * r;
  return `M${n(x1 + nx)} ${n(y1 + ny)}L${n(x2 + nx)} ${n(y2 + ny)}A${n(r)} ${n(r)} 0 0 1 ${n(x2 - nx)} ${n(y2 - ny)}L${n(x1 - nx)} ${n(y1 - ny)}A${n(r)} ${n(r)} 0 0 1 ${n(x1 + nx)} ${n(y1 + ny)}Z`;
};
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const quad = (a: Pt, b: Pt, c: Pt, t: number): Pt => lerp(lerp(a, b, t), lerp(b, c, t), t);

/**
 * Every drawing is staged the same way (the grammar of the scene): a stone disc behind (`ground`), a flat contact shadow
 * under the object (`shadow`), the object as a filled ink figure (`solid`, details knocked out in the ground colour,
 * secondary pieces in `stone`) and ONE accent piece in the group pastel (`soft`). One idea per drawing; no outlines around
 * the figure, no gradients, no blur.
 */
const stage = (shadowRx = 32, shadowY = 99): Shape[] => [
  { layer: 'ground', d: circle(60, 56, 46) },
  { layer: 'shadow', d: ellipse(60, shadowY, shadowRx, 5) }
];
/** A solid disc with the tick knocked out (the seal of the symbol), with a ground-coloured halo so it reads over the figure. */
const seal = (cx: number, cy: number, r: number): Shape[] => [
  { layer: 'knockFill', d: circle(cx, cy, r + 3) },
  { layer: 'solid', d: circle(cx, cy, r) },
  { layer: 'knock', w: 3.5, d: check(cx, cy, r / 15) }
];
/** The pastel badge with an ink tick: the accent of the "done" drawings. */
const badge = (cx: number, cy: number, r: number): Shape[] => [
  { layer: 'knockFill', d: circle(cx, cy, r + 3) },
  { layer: 'soft', d: circle(cx, cy, r) },
  { layer: 'line', w: 3, d: check(cx, cy, r / 14) }
];
/** The bow of the gift, moved `dx` to the side. */
const bow = (dx: number): string => {
  const x = (value: number): string => n(value + dx);
  return `M${x(60)} 44C${x(52)} 26 ${x(36)} 30 ${x(42)} 40C${x(45)} 44 ${x(52)} 44 ${x(60)} 44ZM${x(60)} 44C${x(68)} 26 ${x(84)} 30 ${x(78)} 40C${x(75)} 44 ${x(68)} 44 ${x(60)} 44Z`;
};
/** The gift: an ink box and lid, the ribbon and bow are the pastel light. */
const gift = (dx: number): Shape[] => [
  { layer: 'solid', d: rect(30 + dx, 56, 60, 42, 8) },
  { layer: 'solid', d: rect(26 + dx, 44, 68, 14, 6) },
  { layer: 'knock', w: 2.5, d: `M${30 + dx} 58H${90 + dx}` },
  { layer: 'soft', d: rect(55 + dx, 44, 10, 54, 2) + bow(dx) },
  { layer: 'line', w: 2.5, d: bow(dx) }
];
const TAG = poly([[30, 30], [62, 30], [96, 64], [64, 96], [30, 62]], true);
/** The calendar body shared by `calendar` and `freeAgenda`. */
const calendarBody: Shape[] = [
  { layer: 'solid', d: rect(28, 34, 64, 62, 10) },
  { layer: 'line', w: 5, d: 'M44 26V40M76 26V40' },
  { layer: 'knock', w: 3, d: 'M28 50H92' },
  { layer: 'knockFill', d: [[40, 62], [52, 62], [64, 62], [76, 62], [40, 78], [52, 78]].map(([x, y]) => circle(x!, y!, 3.2)).join('') }
];
const D = { x: 32, y: 26, h: 68 };
const dTick = (x: number, y: number, h: number, w = 6): Shape => ({ layer: 'knock', w, d: check(x + 0.43 * h, y + 0.5 * h, h / 28) });
/** Magnifier: an ink ring with a pastel glass and a handle. */
const lens: Shape[] = [
  { layer: 'solid', d: capsule(68, 68, 88, 88, 6.5) },
  { layer: 'solid', d: circle(52, 52, 26) },
  { layer: 'soft', d: circle(52, 52, 18) }
];

const RAW: Record<IllustrationName, readonly Shape[]> = {
  /** An envelope with the card peeking out and a pastel wax seal. */
  invitation: [
    ...stage(),
    { layer: 'stone', d: rect(34, 24, 52, 40, 6) },
    { layer: 'line', w: 3, d: 'M44 36H76M44 46H66' },
    { layer: 'solid', d: rect(24, 50, 72, 48, 8) },
    { layer: 'knock', w: 3, d: 'M28 56L60 78L92 56' },
    { layer: 'knockFill', d: circle(60, 78, 12) },
    { layer: 'soft', d: circle(60, 78, 9) },
    { layer: 'line', w: 2.5, d: check(60, 78, 0.65) }
  ],
  gift: [...stage(), ...gift(0)],
  calendar: [
    ...stage(),
    ...calendarBody,
    { layer: 'soft', d: rect(66, 70, 18, 16, 4) },
    { layer: 'line', w: 2.5, d: check(75, 78, 0.7) }
  ],
  /** A round table seen from the side, two chairs and the centrepiece. */
  table: [
    ...stage(38),
    { layer: 'stone', d: rect(16, 52, 14, 46, 4) + rect(90, 52, 14, 46, 4) },
    { layer: 'solid', d: rect(56, 64, 8, 34, 3) },
    { layer: 'solid', d: rect(38, 94, 44, 6, 3) },
    { layer: 'solid', d: ellipse(60, 64, 36, 9) },
    { layer: 'line', w: 3, d: 'M60 53V44' },
    { layer: 'soft', d: circle(60, 40, 7) }
  ],
  /** The provider's card: avatar, two lines and the verified seal. */
  provider: [
    ...stage(),
    { layer: 'solid', d: rect(32, 24, 56, 74, 10) },
    { layer: 'knock', w: 3, d: circle(60, 46, 9) },
    { layer: 'knock', w: 3, d: 'M46 70H74M50 80H70' },
    ...badge(86, 88, 12)
  ],
  /** The signal arcs and a pastel bar across them. */
  offline: [
    ...stage(24),
    { layer: 'line', w: 7, d: 'M28 54C46 36 74 36 92 54M40 68C52 57 68 57 80 68' },
    { layer: 'solid', d: circle(60, 84, 7) },
    { layer: 'knockFill', d: capsule(32, 94, 90, 30, 7) },
    { layer: 'soft', d: capsule(32, 94, 90, 30, 4.5) }
  ],
  /** A magnifier with a pastel glass that found nothing. */
  emptySearch: [
    ...stage(26),
    ...lens,
    { layer: 'line', w: 3, d: 'M44 58C48 54 56 54 60 58' },
    { layer: 'solid', d: circle(45, 48, 2.6) + circle(59, 48, 2.6) }
  ],
  /** The ink disc with the tick and pastel confetti. */
  success: [
    ...stage(26),
    { layer: 'solid', d: circle(60, 56, 30) },
    { layer: 'knock', w: 6, d: check(60, 56, 2) },
    { layer: 'soft', d: rect(18, 28, 9, 9, 2) + rect(94, 34, 9, 9, 2) + circle(98, 80, 4.5) + circle(22, 76, 4.5) + rect(76, 14, 7, 7, 2) }
  ],

  // ---- Host ------------------------------------------------------------------------------------------------------
  /** A table from above, chairs taken in stone and the empty one in pastel: the first guest goes here. */
  guestsEmpty: [
    ...stage(20, 100),
    { layer: 'stone', d: circle(60, 24, 8) + circle(92, 56, 8) + circle(28, 56, 8) },
    { layer: 'solid', d: circle(60, 56, 22) },
    { layer: 'knock', w: 3.5, d: 'M60 48V64M52 56H68' },
    { layer: 'soft', d: circle(60, 88, 8) }
  ],
  /** A speech bubble with the tick and a pastel dot: someone answered. */
  firstReply: [
    ...stage(),
    { layer: 'solid', d: rect(22, 30, 72, 50, 16) },
    { layer: 'solid', d: poly([[36, 76], [32, 96], [56, 78]], true) },
    { layer: 'knock', w: 5, d: check(58, 55, 1.9) },
    { layer: 'knockFill', d: circle(92, 32, 13) },
    { layer: 'soft', d: circle(92, 32, 10) }
  ],
  /** The gift box with the lid lifted and nothing inside yet. */
  noGifts: [
    ...stage(),
    { layer: 'solid', d: rect(28, 60, 64, 38, 8) },
    { layer: 'stone', d: rect(32, 60, 56, 8, 3) },
    { layer: 'solid', d: 'M30 46L86 30L90 42L34 58Z' },
    { layer: 'soft', d: poly([[55, 38.8], [61, 37.1], [65, 49.1], [59, 50.8]], true) }
  ],
  /** The gift with the seal: someone reserved it. */
  giftReserved: [...stage(), ...gift(-6), ...seal(88, 86, 12)],
  /** An arched invitation with the D, and the pastel light of "it is out". */
  published: [
    ...stage(),
    { layer: 'soft', d: circle(86, 28, 11) },
    { layer: 'line', w: 3, d: 'M100 18L105 13M102 32H109' },
    { layer: 'solid', d: archCard(34, 22, 52, 76) },
    { layer: 'knock', w: 3.5, d: dShape(47, 50, 28) },
    dTick(47, 50, 28, 3.5)
  ],
  /** A clock with the pastel padlock: the deadline passed. */
  deadlineClosed: [
    ...stage(),
    { layer: 'solid', d: circle(54, 56, 32) },
    { layer: 'knock', w: 4, d: 'M54 56V38M54 56L68 64' },
    { layer: 'knock', w: 3, d: 'M54 30V33M54 79V82M28 56H31M77 56H80' },
    { layer: 'line', w: 4, d: 'M82 76V70a7 7 0 0 1 14 0V76' },
    { layer: 'knockFill', d: rect(73, 73, 32, 27, 7) },
    { layer: 'soft', d: rect(76, 76, 26, 21, 5) },
    { layer: 'solid', d: circle(89, 85, 2.6) }
  ],
  /** Garland, then the D: the host's welcome. */
  welcomeHost: ((): readonly Shape[] => {
    const a: Pt = [10, 14]; const b: Pt = [60, 36]; const c: Pt = [110, 14];
    const at = (t: number): Pt => quad(a, b, c, t);
    const flagAt = (t: number): string => { const p = at(t); return poly([[p[0] - 8, p[1] + 1], [p[0] + 8, p[1] + 1], [p[0], p[1] + 17]], true); };
    return [
      ...stage(28),
      { layer: 'line', w: 3, d: `M${a[0]} ${a[1]}Q${b[0]} ${b[1]} ${c[0]} ${c[1]}` },
      { layer: 'solid', d: flagAt(0.14) + flagAt(0.5) + flagAt(0.86) },
      { layer: 'soft', d: flagAt(0.32) + flagAt(0.68) },
      { layer: 'solid', d: dShape(36, 46, 52) },
      dTick(36, 46, 52, 5)
    ];
  })(),

  // ---- Guest -----------------------------------------------------------------------------------------------------
  /** A chain whose links came apart, with a pastel light in the gap. */
  linkExpired: [
    ...stage(),
    { layer: 'solid', d: capsule(28, 90, 48, 70, 13) },
    { layer: 'knockFill', d: capsule(28, 90, 48, 70, 5.5) },
    { layer: 'solid', d: capsule(72, 46, 92, 26, 13) },
    { layer: 'knockFill', d: capsule(72, 46, 92, 26, 5.5) },
    { layer: 'soft', d: circle(60, 58, 7) }
  ],
  /** The pastel invitation rising out of its ink envelope for a guest who just arrived. */
  welcomeGuest: [
    ...stage(),
    { layer: 'stone', d: rect(24, 52, 72, 46, 6) },
    { layer: 'soft', d: rect(36, 22, 48, 54, 6) },
    { layer: 'line', w: 3, d: check(60, 40, 1.5) },
    { layer: 'solid', d: 'M24 56L60 78L96 56V92a6 6 0 0 1-6 6H30a6 6 0 0 1-6-6Z' }
  ],

  // ---- Provider --------------------------------------------------------------------------------------------------
  /** A price tag on its string, the price still blank in pastel. */
  noOffers: [
    ...stage(),
    { layer: 'line', w: 3, d: 'M42 40C34 24 48 12 58 20' },
    { layer: 'solid', d: TAG },
    { layer: 'knockFill', d: circle(42, 42, 5) },
    { layer: 'soft', d: poly([[56, 62], [70, 48], [80, 58], [66, 72]], true) }
  ],
  /** The tag with the pastel badge: the offer is live. */
  offerPublished: [
    ...stage(),
    { layer: 'line', w: 3, d: 'M42 40C34 24 48 12 58 20' },
    { layer: 'solid', d: TAG },
    { layer: 'knockFill', d: circle(42, 42, 5) },
    ...badge(86, 86, 12)
  ],
  /** An open calendar: free days, and the pastel spot for the first booking. */
  freeAgenda: [
    ...stage(),
    ...calendarBody,
    { layer: 'soft', d: rect(66, 70, 18, 16, 4) },
    { layer: 'line', w: 2.5, d: 'M75 73V83M70 78H80' }
  ],
  /** A person and the pastel plus: a new client (no face, only the shape). */
  newClient: [
    ...stage(28),
    { layer: 'solid', d: circle(50, 40, 14) },
    { layer: 'solid', d: 'M22 98C22 74 36 62 50 62C64 62 78 74 78 98Z' },
    { layer: 'knockFill', d: circle(88, 46, 15) },
    { layer: 'soft', d: circle(88, 46, 12) },
    { layer: 'line', w: 3, d: 'M88 40V52M82 46H94' }
  ],
  /** The D with the first leg of the tick, the rest in pastel dots on its way. */
  verifying: ((): readonly Shape[] => {
    const { x, y, h } = D; const k = h / 28;
    const cx = x + 0.43 * h; const cy = y + 0.5 * h;
    const p0: Pt = [cx - 7 * k, cy]; const p1: Pt = [cx - 2 * k, cy + 5 * k]; const p2: Pt = [cx + 7 * k, cy - 6 * k];
    const dots = [0.3, 0.6, 0.9].map((t) => lerp(p1, p2, t));
    return [
      ...stage(28),
      { layer: 'solid', d: dShape(x, y, h) },
      { layer: 'knock', w: 7, d: poly([p0, p1]) },
      { layer: 'soft', d: dots.map(([dx, dy]) => circle(dx, dy, 4.8)).join('') }
    ];
  })(),
  /** The solid D with the tick knocked out, and its pastel light: verified. */
  verified: [
    ...stage(28),
    { layer: 'soft', d: circle(90, 28, 10) },
    { layer: 'line', w: 3, d: 'M104 18L108 14M106 30H112' },
    { layer: 'solid', d: dShape(D.x, D.y, D.h) },
    dTick(D.x, D.y, D.h, 7)
  ],
  /** Paused: an ink disc with two bars and a quiet pastel moon. */
  suspended: [
    ...stage(26),
    { layer: 'soft', d: circle(90, 26, 9) },
    { layer: 'solid', d: circle(58, 58, 30) },
    { layer: 'knock', w: 7, d: 'M49 46V70M67 46V70' }
  ],
  /** The stall: pastel awning, ink counter with the tick. */
  welcomeProvider: [
    ...stage(36),
    { layer: 'line', w: 4, d: 'M28 42V60M92 42V60' },
    { layer: 'solid', d: rect(24, 58, 72, 40, 6) },
    { layer: 'knock', w: 4, d: check(60, 78, 1.5) },
    { layer: 'soft', d: 'M28 22H92L102 42a7 7 0 0 1-14 0a7 7 0 0 1-14 0a7 7 0 0 1-14 0a7 7 0 0 1-14 0a7 7 0 0 1-14 0a7 7 0 0 1-14 0Z' },
    { layer: 'line', w: 2.5, d: 'M48 22L45 42M60 22V42M72 22L75 42' }
  ],

  // ---- Admin -----------------------------------------------------------------------------------------------------
  /** An inbox tray with the pastel tick above it: all caught up. */
  nothingPending: [
    ...stage(36),
    { layer: 'solid', d: 'M24 72L34 52H86L96 72V92a6 6 0 0 1-6 6H30a6 6 0 0 1-6-6Z' },
    { layer: 'knock', w: 3.5, d: 'M24 72H44a16 16 0 0 0 32 0H96' },
    ...badge(60, 30, 12)
  ],
  /** A sheet of people with the seal: the import finished. */
  importDone: [
    ...stage(),
    { layer: 'solid', d: rect(28, 20, 56, 78, 8) },
    { layer: 'knock', w: 3, d: `${circle(42, 38, 5)}M54 38H72${circle(42, 58, 5)}M54 58H72${circle(42, 78, 5)}M54 78H64` },
    ...badge(86, 86, 12)
  ],

  // ---- Access and system -----------------------------------------------------------------------------------------
  /** A closed padlock with a pastel keyhole: you do not have access here. */
  noAccess: [
    ...stage(30),
    { layer: 'line', w: 8, d: 'M44 54V42a16 16 0 0 1 32 0V54' },
    { layer: 'solid', d: rect(30, 52, 60, 46, 10) },
    { layer: 'soft', d: circle(60, 70, 6) + rect(57, 72, 6, 14, 3) }
  ],
  /** A magnifier over a person: looking for someone. */
  searching: [
    ...stage(26),
    ...lens,
    { layer: 'line', w: 2.5, d: `${circle(52, 46, 5)}M42 64C44 55 60 55 62 64` }
  ],
  /** Two server units and a pastel crack between them. */
  serverError: [
    ...stage(),
    { layer: 'solid', d: rect(28, 24, 64, 28, 8) },
    { layer: 'solid', d: rect(28, 70, 64, 28, 8) },
    { layer: 'knockFill', d: circle(40, 38, 3.5) + circle(40, 84, 3.5) },
    { layer: 'knock', w: 3, d: 'M52 38H80M52 84H72' },
    { layer: 'soft', d: poly([[64, 50], [54, 62], [63, 63], [56, 74], [70, 59], [61, 58], [68, 50]], true) }
  ],
  /** A traffic cone with pastel stripes: back soon. */
  maintenance: [
    ...stage(),
    { layer: 'solid', d: poly([[54, 24], [66, 24], [84, 90], [36, 90]], true) },
    { layer: 'solid', d: rect(26, 88, 68, 10, 4) },
    { layer: 'soft', d: poly([[48.5, 44], [71.5, 44], [73.6, 52], [46.4, 52]], true) + poly([[43.1, 64], [76.9, 64], [79.1, 72], [40.9, 72]], true) }
  ],
  /** A compass whose pastel needle lost the north: the page is not here. */
  notFound: [
    ...stage(26),
    { layer: 'solid', d: circle(60, 58, 32) },
    { layer: 'knock', w: 2, d: circle(60, 58, 25) },
    { layer: 'soft', d: poly([[72, 40], [64, 61], [56, 55]], true) },
    { layer: 'knockFill', d: poly([[56, 55], [48, 76], [64, 61]], true) },
    { layer: 'solid', d: circle(60, 58, 3) }
  ],

  // ---- Public home (site `landing.tsx` and web app `landing-screen.tsx`, the same drawings) -------------------------
  /** The promise: a paper plane on its way, its pastel trail behind it. */
  landingSend: [
    ...stage(24),
    { layer: 'stone', d: poly([[100, 24], [52, 64], [62, 90]], true) },
    { layer: 'solid', d: poly([[100, 24], [16, 52], [52, 64]], true) },
    { layer: 'solid', d: poly([[52, 64], [48, 80], [60, 72]], true) },
    { layer: 'knock', w: 2.5, d: 'M100 24L52 64' },
    { layer: 'soft', d: circle(36, 80, 5.5) + circle(25, 88, 4.5) + circle(16, 95, 3.5) }
  ],
  /** Step one, create: the arched invitation with its lines and the pastel pencil that writes it. */
  landingCreate: [
    ...stage(30),
    { layer: 'solid', d: archCard(26, 22, 50, 76, 10) },
    { layer: 'knock', w: 3, d: circle(51, 48, 6) },
    { layer: 'knock', w: 3, d: 'M38 66H64M42 76H60' },
    { layer: 'knockFill', d: capsule(98, 30, 72, 76, 9) },
    { layer: 'soft', d: capsule(98, 30, 72, 76, 6) },
    { layer: 'solid', d: poly([[77.22, 78.95], [66.78, 73.05], [66.1, 86.45]], true) }
  ],
  /** Step two, share: the phone with a pastel bubble that carries the link. */
  landingShare: [
    ...stage(26),
    { layer: 'solid', d: rect(28, 18, 44, 80, 10) },
    { layer: 'knock', w: 3, d: 'M44 27H56' },
    { layer: 'knockFill', d: circle(50, 89, 3) },
    { layer: 'knockFill', d: rect(47, 33, 58, 32, 13) },
    { layer: 'soft', d: rect(50, 36, 52, 26, 10) },
    { layer: 'line', w: 2.5, d: `${capsule(62, 49, 70, 49, 5)}${capsule(82, 49, 90, 49, 5)}M70 49H82` }
  ],
  /** Step three, see who comes: the list on its clipboard, two answers ticked and the pastel one still to come. */
  landingReplies: [
    ...stage(30),
    { layer: 'solid', d: rect(28, 22, 64, 76, 9) },
    { layer: 'stone', d: rect(46, 15, 28, 13, 5) },
    { layer: 'knock', w: 3, d: `${check(41, 46, 0.7)}${check(41, 64, 0.7)}M54 46H80M54 64H76M54 82H70` },
    { layer: 'soft', d: circle(41, 82, 5.5) }
  ]
};

/** The shapes of each illustration. */
export const ILLUSTRATIONS = RAW;
