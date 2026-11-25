import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { createServer, type Server } from "node:http";
import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { PREVIEW_PAYLOAD, PREVIEW_READY, themeFromTemplate, type TemplateDocument } from "@rsvp/celebration-theme";

// Los casos «web app» (M2, M3) necesitan F6B_APP_DIST: `EXPO_PUBLIC_SITE_URL=http://localhost:$E2E_PORT EXPO_PUBLIC_API_URL=/api npx expo export --clear --platform web`
// (API relativa: una URL http de API falla en un build de release; `--clear`: Metro cachea las variables EXPO_PUBLIC_*).
// F6-b (P10) · /vista-previa en el sitio real, embebida por un arnés que hace de la app en OTRO origen. Afirma lo que debe cumplirse;
// solo escribe imágenes cuando F6B_EVIDENCE_DIR está definido (evidencia, nunca línea base).
const SITE_PORT = Number(process.env.E2E_PORT ?? 3110);
const APP_PORT = Number(process.env.E2E_APP_PORT ?? 3111);
const API = `http://localhost:${SITE_PORT + 1}`;
const APP = `http://localhost:${APP_PORT}`;
const OTHER = `http://127.0.0.1:${APP_PORT}`;
const SLUG = "fixture-v2-medios";
const OUT = process.env.F6B_EVIDENCE_DIR;
/** `expo export --platform web` built with EXPO_PUBLIC_SITE_URL=http://localhost:$E2E_PORT (only the web-app cases need it). */
const DIST = process.env.F6B_APP_DIST;
const TYPES: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".ico": "image/x-icon", ".png": "image/png", ".ttf": "font/ttf", ".svg": "image/svg+xml" };

/** The harness plays the app: it frames the site's preview page and answers its ready message with the payload. */
const HARNESS = (site: string, payload: unknown) => `<!doctype html><meta charset="utf-8"><title>harness</title>
<style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%}</style>
<iframe id="f" title="Vista previa" src="${site}/vista-previa"></iframe>
<script>
  const payload = ${JSON.stringify(payload)}; const site = ${JSON.stringify(site)}; const log = [];
  window.__log = log;
  window.addEventListener("message", (event) => {
    log.push({ origin: event.origin, type: event.data && event.data.type });
    if (event.origin !== site || !event.data || event.data.type !== ${JSON.stringify(PREVIEW_READY)}) return;
    document.getElementById("f").contentWindow.postMessage({ type: ${JSON.stringify(PREVIEW_PAYLOAD)}, payload }, site);
  });
</script>`;

async function payloadFromApi(page: Page) {
  const view = await (await page.request.get(`${API}/celebrations/public/${SLUG}`)).json();
  const template = (await (await page.request.get(`${API}/media/templates/${view.templateId}`)).json()) as TemplateDocument;
  const gallery = (await (await page.request.get(`${API}/media/public/celebrations/${view.celebrationId}/assets`)).json()).items;
  return { theme: themeFromTemplate(template, view.enabledSections), view, gallery };
}
// A real (local) server, not a route: the browser treats a fulfilled route as a public page and blocks it from framing localhost.
let harness: Server;
let current: unknown = null;
test.beforeAll(async () => {
  harness = createServer((request, response) => {
    const path = new URL(request.url ?? "/", APP).pathname;
    if (path.startsWith("/api/")) { response.writeHead(404, { "content-type": "application/problem+json" }); response.end("{}"); return; }
    if (path !== "/harness" && DIST) {
      // The exported Expo web app (SPA): a file when there is one, index.html otherwise.
      const file = join(DIST, path);
      const found = existsSync(file) && statSync(file).isFile() ? file : join(DIST, "index.html");
      response.writeHead(200, { "content-type": TYPES[extname(found)] ?? "application/octet-stream" });
      response.end(readFileSync(found));
      return;
    }
    response.writeHead(200, { "content-type": "text/html" });
    response.end(HARNESS(`http://localhost:${SITE_PORT}`, current));
  });
  await new Promise<void>((resolve) => harness.listen(APP_PORT, resolve));
});
test.afterAll(async () => { await new Promise((resolve) => harness.close(resolve)); });

async function serveHarness(page: Page, origin: string, payload: unknown): Promise<void> {
  current = payload;
  await page.goto(`${origin}/harness`);
}

