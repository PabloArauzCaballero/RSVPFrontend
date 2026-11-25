import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// F4 c3 · the children and rites group as design documents v2, drawn by the real site (next build + start) over the contract fixture. Per template, with
// and without a cover photo, light and dark, at 360, 768 and 1280: the gifts button is in view and at least 44 px, nothing overflows sideways, every
// text pair reaches WCAG AA measured in the DOM, the page wears the document's own palette (not the v1 neutral dark) and axe finds nothing.
// It writes pictures only when F4C3_EVIDENCE_DIR is set (evidence, never a baseline).
const NAMES = ["cielo-bautizo", "menta-infantil", "baby-shower", "primera-comunion", "graduacion"] as const;
const WIDTHS = [360, 768, 1280] as const;
const OUT = process.env.F4C3_EVIDENCE_DIR;
const palettes = (name: string): { light: Record<string, string>; dark: Record<string, string> } =>
  (JSON.parse(readFileSync(join(process.cwd(), `../../packages/celebration-theme/src/design/documents/${name}.json`), "utf8")) as { theme: { tokens: { palettes: { light: Record<string, string>; dark: Record<string, string> } } } }).theme.tokens.palettes;

async function open(page: Page, slug: string, width: number, scheme: "light" | "dark"): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
  await page.goto(`/c/${slug}`);
  await page.waitForFunction(() => { const dock = document.querySelector(".cdesign-dock"); return dock !== null && getComputedStyle(dock).position !== "static"; });
  await page.evaluate(() => document.fonts.ready);
}

/** The smallest contrast of every visible text node against the opaque background it really sits on. Text over a photo or a drawing is reported apart. */
async function textContrast(page: Page): Promise<{ worst: number; failures: string[] }> {
  return page.evaluate(() => {
    const parse = (value: string): [number, number, number, number] => {
      const match = value.match(/rgba?\(([^)]+)\)/);
      if (!match) return [0, 0, 0, 0];
      const parts = (match[1] as string).split(/[ ,/]+/).filter(Boolean).map(Number);
      return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1];
    };
    const over = (top: [number, number, number, number], under: [number, number, number]): [number, number, number] => [0, 1, 2].map((i) => (top[i] as number) * top[3] + (under[i] as number) * (1 - top[3])) as [number, number, number];
    const lum = ([r, g, b]: [number, number, number]): number => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const lin = (c: number): number => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const ratio = (a: [number, number, number], b: [number, number, number]): number => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number]; return (hi + 0.05) / (lo + 0.05); };
    const backdrop = (node: Element): [number, number, number] | null => {
      const layers: [number, number, number, number][] = [];
      for (let el: Element | null = node; el; el = el.parentElement) {
        const style = getComputedStyle(el);
        if (style.backgroundImage !== "none") return null;
        const colour = parse(style.backgroundColor);
        if (colour[3] > 0) layers.push(colour);
        if (colour[3] === 1) break;
      }
      let base: [number, number, number] = [255, 255, 255];
      for (const layer of layers.reverse()) base = over(layer, base);
      return base;
    };
    let worst = 21;
    const failures: string[] = [];
    const walker = document.createTreeWalker(document.querySelector(".celebration") as Node, NodeFilter.SHOW_TEXT);
    for (let text = walker.nextNode(); text; text = walker.nextNode()) {
      const value = (text.textContent ?? "").trim();
      const el = text.parentElement;
      if (!value || !el || el.closest("svg, [aria-hidden='true'], [hidden], style, script")) continue;
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      if (style.visibility === "hidden" || style.display === "none" || !box.width || !box.height) continue;
      const bg = backdrop(el);
      if (!bg) continue;
      const fg = over(parse(style.color), bg);
      const size = parseFloat(style.fontSize);
      const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
      const value2 = ratio(fg, bg);
      worst = Math.min(worst, value2);
      if (value2 < (large ? 3 : 4.5)) failures.push(`${value.slice(0, 30)} ${value2.toFixed(2)}`);
    }
    return { worst, failures };
  });
}

for (const name of NAMES) {
  for (const variant of ["", "-sinfoto"] as const) {
    for (const scheme of ["light", "dark"] as const) {
      for (const width of WIDTHS) {
        test(`${name}${variant} ${scheme} ${width}px: gifts in view and 44px, no overflow, AA in the DOM, the document's own palette`, async ({ page }) => {
          const slug = `fixture-v2-${name}${variant}`;
          await open(page, slug, width, scheme);
          const gifts = page.locator('.cdesign-dock a[data-action="gifts"]');
          await expect(gifts).toBeVisible();
          await expect(gifts).toHaveAttribute("href", `/c/${slug}/regalos`);
          const box = await gifts.boundingBox();
          expect(box && box.height).toBeGreaterThanOrEqual(44);
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await expect(gifts).toBeInViewport();
          await page.evaluate(() => window.scrollTo(0, 0));
          const canvas = await page.evaluate(() => getComputedStyle(document.querySelector(".celebration") as Element).getPropertyValue("--celebration-canvas").trim().toUpperCase());
          expect(canvas).toBe(palettes(name)[scheme]?.["canvas"]);
          const { failures } = await textContrast(page);
          expect(failures).toEqual([]);
          if (OUT && width !== 768) await page.screenshot({ path: `${OUT}/${name}${variant}-${width}-${scheme}.png`, fullPage: true });
        });
      }
      test(`${name}${variant} ${scheme}: axe finds no contrast or structure violations`, async ({ page }) => {
        await open(page, `fixture-v2-${name}${variant}`, 360, scheme);
        const result = await new AxeBuilder({ page }).include(".celebration").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
        expect(result.violations.map((item) => `${item.id}: ${item.nodes.map((node) => node.target.join(" ")).join(" | ")}`)).toEqual([]);
      });
    }
  }
}

test("the programme of Graduación is numbered by acts and the others keep the timeline", async ({ page }) => {
  await open(page, "fixture-v2-graduacion", 360, "light");
  const acts = await page.locator(".celebration-schedule li").evaluateAll((items) => items.map((item) => getComputedStyle(item, "::before").content));
  // getComputedStyle keeps the counter expression unresolved; the two items are the two acts, in Roman numerals.
  expect(acts).toEqual(["counter(act, upper-roman)", "counter(act, upper-roman)"]);
  await open(page, "fixture-v2-cielo-bautizo", 360, "light");
  const dots = await page.locator(".celebration-schedule li").evaluateAll((items) => items.map((item) => getComputedStyle(item, "::before").content));
  expect(dots.every((content) => content === '""')).toBe(true);
});

test("the entrance of every cover plays once and, with reduced motion, nothing is hidden", async ({ page }) => {
  for (const name of NAMES) {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/c/fixture-v2-${name}`);
    const counts = await page.evaluate(() => [...document.querySelectorAll('.cdesign-page[data-page-kind="cover"] .cdesign-el[data-entrance]')].map((node) => getComputedStyle(node).animationIterationCount));
    expect(counts.length, name).toBeGreaterThan(0);
    expect(counts.every((count) => count === "1"), name).toBe(true);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const still = await page.evaluate(() => [...document.querySelectorAll(".cdesign-el[data-entrance]")].every((node) => getComputedStyle(node).animationName === "none"));
    expect(still, name).toBe(true);
  }
});
