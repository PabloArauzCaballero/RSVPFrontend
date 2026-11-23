import { isIP } from "node:net";

/**
 * B1 · Address of the visitor as seen by the one proxy in front of seo-web (Traefik in Coolify).
 * That proxy appends the address it accepted the connection from to X-Forwarded-For, so only the
 * right-most entry is trustworthy: entries to its left were written by the client and can be forged.
 * `trustedHops` = number of proxies in front of this process (default 1).
 */
export function clientAddressOf(headers: Headers, trustedHops = 1): string | null {
  if (trustedHops < 1) return null;
  const entries = (headers.get("x-forwarded-for") ?? "").split(",").map((entry) => entry.trim()).filter(Boolean);
  const candidate = entries[entries.length - trustedHops];
  return candidate && isIP(candidate) ? candidate : null;
}

/** Number of proxies in front of seo-web, from SEO_WEB_TRUSTED_PROXY_HOPS (default 1; 0 disables forwarding). */
export function trustedProxyHops(value = process.env.SEO_WEB_TRUSTED_PROXY_HOPS): number {
  const hops = Number(value ?? 1);
  return Number.isInteger(hops) && hops >= 0 && hops <= 5 ? hops : 1;
}

/**
 * Headers that tell the gateway who the visitor is when seo-web calls it server-side. Without them Kong
 * would count every /r click against seo-web's own address: one rate-limit budget for all visitors.
 */
export function forwardedFor(clientAddress: string | null | undefined): Record<string, string> {
  return clientAddress && isIP(clientAddress) ? { "x-forwarded-for": clientAddress, "x-real-ip": clientAddress } : {};
}
