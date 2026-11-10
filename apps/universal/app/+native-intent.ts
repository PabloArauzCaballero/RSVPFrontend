import { guestSystemPath } from "../src/deep-links/router";
import { hostGiftSystemPath } from "../src/host/gifts/routing";

/** Expo invokes this for cold starts and links received while the app is running. */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return hostGiftSystemPath(path) ?? guestSystemPath(path);
}
