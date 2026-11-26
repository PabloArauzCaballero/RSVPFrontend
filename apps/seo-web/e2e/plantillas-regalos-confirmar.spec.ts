import { mkdirSync, writeFileSync } from "node:fs";
import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// FE #114 follow-up, decision 8 · «Confirmar asistencia» and «Regalos» are ONE block of equal weight: they share a container, have the same
// height, width, weight and ink, sit side by side from 768 px and stacked at 360, and neither is hidden or covered. It runs on the real
// site (next build + start) over the contract fixture, in the v1 renderer (`fixture-ana-y-luis`) and in v2 documents, with and without
// the guest's credential. Pictures and measurements are written only when ACTIONS_EVIDENCE_DIR is set (evidence, never a baseline).
const OUT = process.env.ACTIONS_EVIDENCE_DIR;
const TARGETS = [
  ["v1-clasico", "fixture-ana-y-luis"], ["marfil", "fixture-v2-marfil"], ["pinata", "fixture-v2-pinata"], ["gala", "fixture-v2-gala"],
  ["jardin-botanico", "fixture-v2-jardin-botanico"], ["festivo", "fixture-v2-festivo"], ["cielo-bautizo", "fixture-v2-cielo-bautizo"], ["minimalista", "fixture-v2-minimalista"],
  ["corporativo", "fixture-v2-corporativo"], ["marfil-sinfoto", "fixture-v2-marfil-sinfoto"]
] as const;
const SHOTS = new Set(["v1-clasico", "marfil", "pinata"]);
const WIDTHS = [360, 768, 1280] as const;
const TOKEN = "tok-aaaaaaaaaaaaaaaaaaaaaaaa";

interface Measure {
  readonly reply: Box; readonly gifts: Box; readonly sameContainer: boolean; readonly containerCount: number; readonly overflow: boolean;
  readonly hit: { readonly reply: boolean; readonly gifts: boolean };
}
interface Box { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number; readonly width: number; readonly height: number; readonly fontSize: string; readonly fontWeight: string;
  readonly color: string; readonly background: string; readonly border: string; readonly ground: string; readonly href: string | null }

const MEASURE = `(() => {
  const blocks = [...document.querySelectorAll("main [data-actions-block]")];
  const block = blocks[0];
  const reply = block.querySelector('a[data-action^="rsvp"]');
  const gifts = block.querySelector('a[data-action="gifts"]');
  const opaque = (node) => { for (let walk = node; walk; walk = walk.parentElement) { const value = getComputedStyle(walk).backgroundColor; const alpha = value.match(/[\\d.]+/g)?.[3]; if (alpha === undefined || Number(alpha) > 0.95) return value; } return "rgb(255, 255, 255)"; };
  const box = (node) => { const r = node.getBoundingClientRect(); const s = getComputedStyle(node);
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height, fontSize: s.fontSize, fontWeight: s.fontWeight, color: s.color, background: s.backgroundColor, border: s.borderTopWidth + " " + s.borderTopStyle + " " + s.borderTopColor, ground: opaque(node.parentElement), href: node.getAttribute("href") }; };
  const hits = (node) => { const r = node.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return top !== null && (top === node || node.contains(top)); };
  return { reply: box(reply), gifts: box(gifts), sameContainer: reply.parentElement === gifts.parentElement && reply.parentElement === block, containerCount: blocks.length, overflow: document.documentElement.scrollWidth > innerWidth, hit: { reply: hits(reply), gifts: hits(gifts) } };
})()`;

async function open(page: Page, slug: string, width: number, scheme: "light" | "dark", credential: boolean): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
  await page.goto(`/c/${slug}${credential ? `#t=${TOKEN}` : ""}`);
  await page.evaluate(() => document.fonts.ready);
  // Let the credential island flip the faces (it runs after hydration).
  await page.waitForFunction((expected) => document.querySelector('main [data-actions-block] a[data-action="rsvp-help"]')?.getAttribute("data-credential") === expected, credential ? "present" : "absent");
  const block = page.locator("main [data-actions-block]");
  await block.scrollIntoViewIfNeeded();
  await block.evaluate((node) => node.scrollIntoView({ block: "center" }));
}

