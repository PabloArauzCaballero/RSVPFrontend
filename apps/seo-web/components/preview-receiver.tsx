"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { CelebrationRenderer, fontStylesheet, parsePreviewMessage, parsePreviewPayload, PREVIEW_BRIDGE, PREVIEW_READY, type PreviewPayload } from "@rsvp/celebration-theme";
import { createTranslator } from "@rsvp/i18n/server";
import { uiLocale } from "../lib/locale";

declare global {
  interface Window {
    ReactNativeWebView?: unknown;
    [PREVIEW_BRIDGE]?: (payload: unknown) => void;
  }
}

/**
 * P10 · The invitation the app is editing, drawn by the same renderer the public page uses. The app sends the look, the view and
 * the photos as one message (web: `postMessage` from the parent window, only from a listed origin; native web view: the host's
 * bridge, present only when `ReactNativeWebView` exists). Anything else is ignored. The preview is inert: its links do not navigate.
 */
export function PreviewReceiver({ origins }: { readonly origins: readonly string[] }) {
  const [payload, setPayload] = useState<PreviewPayload | null>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent): void => {
      if (event.source !== window.parent || !origins.includes(event.origin)) return;
      const next = parsePreviewMessage(event.data);
      if (next) setPayload(next);
    };
    window.addEventListener("message", onMessage);
    if (window.ReactNativeWebView) window[PREVIEW_BRIDGE] = (raw) => { const next = parsePreviewPayload(raw); if (next) setPayload(next); };
    // Tell the app we listen: it answers with the payload (and again whenever the host edits).
    if (window.parent !== window) for (const origin of origins) window.parent.postMessage({ type: PREVIEW_READY }, origin);
    return () => { window.removeEventListener("message", onMessage); if (window[PREVIEW_BRIDGE]) delete window[PREVIEW_BRIDGE]; };
  }, [origins]);

  // Inert: a preview that navigated would leave the thing the host is looking at.
  const stop = (event: MouseEvent): void => {
    const anchor = (event.target as HTMLElement).closest("a[href]");
    if (anchor && !anchor.getAttribute("href")?.startsWith("#")) event.preventDefault();
  };

  if (!payload) return <p role="status" aria-busy="true" className="celebration-preview-wait" data-testid="preview-waiting">…</p>;
  const { theme, view, gallery } = payload;
  const t = createTranslator(uiLocale(view.locale));
  const fonts = fontStylesheet(theme);
  return (
    <div onClick={stop} data-testid="preview-render">
      {fonts ? <link rel="stylesheet" href={fonts} precedence="default" /> : null}
      <CelebrationRenderer theme={theme} view={view} gallery={gallery} t={t} basePath={`/c/${view.slug}`} />
    </div>
  );
}
