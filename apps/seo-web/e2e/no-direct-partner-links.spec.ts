import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

/**
 * REQ-F27-06 · no public screen links straight to a partner. Every `a[href]`, `area[href]` and `form[action]` of every public route is
 * collected from the rendered DOM; a partner contact (tel:, mailto:, sms:, WhatsApp, Instagram or a host declared by a provider) must
 * not appear, and every partner exit must be `/r/{listingId}`.
 * Static routes always run; with WORLD=<live-world.json> (scripts/live-world.mjs) the real partner, celebration and gift routes are added.
 */
const PARTNER_HOSTS = (process.env.PARTNER_HOSTS ?? "wa.me,instagram.com,example.com").split(",");
const world = process.env.WORLD ? JSON.parse(readFileSync(process.env.WORLD, "utf8")) : null;

const staticRoutes = ["/", "/proveedores", "/proveedores/decoracion", "/proveedores/decoracion/la-paz", "/proveedores/buscar?q=torta", "/catalogo"];
const liveRoutes: string[] = world ? [
  `/p/${world.provider.slug}`, `/p/${world.provider.slug}/catalogo`, `/p/${world.provider.slug}/catalogo/${world.listings[0].id}`, `/p/${world.provider.slug}/cotizar`, `/p/${world.provider.slug}/agenda`,
  `/c/${world.celebration.slug}`, `/c/${world.celebration.slug}/regalos`
] : [];

const isDirectPartner = (href: string): boolean => {
  if (/^(tel:|mailto:|sms:)/i.test(href)) return true;
  if (!/^https?:\/\//i.test(href)) return false;
  const host = new URL(href).hostname;
  return PARTNER_HOSTS.some((partner) => host === partner || host.endsWith(`.${partner}`));
};

for (const route of [...staticRoutes, ...liveRoutes]) {
  test(`REQ-F27-06 · ${route} has no direct partner link`, async ({ page }) => {
    await page.goto(route, { waitUntil: "load" });
    await page.waitForLoadState("networkidle").catch(() => undefined);
    const targets = await page.$$eval("a[href], area[href], form[action]", (nodes) => nodes.map((node) => node.getAttribute("href") ?? node.getAttribute("action") ?? ""));
    expect(targets.filter(isDirectPartner), `${route} links straight to a partner`).toEqual([]);
    for (const href of targets.filter((target) => target.startsWith("/r/"))) expect(href).toMatch(/^\/r\/[0-9a-f-]{36}(\?|$)/i);
  });
}

test("REQ-F27-03 · the redirector answers 302, never 301", async ({ request }) => {
  test.skip(!world, "needs the live world");
  const response = await request.get(`/r/${world.listings[0].id}?destination=WHATSAPP&surface=PUBLIC_SITE`, { maxRedirects: 0 });
  expect(response.status()).toBe(302);
});
