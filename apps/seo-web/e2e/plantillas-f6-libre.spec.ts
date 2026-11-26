import { expect, test, type Page } from "@playwright/test";

// F6 R5 · the free canvas (rows fixed by the document, the editor's Advanced level) and the advanced stylesheet published in `design.custom.css`.
const SLUG = "fixture-v2-libre";

async function open(page: Page, width: number): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto(`/c/${SLUG}`);
  await page.evaluate(() => document.fonts.ready);
}

for (const width of [360, 1280] as const) {
  for (const zoom of [1, 2] as const) {
    test(`free canvas at ${width}px with the text at ${zoom * 100}%: no content is cut (WCAG 1.4.4)`, async ({ page }) => {
      await open(page, width);
      expect(await page.locator('.cdesign-canvas[data-mode="free"]').count()).toBeGreaterThan(3);
      // Text at 200%: every block's content is drawn twice as large inside its own column.
      if (zoom === 2) await page.addStyleTag({ content: ".cdesign-author { zoom: 2 }" });
      await page.evaluate(() => document.fonts.ready);
      const cut = await page.locator(".cdesign-author").evaluateAll((nodes) => nodes
        .map((node) => ({ name: node.parentElement?.getAttribute("data-block") ?? "", extra: node.scrollHeight - node.clientHeight, text: (node.textContent ?? "").trim().length }))
        .filter((item) => item.text > 0 && item.extra > 2));
      expect(cut, "blocks whose content is taller than their box").toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect(page.locator('.cdesign-dock a[data-action="gifts"]')).toBeVisible();
    });
  }
}

test("a stylesheet published in design.custom.css goes through CustomCss: the safe rule is applied, the @import and the third-party url() never reach the page or the network", async ({ page }) => {
  const requested: string[] = [];
  page.on("request", (request) => { if (request.url().includes("evil.example")) requested.push(request.url()); });
  await open(page, 390);
  const style = page.locator("style[data-celebration-custom]");
  await expect(style).toHaveCount(1);
  const text = (await style.textContent()) ?? "";
  expect(text).toContain(".cdesign-author p");
  expect(text).not.toMatch(/evil|@import|url\(/);
  expect(await page.locator('.cdesign-page[data-section="story"] .cdesign-author p').first().evaluate((node) => getComputedStyle(node).color)).toBe("rgb(17, 34, 51)");
  // The reply and gifts buttons keep their own colours: the rule was scoped to the author's container.
  expect(await page.locator('.cdesign-dock a[data-action="gifts"]').evaluate((node) => getComputedStyle(node).color)).not.toBe("rgb(17, 34, 51)");
  expect(requested).toEqual([]);
});
