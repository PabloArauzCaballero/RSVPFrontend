import { mkdirSync } from "node:fs";
import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

// F7 · the administrator's «Denuncias» screen in real Chrome (Expo web). The API is answered by the test (the screen's own requests, states under control);
// the preview link is answered by the test too, so a link that works once and then 404 is what the browser really loads. Not the real backend (declared in the PR).
const OUT = process.env["STATES_EVIDENCE_DIR"];
const API = `http://localhost:${process.env["MOCK_PORT"] ?? 28301}`;
const MEDIA = "https://media.test";
const CELEBRATION = "11111111-1111-4111-8111-111111111111";
/** The app's client sends credentials, so the answer names the origin and allows them (a wildcard is refused by the browser). */
const cors = (route: Route): Record<string, string> => ({
  "access-control-allow-origin": route.request().headers()["origin"] ?? "*", "access-control-allow-credentials": "true", "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": route.request().headers()["access-control-request-headers"] ?? "*", "access-control-expose-headers": "retry-after, x-correlation-id"
});
const PIXEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAHnOcQAAAAABJRU5ErkJggg==", "base64");
const REPORT = { id: "r-1", celebrationId: CELEBRATION, slug: "ana-y-luis", reason: "COPYRIGHT", comment: "<img src=x onerror=alert(1)> Usan mi canción", element: { kind: "SECTION", id: "music" }, reporterRef: "a1b2c3d4e5f6", status: "OPEN", createdAt: "2026-11-26T15:00:00Z", resolvedAt: null, resolvedBy: null, resolutionNote: null };
const DETAIL = {
  report: REPORT, celebration: { id: CELEBRATION, slug: "ana-y-luis", status: "PUBLISHED", ownerId: "22222222-2222-4222-8222-222222222222" }, openReportsForCelebration: 1, distinctReportersForCelebration: 1,
  takedowns: [{ id: "t-1", celebrationId: CELEBRATION, reportId: "r-1", slug: "ana-y-luis", scope: "ELEMENT", element: { kind: "SECTION", id: "music" }, reason: "COPYRIGHT", guidance: null, hiddenBy: "u-admin", hiddenAt: "2026-11-26T16:00:00Z", appealStatus: "NONE", restoredAt: null }],
  audit: [{ id: "e-1", celebrationId: CELEBRATION, reportId: "r-1", takedownId: null, action: "REPORT_RECEIVED", actorId: null, actorKind: "ANONYMOUS", at: "2026-11-26T15:00:00Z", reason: null, details: {} }]
};
const ASSETS = { items: [{ id: "a-photo", filename: "boda.jpg", purpose: "gallery", status: "PROCESSED", hidden: true, variants: {} }, { id: "a-ok", filename: "visible.jpg", purpose: "gallery", status: "PROCESSED", hidden: false, variants: {} }] };

type Respond = (route: Route) => Promise<void>;
const json = (status: number, body: unknown, extra: Record<string, string> = {}): Respond => (route) => route.fulfill({ status, headers: { ...cors(route), ...extra }, contentType: status >= 400 ? "application/problem+json" : "application/json", body: JSON.stringify(body) });

