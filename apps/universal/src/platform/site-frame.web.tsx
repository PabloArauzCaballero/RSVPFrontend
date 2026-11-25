import { useEffect, useRef, type ReactNode } from "react";
import { PREVIEW_PATH, PREVIEW_READY, previewMessage } from "@rsvp/celebration-theme";
import type { PageFrameProps, PreviewFrameProps, SiteFrameProps } from "./site-frame-types";

/** The frame's document loaded but the preview page never said it listens (a refused frame, an error page): this long after `onload`. */
export const PREVIEW_READY_TIMEOUT_MS = 3_000;
/** The frame never loaded at all (no network, the site down). */
export const PREVIEW_LOAD_TIMEOUT_MS = 8_000;
/** Before leaving for the site, how long the reachability probe waits. */
export const PAGE_PROBE_TIMEOUT_MS = 6_000;

/**
 * Web: the public site refuses to be framed (X-Frame-Options), so the invitation itself is a navigation to the site, with the
 * credential in the address FRAGMENT (`#t=`): a fragment never reaches a server or a Referer, and the site removes it from the
 * address bar as soon as it reads it. The preview page is the one the site lets this app frame, fed by `postMessage`.
 */

/** `url` plus the fragment the site reads the credential from (`apps/seo-web/lib/guest-credential.ts`). */
export const withCredentialFragment = (url: string, token: string | null): string => (token ? `${url}#t=${encodeURIComponent(token)}` : url);

function PageHandOff({ origin, url, credential, onPhase }: PageFrameProps): ReactNode {
  useEffect(() => {
    // The same origin would load this very screen again: a deployment that serves both must route /c/* to the site.
    if (typeof window === "undefined" || window.location.origin === origin) { onPhase("unavailable"); return; }
    onPhase("loading");
    // Leaving for a site that is down shows the browser's error page, with no retry and no way to the gifts: probe first.
    // `no-cors` sees only whether the site answers (a network error or a timeout rejects), which is the state this screen can offer.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PAGE_PROBE_TIMEOUT_MS);
    let left = false;
    fetch(url, { method: "HEAD", mode: "no-cors", cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer", signal: controller.signal })
      .then(() => { left = true; window.location.replace(withCredentialFragment(url, credential)); })
      .catch(() => { if (!left) onPhase("offline"); })
      .finally(() => clearTimeout(timer));
    return () => { clearTimeout(timer); controller.abort(); };
  }, [origin, url, credential, onPhase]);
  return null;
}

function PreviewIframe({ origin, payload, title, testID, onPhase }: PreviewFrameProps): ReactNode {
  const frame = useRef<HTMLIFrameElement>(null);
  const ready = useRef(false);
  const payloadRef = useRef(payload);
  payloadRef.current = payload;

  useEffect(() => {
    ready.current = false;
    onPhase("loading");
    let timer = setTimeout(() => { if (!ready.current) onPhase("offline"); }, PREVIEW_LOAD_TIMEOUT_MS);
    const element = frame.current;
    // The document loaded: the page must now say it listens, soon. A refused frame loads an error page that never will.
    const onLoad = (): void => { clearTimeout(timer); timer = setTimeout(() => { if (!ready.current) onPhase("offline"); }, PREVIEW_READY_TIMEOUT_MS); };
    const onError = (): void => { clearTimeout(timer); onPhase("offline"); };
    element?.addEventListener("load", onLoad);
    element?.addEventListener("error", onError);
    const onMessage = (event: MessageEvent): void => {
      // Only the frame we created, from the site's origin, saying it listens.
      if (event.source !== frame.current?.contentWindow || event.origin !== origin) return;
      const data: unknown = event.data;
      if (typeof data !== "object" || data === null || (data as { type?: unknown }).type !== PREVIEW_READY) return;
      ready.current = true;
      clearTimeout(timer);
      frame.current?.contentWindow?.postMessage(previewMessage(payloadRef.current), origin);
      onPhase("ready");
    };
    window.addEventListener("message", onMessage);
    return () => { clearTimeout(timer); element?.removeEventListener("load", onLoad); element?.removeEventListener("error", onError); window.removeEventListener("message", onMessage); };
  }, [origin, onPhase]);

  // Every edit is sent again, to the site's origin only.
  useEffect(() => { if (ready.current) frame.current?.contentWindow?.postMessage(previewMessage(payload), origin); }, [payload, origin]);

  return <iframe ref={frame} title={title} data-testid={testID} src={`${origin}${PREVIEW_PATH}`} referrerPolicy="no-referrer" style={{ border: 0, width: "100%", height: "100%", display: "block", background: "transparent" }} />;
}

export function SiteFrame(props: SiteFrameProps): ReactNode {
  return props.mode === "page" ? <PageHandOff {...props} /> : <PreviewIframe {...props} />;
}
