import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UiProvider, useTheme } from "@rsvp/ui";
import { colors } from "@rsvp/design-tokens";

// The native module is replaced by a probe that records the props SafeFrame passes: the real insets only exist on a device.
vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ edges, style, children }: { edges: string[]; style: { flex: number; backgroundColor: string }; children: unknown }) => (
    <div data-testid="safe-area" data-edges={edges.join(",")} data-flex={style.flex} data-bg={style.backgroundColor}>{children as never}</div>
  )
}));

import { SafeFrame } from "../src/platform/safe-frame";

function Canvas({ onValue }: { onValue: (canvas: string) => void }) {
  onValue(useTheme().palette.canvas);
  return null;
}

describe("SafeFrame · native safe area (found on iPhone: content sat under the clock and the notch)", () => {
  it("protects all four edges, fills the screen and paints the canvas token behind the insets", () => {
    let canvas = "";
    render(<UiProvider scheme="light"><Canvas onValue={(value) => { canvas = value; }} /><SafeFrame><span>contenido</span></SafeFrame></UiProvider>);
    const frame = screen.getByTestId("safe-area");
    expect(frame.dataset.edges).toBe("top,right,bottom,left");
    expect(frame.dataset.flex).toBe("1");
    expect(frame.dataset.bg).toBe(canvas);
    expect(screen.getByText("contenido")).toBeTruthy();
  });

  it("uses the dark canvas in the dark scheme, so the bands match the screen behind them", () => {
    render(<UiProvider scheme="dark"><SafeFrame><span>oscuro</span></SafeFrame></UiProvider>);
    const dark = screen.getByTestId("safe-area").dataset.bg;
    expect(dark).toBe(colors.dark.canvas);
  });
});
