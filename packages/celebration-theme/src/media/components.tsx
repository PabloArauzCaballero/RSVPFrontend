import type { CSSProperties, ReactNode } from "react";
import { Photo } from "../photo.js";
import type { Translate } from "../types.js";
import { isAllowedEmbedUrl, type Embed } from "./embed.js";
import { AudioPlayerView, EmbedFacadeView, type AudioLabels, type EmbedLabels } from "./interactive.js";
import { clampVeil, hasImage, imageSources, type PublicMedia } from "./variants.js";

/** Components of F6 for the public invitation and for the editor to import. Web only: the native app shows the web invitation (P10).
 *  This file runs on the server: what needs the browser (the facade's tap, the player) lives in `interactive.tsx`, a client module that receives text already
 *  translated, because a function such as `t` cannot cross from a server component to a client one. */

export interface MediaImageProps {
  readonly media: PublicMedia;
  /** Empty for a decorative picture. */
  readonly alt: string;
  readonly fit?: "cover" | "contain";
  /** `sizes` of the picture: how wide it is laid out. Default full width. */
  readonly sizes?: string;
  /** The first picture of the page (LCP): eager and high priority. Every other one is lazy. */
  readonly priority?: boolean;
  readonly className?: string;
}

/** A responsive picture: AVIF, then WebP, then the medium WebP; a vector drawing is used as is. Width and height reserve its space (no layout shift). */
export function MediaImage({ media, alt, fit = "cover", sizes = "100vw", priority = false, className }: MediaImageProps): ReactNode {
  if (!hasImage(media)) return null;
  const sources = imageSources(media);
  const common = {
    alt, className: ["celebration-media-image", className].filter(Boolean).join(" "), width: media.width ?? undefined, height: media.height ?? undefined, decoding: "async" as const,
    loading: priority ? ("eager" as const) : ("lazy" as const), fetchPriority: priority ? ("high" as const) : undefined, style: { objectFit: fit } satisfies CSSProperties
  };
  if (sources.svg) return <Photo {...common} src={sources.svg} />;
  const set = [
    sources.avif ? <source key="avif" type="image/avif" srcSet={sources.avif} sizes={sizes} /> : null,
    sources.webp ? <source key="webp" type="image/webp" srcSet={sources.webp} sizes={sizes} /> : null
  ];
  return <Photo {...common} src={sources.fallback ?? undefined} sources={set} />;
}

/** A veil (canvas colour over the picture) that keeps text on top at AA. `light` and `dark` are the opacities for each scheme, already raised to what
 *  the palette needs (`requiredScrim`): the stylesheet picks one with `prefers-color-scheme` or with the forced scheme. */
export interface MediaBackdropProps { readonly media: PublicMedia; readonly fit?: "cover" | "contain"; readonly light: number; readonly dark: number; readonly priority?: boolean }

/** The picture behind a page or an element, with its veil, as an absolutely positioned decoration: the content that goes over it is a sibling. */
export function MediaBackdrop({ media, fit = "cover", light, dark, priority = false }: MediaBackdropProps): ReactNode {
  if (!hasImage(media)) return null;
  const style = { "--cd-veil-l": `${Math.round(clampVeil(light) * 100)}%`, "--cd-veil-d": `${Math.round(clampVeil(dark) * 100)}%` } as CSSProperties;
  return (
    <div className="celebration-media-backdrop" aria-hidden="true" style={style}>
      <MediaImage media={media} alt="" fit={fit} priority={priority} className="celebration-media-background-image" />
      <div className="celebration-media-veil" />
    </div>
  );
}

export interface EmbedFacadeProps {
  readonly embed: Embed | null;
  readonly title: string;
  readonly t: Translate;
  /** Own poster picture (the host's, so nothing is requested from the provider before the guest taps). */
  readonly poster?: PublicMedia;
  /** Called when the guest taps. A function: only for trees that are client-side from the root (tests, the editor). */
  readonly onLoad?: () => void;
}

const FACADE_SHORT: Readonly<Record<Embed["kind"], string>> = { video: "celebration.media.openVideo", audio: "celebration.media.openMusic" };

const FACADE_LABEL: Readonly<Record<Embed["kind"], string>> = { video: "celebration.media.playVideo", audio: "celebration.media.playMusic" };

/** Click-to-load facade. Nothing from the provider is requested until the guest taps: no iframe, no script, no cookie, no IP. Then the iframe
 *  loads sandboxed, lazy, with a strict referrer policy and on a privacy-enhanced host. An embed off the allowlist renders nothing. */
export function EmbedFacade({ embed, title, t, poster, onLoad }: EmbedFacadeProps): ReactNode {
  if (!embed || !isAllowedEmbedUrl(embed.url)) return null;
  const labels: EmbedLabels = {
    shortOpen: t(FACADE_SHORT[embed.kind]), shortRetry: t("celebration.media.retryShort"), open: t(FACADE_LABEL[embed.kind], { title }), retry: t("celebration.media.retry", { title }), privacy: t("celebration.media.privacy", { provider: embed.label }),
    loading: t("celebration.media.loading", { provider: embed.label }), failed: t("celebration.media.loadFailed", { provider: embed.label })
  };
  return <EmbedFacadeView embed={embed} title={title} labels={labels} poster={poster ? <MediaImage media={poster} alt="" /> : null} {...(onLoad ? { onLoad } : {})} />;
}

export interface AudioPlayerProps {
  readonly media: PublicMedia;
  readonly title: string;
  readonly t: Translate;
}

/** The host's own MP3. Never starts by itself (no `autoplay`, `preload="none"`: nothing is downloaded until the guest presses play), only one plays at a
 *  time, and it has no animated meter, so there is nothing to switch off for reduced motion. */
export function AudioPlayer({ media, title, t }: AudioPlayerProps): ReactNode {
  const src = media.variants.audio;
  if (!src) return null;
  const labels: AudioLabels = { shortPlay: t("celebration.media.playShort"), shortPause: t("celebration.media.pauseShort"), play: t("celebration.media.play", { title }), pause: t("celebration.media.pause", { title }), progress: t("celebration.media.progress", { title }), error: t("celebration.media.audioError") };
  return <AudioPlayerView src={src} durationMs={media.durationMs ?? null} labels={labels} />;
}
