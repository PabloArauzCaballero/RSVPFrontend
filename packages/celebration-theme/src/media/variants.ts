/** Public variants of a media file (F6): what GET /media/public/celebrations/{id}/assets returns, and how to turn them into `srcset`. */
export type MediaVariantName = "thumb" | "medium" | "full" | "webp" | "thumb_avif" | "medium_avif" | "full_avif" | "svg" | "audio";
export type MediaPurpose = "gallery" | "cover" | "background" | "section" | "element" | "block" | "logo" | "monogram" | "illustration" | "music";

export interface PublicMedia {
  readonly id: string;
  readonly width: number | null;
  readonly height: number | null;
  readonly purpose?: MediaPurpose;
  readonly durationMs?: number | null;
  readonly variants: Readonly<Partial<Record<MediaVariantName, string>>>;
}

const WIDTHS = { thumb: 320, medium: 960, full: 1920 } as const;

function srcset(variants: PublicMedia["variants"], suffix: "" | "_avif"): string {
  return (Object.keys(WIDTHS) as (keyof typeof WIDTHS)[]).flatMap((name) => {
    const url = variants[`${name}${suffix}` as MediaVariantName];
    return url ? [`${url} ${WIDTHS[name]}w`] : [];
  }).join(", ");
}

export interface ImageSources {
  readonly avif: string;
  readonly webp: string;
  readonly fallback: string | null;
  readonly svg: string | null;
}

/** Everything an <img> needs. A vector drawing has no raster variants and is used as is. */
export function imageSources(media: PublicMedia): ImageSources {
  const { variants } = media;
  return { avif: srcset(variants, "_avif"), webp: srcset(variants, ""), fallback: variants.medium ?? variants.webp ?? variants.full ?? variants.thumb ?? null, svg: variants.svg ?? null };
}

export const hasImage = (media: PublicMedia): boolean => Boolean(media.variants.svg || media.variants.medium || media.variants.webp || media.variants.full || media.variants.thumb);

/** Veil opacity that keeps text readable on a photo: the document's own value, clamped to what the contract allows (0 to 0.8). */
export const MAX_SCRIM = 0.8;
export const clampScrim = (value: number | undefined): number => (Number.isFinite(value) ? Math.min(MAX_SCRIM, Math.max(0, value as number)) : 0);

/** The strongest veil the renderer paints behind text: the graded veil of contract 1.8.0 (`x-rsvp-veil.gradedBehindText`, .85), above the .8 a document may ask for and never above the contract. */
export const MAX_TEXT_VEIL = 0.85;
export const clampVeil = (value: number | undefined): number => (Number.isFinite(value) ? Math.min(MAX_TEXT_VEIL, Math.max(0, value as number)) : 0);
