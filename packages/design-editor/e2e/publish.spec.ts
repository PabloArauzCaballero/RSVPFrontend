import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";

const EVIDENCE = join(dirname(fileURLToPath(import.meta.url)), "../../../docs/progress/evidence/plantillas-f5");
mkdirSync(EVIDENCE, { recursive: true });

test("contrast warns live and suggests a fix; publishing creates a version; restoring copies it to the draft without publishing", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto("/");
  await expect(page.getByText("Todos los textos se leen bien")).toBeVisible();
  await page.getByRole("group", { name: "Modo claro" }).getByLabel("Acento").fill("#cccccc");
  await expect(page.getByText(/el acento sobre el fondo en modo claro/)).toBeVisible();
  await expect(page.getByText(/puedes publicar igual/)).toBeVisible();
  await page.screenshot({ path: join(EVIDENCE, "e-aviso-contraste-1280.png"), fullPage: true });
  await page.getByRole("button", { name: /^Usar #/ }).first().click();
  await expect(page.getByText(/el acento sobre el fondo en modo claro/)).toHaveCount(0);
  await expect(page.getByText("Versión 1")).toBeVisible();
  await expect(page.getByText(/11:30 a\. m\./)).toBeVisible();
  await page.getByLabel("Nombre de esta versión (opcional)").fill("Con acento nuevo");
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page.getByText("Publicada la versión 2.")).toBeVisible();
  await page.screenshot({ path: join(EVIDENCE, "e-publicar-versiones-1280.png"), fullPage: true });
  const accent = page.getByRole("group", { name: "Modo claro" }).getByLabel("Acento");
  const published = await accent.inputValue();
  await accent.fill("#1f6f5c");
  await page.getByRole("button", { name: "Restaurar" }).last().click();
  await expect(page.getByText(/Versión 1 copiada al borrador/)).toBeVisible();
  expect(await accent.inputValue()).not.toBe(published);
  await expect(page.getByTestId("save-status")).toContainText("Borrador guardado", { timeout: 5000 });
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
});

test("English and dark at 360 px: panels fit", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/?lang=en-US&theme=dark");
  await expect(page.getByRole("button", { name: "Publish" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await page.screenshot({ path: join(EVIDENCE, "e-publicar-oscuro-en-360.png"), fullPage: true });
});
