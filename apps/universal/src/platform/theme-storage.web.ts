import { THEME_STORAGE_KEY, type ThemeEnvironment } from "./theme-core";

/** Web: the choice lives in localStorage (readable before the first paint); the document carries the resolved scheme. */
const KEY = THEME_STORAGE_KEY;

function read(): string | null {
  try { return globalThis.localStorage?.getItem(KEY) ?? null; } catch { return null; }
}

function systemScheme(): "light" | "dark" {
  try { return globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"; } catch { return "light"; }
}

export const themeEnvironment: ThemeEnvironment = {
  readNow: read,
  load: async () => read(),
  save: async (preference) => { try { globalThis.localStorage?.setItem(KEY, preference); } catch { /* blocked storage: the choice still applies for this run */ } },
  system: systemScheme,
  watchSystem: (listener) => {
    const query = globalThis.matchMedia?.("(prefers-color-scheme: dark)");
    query?.addEventListener?.("change", listener);
    return () => query?.removeEventListener?.("change", listener);
  },
  apply: (scheme) => {
    const root = globalThis.document?.documentElement;
    if (!root) return;
    root.dataset.theme = scheme;
    root.style.colorScheme = scheme;
  }
};
