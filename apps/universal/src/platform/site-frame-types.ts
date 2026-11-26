import type { PreviewPayload } from "@rsvp/celebration-theme/model";

/**
 * P10 · A window onto the public site: the invitation itself (`page`) or the preview page the app feeds (`preview`).
 * One contract for both platforms: a native web view (`site-frame.tsx`) and an iframe or a hand-off (`site-frame.web.tsx`).
 */

/** What the frame is doing, so the screen can show loading, a retry, or its own fallbacks (the gift button). */
/**
 * `offline`: no connection or the site does not answer. `unavailable`: the site answered with a server error. `misconfigured`:
 * this deployment cannot show the site at all (it would load itself), which a retry does not fix.
 */
export type FramePhase = "loading" | "ready" | "notFound" | "unavailable" | "offline" | "misconfigured";

export interface SiteFrameBase {
  /** Origin of the public site: the only one the frame loads, messages or hands a credential to. */
  readonly origin: string;
  /** The accessible name of the frame (screen readers announce it on entering). */
  readonly title: string;
  readonly testID: string;
  readonly onPhase: (phase: FramePhase) => void;
}

export interface PageFrameProps extends SiteFrameBase {
  readonly mode: "page";
  readonly url: string;
  readonly slug: string;
  /** The guest's personal credential, when this session holds it; it is handed over, never put in an address. */
  readonly credential: string | null;
  readonly onApp: (path: string) => void;
  readonly onExternal: (url: string) => void;
}

export interface PreviewFrameProps extends SiteFrameBase {
  readonly mode: "preview";
  readonly payload: PreviewPayload;
}

export type SiteFrameProps = PageFrameProps | PreviewFrameProps;
