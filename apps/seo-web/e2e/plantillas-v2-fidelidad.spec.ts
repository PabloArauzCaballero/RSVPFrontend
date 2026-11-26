import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Contract 1.8.0 (fidelity): Marfil, Piñata and Gala art déco as the real site draws them (next build + start over the contract fixture), with the cover photo and without
// it, light and dark, at 360, 768 and 1280. What it proves: the new cover variants and decorations are on the page, the gifts button is in view, at least 44 px and never
// covered while an animation plays (it takes the click), nothing overflows sideways, axe finds nothing, and with `prefers-reduced-motion: reduce` no panel and no sway is
// drawn at all. It writes pictures only when FIDELITY_EVIDENCE_DIR is set (evidence, never a baseline).
const NAMES = ["marfil", "pinata", "gala"] as const;
const VARIANT = { marfil: "arch", pinata: "hanging", gala: "deco" } as const;
const WIDTHS = [360, 768, 1280] as const;
const OUT = process.env.FIDELITY_EVIDENCE_DIR;

async function open(page: Page, slug: string, width: number, scheme: "light" | "dark", motion: "reduce" | "no-preference"): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: motion });
  await page.goto(`/c/${slug}`);
  await page.waitForFunction(() => { const dock = document.querySelector(".cdesign-dock"); return dock !== null && getComputedStyle(dock).position !== "static"; });
  await page.evaluate(() => document.fonts.ready);
}

for (const name of NAMES) {
  for (const bare of [false, true]) {
    const slug = `fixture-v2-${name}${bare ? "-sinfoto" : ""}`;
    for (const scheme of ["light", "dark"] as const) {
      for (const width of WIDTHS) {
        test(`${slug} · ${scheme} · ${width}: the cover variant is drawn, the gifts button is whole, nothing overflows`, async ({ page }) => {
          await open(page, slug, width, scheme, "reduce");
          await expect(page.locator(".cdesign-cover").first()).toHaveAttribute("data-variant", VARIANT[name]);
          const gifts = page.locator('.cdesign-dock a[data-action="gifts"]');
          await expect(gifts).toBeVisible();
          const box = (await gifts.boundingBox()) as { width: number; height: number };
          expect(box.height).toBeGreaterThanOrEqual(44);
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(await gifts.getAttribute("href")).toBe(`/c/${slug}/regalos`);
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
          // Reduced motion: the panels of the doors are not drawn and nothing sways.
          expect(await page.evaluate(() => [...document.querySelectorAll(".cdesign-doors")].every((doors) => getComputedStyle(doors).display === "none"))).toBe(true);
          expect(await page.evaluate(() => [...document.querySelectorAll('[data-anim="mecerse"] .cdesign-author')].every((node) => getComputedStyle(node).animationName === "none"))).toBe(true);
          // No mask, frame or animation on the protected layer, and the gifts block is not under another element.
          expect(await page.locator(".rsvp-protected[data-mask], .rsvp-protected[data-frame], .rsvp-protected[data-anim]").count()).toBe(0);
          expect(await gifts.evaluate((link) => { const rect = link.getBoundingClientRect(); const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2); return top !== null && (top === link || link.contains(top)); })).toBe(true);
          if (OUT) await page.screenshot({ path: `${OUT}/${slug}-${scheme}-${width}.png`, fullPage: false });
        });
      }
      test(`${slug} · ${scheme}: axe finds nothing`, async ({ page }) => {
        await open(page, slug, 1280, scheme, "reduce");
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
        expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`)).toEqual([]);
      });
    }
  }
}

test("Gala · the doors open once, never take the click on «Ver regalos», and leave the page clear", async ({ page }) => {
  await open(page, "fixture-v2-gala", 360, "light", "no-preference");
  const doors = page.locator('.cdesign-doors[data-kind="abrir-puertas"] .cdesign-door');
  await expect(doors).toHaveCount(2);
  expect(await doors.first().evaluate((node) => getComputedStyle(node).pointerEvents)).toBe("none");
  // While they play, the gifts button of the dock is on top and takes the click (Playwright refuses to click an element something else covers).
  await page.locator('.cdesign-dock a[data-action="gifts"]').click({ timeout: 3000, noWaitAfter: true, trial: true });
  await page.waitForTimeout(3200);
  const resting = await doors.evaluateAll((nodes) => nodes.map((node) => { const rect = node.getBoundingClientRect(); return rect.right <= 1 || rect.left >= window.innerWidth - 1; }));
  expect(resting).toEqual([true, true]);
  if (OUT) await page.screenshot({ path: `${OUT}/fixture-v2-gala-puertas-abiertas-360.png` });
});

test("Piñata · the piñata sways while it plays and rests at the end", async ({ page }) => {
  await open(page, "fixture-v2-pinata", 360, "light", "no-preference");
  const author = page.locator('[data-anim="mecerse"] .cdesign-author').first();
  const samples: string[] = [];
  for (let step = 0; step < 14; step += 1) { samples.push(await author.evaluate((node) => getComputedStyle(node).transform)); await page.waitForTimeout(250); }
  expect(samples.some((transform) => transform !== "none" && transform !== "matrix(1, 0, 0, 1, 0, 0)")).toBe(true);
  expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(await author.evaluate((node) => getComputedStyle(node).transform));
  expect(await author.evaluate((node) => getComputedStyle(node).animationIterationCount)).toBe("1");
});
