import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { IdentityClient, SessionManager, createMemorySessionStore } from "@rsvp/auth";
import { colors } from "@rsvp/design-tokens";
import { createThemeStore, parsePreference, type Scheme, type ThemeEnvironment, type ThemePreference } from "../src/platform/theme-core";
import { themeEnvironment as webEnvironment } from "../src/platform/theme-storage.web";
import { themeBootCss, themeBootScript } from "../src/platform/theme-boot";
import { themeStore, useColors, useThemePreference } from "../src/platform/theme";
import { ThemeChoice } from "../src/host/theme-choice";
import { AppProviders } from "../src/platform/providers";
import { fakeClient } from "./support";
import { secureStoreSnapshot } from "./stubs/expo-secure-store";

function fakeEnvironment(initial: { stored?: string | null; system?: Scheme } = {}) {
  let system: Scheme = initial.system ?? "light";
  let stored: string | null = initial.stored ?? null;
  const watchers = new Set<() => void>();
  const applied: string[] = [];
  const env: ThemeEnvironment = {
    readNow: () => null,
    load: async () => stored,
    save: vi.fn(async (preference: ThemePreference) => { stored = preference; }),
    system: () => system,
    watchSystem: (listener) => { watchers.add(listener); return () => watchers.delete(listener); },
    apply: (scheme, preference) => { applied.push(`${scheme}:${preference}`); }
  };
  return { env, applied, watchers, setSystem: (next: Scheme) => { system = next; watchers.forEach((listener) => listener()); } };
}

describe("theme store · system by default, forced by the person", () => {
  it("follows the system scheme until a choice is made, and reacts when the system flips", () => {
    const { env, setSystem, applied } = fakeEnvironment({ system: "light" });
    const store = createThemeStore(env);
    const seen = vi.fn();
    store.subscribe(seen);
    expect(store.getPreference()).toBe("system");
    expect(store.getScheme()).toBe("light");
    setSystem("dark");
    expect(store.getScheme()).toBe("dark");
    expect(seen).toHaveBeenCalledTimes(1);
    expect(applied.at(-1)).toBe("dark:system");
  });

  it("a forced scheme ignores the system and is saved", () => {
    const { env, setSystem } = fakeEnvironment({ system: "dark" });
    const store = createThemeStore(env);
    const seen = vi.fn();
    store.subscribe(seen);
    store.setPreference("light");
    expect(store.getScheme()).toBe("light");
    expect(env.save).toHaveBeenCalledWith("light");
    seen.mockClear();
    setSystem("light");
    setSystem("dark");
    expect(seen).not.toHaveBeenCalled();
    expect(store.getScheme()).toBe("light");
    store.setPreference("system");
    expect(store.getScheme()).toBe("dark");
  });

  it("hydrates the stored choice on native, an invalid value falls back to system, and a choice made meanwhile wins", async () => {
    const stored = fakeEnvironment({ stored: "dark" });
    const store = createThemeStore(stored.env);
    await store.hydrate();
    expect(store.getPreference()).toBe("dark");
    expect(parsePreference("sepia")).toBe("system");
    expect(parsePreference(null)).toBe("system");

    const racing = fakeEnvironment({ stored: "dark" });
    const second = createThemeStore(racing.env);
    second.setPreference("light");
    await second.hydrate();
    expect(second.getPreference()).toBe("light");
  });

  it("stops watching the system when nobody listens", () => {
    const { env, watchers } = fakeEnvironment();
    const store = createThemeStore(env);
    const off = store.subscribe(() => undefined);
    expect(watchers.size).toBe(1);
    off();
    expect(watchers.size).toBe(0);
  });
});

describe("web persistence and document", () => {
  it("reads the stored choice synchronously, writes it, and survives blocked storage", async () => {
    localStorage.setItem("rsvp.theme", "dark");
    expect(webEnvironment.readNow()).toBe("dark");
    await webEnvironment.save("light");
    expect(localStorage.getItem("rsvp.theme")).toBe("light");
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(webEnvironment.readNow()).toBeNull();
    await expect(webEnvironment.save("dark")).resolves.toBeUndefined();
    getItem.mockRestore();
    setItem.mockRestore();
    localStorage.clear();
  });

  it("puts the resolved scheme on the document so the page ground and form controls match", () => {
    webEnvironment.apply("dark", "dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    webEnvironment.apply("light", "system");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("the pre-paint script resolves stored choice then system, and the CSS paints both grounds from the tokens", () => {
    const run = (stored: string | null, systemDark: boolean): string | null => {
      if (stored) localStorage.setItem("rsvp.theme", stored); else localStorage.removeItem("rsvp.theme");
      vi.stubGlobal("matchMedia", () => ({ matches: systemDark }));
      document.documentElement.removeAttribute("data-theme");
      new Function(themeBootScript)();
      vi.unstubAllGlobals();
      return document.documentElement.getAttribute("data-theme");
    };
    expect(run(null, true)).toBe("dark");
    expect(run(null, false)).toBe("light");
    expect(run("light", true)).toBe("light");
    expect(run("dark", false)).toBe("dark");
    expect(run("sepia", true)).toBe("dark");
    localStorage.clear();
    expect(themeBootCss).toContain(colors.dark.canvas);
    expect(themeBootCss).toContain(colors.light.canvas);
  });
});

describe("useColors and ThemeChoice in the app providers", () => {
  function Swatch() {
    const palette = useColors();
    const { scheme } = useThemePreference();
    return <span data-testid="swatch" data-scheme={scheme} data-canvas={palette.canvas} />;
  }
  function mount(): void {
    const { client } = fakeClient({});
    const manager = new SessionManager(createMemorySessionStore(), new IdentityClient(client));
    render(<AppProviders runtime={{ manager, client, identityClient: client }} locale="en-US" queryClient={new QueryClient()}><Swatch /><ThemeChoice /></AppProviders>);
  }

  it("choosing Dark switches the palette of the whole tree and Light switches it back; System is the default", async () => {
    themeStore.setPreference("system");
    mount();
    expect(screen.getByTestId("swatch").dataset.canvas).toBe(colors.light.canvas);
    expect(document.querySelector('[data-testid="theme-system"]')?.getAttribute("aria-checked")).toBe("true");
    act(() => { fireEvent.click(document.querySelector('[data-testid="theme-dark"]') as Element); });
    expect(screen.getByTestId("swatch").dataset.scheme).toBe("dark");
    expect(screen.getByTestId("swatch").dataset.canvas).toBe(colors.dark.canvas);
    expect(document.querySelector('[data-testid="theme-dark"]')?.getAttribute("aria-checked")).toBe("true");
    await Promise.resolve();
    expect(secureStoreSnapshot().get("rsvp.theme")).toBe("dark"); // jsdom resolves the native adapter (keystore stub)
    act(() => { fireEvent.click(document.querySelector('[data-testid="theme-light"]') as Element); });
    expect(screen.getByTestId("swatch").dataset.canvas).toBe(colors.light.canvas);
    act(() => { themeStore.setPreference("system"); });
  });
});
