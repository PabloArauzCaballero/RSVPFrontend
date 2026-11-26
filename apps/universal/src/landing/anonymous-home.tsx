import type { ReactNode } from "react";
import { Redirect, type Href } from "expo-router";
import { AUTH_ROUTES } from "../auth/routes";

/**
 * `/` without a session on iOS and Android: an installed app opens at sign-in (decision of 2026-11-21). The web build
 * resolves `anonymous-home.web.tsx` instead, which shows the public home. Neither file imports the other.
 */
export function AnonymousHome(): ReactNode {
  return <Redirect href={AUTH_ROUTES.login as Href} />;
}