const channels = (value: string): [number, number, number] => (value.match(/[\d.]+/g) ?? ["0", "0", "0"]).slice(0, 3).map(Number) as [number, number, number];
const luminance = ([r, g, b]: [number, number, number]): number => { const lin = (c: number): number => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }; return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
const contrast = (a: string, b: string): number => { const [x, y] = [luminance(channels(a)), luminance(channels(b))]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const results: Record<string, unknown>[] = [];

for (const [name, slug] of TARGETS) {
  for (const scheme of ["light", "dark"] as const) {
    for (const width of WIDTHS) {
      for (const credential of [false, true]) {
        test(`${name} ${scheme} ${width}px ${credential ? "con" : "sin"} credencial: un solo bloque, mismo peso, ${width >= 768 ? "lado a lado" : "apilados"}`, async ({ page }) => {
          await open(page, slug, width, scheme, credential);
          const m = (await page.evaluate(MEASURE)) as Measure;
          // One container that holds both, and only one block on the page.
          expect(m.containerCount).toBe(1);
          expect(m.sameContainer).toBe(true);
          // The gifts link is always /c/{slug}/regalos, no token; the reply always leads to the help (the page never holds the token).
          expect(m.gifts.href).toBe(`/c/${slug}/regalos`);
          expect(m.reply.href).toBe(`/c/${slug}/rsvp`);
          // Same weight: same height, width, type, ink and fill.
          expect(Math.abs(m.reply.height - m.gifts.height)).toBeLessThanOrEqual(1);
          expect(Math.abs(m.reply.width - m.gifts.width)).toBeLessThanOrEqual(1);
          expect(m.reply.fontSize).toBe(m.gifts.fontSize);
          expect(m.reply.fontWeight).toBe(m.gifts.fontWeight);
          expect(m.reply.background).toBe(m.gifts.background);
          expect(m.reply.color).toBe(m.gifts.color);
          expect(m.reply.border).toBe(m.gifts.border);
          // Targets (WCAG 2.5.8 asks 24 px, the project 44 px).
          expect(m.reply.height).toBeGreaterThanOrEqual(44);
          expect(m.gifts.height).toBeGreaterThanOrEqual(44);
          expect(m.reply.width).toBeGreaterThanOrEqual(44);
          // Layout: side by side from 768 px (same row, reply first), stacked below (same column, reply on top).
          if (width >= 768) {
            expect(Math.abs(m.reply.top - m.gifts.top)).toBeLessThanOrEqual(1);
            expect(m.reply.right).toBeLessThanOrEqual(m.gifts.left + 1);
          } else {
            expect(Math.abs(m.reply.left - m.gifts.left)).toBeLessThanOrEqual(1);
            expect(m.gifts.top).toBeGreaterThanOrEqual(m.reply.bottom - 1);
          }
          // Never hidden nor covered, and nothing scrolls sideways.
          expect(m.hit.reply).toBe(true);
          expect(m.hit.gifts).toBe(true);
          expect(m.overflow).toBe(false);
          expect(m.reply.right).toBeLessThanOrEqual(width + 0.5);
          expect(m.gifts.right).toBeLessThanOrEqual(width + 0.5);
          // WCAG 1.4.3: the text against its fill; 1.4.11: the control (fill or border) against the ground it sits on.
          const textContrast = contrast(m.gifts.color, m.gifts.background);
          const controlContrast = contrast(m.gifts.background, m.gifts.ground);
          expect(textContrast).toBeGreaterThanOrEqual(4.5);
          expect(controlContrast).toBeGreaterThanOrEqual(3);
          expect(contrast(m.reply.color, m.reply.background)).toBeGreaterThanOrEqual(4.5);
          results.push({ target: name, scheme, width, credential, layout: width >= 768 ? "row" : "column", reply: { w: m.reply.width, h: m.reply.height }, gifts: { w: m.gifts.width, h: m.gifts.height },
            fontSize: m.gifts.fontSize, fontWeight: m.gifts.fontWeight, textContrast: Number(textContrast.toFixed(2)), controlContrast: Number(controlContrast.toFixed(2)), replyTextContrast: Number(contrast(m.reply.color, m.reply.background).toFixed(2)) });
          if (OUT && SHOTS.has(name) && !credential) {
            mkdirSync(OUT, { recursive: true });
            await page.locator("main [data-actions-block]").locator("xpath=ancestor::section[1]").screenshot({ path: `${OUT}/${name}-${width}-${scheme}.png` });
          }
        });
      }
    }
    test(`${name} ${scheme}: axe finds no violations in the invitation, block included`, async ({ page }) => {
      await open(page, slug, 360, scheme, false);
      const result = await new AxeBuilder({ page }).include(".celebration").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      expect(result.violations.map((item) => `${item.id}: ${item.nodes.map((node) => node.target.join(" ")).join(" | ")}`)).toEqual([]);
    });
  }
}

test("the gifts page is reachable from the block and from the dock, and the page has no section of its own for it", async ({ page }) => {
  await open(page, "fixture-v2-marfil", 360, "light", false);
  await expect(page.locator('main section[data-section="gifts"]')).toHaveCount(0);
  await expect(page.locator('[data-actions-block] a[data-action="gifts"]')).toHaveAttribute("href", "/c/fixture-v2-marfil/regalos");
  await expect(page.locator('.cdesign-dock a[data-action="gifts"]')).toHaveAttribute("href", "/c/fixture-v2-marfil/regalos");
});

test.afterAll(() => {
  if (OUT && results.length) { mkdirSync(OUT, { recursive: true }); writeFileSync(`${OUT}/mediciones-${process.pid}.json`, JSON.stringify(results, null, 1)); }
});