/** Routes of the screen: answers the preflights, then the handler of each path. */
async function serve(page: Page, handlers: { queue?: Respond; detail?: Respond; assets?: Respond; issue?: Respond }): Promise<{ issued: string[] }> {
  const issued: string[] = [];
  await page.route(`${API}/**`, async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") { await route.fulfill({ status: 204, headers: cors(route) }); return; }
    const { pathname } = new URL(request.url());
    if (pathname === "/celebrations/admin/reports") return (handlers.queue ?? json(200, { items: [REPORT] }))(route);
    if (pathname === "/celebrations/admin/reports/r-1") return (handlers.detail ?? json(200, DETAIL))(route);
    if (pathname === `/media/celebrations/${CELEBRATION}/assets`) return (handlers.assets ?? json(200, ASSETS))(route);
    if (pathname === "/media/admin/assets/a-photo/preview-links") { issued.push(pathname); return (handlers.issue ?? json(201, { url: `${MEDIA}/public/previews/token-${issued.length}`, expiresAt: "2026-11-27T12:05:00Z", variant: "thumb", singleUse: true }))(route); }
    return route.fulfill({ status: 404, headers: cors(route), contentType: "application/problem+json", body: JSON.stringify({ title: "Not found", status: 404 }) });
  });
  return { issued };
}
/** The link works once: the first request for a token is the picture, any repeat is the same 404 as an unknown one. */
async function oneShotLinks(page: Page): Promise<string[]> {
  const opened: string[] = [];
  await page.route(`${MEDIA}/public/previews/*`, async (route) => {
    const token = new URL(route.request().url()).pathname;
    if (opened.includes(token)) { await route.fulfill({ status: 404, body: "" }); return; }
    opened.push(token);
    await route.fulfill({ status: 200, contentType: "image/png", body: PIXEL, headers: { "cache-control": "no-store" } });
  });
  return opened;
}
async function open(page: Page, width = 390, scheme: "light" | "dark" = "light"): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
  await page.goto("/admin/denuncias", { waitUntil: "domcontentloaded", timeout: 120_000 });
}
const shot = async (page: Page, name: string): Promise<void> => { if (OUT) { mkdirSync(OUT, { recursive: true }); await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true }); } };
const detail = async (page: Page): Promise<void> => { await page.getByRole("button", { name: "Abrir denuncia ana-y-luis" }).click(); await expect(page.getByTestId("report-comment")).toBeVisible({ timeout: 30_000 }); };

test("F7 · an empty queue says there is nothing open", async ({ page }) => {
  await serve(page, { queue: json(200, { items: [] }) });
  await open(page);
  await expect(page.getByText("No hay denuncias abiertas.")).toBeVisible({ timeout: 60_000 });
  await shot(page, "denuncias-vacio-390");
});

test("F7 · a failed queue offers a retry that loads it", async ({ page }) => {
  let fail = true;
  await serve(page, { queue: (route) => (fail ? json(500, { title: "x", status: 500 })(route) : json(200, { items: [REPORT] })(route)) });
  await open(page);
  const retry = page.getByTestId("admin-retry");
  await expect(retry).toBeVisible({ timeout: 60_000 });
  await shot(page, "denuncias-error-390");
  fail = false;
  await retry.click();
  await expect(page.getByRole("button", { name: "Abrir denuncia ana-y-luis" })).toBeVisible();
});

test("F7 · the stranger's comment is text, never markup, and the hidden file opens once: the second link of the same file is refused and the screen says so", async ({ page }) => {
  const { issued } = await serve(page, {});
  const opened = await oneShotLinks(page);
  let dialogs = 0;
  page.on("dialog", async (dialog) => { dialogs += 1; await dialog.dismiss(); });
  await open(page);
  await detail(page);
  await expect(page.getByTestId("report-comment")).toHaveText("<img src=x onerror=alert(1)> Usan mi canción");
  await expect(page.getByTestId("report-comment").locator("img")).toHaveCount(0);
  expect(dialogs).toBe(0);
  const row = page.getByTestId("hidden-file-a-photo");
  await expect(row).toBeVisible();
  await expect(page.getByText("visible.jpg")).toHaveCount(0);
  expect(issued).toHaveLength(0);
  await row.getByRole("button", { name: "Ver archivo oculto" }).click();
  const image = row.getByRole("img", { name: "Archivo oculto por moderación: boda.jpg" });
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(row.getByText(/sirve una sola vez y vence en 5 minutos/)).toBeVisible();
  expect(opened).toEqual(["/public/previews/token-1"]);
  await shot(page, "denuncias-vista-previa-390");
  // A second look needs a new link; the first one, used again, is the same 404 as any unknown link.
  await page.route(`${MEDIA}/public/previews/token-2`, (route) => route.fulfill({ status: 404, body: "" }));
  await row.getByRole("button", { name: "Pedir otro enlace" }).click();
  await expect(row.getByText("No se pudo abrir el archivo. El enlace sirve una sola vez: pide otro.")).toBeVisible();
  await expect(row.getByRole("img")).toHaveCount(0);
  expect(issued).toHaveLength(2);
  await shot(page, "denuncias-enlace-usado-390");
});

