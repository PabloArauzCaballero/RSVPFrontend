import { Appearance } from "react-native";
import { readLocal, writeLocal } from "./local-store";
import { THEME_STORAGE_KEY, type ThemeEnvironment } from "./theme-core";

/** Native: the choice is a small device-local value; `Appearance` forces the scheme so the status bar and system dialogs agree. */
const KEY = THEME_STORAGE_KEY;

export const themeEnvironment: ThemeEnvironment = {
  readNow: () => null,
  load: () => readLocal(KEY),
  save: (preference) => writeLocal(KEY, preference),
  system: () => (Appearance.getColorScheme() === "dark" ? "dark" : "light"),
  watchSystem: (listener) => {
    const subscription = Appearance.addChangeListener(listener);
    return () => subscription.remove();
  },
  apply: (_scheme, preference) => { Appearance.setColorScheme?.(preference === "system" ? null : preference); }
};
