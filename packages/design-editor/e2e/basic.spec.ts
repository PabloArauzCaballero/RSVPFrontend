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

test("Basic level on a real converted template: edit the gifts button text, pick a drawing, photos honestly unavailable", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1300 });
  await page.goto("/");
  // The document comes from convertV1ToV2: it has no heading/text blocks, only the gifts and confirm buttons carry text.
  const label = page.getByLabel("Texto del botón de regalos");
  await expect(label).toBeVisible();
  await label.fill("Ver la lista de regalos");
  await page.getByLabel("Dibujo de la portada").selectOption("ramo");
  await expect(page.getByTestId("photos-unavailable")).toContainText("Todavía no está disponible");
  await expect(page.getByTestId("save-status")).toContainText("Borrador guardado", { timeout: 5000 });
  const doc = await page.evaluate(() => window.__lastDocument);
  expect(doc.blocks.find((block: { id: string }) => block.id === "gifts-cta").config.label).toBe("Ver la lista de regalos");
  expect(doc.blocks.find((block: { type: string }) => block.type === "illustration").config).toMatchObject({ illustrationId: "ramo", tint: "accent" });
  await page.getByLabel("Dibujo de la portada").selectOption("anillos");
  await expect(page.getByTestId("save-status")).toContainText("Borrador guardado", { timeout: 5000 });
  const swapped = await page.evaluate(() => window.__lastDocument);
  expect(swapped.blocks.filter((block: { type: string }) => block.type === "illustration")).toHaveLength(1);
  await page.screenshot({ path: join(EVIDENCE, "b-textos-dibujos-1280.png"), fullPage: true });
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
});

test("an emptied required text is never silent; the optional label goes back to automatic", async ({ page }) => {
  await page.goto("/");
  const label = page.getByLabel("Texto del botón de confirmar");
  await label.fill("Confirmo");
  await label.fill("");
  await expect(page.getByTestId("save-status")).toContainText("Borrador guardado", { timeout: 5000 });
  const doc = await page.evaluate(() => window.__lastDocument);
  expect(doc.blocks.find((block: { id: string }) => block.id === "rsvp-cta").config).not.toHaveProperty("label");
  await expect(label).toHaveAccessibleDescription("Si lo dejas vacío, usamos el texto automático.");
  await expect(label).toHaveAttribute("aria-invalid", "false");
});

test("template list failure shows an alert with retry and then the picker", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/?templatesFail=1");
  await expect(page.getByRole("alert").filter({ hasText: "No pudimos cargar las plantillas" })).toBeVisible();
  await page.screenshot({ path: join(EVIDENCE, "b-plantillas-error-360.png"), fullPage: true });
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.getByLabel("Cambiar de plantilla")).toBeVisible();
});

test("without a drawing catalogue the panel says drawings are not available yet", async ({ page }) => {
  await page.goto("/?nodrawings=1&theme=dark");
  await expect(page.getByTestId("drawings-unavailable")).toContainText("Todavía no está disponible");
  await expect(page.getByLabel("Dibujo de la portada")).toHaveCount(0);
});

test("radio groups move with the arrow keys", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("radio", { name: "Mediano" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Grande" })).toBeFocused();
  await expect(page.getByRole("radio", { name: "Grande" })).toHaveAttribute("aria-checked", "true");
});

for (const width of [360, 768, 1280]) for (const theme of ["light", "dark"]) {
  test(`the canvas paints the chosen palette and the gifts button keeps its contrast at ${width} px ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/?theme=${theme}`);
    const required = page.locator('.de-el[data-required="true"]').first();
    await expect(required).toBeVisible();
    const group = page.getByRole("group", { name: theme === "dark" ? "Modo oscuro" : "Modo claro" });
    await group.getByLabel("Fondo").evaluate((node) => { const input = node as HTMLInputElement; const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set; set?.call(input, "#102030"); input.dispatchEvent(new Event("input", { bubbles: true })); });
    await expect(page.getByTestId("design-frame")).toHaveCSS("background-color", "rgb(16, 32, 48)");
    // The button paints its own fill and ink (accentFill / onAccent), whatever the page colour is.
    const { fill, ink } = await required.evaluate((node) => { const style = getComputedStyle(node); return { fill: style.backgroundColor, ink: style.color }; });
    const luminance = (rgb: string): number => { const [r, g, b] = (rgb.match(/\d+/g) ?? []).map(Number).map((value) => { const c = (value ?? 0) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }) as [number, number, number]; return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const ratio = (Math.max(luminance(fill), luminance(ink)) + 0.05) / (Math.min(luminance(fill), luminance(ink)) + 0.05);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    await page.screenshot({ path: join(EVIDENCE, `b-lienzo-paleta-${theme}-${width}.png`), fullPage: true });
  });
}
