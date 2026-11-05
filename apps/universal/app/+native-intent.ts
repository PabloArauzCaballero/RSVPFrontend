import { resolveDeepLink } from "../src/deep-links/router";

/** Expo Router hook: normalises incoming system URLs (universal link or rsvp:// scheme) to the guest route (REQ-F21-01). */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return resolveDeepLink(path.includes("://") ? path : `https://link.invalid${path.startsWith("/") ? "" : "/"}${path}`) ?? path;
}
