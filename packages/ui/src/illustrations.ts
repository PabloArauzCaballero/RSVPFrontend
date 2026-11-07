import { brand } from '@rsvp/design-tokens';

/**
 * Line illustrations of DOne. Thick rounded strokes on a 120-unit grid, an offset "soft" block behind the line
 * (the playful misregistration) and, where it fits, the check of the symbol. One data source for web and native.
 */
export type IllustrationName = 'invitation' | 'gift' | 'calendar' | 'table' | 'provider' | 'offline' | 'emptySearch' | 'success';
export type IllustrationTone = 'brand' | 'night' | 'onDark';
export type Layer = 'soft' | 'line' | 'solid' | 'knock' | 'accent' | 'accentFill';
export interface Shape { readonly d: string; readonly layer: Layer }

export const ILLUSTRATION_NAMES: readonly IllustrationName[] = ['invitation', 'gift', 'calendar', 'table', 'provider', 'offline', 'emptySearch', 'success'];
export const ILLUSTRATION_VIEWBOX = 120;
export const ILLUSTRATION_STROKE = 6;
export const ILLUSTRATION_SIZES = { sm: 64, md: 104, lg: 148 } as const;

/** Colour per layer. Amber is only ever the small accent; `knock` is the ground showing through a solid shape. */
export const ILLUSTRATION_COLORS: Record<IllustrationTone, Record<Layer, string>> = {
  brand: { soft: brand.bruma, line: brand.azul, solid: brand.azul, knock: '#FFFFFF', accent: brand.ambar, accentFill: brand.ambar },
  night: { soft: brand.bruma, line: brand.noche, solid: brand.noche, knock: '#FFFFFF', accent: brand.ambar, accentFill: brand.ambar },
  onDark: { soft: brand.medianoche, line: brand.cielo, solid: brand.cielo, knock: brand.noche, accent: brand.ambar, accentFill: brand.ambar }
};
export const isFillLayer = (layer: Layer): boolean => layer === 'soft' || layer === 'solid' || layer === 'accentFill';

const n = (value: number): string => String(Math.round(value * 100) / 100);
const circle = (cx: number, cy: number, r: number): string => `M${n(cx - r)} ${n(cy)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0Z`;
const ellipse = (cx: number, cy: number, rx: number, ry: number): string => `M${n(cx - rx)} ${n(cy)}a${n(rx)} ${n(ry)} 0 1 0 ${n(2 * rx)} 0a${n(rx)} ${n(ry)} 0 1 0 ${n(-2 * rx)} 0Z`;
const rect = (x: number, y: number, w: number, h: number, r: number): string =>
  `M${n(x + r)} ${n(y)}H${n(x + w - r)}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(r)}V${n(y + h - r)}a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(r)}H${n(x + r)}a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(-r)}V${n(y + r)}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(-r)}Z`;
const spark = (cx: number, cy: number, s = 6): Shape => ({ layer: 'accent', d: `M${n(cx)} ${n(cy - s)}V${n(cy + s)}M${n(cx - s)} ${n(cy)}H${n(cx + s)}` });
/** The seal: a solid disc with the knocked-out check of the symbol. */
const seal = (cx: number, cy: number, r: number): Shape[] => {
  const k = r / 15;
  return [{ layer: 'solid', d: circle(cx, cy, r) }, { layer: 'knock', d: `M${n(cx - 7 * k)} ${n(cy)}L${n(cx - 2 * k)} ${n(cy + 5 * k)}L${n(cx + 7 * k)} ${n(cy - 6 * k)}` }];
};

export const ILLUSTRATIONS: Record<IllustrationName, readonly Shape[]> = {
  invitation: [
    { layer: 'soft', d: rect(18, 38, 96, 68, 16) },
    { layer: 'line', d: 'M32 32V26a8 8 0 0 1 8-8H76a8 8 0 0 1 8 8V32' },
    { layer: 'line', d: rect(10, 30, 96, 68, 16) },
    { layer: 'line', d: 'M16 44L58 74L100 44' },
    ...seal(94, 90, 15),
    spark(104, 16)
  ],
  gift: [
    { layer: 'soft', d: rect(28, 60, 76, 50, 12) },
    { layer: 'line', d: rect(22, 54, 76, 50, 12) },
    { layer: 'line', d: rect(16, 40, 88, 18, 9) },
    { layer: 'line', d: 'M60 40V104' },
    { layer: 'line', d: 'M60 40C50 14 26 22 36 34C40 38 50 40 60 40ZM60 40C70 14 94 22 84 34C80 38 70 40 60 40Z' },
    spark(104, 20), spark(14, 22, 4)
  ],
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
    { layer: 'accentFill', d: circle(60, 30, 11) },
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
  ]
};
