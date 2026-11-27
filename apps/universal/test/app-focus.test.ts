import { focusManager } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { subscribeAppStateFocus, type AppStateSource } from "../src/platform/app-focus";

function fakeAppState() {
  let listener: ((state: "active" | "background" | "inactive") => void) | null = null;
  const remove = vi.fn(() => { listener = null; });
  const source: AppStateSource = { addEventListener: (_type, next) => { listener = next; return { remove }; } };
  return { source, remove, emit: (state: "active" | "background" | "inactive") => listener?.(state) };
}

afterEach(() => { focusManager.setEventListener(() => () => undefined); focusManager.setFocused(undefined); });

describe("R6a · the app returning to the foreground counts as focus (renews the member's lead context)", () => {
  it("active is focused; background and inactive are not; unsubscribing removes the listener", () => {
    const app = fakeAppState();
    const seen: boolean[] = [];
    const stop = subscribeAppStateFocus((focused) => seen.push(focused), app.source);
    app.emit("background");
    app.emit("active");
    app.emit("inactive");
    expect(seen).toEqual([false, true, false]);
    stop();
    expect(app.remove).toHaveBeenCalledTimes(1);
  });

  it("feeds React Query's focusManager, which is what refetchOnWindowFocus listens to", () => {
    const app = fakeAppState();
    focusManager.setEventListener((handleFocus) => subscribeAppStateFocus(handleFocus, app.source));
    const changes: boolean[] = [];
    const unsubscribe = focusManager.subscribe((focused) => changes.push(focused));
    app.emit("background");
    app.emit("active");
    expect(focusManager.isFocused()).toBe(true);
    expect(changes).toEqual([false, true]);
    unsubscribe();
  });
});
