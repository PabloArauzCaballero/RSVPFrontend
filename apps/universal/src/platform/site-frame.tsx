import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { WebView } from "react-native-webview";
import { useColors } from "@rsvp/ui";
import type { WebViewMessageEvent } from "react-native-webview";
import type { ShouldStartLoadRequest, WebViewHttpErrorEvent } from "react-native-webview/lib/WebViewTypes";
import { PREVIEW_BRIDGE, PREVIEW_PATH, PREVIEW_READY, type PreviewPayload } from "@rsvp/celebration-theme/model";
import { credentialScript, decideNavigation } from "../guest/invitation-web-model";
import type { PageFrameProps, PreviewFrameProps, SiteFrameProps } from "./site-frame-types";

/**
 * Native: iOS and Android show the public site in a web view. The web view only ever loads the site's own origin; every
 * other address the page tries to open leaves for the system browser (or the app's own screen), and a preview opens nothing.
 * The credential travels as a script handed to the web view before the page loads, never in an address.
 */

const SECURE_WEBVIEW = {
  javaScriptEnabled: true,
  // sessionStorage: where the site keeps the guest's credential for this visit.
  domStorageEnabled: true,
  // Nothing from the file system, no second windows, no mixed content, no cookies shared with the system browser.
  allowFileAccess: false,
  allowUniversalAccessFromFileURLs: false,
  setSupportMultipleWindows: false,
  mixedContentMode: "never",
  sharedCookiesEnabled: false,
  thirdPartyCookiesEnabled: false,
  allowsLinkPreview: false,
  mediaPlaybackRequiresUserAction: true,
  allowsInlineMediaPlayback: true
} as const;

const isFailureStatus = (status: number): "notFound" | "unavailable" | null => (status === 404 ? "notFound" : status >= 500 ? "unavailable" : null);

function PageFrame({ origin, url, slug, credential, title, testID, onApp, onExternal, onPhase }: PageFrameProps): ReactNode {
  // The web view fires `onLoadEnd` after an error too; the failure stays the answer.
  const failed = useRef(false);
  // The web view paints its own white until the page does: give it the app's canvas so dark mode never flashes.
  const canvas = useColors().canvas;
  const fail = (phase: "notFound" | "unavailable" | "offline"): void => { failed.current = true; onPhase(phase); };
  // Runs before the page loads, main frame only; the page's own origin is checked inside the script too.
  const before = useMemo(() => (credential ? credentialScript(origin, slug, credential) : undefined), [origin, slug, credential]);
  const onShould = useCallback((request: ShouldStartLoadRequest): boolean => {
    // iOS also asks about frames inside the page (maps, video); the page's own policy governs those.
    if (request.isTopFrame === false) return true;
    const decision = decideNavigation(request.url, { origin, slug });
    if (decision.kind === "allow") return true;
    if (decision.kind === "app") onApp(decision.path);
    else if (decision.kind === "external") onExternal(decision.url);
    return false;
  }, [origin, slug, onApp, onExternal]);
  return (
    <WebView
      {...SECURE_WEBVIEW}
      testID={testID}
      accessible
      accessibilityLabel={title}
      source={{ uri: url }}
      originWhitelist={[origin]}
      onShouldStartLoadWithRequest={onShould}
      {...(before ? { injectedJavaScriptBeforeContentLoaded: before } : {})}
      injectedJavaScriptForMainFrameOnly
      onLoadStart={() => { failed.current = false; onPhase("loading"); }}
      onLoadEnd={() => { if (!failed.current) onPhase("ready"); }}
      onError={() => fail("offline")}
      onHttpError={(event: WebViewHttpErrorEvent) => { const failure = isFailureStatus(event.nativeEvent.statusCode); if (failure) fail(failure); }}
      style={{ flex: 1, backgroundColor: canvas }}
      containerStyle={{ backgroundColor: canvas }}
    />
  );
}

const inject = (payload: PreviewPayload): string => `window.${PREVIEW_BRIDGE}&&window.${PREVIEW_BRIDGE}(${JSON.stringify(payload)});true;`;

function PreviewWebFrame({ origin, payload, title, testID, onPhase }: PreviewFrameProps): ReactNode {
  const canvas = useColors().canvas;
  const ref = useRef<WebView>(null);
  const ready = useRef(false);
  const send = useCallback(() => { if (ready.current) ref.current?.injectJavaScript(inject(payload)); }, [payload]);
  // The page says it listens (after hydration); from then on every edit is sent.
  useEffect(send, [send]);
  const onMessage = (event: WebViewMessageEvent): void => {
    if (event.nativeEvent.data !== PREVIEW_READY) return;
    ready.current = true;
    send();
    onPhase("ready");
  };
  const onShould = (request: ShouldStartLoadRequest): boolean => request.url === `${origin}${PREVIEW_PATH}` || request.url === "about:blank";
  return (
    <WebView
      {...SECURE_WEBVIEW}
      ref={ref}
      testID={testID}
      accessible
      accessibilityLabel={title}
      source={{ uri: `${origin}${PREVIEW_PATH}` }}
      originWhitelist={[origin]}
      onShouldStartLoadWithRequest={onShould}
      onMessage={onMessage}
      onLoadStart={() => { ready.current = false; onPhase("loading"); }}
      onError={() => onPhase("offline")}
      onHttpError={(event: WebViewHttpErrorEvent) => { if (event.nativeEvent.statusCode >= 400) onPhase("unavailable"); }}
      style={{ flex: 1, backgroundColor: canvas }}
      containerStyle={{ backgroundColor: canvas }}
    />
  );
}

export function SiteFrame(props: SiteFrameProps): ReactNode {
  return props.mode === "page" ? <PageFrame {...props} /> : <PreviewWebFrame {...props} />;
}
