import { HOST_ROUTES } from "../routes";

const HOST_GIFT_PATHS: readonly string[] = [HOST_ROUTES.gifts, HOST_ROUTES.giftCatalog, HOST_ROUTES.giftExternal, HOST_ROUTES.giftProviders, HOST_ROUTES.giftInbox];

/** Reserve only F23's static host routes; token-bearing guest paths keep their existing resolver. */
export function hostGiftSystemPath(value: string): string | null {
  if (!value || value.length > 2048 || value.startsWith("//") || /[\\\s]/.test(value) || /(?:^|\/)(?:\.|%2e){1,2}(?:\/|[?#]|$)/i.test(value)) return null;
  try {
    const internal = value.startsWith("/");
    const url = new URL(value, internal ? "https://internal.invalid" : undefined);
    const native = url.protocol === "rsvp:";
    if (!internal && !native || url.username || url.password || native && url.port) return null;
    const pathname = (native && url.hostname ? `/${url.hostname}${url.pathname}` : url.pathname).replace(/\/$/, "");
    return HOST_GIFT_PATHS.includes(pathname) ? `${pathname}${url.search}` : null;
  } catch { return null; }
}
