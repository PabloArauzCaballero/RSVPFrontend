import { expect, test } from "@playwright/test";

// The catalog shows every primitive in every state, so one screenshot per width and scheme guards the whole set.
const WIDTHS = [360, 768, 1280] as const;
const SCHEMES = ["light", "dark"] as const;

for (const scheme of SCHEMES) {
  for (const width of WIDTHS) {
    test(`catalogo ${scheme} ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      await page.goto("/catalogo");
      if (scheme === "dark") await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect(page).toHaveScreenshot(`${scheme}-${width}.png`, { fullPage: true });
    });
  }
}

test("landing 360/1280 keeps its approved look", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [360, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`landing-${width}.png`, { fullPage: true });
  }
});
