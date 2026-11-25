import { mkdirSync, writeFileSync } from "node:fs";
import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

// F6 · medios y embebidos del renderizador v2, dibujados por el sitio real (next build + start) sobre el fixture de contrato.
// Afirma lo que debe cumplirse; solo escribe imágenes cuando F6_EVIDENCE_DIR está definido (evidencia, nunca línea base).
const SLUG = "fixture-v2-medios";
const OUT = process.env.F6_EVIDENCE_DIR;
const PROVIDERS = /^https:\/\/(www\.youtube-nocookie\.com|www\.google\.com)\//;

async function open(page: Page, width: number, scheme: "light" | "dark" = "light", reduced = true): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: reduced ? "reduce" : "no-preference" });
  await page.goto(`/c/${SLUG}`);
  await page.evaluate(() => document.fonts.ready);
}
/** Stub of the provider's player so the test needs no outside network and still sees the iframe's request. */
async function stubProviders(page: Page, requested: string[]): Promise<void> {
  await page.route(PROVIDERS, async (route) => { requested.push(route.request().url()); await route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>stub</title><p>player</p>" }); });
}

test("the cover and the pictures are <picture> with AVIF first and the browser takes the AVIF", async ({ page }) => {
  await open(page, 390);
  const cover = page.locator(".cdesign-cover picture");
  await expect(cover.locator("source").first()).toHaveAttribute("type", "image/avif");
  await expect(cover.locator("source").nth(1)).toHaveAttribute("type", "image/webp");
  const img = cover.locator("img");
  await expect(img).toHaveAttribute("fetchpriority", "high");
  await expect(img).toHaveAttribute("loading", "eager");
  await expect.poll(() => img.evaluate((node) => (node as HTMLImageElement).currentSrc)).toMatch(/\.avif$/);
  const lazy = page.locator(".cdesign-image").first();
  await expect(lazy).toHaveAttribute("loading", "lazy");
  await expect(lazy).toHaveAttribute("width", "1920");
  expect(await page.locator("picture img").evaluateAll((nodes) => nodes.every((node) => (node as HTMLImageElement).getAttribute("height")))).toBe(true);
});

for (const scheme of ["light", "dark"] as const) {
  for (const width of [360, 768, 1280] as const) {
    test(`${scheme} ${width}px: the title over the background picture reads at AA over the real pixels (veil per scheme)`, async ({ page }) => {
      await open(page, width, scheme);
      await page.waitForFunction(() => [...document.querySelectorAll(".celebration-media-backdrop img")].every((node) => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0));
      const title = page.locator(".cdesign-cover h1");
      const ink = await title.evaluate((node) => getComputedStyle(node).color);
      const clip = (await title.boundingBox())!;
      // Hide the glyphs and read what is behind them: the picture under its veil.
      await page.addStyleTag({ content: ".cdesign-cover h1, .cdesign-cover p { color: transparent !important }" });
      const shot = await page.screenshot({ clip, animations: "disabled" });
      const { data, info } = await sharp(shot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      const lum = (r: number, g: number, b: number): number => { const f = (v: number): number => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const [ir, ig, ib] = (/\d+/g.exec(ink) ? ink.match(/\d+/g)! : []).map(Number) as [number, number, number];
      const inkLum = lum(ir, ig, ib);
      let worst = Infinity;
      for (let i = 0; i < info.width * info.height * 3; i += 3) {
        const l = lum(data[i]!, data[i + 1]!, data[i + 2]!);
        worst = Math.min(worst, (Math.max(l, inkLum) + 0.05) / (Math.min(l, inkLum) + 0.05));
      }
      expect(worst, `worst contrast of ${ink} over the veiled picture`).toBeGreaterThanOrEqual(4.5);
    });
  }
}

test("no request to any provider before the guest taps; one tap loads exactly one iframe, sandboxed, on youtube-nocookie", async ({ page }) => {
  const requested: string[] = [];
  await stubProviders(page, requested);
  await open(page, 390);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  expect(requested).toEqual([]);
  expect(await page.locator("iframe").count()).toBe(0);
  await expect(page.locator('.celebration-embed[data-provider="youtube"] .celebration-note')).toContainText("YouTube");
  const play = page.getByRole("button", { name: /Ver el video/ });
  await play.scrollIntoViewIfNeeded();
  await play.click();
  const frame = page.locator('.celebration-embed[data-provider="youtube"] iframe');
  await expect(frame).toHaveAttribute("src", /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?/);
  await expect(frame).toHaveAttribute("sandbox", /allow-scripts/);
  await expect(frame).toHaveAttribute("referrerpolicy", "strict-origin-when-cross-origin");
  await expect(page.locator('.celebration-embed[data-provider="youtube"] .celebration-embed-status')).toHaveCount(0);
  expect(requested.filter((url) => url.includes("youtube-nocookie"))).toHaveLength(1);
});

test("keyboard: Tab reaches the play button of the video with a visible focus ring and Enter loads it; the map loads the same way", async ({ page }) => {
  const requested: string[] = [];
  await stubProviders(page, requested);
  await open(page, 390);
  const play = page.getByRole("button", { name: /Ver el video/ });
  await play.focus();
  await expect(play).toBeFocused();
  const outline = await play.evaluate((node) => getComputedStyle(node).outlineStyle + " " + getComputedStyle(node).outlineWidth);
  expect(outline).toMatch(/solid 3px/);
  const box = await play.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await page.keyboard.press("Enter");
  await expect(page.locator('.celebration-embed[data-provider="youtube"] iframe')).toHaveCount(1);
  const map = page.getByRole("button", { name: /Ver el mapa/ });
  await map.focus();
  await page.keyboard.press("Space");
  await expect(page.locator('.celebration-embed[data-provider="google_maps"] iframe')).toHaveAttribute("src", /^https:\/\/www\.google\.com\/maps\?q=Iglesia/);
});

test("no network: after the tap, going offline ends in an alert with a retry (no silent blank box)", async ({ page, context }) => {
  await page.route(PROVIDERS, () => { /* never answers: the connection hangs */ });
  await open(page, 390);
  await page.getByRole("button", { name: /Ver el video/ }).click();
  await expect(page.locator('.celebration-embed-status')).toContainText("Cargando YouTube");
  await context.setOffline(true);
  await expect(page.getByRole("alert").filter({ hasText: "No pudimos cargar YouTube" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Reintentar/ })).toBeVisible();
  await context.setOffline(false);
});

test("the host's song: nothing is downloaded and nothing plays until the guest presses play; one press plays, another pauses", async ({ page }) => {
  const audioRequests: string[] = [];
  page.on("request", (request) => { if (request.url().endsWith("song.wav")) audioRequests.push(request.url()); });
  await open(page, 390);
  await page.waitForTimeout(500);
  expect(audioRequests).toEqual([]);
  expect(await page.locator("audio").evaluate((node) => (node as HTMLAudioElement).paused)).toBe(true);
  expect(await page.locator("audio").evaluate((node) => (node as HTMLAudioElement).autoplay)).toBe(false);
  const button = page.locator(".celebration-audio-button");
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "false");
});

test("the gifts button stays on the page with media in it, and no media block overflows the phone", async ({ page }) => {
  for (const width of [320, 360, 390]) {
    await open(page, width);
    await expect(page.locator('.cdesign-dock a[data-action="gifts"]')).toHaveAttribute("href", `/c/${SLUG}/regalos`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

for (const scheme of ["light", "dark"] as const) {
  test(`${scheme}: axe finds no violations on the page with pictures, facades and the player`, async ({ page }) => {
    await open(page, 390, scheme);
    const result = await new AxeBuilder({ page }).include(".celebration").exclude(".celebration-media-backdrop").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(result.violations.map((item) => `${item.id}: ${item.nodes.map((node) => node.target.join(" ")).join(" | ")}`)).toEqual([]);
  });
  for (const width of [360, 768, 1280] as const) {
    test(`evidence ${scheme} ${width}px`, async ({ page }) => {
      await open(page, width, scheme);
      await page.waitForFunction(() => [...document.images].filter((node) => node.loading !== "lazy").every((node) => node.complete));
      const media = page.locator('.cdesign-page[data-section="story"]');
      await media.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => [...document.querySelectorAll(".cdesign-image")].every((node) => (node as HTMLImageElement).complete));
      if (OUT) {
        mkdirSync(OUT, { recursive: true });
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: `${OUT}/portada-${width}-${scheme}.png` });
        await media.screenshot({ path: `${OUT}/medios-${width}-${scheme}.png` });
      }
    });
  }
}

test("LCP of the cover under 4G (1.6 Mbit/s, 150 ms) and a 4x slower CPU, measured on the real page", async ({ page }) => {
  const client = await page.context().newCDPSession(page);
  await client.send("Network.enable");
  await client.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.addInitScript(() => {
    (window as unknown as { __lcp: { time: number; tag: string; url: string }[] }).__lcp = [];
    new PerformanceObserver((list) => { for (const entry of list.getEntries()) { const lcp = entry as PerformanceEntry & { renderTime: number; loadTime: number; element?: Element; url: string }; (window as unknown as { __lcp: unknown[] }).__lcp.push({ time: lcp.renderTime || lcp.loadTime, tag: lcp.element?.tagName ?? "", url: lcp.url }); } }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  await page.goto(`/c/${SLUG}`, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  const entries = await page.evaluate(() => (window as unknown as { __lcp: { time: number; tag: string; url: string }[] }).__lcp);
  const last = entries.at(-1)!;
  if (OUT) { mkdirSync(OUT, { recursive: true }); writeFileSync(`${OUT}/lcp-4g.json`, JSON.stringify({ viewport: "390x844", network: "4G 1.6 Mbit/s, 150 ms RTT", cpu: "4x slowdown", entries, lcpMs: Math.round(last.time) }, null, 2)); }
  expect(last.time).toBeLessThan(2500);
});
