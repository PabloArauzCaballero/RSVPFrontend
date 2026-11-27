import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

// F7 · denuncia pública desde la invitación real (next build + start sobre el fixture de contrato; el POST de la denuncia lo responde la prueba,
// no el backend: Celebration 1.8.0). Afirma lo que debe cumplirse; solo escribe imágenes cuando F7_EVIDENCE_DIR está definido (evidencia, nunca línea base).
const WITH_MUSIC = "fixture-v2-medios";
const MUSIC_HIDDEN = "fixture-v2-musica-oculta";
const ENGLISH = "fixture-v2-medios-en";
const OUT = process.env.F7_EVIDENCE_DIR;
const REPORTS = /\/celebrations\/public\/[^/]+\/reports$/;
// The browser only hands Retry-After to the page when the API exposes it across origins (the gateway must do the same; declared in the PR).
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST, OPTIONS", "access-control-expose-headers": "retry-after" };

interface Sent { readonly url: string; readonly body: Record<string, unknown>; readonly authorization: string | null }
/** Answers the preflight and the report; every real POST is recorded. */
async function answer(page: Page, sent: Sent[], respond: (route: Route) => Promise<void>): Promise<void> {
  await page.route(REPORTS, async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") { await route.fulfill({ status: 204, headers: CORS }); return; }
    sent.push({ url: request.url(), body: request.postDataJSON() as Record<string, unknown>, authorization: await request.headerValue("authorization") });
    await respond(route);
  });
}
const received = (route: Route) => route.fulfill({ status: 201, headers: CORS, contentType: "application/json", body: JSON.stringify({ id: "11111111-1111-4111-8111-111111111111", status: "RECEIVED" }) });
const refuse = (status: number, code: string, headers: Record<string, string> = {}) => (route: Route) => route.fulfill({ status, headers: { ...CORS, ...headers }, contentType: "application/problem+json", body: JSON.stringify({ title: code, status, code }) });

async function open(page: Page, slug: string, width = 390, scheme: "light" | "dark" = "light"): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
  await page.goto(`/c/${slug}`);
  await page.evaluate(() => document.fonts.ready);
}
const dialog = (page: Page) => page.getByRole("dialog");
const shot = async (page: Page, name: string): Promise<void> => { if (OUT) { mkdirSync(OUT, { recursive: true }); await page.screenshot({ path: join(OUT, `${name}.png`) }); } };

test("the foot offers to report the page and, only when the page plays the host's own MP3, the music apart; the gifts and reply buttons stay reachable", async ({ page }) => {
  await open(page, WITH_MUSIC);
  const footer = page.locator("[data-report-footer]");
  await footer.scrollIntoViewIfNeeded();
  await expect(footer.getByRole("button", { name: "Denunciar esta invitación" })).toBeVisible();
  await expect(footer.getByRole("button", { name: "Denunciar la música" })).toBeVisible();
  await expect(page.locator('.cdesign-dock a[data-action="gifts"]')).toHaveAttribute("href", `/c/${WITH_MUSIC}/regalos`);
  // A real click is refused by Playwright when something covers the button: the fixed dock must not sit on the foot.
  await footer.getByRole("button", { name: "Denunciar la música" }).click();
  await expect(dialog(page)).toBeVisible();
});

