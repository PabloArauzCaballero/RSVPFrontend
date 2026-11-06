import { expect, test } from "@playwright/test";
import { AUTHED_SCREENS, WIDTHS } from "./screens";

// Visual gate of the Expo app (authed session). Baselines are machine output until a person reviews them in the PR
// (see docs/runbooks/visual-baselines.md). A green run means "unchanged since the baseline", not "approved".
for (const screen of AUTHED_SCREENS) {
  for (const width of WIDTHS) {
    test(`${screen.name} ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
      await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
      await page.goto(screen.path, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator("[role=main], [role=alert], [role=status]").first()).toBeVisible();
      // Indeterminate spinners only: the response bar is a progressbar with a value. Failed requests retry with backoff before showing their error state.
      await expect(page.locator("[role=progressbar]:not([aria-valuenow])")).toHaveCount(0, { timeout: 30_000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect(page).toHaveScreenshot(`${screen.name}-${width}.png`);
    });
  }
}
