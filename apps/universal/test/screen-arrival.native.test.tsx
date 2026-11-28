import { useState, type ReactNode } from "react";
import { act, screen } from "@testing-library/react";
import { Platform } from "react-native";
import { moveScreenFocus } from "@rsvp/ui";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Screen } from "../src/host/shell";
import { resetScreenArrivals } from "../src/platform/screen-arrival";
import { createTestNavigation, TestRoute } from "./stubs/expo-router";
import { fakeClient, renderApp } from "./support";

/**
 * What `Screen` hands to the native `moveScreenFocus` (VoiceOver/TalkBack). It still renders with react-native-web: only the
 * wiring is checked here. `AccessibilityInfo` itself is covered in packages/ui, and nothing runs on a device.
 */
vi.mock("@rsvp/ui", async (original) => ({ ...(await original<object>()), moveScreenFocus: vi.fn((node: unknown) => node) }));

describe("native arrival", () => {
  const os = Platform.OS;
  beforeEach(() => { resetScreenArrivals(); vi.mocked(moveScreenFocus).mockClear(); Platform.OS = "ios"; document.title = "DOne"; });
  afterEach(() => { Platform.OS = os; });

  it("gives the title node and its text of the screen that comes to the front, and never names a document", () => {
    const first = createTestNavigation(true);
    const second = createTestNavigation(false);
    let push: () => void = () => undefined;
    function Flow(): ReactNode {
      const [pushed, setPushed] = useState(false);
      push = () => { second.setFocused(true); setPushed(true); };
      return (
        <>
          <TestRoute navigation={first}><Screen title="Resumen">x</Screen></TestRoute>
          {pushed ? <TestRoute navigation={second}><Screen title="Invitados">y</Screen></TestRoute> : null}
        </>
      );
    }
    renderApp(<Flow />, fakeClient({}).client);
    expect(moveScreenFocus).not.toHaveBeenCalled();
    act(() => push());
    act(() => first.setFocused(false));
    const [summary, guests] = screen.getAllByRole("heading", { level: 1 });
    expect(moveScreenFocus).toHaveBeenCalledTimes(1);
    expect(vi.mocked(moveScreenFocus).mock.calls[0]).toEqual([guests, "Invitados"]);
    act(() => { second.setFocused(false); first.setFocused(true); });
    expect(vi.mocked(moveScreenFocus).mock.calls[1]).toEqual([summary, "Resumen"]);
    expect(document.title).toBe("DOne");
  });
});
