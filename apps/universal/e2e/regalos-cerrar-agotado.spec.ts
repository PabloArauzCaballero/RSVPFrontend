import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { MOCK_CELEBRATION_ID } from "@rsvp/testing/contract-mock";

// Recorridos del anfitrión en Chromium real, a 360 y 1280 px: cerrar y reabrir la lista de regalos, y un regalo reservado cuyo producto se agotó.
// Gift se simula con page.route y estado en memoria (no hay backend en este recorrido: prueba la pantalla frente a las formas del contrato).
const OUT = process.env["STATES_EVIDENCE_DIR"];
const C = MOCK_CELEBRATION_ID;
const ITEMS = `**/gifts/celebrations/${C}/items*`;
const CLOSURE = `**/gifts/celebrations/${C}/gift-list/closure`;
const RESERVATIONS = `**/gifts/celebrations/${C}/reservations*`;
const gift = (id: string, over: Record<string, unknown> = {}) => ({ id, listId: "l", celebrationId: C, title: id, price: { amountMinor: 10000, currency: "BOB" }, source: "CATALOGED", status: "AVAILABLE", availability: "AVAILABLE", version: 0, createdAt: "2026-11-01T00:00:00Z", ...over });
const json = (body: unknown, status = 200) => ({ status, contentType: "application/json", body: JSON.stringify(body) });

interface World { closed: boolean; puts: unknown[]; items: unknown[]; reservations: unknown[]; closureStatus: number }
async function install(page: Page, world: World): Promise<void> {
  await page.route(ITEMS, (route) => route.fulfill(json({ items: world.items, partnerPriorityEnabled: true, nextCursor: null, closed: world.closed })));
  await page.route(RESERVATIONS, (route) => route.fulfill(json({ items: world.reservations })));
  await page.route(CLOSURE, (route) => {
    if (route.request().method() !== "PUT") return route.fallback();
    const body = route.request().postDataJSON() as { closed: boolean };
    world.puts.push(body);
    if (world.closureStatus !== 200) return route.fulfill(json({ type: "about:blank", title: "error", status: world.closureStatus }, world.closureStatus));
    world.closed = body.closed;
    return route.fulfill(json({ closed: world.closed, closedAt: world.closed ? "2026-11-28T12:00:00Z" : null }));
  });
}
const shot = async (page: Page, name: string): Promise<void> => { if (OUT) { mkdirSync(OUT, { recursive: true }); await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true }); } };
/** Nothing overflows sideways and the control at the centre of `locator` is the control itself (not covered by a fixed bar). */
async function reachable(page: Page, testId: string): Promise<void> {
  const node = page.getByTestId(testId).first();
  // The browser's own "if needed" scroll can park the control right under a fixed bar; a person scrolls it to the middle, so the check does too.
  await node.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const covered = await node.evaluate((el) => { const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !(top !== null && el.contains(top)); });
  expect(covered, `${testId} está tapado`).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

for (const width of [360, 1280]) {
  test.describe(`${width}px`, () => {
    test.beforeEach(async ({ page }) => { await page.setViewportSize({ width, height: width === 360 ? 740 : 900 }); });

    test("cerrar la lista pide confirmación, no envía nada hasta confirmar, queda «Cerrada» y se puede reabrir", async ({ page }) => {
      const world: World = { closed: false, puts: [], items: [gift("Torta")], reservations: [], closureStatus: 200 };
      await install(page, world);
      await page.goto(`/regalos?c=${C}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await expect(page.getByTestId("gift-closure").first()).toBeVisible({ timeout: 60_000 });
      await expect(page.getByTestId("gift-closure-status").first()).toHaveText("Abierta");
      await shot(page, `lista-abierta-${width}`);
      await reachable(page, "gift-closure-close");
      await page.getByTestId("gift-closure-close").first().click();
      await expect(page.getByText("¿Cerrar la lista de regalos?").first()).toBeVisible();
      await shot(page, `cerrar-confirmacion-${width}`);
      expect(world.puts).toHaveLength(0);
      await page.getByTestId("gift-closure-keep").first().click();
      await expect(page.getByTestId("gift-closure-status").first()).toHaveText("Abierta");
      expect(world.puts).toHaveLength(0);
      await page.getByTestId("gift-closure-close").first().click();
      await reachable(page, "gift-closure-confirm");
      await page.getByTestId("gift-closure-confirm").first().click();
      await expect(page.getByTestId("gift-closure-done").first()).toBeVisible();
      await expect(page.getByTestId("gift-closure-status").first()).toHaveText("Cerrada");
      expect(world.puts).toEqual([{ closed: true }]);
      await shot(page, `lista-cerrada-${width}`);
      // Reabrir.
      await reachable(page, "gift-closure-reopen");
      await page.getByTestId("gift-closure-reopen").first().click();
      const confirm = page.getByTestId("gift-closure-confirm").first();
      if (await confirm.isVisible().catch(() => false)) await confirm.click();
      await expect(page.getByTestId("gift-closure-status").first()).toHaveText("Abierta");
      expect(world.puts).toEqual([{ closed: true }, { closed: false }]);
      await shot(page, `lista-reabierta-${width}`);
    });

    test("un 403 al cerrar se dice con palabras y la lista sigue abierta", async ({ page }) => {
      const world: World = { closed: false, puts: [], items: [gift("Torta")], reservations: [], closureStatus: 403 };
      await install(page, world);
      await page.goto(`/regalos?c=${C}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.getByTestId("gift-closure-close").first().click({ timeout: 60_000 });
      await page.getByTestId("gift-closure-confirm").first().click();
      await expect(page.getByRole("alert").first()).toBeVisible();
      await expect(page.getByTestId("gift-closure-status").first()).toHaveText("Abierta");
      await shot(page, `cerrar-403-${width}`);
    });

    test("un producto agotado con reserva sigue «Reservado», avisa y conserva «Liberar»; el que no se agotó no avisa", async ({ page }) => {
      const held = gift("held", { title: "Vajilla dorada", status: "COMMITTED", quantity: 1, unitsLeft: 0, productUnavailable: true, productUnavailableReason: "OUT_OF_STOCK", productListingId: "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b" });
      const world: World = { closed: false, puts: [], items: [held, gift("ok")], reservations: [{ id: "r1", itemId: "held", celebrationId: C, status: "COMMITTED", requestedAt: "2026-11-02T00:00:00Z" }], closureStatus: 200 };
      await install(page, world);
      await page.goto(`/regalos?c=${C}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      const row = page.getByTestId("gift-held").first();
      await expect(row).toBeVisible({ timeout: 60_000 });
      await expect(page.getByTestId("gift-status-held").first()).toHaveText("Reservado");
      await expect(page.getByTestId("gift-soldout-held").first()).toContainText("Producto agotado");
      await expect(page.getByTestId("gift-soldout-reason-held").first()).toHaveText("Se agotó.");
      await expect(page.getByTestId("gift-soldout-held").first()).toContainText("La reserva se mantiene");
      await expect(page.getByTestId("gift-soldout-ok")).toHaveCount(0);
      await expect(page.getByTestId("gift-unavailable-section")).toHaveCount(0);
      await reachable(page, "release-held");
      await shot(page, `agotado-con-reserva-${width}`);
    });
  });
}
