import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";

const EVIDENCE = join(dirname(fileURLToPath(import.meta.url)), "../../../docs/progress/evidence/plantillas-f5");
mkdirSync(EVIDENCE, { recursive: true });

test("Basic level: template, fonts, spacing, padding and sections (gifts locked)", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1100 });
  await page.goto("/");
  await expect(page.getByRole("checkbox", { name: /Regalos/ })).toBeDisabled();
  await expect(page.getByText("Siempre visible")).toBeVisible();
  await page.getByLabel("Cambiar de plantilla").selectOption("t-min");
  await expect(page.getByLabel("Títulos")).toHaveValue("fraunces");
  await page.getByLabel("Títulos").selectOption("playfair-display");
  await page.getByRole("radio", { name: "Amplio" }).click();
  await page.getByRole("radio", { name: "Mediano" }).click();
  await page.getByRole("checkbox", { name: /Preguntas frecuentes/ }).uncheck();
  await page.getByRole("button", { name: "Subir Itinerario" }).click();
  await expect(page.getByTestId("save-status")).toContainText("Borrador guardado", { timeout: 5000 });
  const doc = await page.evaluate(() => window.__lastDocument);
  expect(doc.tokens.typography.heading.family).toBe("playfair-display");
  expect(doc.tokens.spacing.section).toBe(72);
  expect(doc.pages.find((p: { section?: string }) => p.section === "faq").canvases.mobile.elements.every((e: { visible: boolean }) => !e.visible)).toBe(true);
  expect(doc.pages.find((p: { section?: string }) => p.section === "gifts").canvases.mobile.elements.every((e: { visible: boolean }) => e.visible)).toBe(true);
  await page.screenshot({ path: join(EVIDENCE, "b-modo-basico-1280.png"), fullPage: true });
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
});

test("Basic level at 360 px in dark and English", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/?lang=en-US&theme=dark");
  await expect(page.getByLabel("Switch template")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await page.screenshot({ path: join(EVIDENCE, "b-modo-basico-oscuro-en-360.png"), fullPage: true });
});