test("when moderation hid the own MP3 there is no player, no empty box, no report of the music, and the invitation, its photos and both buttons stay", async ({ page }) => {
  await open(page, MUSIC_HIDDEN);
  await expect(page.locator("audio")).toHaveCount(0);
  await expect(page.locator('.cdesign-el[data-block="music"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Denunciar la música" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Denunciar esta invitación" })).toBeVisible();
  await expect(page.locator(".cdesign-cover h1")).toBeVisible();
  await expect(page.locator('.cdesign-dock a[data-action="gifts"]')).toHaveAttribute("href", `/c/${MUSIC_HIDDEN}/regalos`);
  await expect(page.locator('.cdesign-dock [data-action="rsvp"], .cdesign-dock [data-action="rsvp-help"]').first()).toBeVisible();
  expect(await page.locator("img").evaluateAll((nodes) => nodes.filter((node) => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth === 0).length)).toBe(0);
  await shot(page, "musica-oculta-390");
});

test("a page that never had music does not offer to report it", async ({ page }) => {
  await open(page, "fixture-v2-marfil");
  await expect(page.getByRole("button", { name: "Denunciar esta invitación" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Denunciar la música" })).toHaveCount(0);
});

test("reporting the page: validation in place, one anonymous request, the received state, and focus returns to the button", async ({ page }) => {
  const sent: Sent[] = [];
  await answer(page, sent, received);
  await open(page, WITH_MUSIC);
  const opener = page.getByRole("button", { name: "Denunciar esta invitación" });
  await opener.click();
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page)).toHaveAccessibleName("Denunciar esta invitación");
  await expect(dialog(page).getByLabel("Motivo")).toBeFocused();
  await dialog(page).getByRole("button", { name: "Enviar denuncia" }).click();
  await expect(dialog(page).getByRole("alert")).toHaveText("Elige un motivo.");
  expect(sent).toHaveLength(0);
  await dialog(page).getByLabel("Motivo").selectOption("OTHER");
  await dialog(page).getByRole("button", { name: "Enviar denuncia" }).click();
  await expect(dialog(page).getByRole("alert")).toHaveText("Con este motivo cuéntanos qué pasa en el comentario.");
  await dialog(page).getByLabel(/Comentario/).fill("  Usan fotos mías sin permiso  ");
  await shot(page, "denuncia-formulario-390");
  await dialog(page).getByRole("button", { name: "Enviar denuncia" }).click();
  await expect(dialog(page).getByRole("status")).toContainText("Recibimos tu denuncia");
  expect(sent).toHaveLength(1);
  expect(sent[0]?.url).toContain(`/celebrations/public/${WITH_MUSIC}/reports`);
  expect(sent[0]?.body).toEqual({ reason: "OTHER", comment: "Usan fotos mías sin permiso" });
  expect(sent[0]?.authorization).toBeNull();
  await shot(page, "denuncia-recibida-390");
  await dialog(page).getByRole("button", { name: "Cerrar" }).click();
  await expect(dialog(page)).toBeHidden();
  await expect(opener).toBeFocused();
  // A second report opens on a clean form with the focus on its first field, not on a leftover of the confirmation.
  await opener.click();
  await expect(dialog(page).getByLabel("Motivo")).toBeFocused();
});

for (const scheme of ["light", "dark"] as const) {
  test(`keyboard only: focus is never dropped to the body while it sends, after a failure or on the confirmation, ${scheme}`, async ({ page }) => {
    const sent: Sent[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let first = true;
    await answer(page, sent, async (route) => { if (first) { first = false; await gate; await refuse(500, "INTERNAL")(route); return; } await received(route); });
    await open(page, WITH_MUSIC, 390, scheme);
    const opener = page.getByRole("button", { name: "Denunciar esta invitación" });
    await opener.focus();
    await page.keyboard.press("Enter");
    await dialog(page).getByLabel("Motivo").selectOption("SPAM");
    const send = dialog(page).getByRole("button", { name: "Enviar denuncia" });
    await send.focus();
    await page.keyboard.press("Enter");
    const sending = dialog(page).getByRole("button", { name: "Enviando…" });
    await expect(sending).toHaveAttribute("aria-disabled", "true");
    await expect(sending).toBeFocused();
    await page.keyboard.press("Enter");
    release();
    await expect(dialog(page).locator("[data-report-failure]")).toBeVisible();
    await expect(send).toBeFocused();
    expect(sent).toHaveLength(1);
    await page.keyboard.press("Enter");
    await expect(dialog(page).getByRole("heading", { name: "Recibimos tu denuncia" })).toBeFocused();
    await expect(dialog(page).getByRole("status")).toContainText("Recibimos tu denuncia");
    await page.keyboard.press("Tab");
    await expect(dialog(page).getByRole("button", { name: "Cerrar" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(opener).toBeFocused();
  });
}

test("at 360px the counter is never split in two lines", async ({ page }) => {
  await open(page, WITH_MUSIC, 360);
  await page.getByRole("button", { name: "Denunciar esta invitación" }).click();
  await dialog(page).getByLabel(/Comentario/).fill("x".repeat(1000));
  const counter = dialog(page).getByText("1000 de 1000");
  const lines = await counter.evaluate((node) => { const range = document.createRange(); range.selectNodeContents(node); return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size; });
  expect(lines).toBe(1);
});

test("reporting the music sends the reserved element and says only the music is reviewed", async ({ page }) => {
  const sent: Sent[] = [];
  await answer(page, sent, received);
  await open(page, WITH_MUSIC);
  await page.getByRole("button", { name: "Denunciar la música" }).click();
  await expect(dialog(page)).toContainText("Solo se revisa la música");
  await dialog(page).getByLabel("Motivo").selectOption("COPYRIGHT");
  await dialog(page).getByRole("button", { name: "Enviar denuncia" }).click();
  await expect(dialog(page).getByRole("status")).toBeVisible();
  expect(sent[0]?.body).toEqual({ reason: "COPYRIGHT", element: { kind: "SECTION", id: "music" } });
});

test("while it sends the form is locked and says so; a double click sends once", async ({ page }) => {
  const sent: Sent[] = [];
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await answer(page, sent, async (route) => { await gate; await received(route); });
  await open(page, WITH_MUSIC);
  await page.getByRole("button", { name: "Denunciar esta invitación" }).click();
  await dialog(page).getByLabel("Motivo").selectOption("SPAM");
  await dialog(page).getByRole("button", { name: "Enviar denuncia" }).dblclick();
  const sending = dialog(page).getByRole("button", { name: "Enviando…" });
  await expect(sending).toBeDisabled();
  await expect(dialog(page).getByLabel("Motivo")).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeVisible();
  await shot(page, "denuncia-enviando-390");
  release();
  await expect(dialog(page).getByRole("status")).toBeVisible();
  expect(sent).toHaveLength(1);
});

test.describe("errors keep what the guest typed", () => {
  const cases: readonly [string, (route: Route) => Promise<void>, string | RegExp][] = [
    ["429 with Retry-After", refuse(429, "RATE_LIMITED", { "retry-after": "125" }), "Se enviaron demasiadas denuncias desde tu conexión. Inténtalo de nuevo en 3 min."],
    ["422 invalid characters", refuse(422, "INVALID_TEXT_CHARACTER"), /caracteres que no podemos aceptar/],
    ["404 the invitation is gone", refuse(404, "NOT_FOUND"), "Esta invitación ya no está disponible, así que no hace falta denunciarla."],
    ["500", refuse(500, "INTERNAL"), /No pudimos enviar la denuncia\. Inténtalo de nuevo\. Tu texto sigue aquí\./],
    ["connection lost", (route) => route.abort("failed"), /Revisa tu conexión/]
  ];
  for (const [name, respond, words] of cases) {
    test(name, async ({ page }) => {
      const sent: Sent[] = [];
      await answer(page, sent, respond);
      await open(page, WITH_MUSIC);
      await page.getByRole("button", { name: "Denunciar esta invitación" }).click();
      await dialog(page).getByLabel("Motivo").selectOption("SPAM");
      await dialog(page).getByLabel(/Comentario/).fill("Es publicidad");
      await dialog(page).getByRole("button", { name: "Enviar denuncia" }).click();
      const alert = dialog(page).locator("[data-report-failure]");
      await expect(alert).toBeVisible();
      await expect(alert).toHaveText(words);
      await expect(dialog(page).getByLabel(/Comentario/)).toHaveValue("Es publicidad");
      await expect(dialog(page).getByLabel("Motivo")).toHaveValue("SPAM");
      await expect(dialog(page).getByRole("button", { name: "Enviar denuncia" })).toBeEnabled();
    });
  }

  test("after a failure the same text goes through on the next try", async ({ page }) => {
    const sent: Sent[] = [];
    let first = true;
    await answer(page, sent, (route) => { if (first) { first = false; return refuse(500, "INTERNAL")(route); } return received(route); });
    await open(page, WITH_MUSIC);
    await page.getByRole("button", { name: "Denunciar esta invitación" }).click();
    await dialog(page).getByLabel("Motivo").selectOption("SPAM");
    await dialog(page).getByRole("button", { name: "Enviar denuncia" }).click();
    await expect(dialog(page).locator("[data-report-failure]")).toBeVisible();
    await dialog(page).getByRole("button", { name: "Enviar denuncia" }).click();
    await expect(dialog(page).getByRole("status")).toBeVisible();
    expect(sent).toHaveLength(2);
  });
});

test("keyboard: Escape closes the dialog and focus goes back to the button that opened it; focus stays inside while it is open", async ({ page }) => {
  await open(page, WITH_MUSIC);
  const opener = page.getByRole("button", { name: "Denunciar la música" });
  await opener.focus();
  await page.keyboard.press("Enter");
  await expect(dialog(page)).toBeVisible();
  // The page behind a modal dialog is inert: Tab walks the dialog and then leaves to the browser (the body), never to a control of the page.
  for (let step = 0; step < 8; step += 1) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement === document.body || document.activeElement?.closest("dialog") !== null)).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeHidden();
  await expect(opener).toBeFocused();
});

test("the other language: en-US words end to end", async ({ page }) => {
  await open(page, ENGLISH);
  await page.getByRole("button", { name: "Report the music" }).click();
  await expect(dialog(page)).toHaveAccessibleName("Report the music");
  await dialog(page).getByRole("button", { name: "Send report" }).click();
  await expect(dialog(page).getByRole("alert")).toHaveText("Choose a reason.");
});

for (const scheme of ["light", "dark"] as const) {
  for (const width of [360, 768, 1280] as const) {
    test(`axe finds nothing serious in the foot and the open dialog, ${scheme} ${width}px, and nothing scrolls sideways`, async ({ page }) => {
      await open(page, WITH_MUSIC, width, scheme);
      await page.locator("[data-report-footer]").scrollIntoViewIfNeeded();
      const foot = await new AxeBuilder({ page }).include("[data-report-footer]").analyze();
      expect(foot.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
      await page.getByRole("button", { name: "Denunciar la música" }).click();
      await dialog(page).getByRole("button", { name: "Enviar denuncia" }).click();
      const open_ = await new AxeBuilder({ page }).include("dialog[open]").analyze();
      expect(open_.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const box = (await dialog(page).boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      await shot(page, `denuncia-dialogo-${scheme}-${width}`);
    });
  }
}
