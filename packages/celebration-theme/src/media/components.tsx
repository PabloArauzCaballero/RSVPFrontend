import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Translate } from "../types.js";
import { isAllowedEmbedUrl, type Embed } from "./embed.js";
import { clampScrim, hasImage, imageSources, type PublicMedia } from "./variants.js";

/** Components of F6 for the public invitation and for the editor to import. Web only: the native app shows the web invitation (P10). */

/** A veil that is laid on a photo when the document does not set one, so text on top stays readable (AA) on any picture. */
export const AUTO_SCRIM = 0.4;

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
  if (sources.svg) return <img {...common} src={sources.svg} />;
  return (
    <picture>
      {sources.avif ? <source type="image/avif" srcSet={sources.avif} sizes={sizes} /> : null}
      {sources.webp ? <source type="image/webp" srcSet={sources.webp} sizes={sizes} /> : null}
      <img {...common} src={sources.fallback ?? undefined} />
    </picture>
  );
}

export interface MediaBackgroundProps {
  readonly media: PublicMedia;
  readonly fit?: "cover" | "contain";
  /** 0 to 0.8, from the design document. Missing means the automatic veil. */
  readonly scrim?: number;
  readonly priority?: boolean;
  readonly children?: ReactNode;
}

/** A section or page background picture with its veil. The picture is decoration: the text on top carries the meaning. */
export function MediaBackground({ media, fit = "cover", scrim, priority = false, children }: MediaBackgroundProps): ReactNode {
  const veil = scrim === undefined ? AUTO_SCRIM : clampScrim(scrim);
  return (
    <div className="celebration-media-background" data-scrim={veil} style={{ "--celebration-scrim": `${Math.round(veil * 100)}%` } as CSSProperties}>
      <MediaImage media={media} alt="" fit={fit} priority={priority} className="celebration-media-background-image" />
      <div className="celebration-media-veil" aria-hidden="true" />
      <div className="celebration-media-content">{children}</div>
    </div>
  );
}

export interface EmbedFacadeProps {
  readonly embed: Embed | null;
  readonly title: string;
  readonly t: Translate;
  /** Own poster picture (the host's, so nothing is requested from the provider before the guest taps). */
  readonly poster?: PublicMedia;
  /** Called when the iframe is put in the page, for tests and analytics. */
  readonly onLoad?: () => void;
}

const FACADE_LABEL: Readonly<Record<Embed["kind"], string>> = { video: "celebration.media.playVideo", audio: "celebration.media.playMusic", map: "celebration.media.showMap" };

/** Click-to-load facade. Nothing from the provider is requested until the guest taps: no iframe, no script, no cookie, no IP. Then the iframe
 *  loads sandboxed, lazy, with a strict referrer policy and on a privacy-enhanced host. An embed off the allowlist renders nothing. */
export function EmbedFacade({ embed, title, t, poster, onLoad }: EmbedFacadeProps): ReactNode {
  const [loaded, setLoaded] = useState(false);
  const noteId = useId();
  if (!embed || !isAllowedEmbedUrl(embed.url)) return null;
  const start = (): void => { setLoaded(true); onLoad?.(); };
  return (
    <div className="celebration-embed" data-kind={embed.kind} data-provider={embed.provider} data-loaded={loaded ? "true" : "false"}>
      {loaded ? (
        <iframe
          className="celebration-embed-frame" src={embed.url} title={title} loading="lazy" sandbox={embed.sandbox} allow={embed.allow || undefined}
          referrerPolicy="strict-origin-when-cross-origin" allowFullScreen={embed.kind === "video"}
        />
      ) : (
        <>
          {poster ? <MediaImage media={poster} alt="" /> : null}
          <button type="button" className="celebration-embed-play" onClick={start} aria-describedby={noteId}>
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
            <span>{t(FACADE_LABEL[embed.kind], { title })}</span>
          </button>
          <p id={noteId} className="celebration-note">{t("celebration.media.privacy", { provider: embed.label })}</p>
        </>
      )}
    </div>
  );
}

let playing: HTMLAudioElement | null = null;

export interface AudioPlayerProps {
  readonly media: PublicMedia;
  readonly title: string;
  readonly t: Translate;
}

const clock = (seconds: number): string => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/** The host's own MP3. Never starts by itself (no `autoplay`, `preload="none"`: nothing is downloaded until the guest presses play), only one plays at a
 *  time, and it has no animated meter, so there is nothing to switch off for reduced motion. */
export function AudioPlayer({ media, title, t }: AudioPlayerProps): ReactNode {
  const audio = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<"idle" | "playing" | "paused" | "error">("idle");
  const [position, setPosition] = useState(0);
  const total = media.durationMs ? media.durationMs / 1000 : 0;
  const src = media.variants.audio;
  useEffect(() => () => { if (audio.current && playing === audio.current) playing = null; }, []);
  if (!src) return null;
  const toggle = (): void => {
    const element = audio.current;
    if (!element) return;
    if (state === "playing") { element.pause(); return; }
    if (playing && playing !== element) playing.pause();
    playing = element;
    element.play().catch(() => setState("error"));
  };
  return (
    <div className="celebration-audio" data-state={state}>
      <audio
        ref={audio} src={src} preload="none" onPlay={() => setState("playing")} onPause={() => setState((current) => (current === "error" ? current : "paused"))}
        onEnded={() => { setState("idle"); setPosition(0); }} onError={() => setState("error")} onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
      />
      <button type="button" className="celebration-audio-button" onClick={toggle} aria-pressed={state === "playing"}>
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
          {state === "playing" ? <path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" /> : <path d="M8 5v14l11-7z" fill="currentColor" />}
        </svg>
        <span>{state === "playing" ? t("celebration.media.pause", { title }) : t("celebration.media.play", { title })}</span>
      </button>
      {total ? <progress className="celebration-audio-progress" max={total} value={Math.min(position, total)} aria-label={t("celebration.media.progress", { title })} /> : null}
      {total ? <span className="celebration-note">{clock(position)} / {clock(total)}</span> : null}
      {state === "error" ? <p role="alert" className="celebration-note">{t("celebration.media.audioError")}</p> : null}
    </div>
  );
}
