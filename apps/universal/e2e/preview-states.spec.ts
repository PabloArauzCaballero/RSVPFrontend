import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { MOCK_CELEBRATION_ID } from "@rsvp/testing/contract-mock";

// P10 · the host preview when the public site cannot be reached: the offline state with a retry, never a blank frame.
const OUT = process.env["STATES_EVIDENCE_DIR"];

test("PL-134-R2-m3 · the host preview shows the offline state when the site does not answer, and retry goes back to loading", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/preview?c=${MOCK_CELEBRATION_ID}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  const error = page.getByTestId("preview-error").first();
  await expect(error).toBeVisible({ timeout: 30_000 });
  await expect(error).toHaveAttribute("role", "alert");
  await expect(error).toContainText("No pudimos cargar la vista previa");
  // m1: the retry is not under the fixed action bar: the element at its centre is the retry itself.
  const retry = page.getByTestId("preview-retry").first();
  const box = await retry.boundingBox();
  expect(box).not.toBeNull();
  const covered = await retry.evaluate((node, point) => !node.contains(document.elementFromPoint(point.x, point.y)), { x: (box?.x ?? 0) + (box?.width ?? 0) / 2, y: (box?.y ?? 0) + (box?.height ?? 0) / 2 });
  expect(covered).toBe(false);
  if (OUT) { mkdirSync(OUT, { recursive: true }); await page.screenshot({ path: `${OUT}/vista-previa-sin-red.png` }); }
  await page.getByTestId("preview-retry").first().click();
  await expect(page.getByTestId("preview-loading").first()).toBeVisible();
});
