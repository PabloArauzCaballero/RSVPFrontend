import { useEffect, useRef, type ReactNode } from "react";
import { PREVIEW_PATH, PREVIEW_READY, previewMessage } from "@rsvp/celebration-theme";
import type { PageFrameProps, PreviewFrameProps, SiteFrameProps } from "./site-frame-types";

/** No answer from the preview page in this time is a page that did not load (a blocked frame, no network, the site down). */
export const PREVIEW_READY_TIMEOUT_MS = 12_000;

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
    window.location.replace(withCredentialFragment(url, credential));
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
    const timer = setTimeout(() => { if (!ready.current) onPhase("offline"); }, PREVIEW_READY_TIMEOUT_MS);
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
    return () => { clearTimeout(timer); window.removeEventListener("message", onMessage); };
  }, [origin, onPhase]);

  // Every edit is sent again, to the site's origin only.
  useEffect(() => { if (ready.current) frame.current?.contentWindow?.postMessage(previewMessage(payload), origin); }, [payload, origin]);

  return <iframe ref={frame} title={title} data-testid={testID} src={`${origin}${PREVIEW_PATH}`} referrerPolicy="no-referrer" style={{ border: 0, width: "100%", height: "100%", display: "block", background: "transparent" }} />;
}

export function SiteFrame(props: SiteFrameProps): ReactNode {
  return props.mode === "page" ? <PageHandOff {...props} /> : <PreviewIframe {...props} />;
}