test("the app's origin frames the preview page, which draws the payload with the public renderer", async ({ page }) => {
  const payload = await payloadFromApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await serveHarness(page, APP, payload);
  const frame = page.frameLocator("#f");
  await expect(frame.getByRole("heading", { level: 1 })).toHaveText(payload.view.content.title);
  await expect(frame.locator('a[data-action="gifts"]').first()).toHaveAttribute("href", `/c/${SLUG}/regalos`);
  // The preview is inert: a link in it does not leave the page.
  const before = page.frames().map((item) => item.url());
  await frame.locator('a[data-action="gifts"]').first().click();
  expect(page.frames().map((item) => item.url())).toEqual(before);
  const axe = await new AxeBuilder({ page }).include("#f").analyze();
  expect(axe.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
  if (OUT) {
    mkdirSync(OUT, { recursive: true });
    for (const width of [360, 768, 1280]) {
      await page.setViewportSize({ width, height: width === 1280 ? 800 : 900 });
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/vista-previa-${width}.png` });
    }
  }
});

test("headers: only the app's origin may frame it, and it is never cached, indexed or sent with a Referer", async ({ request }) => {
  const response = await request.get("/vista-previa");
  expect(response.status()).toBe(200);
  const headers = response.headers();
  expect(headers["content-security-policy"]).toBe(`frame-ancestors ${APP}`);
  expect(headers["x-frame-options"]).toBeUndefined();
  expect(headers["cache-control"]).toBe("no-store");
  expect(headers["referrer-policy"]).toBe("no-referrer");
  expect(headers["x-robots-tag"]).toContain("noindex");
  // Every other page still refuses to be framed.
  const invitation = await request.get(`/c/${SLUG}`);
  expect(invitation.headers()["x-frame-options"]).toBe("DENY");
  expect(invitation.headers()["content-security-policy-report-only"]).toContain("frame-ancestors 'none'");
});

test("negative: another origin cannot frame it, so it never gets a payload", async ({ page }) => {
  const payload = await payloadFromApi(page);
  const refused: string[] = [];
  page.on("console", (message) => { if (/frame-ancestors|Refused to frame/i.test(message.text())) refused.push(message.text()); });
  await serveHarness(page, OTHER, payload);
  await page.waitForTimeout(1500);
  await expect(page.frameLocator("#f").getByRole("heading", { level: 1 })).toHaveCount(0);
  expect(refused.length).toBeGreaterThan(0);
});

test("negative: a page that posts without being the parent, or from another origin, draws nothing", async ({ page }) => {
  await page.goto("/vista-previa");
  await expect(page.getByTestId("preview-waiting")).toBeVisible();
  await page.evaluate((type) => window.postMessage({ type, payload: {} }, "*"), PREVIEW_PAYLOAD);
  await page.waitForTimeout(300);
  await expect(page.getByTestId("preview-render")).toHaveCount(0);
});

test("PL-134-M1 · a credential in the fragment is stored and the address cleaned before anything of a third party loads; the reply says «Confirmar asistencia»", async ({ page }) => {
  const token = "g".repeat(43);
  // A Referer never carries a fragment; the check is that no request (first or third party) leaks the token, and that no third-party FRAME exists while the hash is there.
  const leaked: string[] = [];
  page.on("request", (request) => { if (/t=g{16}|#t=/.test(`${request.url()} ${request.headers()["referer"] ?? ""}`)) leaked.push(request.url()); });
  await page.goto(`/c/${SLUG}#t=${token}`);
  await expect(page.locator('a[data-action="rsvp-help"]:visible').first()).toContainText("Confirmar asistencia");
  expect(await page.evaluate(() => location.hash)).toBe("");
  expect(await page.evaluate((slug) => sessionStorage.getItem(`rsvp.guest.credential.${slug}`), SLUG)).toBe(token);
  expect(leaked).toEqual([]);
  expect(page.frames().filter((frame) => frame !== page.mainFrame())).toEqual([]);
});

test("PL-134-M2 · web app: with the site unreachable the guest sees the offline state with retry and the gifts button, and retry goes to the site once it answers", async ({ page }) => {
  test.skip(!DIST, "needs F6B_APP_DIST (expo export --platform web)");
  await page.setViewportSize({ width: 1440, height: 900 });
  let blocked = true;
  await page.route(`http://localhost:${SITE_PORT}/**`, (route) => (blocked ? route.abort("connectionrefused") : route.continue()));
  await page.goto(`${APP}/c/${SLUG}`);
  await expect(page.getByTestId("guest-retry")).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId("invitation-gifts")).toBeVisible();
  // One column for every state: the offline card is as wide as the loading column.
  expect((await page.getByTestId("guest-column").boundingBox())?.width).toBe(640);
  if (OUT) { mkdirSync(OUT, { recursive: true }); await page.screenshot({ path: `${OUT}/web-sin-red.png` }); }
  blocked = false;
  await page.getByTestId("guest-retry").click();
  await page.waitForURL(new RegExp(`^http://localhost:${SITE_PORT}/c/${SLUG}`), { timeout: 15000 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("PL-134-M3 · web app at 1440: the loading state keeps the guest column (640 px, the offline card's), centred", async ({ page }) => {
  test.skip(!DIST, "needs F6B_APP_DIST (expo export --platform web)");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route(`http://localhost:${SITE_PORT}/**`, () => undefined);
  await page.goto(`${APP}/c/${SLUG}`);
  const column = page.getByTestId("invitation-loading-column");
  await expect(column).toBeVisible();
  const box = await column.boundingBox();
  expect(box?.width).toBe(640);
  expect(Math.abs((box?.x ?? 0) + (box?.width ?? 0) / 2 - 720)).toBeLessThan(4);
  if (OUT) await page.screenshot({ path: `${OUT}/web-cargando-1440.png` });
});
