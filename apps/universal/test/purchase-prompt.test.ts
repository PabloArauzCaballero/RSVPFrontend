import { describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({ platform: { OS: "ios" } }));
vi.mock("react-native", () => ({ Platform: native.platform, AppState: { addEventListener: () => ({ remove: () => undefined }) } }));

import { subscribeReturn } from "../src/guest/purchase-prompt";

function fakeAppState() {
  let listener: ((state: string) => void) | null = null;
  const remove = vi.fn(() => { listener = null; });
  return { remove, emit: (state: string) => listener?.(state), source: { addEventListener: (_type: "change", next: (state: never) => void) => { listener = next as (state: string) => void; return { remove }; } } };
}

describe("R5 · «back from the provider» in the app", () => {
  it("fires once when the app returns from the background; inactive (the «open in WhatsApp?» sheet) is not leaving", () => {
    const app = fakeAppState();
    const returned = vi.fn();
    const stop = subscribeReturn(returned, app.source as never);
    app.emit("inactive"); app.emit("active");
    expect(returned).not.toHaveBeenCalled();
    app.emit("background"); app.emit("inactive"); app.emit("active");
    expect(returned).toHaveBeenCalledTimes(1);
    app.emit("active");
    expect(returned).toHaveBeenCalledTimes(1);
    app.emit("background"); app.emit("active");
    expect(returned).toHaveBeenCalledTimes(2);
    stop();
    expect(app.remove).toHaveBeenCalledTimes(1);
  });

  it("on the web build a page restored from the back-forward cache counts as coming back, and the listener is removed", () => {
    native.platform.OS = "web";
    try {
      const app = fakeAppState();
      const returned = vi.fn();
      const stop = subscribeReturn(returned, app.source as never);
      const restored = new Event("pageshow"); Object.defineProperty(restored, "persisted", { value: true });
      globalThis.dispatchEvent(restored);
      expect(returned).toHaveBeenCalledTimes(1);
      const fresh = new Event("pageshow"); Object.defineProperty(fresh, "persisted", { value: false });
      globalThis.dispatchEvent(fresh);
      expect(returned).toHaveBeenCalledTimes(1);
      stop();
      globalThis.dispatchEvent(restored);
      expect(returned).toHaveBeenCalledTimes(1);
    } finally { native.platform.OS = "ios"; }
  });
});
