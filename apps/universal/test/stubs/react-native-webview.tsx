import { forwardRef, useImperativeHandle, type Ref } from "react";

/** The web view of a device does not run in jsdom: the stub keeps the props the app gave it, so a test can play the page's side. */
export interface StubWebViewProps {
  readonly testID?: string;
  readonly source?: { readonly uri: string };
  readonly originWhitelist?: readonly string[];
  readonly injectedJavaScriptBeforeContentLoaded?: string;
  readonly injectedJavaScriptForMainFrameOnly?: boolean;
  readonly javaScriptEnabled?: boolean;
  readonly allowFileAccess?: boolean;
  readonly setSupportMultipleWindows?: boolean;
  readonly accessibilityLabel?: string;
  readonly onShouldStartLoadWithRequest?: (request: { readonly url: string; readonly isTopFrame: boolean }) => boolean;
  readonly onLoadStart?: () => void;
  readonly onLoadEnd?: () => void;
  readonly onError?: () => void;
  readonly onHttpError?: (event: { readonly nativeEvent: { readonly statusCode: number } }) => void;
  readonly onMessage?: (event: { readonly nativeEvent: { readonly data: string } }) => void;
}
export const webViews: { current: StubWebViewProps | null; injected: string[]; byId: Map<string, StubWebViewProps>; injectedById: Map<string, string[]> } = { current: null, injected: [], byId: new Map(), injectedById: new Map() };
export const resetWebViews = (): void => { webViews.current = null; webViews.injected = []; webViews.byId.clear(); webViews.injectedById.clear(); };

export const WebView = forwardRef(function WebView(props: StubWebViewProps, ref: Ref<{ injectJavaScript: (script: string) => void }>) {
  webViews.current = props;
  if (props.testID) webViews.byId.set(props.testID, props);
  useImperativeHandle(ref, () => ({ injectJavaScript: (script: string) => { webViews.injected.push(script); if (props.testID) webViews.injectedById.set(props.testID, [...(webViews.injectedById.get(props.testID) ?? []), script]); } }));
  return <div data-testid={props.testID} role="document" aria-label={props.accessibilityLabel} data-uri={props.source?.uri} />;
});
export default WebView;