test("F7 · a 409 while the bytes still move and a 403 are explained", async ({ page }) => {
  let answer = 409;
  await serve(page, { issue: (route) => json(answer, { title: "x", status: answer, code: answer === 409 ? "ASSET_NOT_QUARANTINED" : "FORBIDDEN" })(route) });
  await open(page);
  await detail(page);
  const row = page.getByTestId("hidden-file-a-photo");
  await row.getByRole("button", { name: "Ver archivo oculto" }).click();
  await expect(row.getByText("El archivo aún se está moviendo a cuarentena. Inténtalo de nuevo en un minuto.")).toBeVisible();
  answer = 403;
  await row.getByRole("button", { name: "Ver archivo oculto" }).click();
  await expect(row.getByText("Solo los administradores pueden mirar archivos ocultos.")).toBeVisible();
});

test("F7 · the files that cannot be read leave a retry, not a blank block", async ({ page }) => {
  let fail = true;
  await serve(page, { assets: (route) => (fail ? json(500, { title: "x", status: 500 })(route) : json(200, { items: [] })(route)) });
  await open(page);
  await detail(page);
  await expect(page.getByText("No pudimos cargar los archivos de esta invitación.")).toBeVisible();
  fail = false;
  await page.getByTestId("files-retry").click();
  await expect(page.getByTestId("files-none")).toBeVisible();
});

for (const scheme of ["light", "dark"] as const) {
  test(`F7 · keyboard only: opening a report, asking for the hidden file and going back never drop the focus to the body, ${scheme}`, async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const { issued } = await serve(page, { issue: async (route) => { await gate; await json(201, { url: `${MEDIA}/public/previews/token-1`, expiresAt: "2026-11-27T12:05:00Z", variant: "thumb", singleUse: true })(route); } });
    await oneShotLinks(page);
    await open(page, 390, scheme);
    const opener = page.getByRole("button", { name: "Abrir denuncia ana-y-luis" });
    await expect(opener).toBeVisible({ timeout: 60_000 });
    await opener.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Denuncia de ana-y-luis" })).toBeFocused();
    await expect(page.getByTestId("report-comment")).toBeVisible();
    const ask = page.getByTestId("preview-ask-a-photo");
    await ask.focus();
    await page.keyboard.press("Enter");
    await expect(ask).toHaveAccessibleName("Pidiendo el enlace…");
    await expect(ask).toBeFocused();
    await page.keyboard.press("Enter");
    release();
    await expect(page.getByRole("img", { name: /Archivo oculto/ })).toBeVisible();
    await expect(ask).toBeFocused();
    expect(issued).toHaveLength(1);
    await page.getByTestId("report-back").focus();
    await page.keyboard.press("Enter");
    await expect(opener).toBeFocused();
  });
}

for (const scheme of ["light", "dark"] as const) {
  for (const width of [360, 768, 1280] as const) {
    test(`F7 · axe finds nothing serious in the queue and the report, ${scheme} ${width}px, and nothing scrolls sideways`, async ({ page }) => {
      await serve(page, {});
      await oneShotLinks(page);
      await open(page, width, scheme);
      await expect(page.getByRole("button", { name: "Abrir denuncia ana-y-luis" })).toBeVisible({ timeout: 60_000 });
      const queue = await new AxeBuilder({ page }).analyze();
      expect(queue.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
      await shot(page, `denuncias-cola-${scheme}-${width}`);
      await detail(page);
      await page.getByTestId("hidden-file-a-photo").getByRole("button", { name: "Ver archivo oculto" }).click();
      await expect(page.getByRole("img", { name: /Archivo oculto/ })).toBeVisible();
      const report = await new AxeBuilder({ page }).analyze();
      expect(report.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await shot(page, `denuncias-detalle-${scheme}-${width}`);
    });
  }
}
