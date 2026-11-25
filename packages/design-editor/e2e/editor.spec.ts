import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";

const EVIDENCE = join(dirname(fileURLToPath(import.meta.url)), "../../../docs/progress/evidence/plantillas-f5");
mkdirSync(EVIDENCE, { recursive: true });
const shot = (name: string) => join(EVIDENCE, `a-${name}.png`);

test.describe("editor shell (PR a)", () => {
  test("opens in Basic mode, mobile canvas, with the gifts block marked mandatory", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Ana y Luis" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Básico" })).toHaveAttribute("aria-checked", "true");
    await expect(page.locator('[data-block="giftsCta"][data-required="true"]').first()).toBeVisible();
    await page.screenshot({ path: shot("escritorio-claro-1280"), fullPage: true });
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
  });

  test("editing autosaves with If-Match and undo/redo restore the colour", async ({ page }) => {
    await page.goto("/");
    const accent = page.getByLabel("Color de acento (claro)");
    const original = await accent.inputValue();
    await accent.fill("#1f6f5c");
    await expect(page.getByTestId("save-status")).toContainText("Cambios sin guardar");
    await expect(page.getByTestId("save-status")).toContainText("Borrador guardado", { timeout: 5000 });
    const saves = await page.evaluate(() => window.__saves);
    expect(saves).toEqual([{ id: "design-1", version: 4, accent: "#1F6F5C" }]);
    await page.getByRole("button", { name: "Deshacer" }).click();
    expect(await accent.inputValue()).toBe(original);
    await accent.focus();
    await page.keyboard.press("Control+Shift+Z");
    expect(await accent.inputValue()).toBe("#1f6f5c");
    await page.keyboard.press("Control+Z");
    expect(await accent.inputValue()).toBe(original);
    await page.getByRole("button", { name: "Rehacer" }).click();
    expect(await accent.inputValue()).toBe("#1f6f5c");
    await expect(page.getByTestId("save-status")).toContainText("Borrador guardado", { timeout: 5000 });
  });

  test("the desktop canvas and the Advanced level switch the stage", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.getByRole("radio", { name: "Escritorio" }).click();
    await expect(page.getByTestId("design-frame")).toHaveAttribute("data-canvas", "desktop");
    await page.getByRole("radio", { name: "Avanzado" }).click();
    await expect(page.getByRole("radio", { name: "Avanzado" })).toHaveAttribute("aria-checked", "true");
    await page.screenshot({ path: shot("escritorio-lienzo-escritorio-1280") });
  });

  test("mobile viewport has no horizontal scroll and 44px targets", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    for (const button of await page.getByRole("button").all()) {
      const box = await button.boundingBox();
      if (box) expect(box.height).toBeGreaterThanOrEqual(43.5);
    }
    await page.screenshot({ path: shot("movil-claro-360"), fullPage: true });
  });

  test("dark theme and English", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/?theme=dark&lang=en-US");
    await expect(page.getByRole("radio", { name: "Advanced" })).toBeVisible();
    await page.screenshot({ path: shot("escritorio-oscuro-en-1280"), fullPage: true });
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
  });

  test("a 409 stops saving and offers the newer version; offline retries", async ({ page }) => {
    await page.goto("/?fail=409");
    await page.getByLabel("Color de acento (claro)").fill("#1f6f5c");
    await expect(page.getByTestId("save-status")).toContainText("Alguien guardó otra versión", { timeout: 5000 });
    await expect(page.getByRole("button", { name: "Cargar la versión nueva" })).toBeVisible();
    await page.screenshot({ path: shot("conflicto-1280") });
    await page.goto("/?fail=offline");
    await page.getByLabel("Color de acento (claro)").fill("#1f6f5c");
    await expect(page.getByTestId("save-status")).toContainText("Reintentamos en 2 s", { timeout: 5000 });
  });
});
