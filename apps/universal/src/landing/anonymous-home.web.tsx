import type { ReactNode } from "react";
import { router, type Href } from "expo-router";
import { LandingScreen } from "./landing-screen";

/** `/` without a session in the browser: the same public home as the site (decision of 2026-11-21). Native: `anonymous-home.tsx`. */
const goTo = (path: string): void => { router.push(path as Href); };

export function AnonymousHome(): ReactNode {
  return <LandingScreen onNavigate={goTo} />;
}
