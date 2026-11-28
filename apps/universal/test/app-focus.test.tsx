import { focusManager } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => {
  let listener: ((state: string) => void) | null = null;
  const remove = vi.fn(() => { listener = null; });
  return {
    platform: { OS: "ios" },
    remove,
    emit: (state: string) => listener?.(state),
    listening: () => listener !== null,
    appState: { addEventListener: (_type: string, next: (state: string) => void) => { listener = next; return { remove }; } }
  };
});
vi.mock("react-native", () => ({ Platform: native.platform, AppState: native.appState }));

import { subscribeAppStateFocus, useAppStateFocus } from "../src/platform/app-focus";

afterEach(() => { native.platform.OS = "ios"; native.remove.mockClear(); focusManager.setFocused(undefined); });

describe("R6a · the app returning to the foreground counts as focus (renews the member's lead context)", () => {
  it("only background is a loss of focus: inactive (Face ID, picker) stays focused; unsubscribing removes the listener", () => {
    const seen: boolean[] = [];
    const stop = subscribeAppStateFocus((focused) => seen.push(focused));
    native.emit("background");
    native.emit("inactive");
    native.emit("active");
    native.emit("inactive");
    expect(seen).toEqual([false, true, true, true]);
    stop();
    expect(native.remove).toHaveBeenCalledTimes(1);
  });

  it("useAppStateFocus feeds focusManager on native, and a trip to the background and back notifies subscribers once", () => {
    const changes: boolean[] = [];
    const unsubscribe = focusManager.subscribe((focused) => changes.push(focused));
    const mounted = renderHook(() => useAppStateFocus());
    native.emit("background");
    expect(focusManager.isFocused()).toBe(false);
    native.emit("inactive");
    native.emit("active");
    expect(focusManager.isFocused()).toBe(true);
    expect(changes).toEqual([false, true]);
    unsubscribe();
    mounted.unmount();
    native.remove.mockClear();
  });

  it("removes the AppState listener and restores the default on unmount", () => {
    const view = renderHook(() => useAppStateFocus());
    native.emit("background");
    expect(focusManager.isFocused()).toBe(false);
    view.unmount();
    expect(native.remove).toHaveBeenCalledTimes(1);
    expect(native.listening()).toBe(false);
    expect(focusManager.isFocused()).toBe(true);
  });

  it("negative: on web it does not touch AppState (the browser's visibilitychange is kept)", () => {
    native.platform.OS = "web";
    renderHook(() => useAppStateFocus());
    expect(native.listening()).toBe(false);
  });
});
