import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { VISUAL_NOW } from "./clock";
import { DARK_ANON_SCREENS, DARK_WIDTHS } from "./screens";

// Dark scheme of the visual gate (anon session): a subset of routes at phone and desktop width. The scheme comes from the system
// (`colorScheme: dark`), the way a person with a dark device meets the app. Baselines are machine output until a person reviews them in the PR.
for (const screen of DARK_ANON_SCREENS) {
  for (const width of DARK_WIDTHS) {
    test(`${screen.name} dark ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
      await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
      await page.clock.setFixedTime(VISUAL_NOW);
      await page.goto(screen.path, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator("[role=progressbar]:not([aria-valuenow])")).toHaveCount(0, { timeout: 30_000 });
      await expect(page.locator("[role=main], [role=alert], [role=status]").first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.getAttribute("data-theme"))).toBe("dark");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect(page).toHaveScreenshot(`${screen.name}-dark-${width}.png`);
      const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const blocking = violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
      expect(blocking.map((violation) => `${violation.id} (${violation.nodes.length}): ${violation.nodes[0]?.html.slice(0, 120)}`)).toEqual([]);
    });
  }
}
