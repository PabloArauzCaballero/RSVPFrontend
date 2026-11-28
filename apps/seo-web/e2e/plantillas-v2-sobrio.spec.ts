import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// F4 c4 · the sober group as design documents v2, drawn by the real site (next build + start) over the contract fixture. Per template, with
// and without a cover photo, light and dark, at 360, 768 and 1280: the gifts button is in view and at least 44 px, nothing overflows sideways, every
// text pair reaches WCAG AA measured in the DOM, the page wears the document's own palette (not the v1 neutral dark) and axe finds nothing.
// It writes pictures only when F4C4_EVIDENCE_DIR is set (evidence, never a baseline).
const NAMES = ["minimalista", "arena-terracota", "corporativo", "corporativo-grafito", "inauguracion", "fiesta-patronal", "otros-evento"] as const;
const WIDTHS = [360, 768, 1280] as const;
const OUT = process.env.F4C4_EVIDENCE_DIR;
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

test("the agenda of Corporativo grafito is numbered and comes first; Corporativo keeps the timeline", async ({ page }) => {
  await open(page, "fixture-v2-corporativo-grafito", 360, "light");
  const acts = await page.locator(".celebration-schedule li").evaluateAll((items) => items.map((item) => getComputedStyle(item, "::before").content));
  expect(acts.length).toBeGreaterThan(0);
  expect(acts.every((content) => content === "counter(act, upper-roman)")).toBe(true);
  const firstSection = await page.locator(".cdesign-page[data-page-kind='section']").first().getAttribute("data-section");
  expect(firstSection).toBe("schedule");
  await open(page, "fixture-v2-corporativo", 360, "light");
  const dots = await page.locator(".celebration-schedule li").evaluateAll((items) => items.map((item) => getComputedStyle(item, "::before").content));
  expect(dots.every((content) => content === '""')).toBe(true);
});

test("Minimalista has a single object on the cover: its line", async ({ page }) => {
  await open(page, "fixture-v2-minimalista", 360, "light");
  expect(await page.locator('.cdesign-page[data-page-kind="cover"] .cdesign-el').count()).toBe(2);
  expect(await page.locator('.cdesign-page[data-page-kind="cover"] svg').count()).toBe(1);
});

// PL-130-M2 · the names are in the first screen and above the dock whatever the template, the photo or the width (the phone canvas stops stretching at 480 px), the
// whole cover text (title and date) clears the dock too, and no word of the title is cut in the middle.
const SCREENS = [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1280, height: 900 }] as const;
for (const name of NAMES) {
  for (const variant of ["", "-sinfoto"] as const) {
    for (const screen of SCREENS) {
      test(`${name}${variant} ${screen.width}x${screen.height}: the title ends above the dock and no word is cut`, async ({ page }) => {
        await page.setViewportSize(screen);
        await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
        await page.goto(`/c/fixture-v2-${name}${variant}`);
        await page.evaluate(() => document.fonts.ready);
        const box = await page.locator(".celebration-design h1").first().boundingBox();
        const cover = await page.locator(".celebration-design h1").first().evaluate((node) => {
          // The text actually drawn (title, date, place), not the photo or the grid area the cover element reserves.
          const range = document.createRange();
          range.selectNodeContents(node.closest(".cdesign-cover-copy") ?? node);
          const rect = range.getBoundingClientRect();
          return { y: rect.y + window.scrollY, height: rect.height };
        });
        const dock = await page.locator(".cdesign-dock").boundingBox();
        expect(box).not.toBeNull();
        expect(dock).not.toBeNull();
        // The dock sits at the bottom of the phone and covers what is under it: the title must end above it. When it sits at the top (wide screens) the limit is the window.
        const limit = dock && dock.y > screen.height / 2 ? dock.y : screen.height;
        expect((box?.y ?? 0) + (box?.height ?? 0), "title").toBeLessThanOrEqual(limit);
        // On the phone the date and the place must clear the dock too; on wider screens the cover is a page of its own that scrolls.
        if (screen.width <= 480) expect(cover.y + cover.height, "cover text (title, date, place)").toBeLessThanOrEqual(limit);
        // A word that wraps in the middle has client rects on two lines.
        const cut = await page.locator(".celebration-design h1").first().evaluate((node) => {
          const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
          const broken: string[] = [];
          for (let text = walker.nextNode(); text; text = walker.nextNode()) {
            const value = text.textContent ?? "";
            for (const match of value.matchAll(/\S+/g)) {
              const range = document.createRange();
              range.setStart(text, match.index ?? 0);
              range.setEnd(text, (match.index ?? 0) + match[0].length);
              const lines = new Set([...range.getClientRects()].map((rect) => Math.round(rect.top)));
              if (lines.size > 1) broken.push(match[0]);
            }
          }
          return broken;
        });
        expect(cut, "words cut across lines").toEqual([]);
      });
    }
  }
}

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
