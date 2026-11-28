import type { GalleryImage, PublicCelebrationView } from "./content.js";
import type { CelebrationTheme } from "./types.js";

/**
 * P10 · The app shows the invitation by loading the public site's own renderer in a web view (one implementation, full parity).
 * What the host is editing is not published yet, so the site cannot read it: the app hands the preview page the look, the view
 * and the photos as ONE message, and the page draws them with the same `CelebrationRenderer`. The message carries no credential.
 *
 * Who may send it: on the web the parent window, and only from an origin the site lists (`NEXT_PUBLIC_APP_URL`);
 * in the native web view the page only listens when the host app's bridge (`ReactNativeWebView`) exists.
 */

/** The site's route that draws a preview. Never indexed, never cached, framed only by the app (see next.config.js). */
export const PREVIEW_PATH = "/vista-previa";
/** Sent by the page to its parent once it listens, so the app sends the first (and any pending) payload. */
export const PREVIEW_READY = "rsvp.preview.ready";
/** Sent by the app with the payload to draw. */
export const PREVIEW_PAYLOAD = "rsvp.preview.payload";
/** The global the native bridge calls (`injectJavaScript`); the web path uses `postMessage` instead. */
export const PREVIEW_BRIDGE = "__rsvpPreview";

export interface PreviewPayload {
  readonly theme: CelebrationTheme;
  readonly view: PublicCelebrationView;
  readonly gallery: readonly GalleryImage[];
}

export interface PreviewMessage { readonly type: typeof PREVIEW_PAYLOAD; readonly payload: PreviewPayload }

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** The payload when `value` has the shape of one, otherwise null: a page that is messaged by anything else draws nothing. */
export function parsePreviewPayload(value: unknown): PreviewPayload | null {
  if (!isRecord(value)) return null;
  const { theme, view, gallery } = value;
  if (!isRecord(theme) || !Array.isArray(theme["sections"]) || !isRecord(theme["palette"])) return null;
  if (!isRecord(view) || typeof view["slug"] !== "string" || typeof view["locale"] !== "string" || !isRecord(view["content"])) return null;
  if (!Array.isArray(gallery)) return null;
  return { theme: theme as unknown as CelebrationTheme, view: view as unknown as PublicCelebrationView, gallery: gallery as GalleryImage[] };
}

/** The payload inside a `message` event's data, or null. */
export function parsePreviewMessage(data: unknown): PreviewPayload | null {
  if (!isRecord(data) || data["type"] !== PREVIEW_PAYLOAD) return null;
  return parsePreviewPayload(data["payload"]);
}

export const previewMessage = (payload: PreviewPayload): PreviewMessage => ({ type: PREVIEW_PAYLOAD, payload });
