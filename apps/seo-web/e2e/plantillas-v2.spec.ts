import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// F4 b · the three templates as design documents v2, drawn by the real site (next build + start) over the contract fixture.
// It asserts what must hold; it only writes pictures when F4B_EVIDENCE_DIR is set (evidence, never a baseline).
const TEMPLATES = ["marfil", "pinata", "gala"] as const;
const WIDTHS = [320, 360, 390, 768, 1280] as const;
const OUT = process.env.F4B_EVIDENCE_DIR;

async function open(page: Page, slug: string, width: number, scheme: "light" | "dark", reduced = true): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: reduced ? "reduce" : "no-preference" });
  await page.goto(`/c/${slug}`);
  await page.evaluate(() => document.fonts.ready);
}

for (const name of TEMPLATES) {
  for (const variant of ["", "-sinfoto"] as const) {
    for (const scheme of ["light", "dark"] as const) {
      for (const width of WIDTHS) {
        test(`${name}${variant} ${scheme} ${width}px: gifts button in view, no overflow, targets 44px`, async ({ page }) => {
          await open(page, `fixture-v2-${name}${variant}`, width, scheme);
          const gifts = page.locator('.cdesign-dock a[data-action="gifts"]');
          await expect(gifts).toBeVisible();
          await expect(gifts).toHaveAttribute("href", "/c/fixture-v2-" + name + variant + "/regalos");
          const box = await gifts.boundingBox();
          expect(box && box.height).toBeGreaterThanOrEqual(44);
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
          // still in view after scrolling to the end of the invitation
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await expect(gifts).toBeInViewport();
          await page.evaluate(() => window.scrollTo(0, 0));
          if (OUT && (width === 390 || width === 1280 || width === 320)) await page.screenshot({ path: `${OUT}/${name}${variant}-${width}-${scheme}.png`, fullPage: true });
        });
      }
      test(`${name}${variant} ${scheme}: axe finds no contrast or structure violations`, async ({ page }) => {
        await open(page, `fixture-v2-${name}${variant}`, 390, scheme);
        const result = await new AxeBuilder({ page }).include(".celebration").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
        expect(result.violations.map((item) => `${item.id}: ${item.nodes.map((node) => node.target.join(" ")).join(" | ")}`)).toEqual([]);
      });
    }
  }
}

test("motion: with reduced motion nothing is hidden or moving, and the entrance plays once without it", async ({ page }) => {
  await open(page, "fixture-v2-pinata", 390, "light", true);
  const still = await page.evaluate(() => [...document.querySelectorAll(".cdesign-el[data-entrance]")].every((node) => getComputedStyle(node).animationName === "none"));
  expect(still).toBe(true);
  await open(page, "fixture-v2-pinata", 390, "light", false);
  const played = await page.evaluate(() => [...document.querySelectorAll('.cdesign-page[data-page-kind="cover"] .cdesign-el[data-entrance]')].map((node) => getComputedStyle(node).animationIterationCount));
  expect(played.length).toBeGreaterThan(0);
  expect(played.every((count) => count === "1")).toBe(true);
});

test("the partner link of the recommendations goes through /r/{listingId}", async ({ page }) => {
  await open(page, "fixture-v2-marfil", 390, "light");
  const hrefs = await page.locator('a[data-link-kind="partner"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
  expect(hrefs).toEqual(["/r/7d1c1a34-5d4c-4a39-9a2e-0f4f2d3d7b11"]);
});
