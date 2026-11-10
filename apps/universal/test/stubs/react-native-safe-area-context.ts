import { createContext } from "react";

/** Test stub: jsdom has no native insets, so screens see "no provider" and use zero padding. */
export const SafeAreaInsetsContext = createContext<{ top: number; bottom: number; left: number; right: number } | null>(null);
