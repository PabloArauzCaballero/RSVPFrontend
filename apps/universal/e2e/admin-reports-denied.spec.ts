import { expect, test } from "@playwright/test";

// F7 · a signed-in HOST who types the address of «Denuncias» is refused in real Chrome (by the guard of the (admin) group, before the
// screen mounts; `adminOnly` is the second layer, covered by the unit test), and no moderation request leaves.
test("F7 · a host sees access denied on /admin/denuncias and no moderation request leaves", async ({ page }) => {
  const asked: string[] = [];
  page.on("request", (request) => { const { pathname } = new URL(request.url()); if (/^\/(celebrations|media)\/.*admin|^\/media\/celebrations\//.test(pathname)) asked.push(pathname); });
  await page.goto("/admin/denuncias", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await expect(page.getByRole("heading", { name: "Esta sección es de otra cuenta" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: /Abrir denuncia/ })).toHaveCount(0);
  await page.waitForLoadState("networkidle");
  expect(asked).toEqual([]);
});
