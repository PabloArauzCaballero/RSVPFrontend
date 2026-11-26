"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { Embed } from "./embed.js";

/** The parts of F6 that need the browser. They get their text already translated (see components.tsx). */

/** How long the guest waits for the provider before the facade offers to try again. */
const LOAD_DEADLINE_MS = 12000;

export interface EmbedLabels { /** Visible text of the button: short, so it fits a phone. The full name (with the title) is its accessible name. */ readonly shortOpen: string; readonly shortRetry: string; readonly open: string; readonly retry: string; readonly privacy: string; readonly loading: string; readonly failed: string }

export interface EmbedFacadeViewProps {
  readonly embed: Embed;
  readonly title: string;
  readonly labels: EmbedLabels;
  /** The host's own poster, already drawn (so nothing is requested from the provider before the guest taps). */
  readonly poster?: ReactNode;
  readonly onLoad?: () => void;
}

export function EmbedFacadeView({ embed, title, labels, poster, onLoad }: EmbedFacadeViewProps): ReactNode {
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  const [attempt, setAttempt] = useState(0);
  const noteId = useId();
  useEffect(() => {
    if (phase !== "loading") return undefined;
    // An iframe reports no error: a lost connection or a blocked frame is a load that never arrives, so a deadline (or the browser going offline) is the failure.
    const timer = window.setTimeout(() => setPhase("failed"), LOAD_DEADLINE_MS);
    const offline = (): void => setPhase("failed");
    window.addEventListener("offline", offline);
    return () => { window.clearTimeout(timer); window.removeEventListener("offline", offline); };
  }, [phase, attempt]);
  const start = (): void => { setPhase("loading"); setAttempt((value) => value + 1); onLoad?.(); };
  const active = phase === "loading" || phase === "ready";
  return (
    <div className="celebration-embed" data-kind={embed.kind} data-provider={embed.provider} data-loaded={active ? "true" : "false"} data-phase={phase}>
      {active ? (
        <>
          <iframe
            key={attempt} className="celebration-embed-frame" src={embed.url} title={title} loading="lazy" sandbox={embed.sandbox} allow={embed.allow || undefined}
            referrerPolicy="strict-origin-when-cross-origin" allowFullScreen={embed.kind === "video"} onLoad={() => setPhase("ready")}
          />
          {phase === "loading" ? <p role="status" className="celebration-embed-status">{labels.loading}</p> : null}
        </>
      ) : (
        <>
          {poster}
          <button type="button" className="celebration-embed-play" onClick={start} aria-describedby={noteId} aria-label={phase === "failed" ? labels.retry : labels.open}>
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
            <span>{phase === "failed" ? labels.shortRetry : labels.shortOpen}</span>
          </button>
          {phase === "failed" ? <p role="alert" className="celebration-note">{labels.failed}</p> : null}
          <p id={noteId} className="celebration-note">{labels.privacy}</p>
        </>
      )}
    </div>
  );
}

let playing: HTMLAudioElement | null = null;

export interface AudioLabels { readonly shortPlay: string; readonly shortPause: string; readonly play: string; readonly pause: string; readonly progress: string; readonly error: string }
export interface AudioPlayerViewProps { readonly src: string; readonly durationMs: number | null; readonly labels: AudioLabels }

const clock = (seconds: number): string => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export function AudioPlayerView({ src, durationMs, labels }: AudioPlayerViewProps): ReactNode {
  const audio = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<"idle" | "playing" | "paused" | "error">("idle");
  const [position, setPosition] = useState(0);
  const total = durationMs ? durationMs / 1000 : 0;
  useEffect(() => () => { if (audio.current && playing === audio.current) playing = null; }, []);
  const toggle = (): void => {
    const element = audio.current;
    if (!element) return;
    if (state === "playing") { element.pause(); return; }
    if (playing && playing !== element) playing.pause();
    playing = element;
    element.play().catch(() => setState("error"));
  };
  return (
    <div className="celebration-embed" data-kind="audio" data-provider="upload" data-loaded="false" data-phase={state}>
      <audio
        ref={audio} src={src} preload="none" onPlay={() => setState("playing")} onPause={() => setState((current) => (current === "error" ? current : "paused"))}
        onEnded={() => { setState("idle"); setPosition(0); }} onError={() => setState("error")} onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
      />
      <button type="button" className="celebration-audio-button" onClick={toggle} aria-pressed={state === "playing"} aria-label={state === "playing" ? labels.pause : labels.play}>
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
          {state === "playing" ? <path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" /> : <path d="M8 5v14l11-7z" fill="currentColor" />}
        </svg>
        <span>{state === "playing" ? labels.shortPause : labels.shortPlay}</span>
      </button>
      {total ? <progress className="celebration-audio-progress" max={total} value={Math.min(position, total)} aria-label={labels.progress} /> : null}
      {total ? <span className="celebration-note">{clock(position)} / {clock(total)}</span> : null}
      {state === "error" ? <p role="alert" className="celebration-note">{labels.error}</p> : null}
    </div>
  );
}
