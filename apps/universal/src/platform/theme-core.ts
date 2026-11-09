/**
 * The colour scheme of the app: follows the system by default and can be forced light or dark. The store is
 * framework-free (the platform supplies storage and the system scheme through `ThemeEnvironment`) so the same rules
 * run on web and native and can be tested without either.
 */
export type ThemePreference = "system" | "light" | "dark";
export type Scheme = "light" | "dark";
/** Key of the stored choice (web localStorage, native keystore wrapper) and of the pre-paint script. */
export const THEME_STORAGE_KEY = "rsvp.theme";
export const THEME_PREFERENCES: readonly ThemePreference[] = ["system", "light", "dark"];

export const parsePreference = (value: string | null | undefined): ThemePreference => (value === "light" || value === "dark" ? value : "system");

export interface ThemeEnvironment {
  /** Synchronous read, so the first paint already has the stored choice (web). Native returns null and hydrates through `load`. */
  readonly readNow: () => string | null;
  readonly load: () => Promise<string | null>;
  readonly save: (preference: ThemePreference) => Promise<void>;
  readonly system: () => Scheme;
  /** Calls the listener when the system scheme changes; returns the unsubscribe. */
  readonly watchSystem: (listener: () => void) => () => void;
  /** Pushes the resolved scheme to the host (document attributes on web, `Appearance` on native). */
  readonly apply: (scheme: Scheme, preference: ThemePreference) => void;
}

export interface ThemeStore {
  readonly getPreference: () => ThemePreference;
  readonly getScheme: () => Scheme;
  readonly setPreference: (preference: ThemePreference) => void;
  /** Reads the stored choice (native) once the app starts. A choice made meanwhile wins. */
  readonly hydrate: () => Promise<void>;
  readonly subscribe: (listener: () => void) => () => void;
}

export function createThemeStore(env: ThemeEnvironment): ThemeStore {
  let preference = parsePreference(env.readNow());
  let touched = false;
  const listeners = new Set<() => void>();
  const resolve = (): Scheme => (preference === "system" ? env.system() : preference);
  const publish = (): void => { env.apply(resolve(), preference); listeners.forEach((listener) => listener()); };
  let stopWatching: (() => void) | null = null;
  const watch = (): void => { stopWatching ??= env.watchSystem(() => { if (preference === "system") publish(); }); };
  env.apply(resolve(), preference);
  return {
    getPreference: () => preference,
    getScheme: resolve,
    setPreference: (next) => {
      touched = true;
      if (next === preference) return;
      preference = next;
      void env.save(next);
      publish();
    },
    hydrate: async () => {
      const stored = parsePreference(await env.load());
      if (touched || stored === preference) return;
      preference = stored;
      publish();
    },
    subscribe: (listener) => {
      watch();
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) { stopWatching?.(); stopWatching = null; }
      };
    }
  };
}
