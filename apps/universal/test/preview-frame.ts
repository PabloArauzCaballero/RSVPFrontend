import { expect } from "vitest";
import { act } from "@testing-library/react";
import { PREVIEW_BRIDGE, PREVIEW_READY } from "@rsvp/celebration-theme/model";
import { webViews } from "./stubs/react-native-webview";

/**
 * Plays the preview page: it says it listens, and the text of what the app then handed it (the view, the look and the photos, as
 * JSON), which is everything the page draws. A preview that shows what was typed is a payload that contains it.
 */
export function previewSeenBy(testID: string): string {
  const view = webViews.byId.get(testID);
  if (!view) throw new Error(`no preview frame ${testID}`);
  act(() => { view.onMessage?.({ nativeEvent: { data: PREVIEW_READY } }); });
  const scripts = webViews.injectedById.get(testID) ?? [];
  const last = scripts.at(-1);
  if (!last) throw new Error(`the preview ${testID} was sent nothing`);
  const prefix = `window.${PREVIEW_BRIDGE}&&window.${PREVIEW_BRIDGE}(`;
  expect(last.startsWith(prefix)).toBe(true);
  return last.slice(prefix.length, last.lastIndexOf(");true;"));
}
