import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { VISUAL_NOW } from "./clock";
import { AUTHED_SCREENS, WIDTHS } from "./screens";

// Visual gate of the Expo app (authed session). Baselines are machine output until a person reviews them in the PR
// (see docs/runbooks/visual-baselines.md). A green run means "unchanged since the baseline", not "approved".
for (const screen of AUTHED_SCREENS) {
  for (const width of WIDTHS) {
    test(`${screen.name} ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
      await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
      // Same instant as the visual server's clock: the app computes countdowns and "x days left" from Date.now().
      await page.clock.setFixedTime(VISUAL_NOW);
      await page.goto(screen.path, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      // Wait out indeterminate spinners (a progressbar with no value). Failed requests retry with backoff before they show their error state.
      await expect(page.locator("[role=progressbar]:not([aria-valuenow])")).toHaveCount(0, { timeout: 30_000 });
      await expect(page.locator("[role=main], [role=alert], [role=status]").first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect(page).toHaveScreenshot(`${screen.name}-${width}.png`);
      // Accessibility on the phone and the desktop layouts: no critical or serious WCAG 2.1 A/AA violations.
      if (width !== 768) {
        const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
        const blocking = violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
        expect(blocking.map((violation) => `${violation.id} (${violation.nodes.length}): ${violation.nodes[0]?.html.slice(0, 120)}`)).toEqual([]);
      }
    });
  }
}
